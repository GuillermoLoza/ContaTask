import { db } from '../config/database.js';

/**
 * Modelo Cliente (Patrón MVC con Knex.js)
 * Gestiona el catálogo de MYPEs asesoradas, estadísticas de cumplimiento y persistencia.
 */
export class Cliente {
  /**
   * Obtener todas las MYPEs activas con estadísticas de transacciones y bancarización
   */
  static async findAllWithStats({ soloActivos = false } = {}) {
    let query = db('clientes as c')
      .leftJoin('transacciones as t', 't.cliente_id', 'c.id')
      .select(
        'c.id',
        'c.ruc',
        'c.razon_social',
        'c.nombre_comercial',
        'c.regimen_tributario',
        'c.contacto_nombre',
        'c.email',
        'c.celular',
        'c.direccion',
        'c.activo',
        'c.usuario_sol',
        'c.sunat_client_id',
        'c.sunat_token_expires_at',
        'c.sunat_estado_conexion',
        'c.sunat_ultimo_acceso',
        'c.sunat_ultimo_error',
        'c.created_at',
        db.raw("CASE WHEN c.clave_sol IS NOT NULL AND LENGTH(TRIM(c.clave_sol)) > 0 THEN 1 ELSE 0 END as tiene_clave_sol"),
        db.raw('COUNT(t.id) as total_transacciones'),
        db.raw("SUM(CASE WHEN t.estado_sustento = 'INFORMACION_INCOMPLETA' THEN 1 ELSE 0 END) as pendientes_sustento"),
        db.raw("SUM(CASE WHEN t.estado_sustento = 'VALIDADO' THEN 1 ELSE 0 END) as validados"),
        db.raw("COALESCE(SUM(CASE WHEN t.requiere_bancarizacion = TRUE THEN t.monto_total ELSE 0 END), 0) as monto_bancarizacion")
      );

    if (soloActivos) {
      query = query.where('c.activo', true);
    }

    const records = await query
      .groupBy(
        'c.id',
        'c.ruc',
        'c.razon_social',
        'c.nombre_comercial',
        'c.regimen_tributario',
        'c.contacto_nombre',
        'c.email',
        'c.celular',
        'c.direccion',
        'c.activo',
        'c.usuario_sol',
        'c.clave_sol',
        'c.sunat_client_id',
        'c.sunat_token_expires_at',
        'c.sunat_estado_conexion',
        'c.sunat_ultimo_acceso',
        'c.sunat_ultimo_error',
        'c.created_at'
      )
      .orderBy('c.razon_social', 'asc');

    return records.map(r => ({
      ...r,
      tiene_clave_sol: Boolean(r.tiene_clave_sol),
      sunat_estado_conexion: r.sunat_estado_conexion || 'NO_CONFIGURADO',
      total_transacciones: Number(r.total_transacciones || 0),
      pendientes_sustento: Number(r.pendientes_sustento || 0),
      validados: Number(r.validados || 0),
      monto_bancarizacion: parseFloat(r.monto_bancarizacion || 0)
    }));
  }

  /**
   * Obtener todos los clientes
   */
  static async findAll() {
    return db('clientes').select('*').orderBy('razon_social', 'asc');
  }

  /**
   * Buscar MYPE por su ID primario
   */
  static async findById(id) {
    return db('clientes').where({ id: Number(id) }).first();
  }

  /**
   * Buscar MYPE por su número de RUC (11 dígitos)
   */
  static async findByRuc(ruc) {
    return db('clientes').where({ ruc: String(ruc).trim() }).first();
  }

  /**
   * Buscar MYPE por su correo electrónico de contacto
   */
  static async findByEmail(email) {
    if (!email) return null;
    return db('clientes')
      .whereRaw('LOWER(email) = ?', [String(email).toLowerCase().trim()])
      .first();
  }

  /**
   * Actualizar estado activo / inactivo (desactivar o reactivar)
   */
  static async updateActivo(id, activo) {
    await db('clientes')
      .where({ id: Number(id) })
      .update({ activo: activo ? 1 : 0 });

    return this.findById(id);
  }

  /**
   * Actualizar credenciales SUNAT (Usuario SOL y Clave SOL)
   */
  static async updateSunatCredentials(id, { usuario_sol, clave_sol, sunat_client_id, sunat_client_secret }) {
    const updateData = {};
    if (usuario_sol !== undefined) updateData.usuario_sol = usuario_sol ? usuario_sol.trim().toUpperCase() : null;
    if (clave_sol !== undefined) updateData.clave_sol = clave_sol ? clave_sol.trim() : null;
    if (sunat_client_id !== undefined) updateData.sunat_client_id = sunat_client_id ? sunat_client_id.trim() : null;
    if (sunat_client_secret !== undefined) updateData.sunat_client_secret = sunat_client_secret ? sunat_client_secret.trim() : null;
    
    // Si se actualizan credenciales, restablecer estado
    updateData.sunat_estado_conexion = (updateData.usuario_sol && updateData.clave_sol) ? 'PENDIENTE_VALIDACION' : 'NO_CONFIGURADO';
    updateData.sunat_ultimo_error = null;

    await db('clientes').where({ id: Number(id) }).update(updateData);
    return this.findById(id);
  }

  /**
   * Actualizar estado y token de conexión SUNAT
   */
  static async updateSunatToken(id, { sunat_token, sunat_token_expires_at, sunat_estado_conexion, sunat_ultimo_acceso, sunat_ultimo_error }) {
    const updateData = {};
    if (sunat_token !== undefined) updateData.sunat_token = sunat_token;
    if (sunat_token_expires_at !== undefined) updateData.sunat_token_expires_at = sunat_token_expires_at;
    if (sunat_estado_conexion !== undefined) updateData.sunat_estado_conexion = sunat_estado_conexion;
    if (sunat_ultimo_acceso !== undefined) updateData.sunat_ultimo_acceso = sunat_ultimo_acceso;
    if (sunat_ultimo_error !== undefined) updateData.sunat_ultimo_error = sunat_ultimo_error;

    await db('clientes').where({ id: Number(id) }).update(updateData);
    return this.findById(id);
  }

  /**
   * Registrar una nueva empresa MYPE
   */
  static async create({ ruc, razon_social, nombre_comercial, regimen_tributario, contacto_nombre, email, celular, direccion, usuario_sol, clave_sol, sunat_client_id, sunat_client_secret }) {
    const res = await db('clientes').insert({
      ruc: String(ruc).trim(),
      razon_social: razon_social.trim(),
      nombre_comercial: nombre_comercial ? nombre_comercial.trim() : null,
      regimen_tributario: regimen_tributario || 'MYPE Tributario',
      contacto_nombre: contacto_nombre ? contacto_nombre.trim() : null,
      email: email.toLowerCase().trim(),
      celular: celular.trim(),
      direccion: direccion ? direccion.trim() : null,
      usuario_sol: usuario_sol ? usuario_sol.trim().toUpperCase() : null,
      clave_sol: clave_sol ? clave_sol.trim() : null,
      sunat_client_id: sunat_client_id ? sunat_client_id.trim() : null,
      sunat_client_secret: sunat_client_secret ? sunat_client_secret.trim() : null,
      sunat_estado_conexion: (usuario_sol && clave_sol) ? 'PENDIENTE_VALIDACION' : 'NO_CONFIGURADO',
      activo: 1
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }

  /**
   * Actualizar información completa de un cliente (datos comerciales, fiscales y SOL)
   */
  static async update(id, {
    ruc,
    razon_social,
    nombre_comercial,
    regimen_tributario,
    contacto_nombre,
    email,
    celular,
    direccion,
    usuario_sol,
    clave_sol,
    sunat_client_id,
    sunat_client_secret
  }) {
    const updateData = {};
    if (ruc !== undefined) updateData.ruc = String(ruc).trim();
    if (razon_social !== undefined) updateData.razon_social = razon_social.trim();
    if (nombre_comercial !== undefined) updateData.nombre_comercial = nombre_comercial ? nombre_comercial.trim() : null;
    if (regimen_tributario !== undefined) updateData.regimen_tributario = regimen_tributario || 'MYPE Tributario';
    if (contacto_nombre !== undefined) updateData.contacto_nombre = contacto_nombre ? contacto_nombre.trim() : null;
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (celular !== undefined) updateData.celular = celular.trim();
    if (direccion !== undefined) updateData.direccion = direccion ? direccion.trim() : null;

    if (usuario_sol !== undefined) {
      updateData.usuario_sol = usuario_sol ? usuario_sol.trim().toUpperCase() : null;
    }
    if (clave_sol !== undefined && clave_sol !== null && clave_sol.trim().length > 0) {
      updateData.clave_sol = clave_sol.trim();
    }
    if (sunat_client_id !== undefined) {
      updateData.sunat_client_id = sunat_client_id ? sunat_client_id.trim() : null;
    }
    if (sunat_client_secret !== undefined) {
      updateData.sunat_client_secret = sunat_client_secret ? sunat_client_secret.trim() : null;
    }

    if (Object.keys(updateData).length > 0) {
      await db('clientes').where({ id: Number(id) }).update(updateData);
    }

    return this.findById(id);
  }
}

