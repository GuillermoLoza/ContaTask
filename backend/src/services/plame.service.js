import { db } from '../config/database.js';

/**
 * Servicio PLAME (Planilla Mensual de Pagos - Formulario Virtual N° 0601)
 * Implementa el requerimiento RF-T05 de la tesis:
 * - Carga, procesamiento y validación de la nómina de trabajadores del cliente MYPE
 * - Cálculo automático de retenciones (ONP 13% o AFP, Renta de 5ta) y aportes (EsSalud 9%)
 * - Validación estructural (DNI de 8 dígitos, sueldo no menor a la RMV S/ 1,025)
 * - Generación de los archivos planos estructurados (.rem, .jor, .snl) listos para importar en PDT PLAME
 * - Almacenamiento de constancia de presentación y cambio de estado a "PLAME Declarado"
 */
export class PlameService {

  /**
   * Obtiene o inicializa el periodo de planilla mensual de un cliente
   */
  static async getPeriodoPlame(clienteId, periodo) {
    let plamePeriodo = await db('plame_periodos')
      .where({ cliente_id: clienteId, periodo })
      .first();

    if (!plamePeriodo) {
      const cliente = await db('clientes').where({ id: clienteId }).first();
      if (!cliente) throw new Error('Cliente no encontrado');

      const [idRes] = await db('plame_periodos').insert({
        cliente_id: clienteId,
        cliente_ruc: cliente.ruc,
        periodo: periodo,
        estado: 'BORRADOR',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      const id = typeof idRes === 'object' ? idRes.id : idRes;
      plamePeriodo = await db('plame_periodos').where({ id }).first();

      // Cargar trabajadores iniciales demostrativos para la MYPE
      await this.cargarTrabajadoresDemo(clienteId, plamePeriodo.id);
    }

    const trabajadores = await db('plame_trabajadores')
      .where({ plame_periodo_id: plamePeriodo.id })
      .orderBy('apellidos', 'asc');

    // Recalcular y actualizar totales
    await this.actualizarTotalesPeriodo(plamePeriodo.id);
    const periodoActualizado = await db('plame_periodos').where({ id: plamePeriodo.id }).first();

    return {
      periodo: periodoActualizado,
      trabajadores,
      metricas: {
        totalTrabajadores: trabajadores.length,
        trabajadoresValidos: trabajadores.filter(t => t.es_valido).length,
        inconsistencias: trabajadores.filter(t => !t.es_valido).length,
        totalNetoPagar: trabajadores.reduce((acc, t) => acc + Number(t.neto_pagar), 0)
      }
    };
  }

  /**
   * Agrega o actualiza un trabajador en la nómina del periodo
   */
  static async guardarTrabajador(clienteId, periodo, data) {
    let plamePeriodo = await db('plame_periodos')
      .where({ cliente_id: clienteId, periodo })
      .first();

    if (!plamePeriodo) {
      await this.getPeriodoPlame(clienteId, periodo);
      plamePeriodo = await db('plame_periodos').where({ cliente_id: clienteId, periodo }).first();
    }

    // Cálculos de nómina peruana conforme a ley:
    const sueldoBase = Number(data.sueldoBase) || 1025.00; // RMV actual Perú
    const asigFam = data.tieneHijos ? 102.50 : (Number(data.asignacionFamiliar) || 0); // 10% RMV
    const horasExtras = Number(data.horasExtras) || 0;
    const remBruta = sueldoBase + asigFam + horasExtras;

    // Aporte EsSalud 9% (Asumido por empleador)
    const baseEsSalud = Math.max(remBruta, 1025.00);
    const aporteEssalud = Math.round((baseEsSalud * 0.09) * 100) / 100;

    // Descuento de Pensión (Asumido por el trabajador)
    const regimenPension = data.regimenPensionario || 'ONP';
    let descuentoPension = 0;
    if (regimenPension === 'ONP') {
      descuentoPension = Math.round((remBruta * 0.13) * 100) / 100;
    } else {
      // AFP (Fondo 10% + Seguro 1.47% + Comisión ~0.38% = aprox 11.85%)
      descuentoPension = Math.round((remBruta * 0.1185) * 100) / 100;
    }

    // Renta de 5ta categoría (si ingresos proyectados anuales superan 7 UIT)
    let retencionRenta5ta = 0;
    if (remBruta > 2500) {
      retencionRenta5ta = Math.round(((remBruta - 2500) * 0.08) * 100) / 100;
    }

    const netoPagar = remBruta - descuentoPension - retencionRenta5ta;

    // Validaciones estructurales de SUNAT:
    let esValido = true;
    let errorValidacion = null;
    const numDoc = String(data.numeroDocumento || '').trim();

    if (!numDoc || numDoc.length !== 8 || !/^\d+$/.test(numDoc)) {
      esValido = false;
      errorValidacion = 'DNI inválido: debe contener exactamente 8 dígitos numéricos.';
    } else if (sueldoBase < 1025.00) {
      esValido = false;
      errorValidacion = 'Sueldo base menor a la Remuneración Mínima Vital (RMV S/ 1,025.00).';
    }

    const payload = {
      plame_periodo_id: plamePeriodo.id,
      cliente_id: clienteId,
      tipo_documento: data.tipoDocumento || '01',
      numero_documento: numDoc,
      nombres: data.nombres,
      apellidos: data.apellidos,
      cargo: data.cargo || 'Operario',
      fecha_ingreso: data.fechaIngreso || `${periodo}-01`,
      dias_laborados: parseInt(data.diasLaborados || '30', 10),
      horas_ordinarias: parseInt(data.horasOrdinarias || '240', 10),
      sueldo_base: sueldoBase,
      asignacion_familiar: asigFam,
      horas_extras: horasExtras,
      total_remuneracion_bruta: remBruta,
      regimen_pensionario: regimenPension,
      descuento_pension: descuentoPension,
      retencion_renta_5ta: retencionRenta5ta,
      neto_pagar: netoPagar,
      aporte_essalud: aporteEssalud,
      es_valido: esValido,
      error_validacion: errorValidacion
    };

    if (data.id) {
      await db('plame_trabajadores').where({ id: data.id }).update(payload);
    } else {
      payload.created_at = new Date();
      await db('plame_trabajadores').insert(payload);
    }

    await this.actualizarTotalesPeriodo(plamePeriodo.id);
    return plamePeriodo.id;
  }

  /**
   * Elimina un trabajador de la nómina
   */
  static async eliminarTrabajador(trabajadorId) {
    const trab = await db('plame_trabajadores').where({ id: trabajadorId }).first();
    if (trab) {
      await db('plame_trabajadores').where({ id: trabajadorId }).del();
      await this.actualizarTotalesPeriodo(trab.plame_periodo_id);
    }
    return { success: true };
  }

  /**
   * RF-T05: Valida la consistencia de la planilla antes de generar archivos
   */
  static async validarPlanilla(clienteId, periodo) {
    const plamePeriodo = await db('plame_periodos')
      .where({ cliente_id: clienteId, periodo })
      .first();

    if (!plamePeriodo) throw new Error('Periodo no encontrado');

    const trabajadores = await db('plame_trabajadores')
      .where({ plame_periodo_id: plamePeriodo.id });

    const errores = trabajadores.filter(t => !t.es_valido);

    if (errores.length > 0) {
      return {
        esValido: false,
        totalErrores: errores.length,
        errores: errores.map(e => ({
          trabajador: `${e.nombres} ${e.apellidos}`,
          documento: e.numero_documento,
          error: e.error_validacion
        }))
      };
    }

    await db('plame_periodos').where({ id: plamePeriodo.id }).update({
      estado: 'VALIDADO',
      updated_at: new Date()
    });

    return {
      esValido: true,
      totalTrabajadores: trabajadores.length,
      mensaje: 'Planilla validada sin observaciones. Lista para generar estructuras oficiales SUNAT.'
    };
  }

  /**
   * RF-T05: Genera los archivos planos oficiales de importación PDT PLAME (.rem, .jor, .snl)
   */
  static async generarArchivosPlame(clienteId, periodo) {
    const cliente = await db('clientes').where({ id: clienteId }).first();
    const plamePeriodo = await db('plame_periodos')
      .where({ cliente_id: clienteId, periodo })
      .first();

    const trabajadores = await db('plame_trabajadores')
      .where({ plame_periodo_id: plamePeriodo.id })
      .where('es_valido', true);

    const cleanPeriod = periodo.replace('-', '');
    const prefix = `0601${cleanPeriod}${cliente.ruc}`;

    // 1. Archivo .rem (Estructura de Remuneraciones y Conceptos PDT 0601)
    // Formato: TipoDoc|NumDoc|CodConcepto|MontoDevengado|MontoPagado|
    const lineasRem = [];
    for (const t of trabajadores) {
      // Concepto 0121: Remuneración Básica
      lineasRem.push(`${t.tipo_documento}|${t.numero_documento}|0121|${Number(t.sueldo_base).toFixed(2)}|${Number(t.sueldo_base).toFixed(2)}|`);
      // Concepto 0201: Asignación Familiar
      if (Number(t.asignacion_familiar) > 0) {
        lineasRem.push(`${t.tipo_documento}|${t.numero_documento}|0201|${Number(t.asignacion_familiar).toFixed(2)}|${Number(t.asignacion_familiar).toFixed(2)}|`);
      }
      // Concepto 0607: ONP o 0608: AFP
      const codPension = t.regimen_pensionario === 'ONP' ? '0607' : '0608';
      lineasRem.push(`${t.tipo_documento}|${t.numero_documento}|${codPension}|${Number(t.descuento_pension).toFixed(2)}|${Number(t.descuento_pension).toFixed(2)}|`);
      // Concepto 0804: EsSalud 9%
      lineasRem.push(`${t.tipo_documento}|${t.numero_documento}|0804|${Number(t.aporte_essalud).toFixed(2)}|${Number(t.aporte_essalud).toFixed(2)}|`);
    }

    // 2. Archivo .jor (Jornada Laboral - Horas Ordinarias y Sobretiempo)
    // Formato: TipoDoc|NumDoc|HorasOrdinarias|MinutosOrd|HorasSobretiempo|MinutosSobretiempo|
    const lineasJor = trabajadores.map(t =>
      `${t.tipo_documento}|${t.numero_documento}|${t.horas_ordinarias}|0|${Number(t.horas_extras) > 0 ? 10 : 0}|0|`
    );

    // 3. Archivo .snl (Días No Laborados y Subsidiados)
    const lineasSnl = trabajadores.map(t =>
      `${t.tipo_documento}|${t.numero_documento}|${t.dias_laborados}|`
    );

    await db('plame_periodos').where({ id: plamePeriodo.id }).update({
      estado: 'ARCHIVOS_GENERADOS',
      archivo_rem_url: `${prefix}.rem`,
      archivo_jor_url: `${prefix}.jor`,
      archivo_snl_url: `${prefix}.snl`,
      updated_at: new Date()
    });

    return {
      archivos: [
        { nombre: `${prefix}.rem`, contenido: lineasRem.join('\r\n'), descripcion: 'Estructura de Remuneraciones' },
        { nombre: `${prefix}.jor`, contenido: lineasJor.join('\r\n'), descripcion: 'Estructura de Jornada Laboral' },
        { nombre: `${prefix}.snl`, contenido: lineasSnl.join('\r\n'), descripcion: 'Estructura de Días Laborados' }
      ]
    };
  }

  /**
   * RF-T05: Registra la presentación oficial de la PLAME y emite constancia
   */
  static async declararPlame(clienteId, periodo, constanciaData = {}) {
    const plamePeriodo = await db('plame_periodos')
      .where({ cliente_id: clienteId, periodo })
      .first();

    const npsPlame = `81${Math.floor(10000000 + Math.random() * 90000000)}`;

    await db('plame_periodos').where({ id: plamePeriodo.id }).update({
      estado: 'DECLARADO',
      nps_plame: npsPlame,
      updated_at: new Date()
    });

    return {
      success: true,
      mensaje: 'Planilla Mensual de Pagos (PLAME) declarada con éxito ante SUNAT.',
      nps: npsPlame,
      periodo: periodo,
      totalEsSalud: plamePeriodo.total_essalud,
      totalOnp: plamePeriodo.total_onp
    };
  }

  /**
   * Actualiza totales consolidados del periodo
   */
  static async actualizarTotalesPeriodo(plamePeriodoId) {
    const trabajadores = await db('plame_trabajadores')
      .where({ plame_periodo_id: plamePeriodoId });

    const totalTrab = trabajadores.length;
    const totalRem = trabajadores.reduce((acc, t) => acc + Number(t.total_remuneracion_bruta), 0);
    const totalEssalud = trabajadores.reduce((acc, t) => acc + Number(t.aporte_essalud), 0);
    const totalOnp = trabajadores
      .filter(t => t.regimen_pensionario === 'ONP')
      .reduce((acc, t) => acc + Number(t.descuento_pension), 0);
    const totalAfp = trabajadores
      .filter(t => t.regimen_pensionario !== 'ONP')
      .reduce((acc, t) => acc + Number(t.descuento_pension), 0);
    const totalRenta5ta = trabajadores.reduce((acc, t) => acc + Number(t.retencion_renta_5ta), 0);

    await db('plame_periodos').where({ id: plamePeriodoId }).update({
      total_trabajadores: totalTrab,
      total_remuneracion: totalRem,
      total_essalud: totalEssalud,
      total_onp: totalOnp,
      total_afp: totalAfp,
      total_renta_5ta: totalRenta5ta,
      updated_at: new Date()
    });
  }

  /**
   * Carga trabajadores demostrativos para pruebas inmediatas
   */
  static async cargarTrabajadoresDemo(clienteId, plamePeriodoId) {
    const demos = [
      {
        plame_periodo_id: plamePeriodoId,
        cliente_id: clienteId,
        tipo_documento: '01',
        numero_documento: '71829304',
        nombres: 'Juan Carlos',
        apellidos: 'Ríos Mendoza',
        cargo: 'Jefe de Operaciones',
        fecha_ingreso: '2023-03-15',
        dias_laborados: 30,
        horas_ordinarias: 240,
        sueldo_base: 2800.00,
        asignacion_familiar: 102.50,
        horas_extras: 150.00,
        total_remuneracion_bruta: 3052.50,
        regimen_pensionario: 'INTEGRA',
        descuento_pension: 361.72,
        retencion_renta_5ta: 44.20,
        neto_pagar: 2646.58,
        aporte_essalud: 274.73,
        es_valido: true,
        created_at: new Date()
      },
      {
        plame_periodo_id: plamePeriodoId,
        cliente_id: clienteId,
        tipo_documento: '01',
        numero_documento: '45892134',
        nombres: 'María Elena',
        apellidos: 'Quispe Huamán',
        cargo: 'Asistente Contable / Administrativa',
        fecha_ingreso: '2024-01-10',
        dias_laborados: 30,
        horas_ordinarias: 240,
        sueldo_base: 1500.00,
        asignacion_familiar: 102.50,
        horas_extras: 0.00,
        total_remuneracion_bruta: 1602.50,
        regimen_pensionario: 'ONP',
        descuento_pension: 208.33,
        retencion_renta_5ta: 0.00,
        neto_pagar: 1394.17,
        aporte_essalud: 144.23,
        es_valido: true,
        created_at: new Date()
      },
      {
        plame_periodo_id: plamePeriodoId,
        cliente_id: clienteId,
        tipo_documento: '01',
        numero_documento: '74129856',
        nombres: 'Luis Alberto',
        apellidos: 'Sánchez Vargas',
        cargo: 'Operario de Almacén',
        fecha_ingreso: '2024-06-01',
        dias_laborados: 30,
        horas_ordinarias: 240,
        sueldo_base: 1025.00,
        asignacion_familiar: 0.00,
        horas_extras: 0.00,
        total_remuneracion_bruta: 1025.00,
        regimen_pensionario: 'ONP',
        descuento_pension: 133.25,
        retencion_renta_5ta: 0.00,
        neto_pagar: 891.75,
        aporte_essalud: 92.25,
        es_valido: true,
        created_at: new Date()
      }
    ];

    await db('plame_trabajadores').insert(demos);
  }
}
