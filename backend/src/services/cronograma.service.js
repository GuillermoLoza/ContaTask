import https from 'https';
import { db } from '../config/database.js';

const MESES_MAP = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'set': '09', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
};

function limpiarTexto(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export class CronogramaService {

  /**
   * Conecta y descarga directamente el HTML oficial de la página de SUNAT:
   * https://www.sunat.gob.pe/orientacion/cronogramas/{year}/cObligacionMensual{year}.html
   */
  static fetchHtmlSunat(year) {
    const url = `https://www.sunat.gob.pe/orientacion/cronogramas/${year}/cObligacionMensual${year}.html`;
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ContaTask/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 8000
      }, (res) => {
        if (res.statusCode === 404) {
          resolve({ status: 404, url, html: '' });
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, url, html: data }));
      });

      req.on('error', (err) => reject(new Error(`Fallo de conexión con portal de SUNAT: ${err.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Tiempo de espera agotado al conectar a la web oficial de SUNAT'));
      });
    });
  }

  /**
   * Parsea la tabla HTML de vencimientos del portal oficial de SUNAT
   */
  static parsearHtmlSunat(html, year) {
    if (!html) return { resolucion: '', periodos: {} };

    // Extraer Resolución de Superintendencia
    let resolucion = `Resolución de Superintendencia SUNAT N° 281-2022/SUNAT`;
    const rsMatch = html.match(/Resoluci[oó]n\s+de\s+Superintendencia\s+N[°oº]?\s*[\d\-]+(?:\/[A-Z]+)?/i)
      || html.match(/R\.?S\.?\s*N[°oº]?\s*[\d\-]+(?:\/[A-Z]+)?/i);
    if (rsMatch) {
      resolucion = rsMatch[0].replace(/\s+/g, ' ').trim();
    }

    const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const periodos = {};

    for (const tr of trMatches) {
      const tdMatches = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
      if (tdMatches.length !== 8) continue; // 1 de período + 7 de grupos de dígitos

      const celdaPeriodo = limpiarTexto(tdMatches[0]);
      const matchPer = celdaPeriodo.match(/^([a-zA-Z]{3})\s*[-–]\s*(\d{4})$/i);
      if (!matchPer) continue;

      const mesStr = matchPer[1].toLowerCase();
      const anioPer = matchPer[2];
      const mesNum = MESES_MAP[mesStr];
      if (!mesNum) continue;

      const periodoKey = `${anioPer}-${mesNum}`;
      const grupos = ['0', '1', '2_3', '4_5', '6_7', '8_9', 'BUENOS_CONTRIBUYENTES'];
      const etiquetas = [
        'Dígito 0', 'Dígito 1', 'Dígitos 2 y 3', 'Dígitos 4 y 5',
        'Dígitos 6 y 7', 'Dígitos 8 y 9', 'Buenos Contribuyentes y UESP'
      ];

      periodos[periodoKey] = [];

      for (let i = 1; i <= 7; i++) {
        const rawText = limpiarTexto(tdMatches[i]);
        const partes = rawText.split(' ');
        const dia = partes[0].padStart(2, '0');
        const mesVencStr = partes[1] ? partes[1].toLowerCase() : '';
        const mesVencNum = MESES_MAP[mesVencStr] || (Number(mesNum) === 12 ? '01' : String(Number(mesNum) + 1).padStart(2, '0'));
        const anioVenc = partes[2] ? partes[2] : (Number(mesNum) === 12 ? String(Number(anioPer) + 1) : anioPer);

        const fechaIso = `${anioVenc}-${mesVencNum}-${dia}`;

        periodos[periodoKey].push({
          digito_grupo: grupos[i - 1],
          digito_label: etiquetas[i - 1],
          fecha_vencimiento: fechaIso
        });
      }
    }

    return { resolucion, periodos };
  }

  /**
   * Obtiene la tabla completa de vencimientos oficiales desde la URL oficial de SUNAT:
   * https://www.sunat.gob.pe/orientacion/cronogramas/{year}/cObligacionMensual{year}.html
   * y la sincroniza en la base de datos `cronogramas_sunat_oficial`.
   */
  static async sincronizarDesdePortalSunat(periodo) {
    const [year, month] = periodo.split('-');
    const urlOficial = `https://www.sunat.gob.pe/orientacion/cronogramas/${year}/cObligacionMensual${year}.html`;
    const fuente = `Página Oficial SUNAT (${urlOficial})`;

    // 1. Descargar HTML de la URL oficial
    const res = await this.fetchHtmlSunat(year);

    if (res.status === 404) {
      throw new Error(
        `La página oficial de SUNAT (${urlOficial}) aún no publica el cronograma de vencimientos para el año ${year}. No se permiten cálculos ni suposiciones.`
      );
    }

    if (res.status !== 200 || !res.html) {
      throw new Error(
        `Error al obtener la página de SUNAT (${urlOficial}): Código HTTP ${res.status}`
      );
    }

    // 2. Parsear la tabla oficial
    const { resolucion, periodos } = this.parsearHtmlSunat(res.html, year);

    if (!periodos[periodo] || periodos[periodo].length === 0) {
      throw new Error(
        `El período ${periodo} no se encuentra detallado en la tabla de la página oficial de SUNAT (${urlOficial}).`
      );
    }

    // 3. Persistir todos los meses del ejercicio en la base de datos
    try {
      const tieneTabla = await db.schema.hasTable('cronogramas_sunat_oficial');
      if (tieneTabla) {
        for (const [perKey, items] of Object.entries(periodos)) {
          for (const item of items) {
            const existe = await db('cronogramas_sunat_oficial')
              .where({ periodo: perKey, digito_grupo: item.digito_grupo })
              .first();

            if (existe) {
              await db('cronogramas_sunat_oficial')
                .where({ id: existe.id })
                .update({
                  digito_label: item.digito_label,
                  fecha_vencimiento: item.fecha_vencimiento,
                  resolucion_sunat: resolucion,
                  fuente_oficial: fuente,
                  url_oficial: urlOficial,
                  estado: 'OFICIAL_SUNAT_WEB',
                  sincronizado_at: new Date()
                });
            } else {
              await db('cronogramas_sunat_oficial').insert({
                periodo: perKey,
                digito_grupo: item.digito_grupo,
                digito_label: item.digito_label,
                fecha_vencimiento: item.fecha_vencimiento,
                resolucion_sunat: resolucion,
                fuente_oficial: fuente,
                url_oficial: urlOficial,
                estado: 'OFICIAL_SUNAT_WEB',
                sincronizado_at: new Date()
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Advertencia al persistir en cronogramas_sunat_oficial:', err.message);
    }

    return {
      success: true,
      periodo,
      year: Number(year),
      month: Number(month),
      resolucion,
      fuente_oficial: fuente,
      url_oficial: urlOficial,
      sincronizado_at: new Date().toISOString(),
      cronograma_digitos: periodos[periodo]
    };
  }

  /**
   * Obtiene la tabla oficial de vencimientos de SUNAT para el período solicitado.
   * Si no está en BD, lo extrae directamente de la página de SUNAT.
   */
  static async obtenerCronogramaOficial(periodo = '2026-08') {
    const [year, month] = periodo.split('-');

    // Primero consultar en BD
    try {
      const tieneTabla = await db.schema.hasTable('cronogramas_sunat_oficial');
      if (tieneTabla) {
        const filas = await db('cronogramas_sunat_oficial')
          .where({ periodo })
          .orderBy('id', 'asc');

        if (filas && filas.length > 0) {
          const primero = filas[0];
          return {
            periodo,
            year: Number(year),
            month: Number(month),
            resolucion_sunat: primero.resolucion_sunat,
            fuente_oficial: primero.fuente_oficial,
            url_oficial: primero.url_oficial,
            mes_nombre: this.getNombreMes(Number(month)),
            sincronizado_at: primero.sincronizado_at,
            metodo_obtencion: 'EXTRACCION_OFICIAL_SUNAT',
            cronograma_digitos: filas.map(f => ({
              digito_grupo: f.digito_grupo,
              digito_label: f.digito_label,
              fecha_vencimiento: f.fecha_vencimiento instanceof Date
                ? f.fecha_vencimiento.toISOString().slice(0, 10)
                : String(f.fecha_vencimiento).slice(0, 10)
            }))
          };
        }
      }
    } catch (e) {
      console.warn('Error leyendo cronogramas_sunat_oficial:', e.message);
    }

    // Si no está en BD, conectarse y extraer de la web oficial de SUNAT
    const syncResult = await this.sincronizarDesdePortalSunat(periodo);

    return {
      periodo,
      year: Number(year),
      month: Number(month),
      resolucion_sunat: syncResult.resolucion,
      fuente_oficial: syncResult.fuente_oficial,
      url_oficial: syncResult.url_oficial,
      mes_nombre: this.getNombreMes(Number(month)),
      sincronizado_at: syncResult.sincronizado_at,
      metodo_obtencion: 'EXTRACCION_OFICIAL_SUNAT',
      cronograma_digitos: syncResult.cronograma_digitos
    };
  }

  /**
   * Obtiene la fecha exacta de vencimiento oficial de SUNAT para un RUC específico
   */
  static async obtenerVencimientoParaRuc(ruc, periodo = '2026-08', esBuenContribuyente = false) {
    if (!ruc || typeof ruc !== 'string') return null;

    const crono = await this.obtenerCronogramaOficial(periodo);
    if (esBuenContribuyente) {
      const bc = crono.cronograma_digitos.find(d => d.digito_grupo === 'BUENOS_CONTRIBUYENTES');
      return bc ? bc.fecha_vencimiento : null;
    }

    const ultimoDigito = ruc.trim().slice(-1);
    let grupo = ultimoDigito;
    if (ultimoDigito === '2' || ultimoDigito === '3') grupo = '2_3';
    else if (ultimoDigito === '4' || ultimoDigito === '5') grupo = '4_5';
    else if (ultimoDigito === '6' || ultimoDigito === '7') grupo = '6_7';
    else if (ultimoDigito === '8' || ultimoDigito === '9') grupo = '8_9';

    const item = crono.cronograma_digitos.find(d => d.digito_grupo === grupo);
    return item ? item.fecha_vencimiento : null;
  }

  /**
   * Cruza los vencimientos oficiales de SUNAT contra las empresas de la base de datos
   */
  static async obtenerCronogramaClientes(periodo = '2026-08') {
    const cronoOficial = await this.obtenerCronogramaOficial(periodo);

    const clientes = await db('clientes as c')
      .where('c.activo', true)
      .select('c.id', 'c.ruc', 'c.razon_social', 'c.nombre_comercial', 'c.regimen_tributario', 'c.email', 'c.celular')
      .orderBy('c.razon_social', 'asc');

    const pendientesPorCliente = await db('transacciones')
      .where('periodo', periodo)
      .whereIn('estado_sustento', ['INFORMACION_INCOMPLETA', 'RECHAZADO'])
      .groupBy('cliente_id')
      .select('cliente_id', db.raw('COUNT(id) as total_pendientes'));

    const pendientesMap = new Map();
    pendientesPorCliente.forEach(p => {
      pendientesMap.set(p.cliente_id, Number(p.total_pendientes));
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const items = clientes.map(cli => {
      const ultimoDigito = cli.ruc.slice(-1);
      const itemD = cronoOficial.cronograma_digitos.find(d => {
        if (d.digito_grupo === ultimoDigito) return true;
        if (d.digito_grupo === '2_3' && (ultimoDigito === '2' || ultimoDigito === '3')) return true;
        if (d.digito_grupo === '4_5' && (ultimoDigito === '4' || ultimoDigito === '5')) return true;
        if (d.digito_grupo === '6_7' && (ultimoDigito === '6' || ultimoDigito === '7')) return true;
        if (d.digito_grupo === '8_9' && (ultimoDigito === '8' || ultimoDigito === '9')) return true;
        return false;
      });

      const vencimientoStr = itemD ? itemD.fecha_vencimiento : null;
      let diasRestantes = 0;
      if (vencimientoStr) {
        const fechaVenc = new Date(vencimientoStr + 'T00:00:00');
        const diffMs = fechaVenc.getTime() - hoy.getTime();
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      const pendientes = pendientesMap.get(cli.id) || 0;

      let estadoColor = 'green';
      let estadoTexto = 'Al día';

      if (pendientes > 0) {
        if (diasRestantes < 0) {
          estadoColor = 'red';
          estadoTexto = `Vencido hace ${Math.abs(diasRestantes)} d`;
        } else if (diasRestantes === 0) {
          estadoColor = 'red';
          estadoTexto = '¡Vence Hoy!';
        } else if (diasRestantes <= 2) {
          estadoColor = 'red';
          estadoTexto = `Urgente (${diasRestantes} d)`;
        } else if (diasRestantes <= 6) {
          estadoColor = 'orange';
          estadoTexto = `Próximo (${diasRestantes} d)`;
        } else {
          estadoColor = 'orange';
          estadoTexto = `En plazo (${diasRestantes} d)`;
        }
      } else {
        if (diasRestantes < 0) {
          estadoColor = 'green';
          estadoTexto = 'Declarado / Al día';
        } else {
          estadoColor = 'green';
          estadoTexto = 'Documentación Completa';
        }
      }

      return {
        id: cli.id,
        clienteDbId: cli.id,
        nombre: cli.razon_social,
        nombreComercial: cli.nombre_comercial || cli.razon_social,
        ruc: cli.ruc,
        ultimoDigito,
        vencimiento: vencimientoStr,
        vencimientoFormateado: this.formatFechaLegible(vencimientoStr),
        diasRestantes,
        pendientes,
        estadoColor,
        estadoTexto,
        email: cli.email,
        celular: cli.celular,
        regimen_tributario: cli.regimen_tributario
      };
    });

    items.sort((a, b) => new Date(a.vencimiento || '').getTime() - new Date(b.vencimiento || '').getTime());

    return {
      success: true,
      periodo,
      cronoOficial,
      items,
      totalEmpresas: items.length,
      empresasAlDia: items.filter(i => i.pendientes === 0).length,
      empresasPendientes: items.filter(i => i.pendientes > 0).length,
      empresasUrgentes: items.filter(i => i.estadoColor === 'red').length,
      sincronizado_at: new Date().toISOString()
    };
  }

  // Helpers
  static getNombreMes(mes) {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Mes';
  }

  static formatFechaLegible(fechaStr) {
    if (!fechaStr) return '-';
    const [y, m, d] = fechaStr.split('-');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const nombreDia = diasSemana[dateObj.getDay()];
    return `${nombreDia}, ${Number(d)} de ${this.getNombreMes(Number(m))} de ${y}`;
  }
}
