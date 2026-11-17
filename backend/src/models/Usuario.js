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
      .select('id', 'nombre', 'email', 'rol', 'ruc', 'empresa_nombre', 'telefono', 'activo', 'mfa_enabled', 'mfa_verified_at')
      .where({ id: Number(id) })
      .first();
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
