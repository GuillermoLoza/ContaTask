import { ResponseView } from './response.view.js';

/**
 * Vista de Autenticación (Patrón MVC)
 * Serializa y sanitiza objetos de usuario eliminando hashes de contraseñas.
 */
export class AuthView {
  /**
   * Renderizar respuesta de inicio de sesión exitoso con token JWT
   */
  static renderLogin(res, token, user) {
    return ResponseView.success(res, {
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        ruc: user.ruc || null,
        empresaNombre: user.empresa_nombre || null,
        telefono: user.telefono || null,
        colegiatura: user.colegiatura || null,
        cargoTitulo: user.cargo_titulo || null,
        direccionEstudio: user.direccion_estudio || null,
        pieFirma: user.pie_firma || null,
        mfa_enabled: Boolean(user.mfa_enabled)
      }
    });
  }

  /**
   * Renderizar perfil del usuario autenticado
   */
  static renderProfile(res, user) {
    return ResponseView.success(res, {
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        ruc: user.ruc || null,
        empresaNombre: user.empresa_nombre || null,
        telefono: user.telefono || null,
        colegiatura: user.colegiatura || null,
        cargoTitulo: user.cargo_titulo || null,
        direccionEstudio: user.direccion_estudio || null,
        pieFirma: user.pie_firma || null,
        mfa_enabled: Boolean(user.mfa_enabled)
      }
    });
  }

  /**
   * Renderizar listado de usuarios demo
   */
  static renderDemoUsers(res, users) {
    return ResponseView.success(res, {
      users: users.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        ruc: u.ruc,
        empresa_nombre: u.empresa_nombre
      }))
    });
  }
}
