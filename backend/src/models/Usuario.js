import { db } from '../config/database.js';

/**
 * Modelo Usuario (Patrón MVC con Knex.js)
 * Gestiona la persistencia y consultas de usuarios y roles del sistema.
 */
export class Usuario {
  /**
   * Buscar usuario por correo electrónico
   */
  static async findByEmail(email) {
    return db('usuarios')
      .whereRaw('LOWER(email) = ?', [email.toLowerCase().trim()])
      .first();
  }

  /**
   * Buscar usuario por su ID primario
   */
  static async findById(id) {
    return db('usuarios')
      .select(
        'id',
        'nombre',
        'email',
        'rol',
        'ruc',
        'empresa_nombre',
        'telefono',
        'colegiatura',
        'cargo_titulo',
        'direccion_estudio',
        'pie_firma',
        'activo',
        'mfa_enabled',
        'mfa_verified_at'
      )
      .where({ id: Number(id) })
      .first();
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateProfile(id, { nombre, email, telefono, ruc, empresaNombre, colegiatura, cargoTitulo, direccionEstudio, pieFirma }) {
    const updateObj = {};
    if (nombre !== undefined) updateObj.nombre = String(nombre).trim();
    if (email !== undefined) updateObj.email = String(email).toLowerCase().trim();
    if (telefono !== undefined) updateObj.telefono = telefono ? String(telefono).trim() : null;
    if (ruc !== undefined) updateObj.ruc = ruc ? String(ruc).trim() : null;
    if (empresaNombre !== undefined) updateObj.empresa_nombre = empresaNombre ? String(empresaNombre).trim() : null;
    if (colegiatura !== undefined) updateObj.colegiatura = colegiatura ? String(colegiatura).trim() : null;
    if (cargoTitulo !== undefined) updateObj.cargo_titulo = cargoTitulo ? String(cargoTitulo).trim() : null;
    if (direccionEstudio !== undefined) updateObj.direccion_estudio = direccionEstudio ? String(direccionEstudio).trim() : null;
    if (pieFirma !== undefined) updateObj.pie_firma = pieFirma ? String(pieFirma).trim() : null;

    if (Object.keys(updateObj).length > 0) {
      await db('usuarios').where({ id: Number(id) }).update(updateObj);
    }
    return this.findById(id);
  }

  /**
   * Actualizar contraseña de un usuario
   */
  static async updatePassword(id, passwordHash) {
    await db('usuarios').where({ id: Number(id) }).update({
      password_hash: passwordHash
    });
  }

  /**
   * Obtener detalles de MFA para validación o configuración
   */
  static async getMfaDetails(id) {
    return db('usuarios')
      .select('id', 'email', 'password_hash', 'mfa_enabled', 'mfa_secret', 'mfa_recovery_codes', 'mfa_verified_at')
      .where({ id: Number(id) })
      .first();
  }

  /**
   * Activa la autenticación multifactor y guarda el secreto y códigos de recuperación
   */
  static async enableMfa(id, { secret, recoveryCodes }) {
    await db('usuarios')
      .where({ id: Number(id) })
      .update({
        mfa_enabled: true,
        mfa_secret: secret,
        mfa_recovery_codes: JSON.stringify(recoveryCodes),
        mfa_verified_at: new Date()
      });
    return this.findById(id);
  }

  /**
   * Desactiva la autenticación multifactor
   */
  static async disableMfa(id) {
    await db('usuarios')
      .where({ id: Number(id) })
      .update({
        mfa_enabled: false,
        mfa_secret: null,
        mfa_recovery_codes: null,
        mfa_verified_at: null
      });
    return this.findById(id);
  }

  /**
   * Actualiza los códigos de recuperación tras consumir uno o al regenerar
   */
  static async updateRecoveryCodes(id, recoveryCodes) {
    await db('usuarios')
      .where({ id: Number(id) })
      .update({
        mfa_recovery_codes: JSON.stringify(recoveryCodes)
      });
  }

  /**
   * Obtener usuarios activos para demostración
   */
  static async findActiveDemoUsers() {
    return db('usuarios')
      .select('id', 'nombre', 'email', 'rol', 'ruc', 'empresa_nombre')
      .where({ activo: 1 });
  }

  /**
   * Registrar nuevo usuario
   */
  static async create({ nombre, email, passwordHash, rol, ruc, empresaNombre, telefono }) {
    const res = await db('usuarios').insert({
      nombre,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      rol,
      ruc: ruc || null,
      empresa_nombre: empresaNombre || null,
      telefono: telefono || null
    }).returning('id');

    const id = Array.isArray(res) ? res[0] : res;
    return typeof id === 'object' && id !== null ? id.id : id;
  }
}
