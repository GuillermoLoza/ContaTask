import { ResponseView } from './response.view.js';

/**
 * Vista de Clientes (Patrón MVC)
 * Formatea y presenta la información de las MYPEs y métricas de cumplimiento.
 */
export class ClienteView {
  /**
   * Renderizar listado de clientes con estadísticas
   */
  static renderList(res, clientes) {
    return ResponseView.success(res, {
      clientes: clientes.map((c) => ({
        id: c.id,
        ruc: c.ruc,
        razon_social: c.razon_social,
        nombre_comercial: c.nombre_comercial || null,
        regimen_tributario: c.regimen_tributario,
        contacto_nombre: c.contacto_nombre || null,
        email: c.email,
        celular: c.celular,
        direccion: c.direccion || null,
        activo: Boolean(c.activo === 1 || c.activo === true || c.activo === '1'),
        usuario_sol: c.usuario_sol || null,
        tiene_clave_sol: Boolean(c.tiene_clave_sol),
        sunat_client_id: c.sunat_client_id || null,
        sunat_estado_conexion: c.sunat_estado_conexion || 'NO_CONFIGURADO',
        sunat_token_expires_at: c.sunat_token_expires_at || null,
        sunat_ultimo_acceso: c.sunat_ultimo_acceso || null,
        sunat_ultimo_error: c.sunat_ultimo_error || null,
        total_transacciones: Number(c.total_transacciones || 0),
        pendientes_sustento: Number(c.pendientes_sustento || 0),
        validados: Number(c.validados || 0),
        monto_bancarizacion: Number(c.monto_bancarizacion || 0)
      }))
    });
  }

  /**
   * Renderizar detalle de un cliente específico
   */
  static renderDetail(res, cliente) {
    return ResponseView.success(res, {
      cliente: {
        ...cliente,
        activo: Boolean(cliente.activo === 1 || cliente.activo === true || cliente.activo === '1')
      }
    });
  }

  /**
   * Renderizar confirmación de registro de cliente
   */
  static renderCreated(res, clienteId) {
    return ResponseView.success(
      res,
      {
        message: 'Cliente registrado exitosamente',
        id: clienteId
      },
      201
    );
  }
}
