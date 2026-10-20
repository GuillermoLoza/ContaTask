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
      .select('id', 'nombre', 'email', 'rol', 'ruc', 'empresa_nombre', 'telefono', 'activo')
      .where({ id: Number(id) })
      .first();
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
