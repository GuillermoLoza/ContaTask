import { SunatService } from '../services/sunat.service.js';
import { CronogramaService } from '../services/cronograma.service.js';
import { BuzonSol } from '../models/BuzonSol.js';
import { Cliente } from '../models/Cliente.js';
import { ResponseView } from '../views/response.view.js';

export class SunatController {
  /**
   * Obtener estado de credenciales SOL del cliente
   */
  static async getCredenciales(req, res, next) {
    try {
      const { clienteId } = req.params;
      const cliente = await Cliente.findById(clienteId);

      if (!cliente) {
        return ResponseView.error(res, 'Cliente no encontrado', 404);
      }

      return ResponseView.success(res, {
        clienteId: cliente.id,
        ruc: cliente.ruc,
        razon_social: cliente.razon_social,
        usuario_sol: cliente.usuario_sol || '',
        tiene_clave_sol: Boolean(cliente.clave_sol && cliente.clave_sol.trim().length > 0),
        sunat_client_id: cliente.sunat_client_id || '',
        sunat_estado_conexion: cliente.sunat_estado_conexion || 'NO_CONFIGURADO',
        sunat_token_expires_at: cliente.sunat_token_expires_at,
        sunat_ultimo_acceso: cliente.sunat_ultimo_acceso,
        sunat_ultimo_error: cliente.sunat_ultimo_error,
        tiene_token: Boolean(cliente.sunat_token && new Date(cliente.sunat_token_expires_at) > new Date())
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registrar o actualizar Usuario SOL y Clave SOL para un cliente
   */
  static async guardarCredenciales(req, res, next) {
    try {
      const { clienteId } = req.params;
      const { usuario_sol, clave_sol, sunat_client_id, sunat_client_secret } = req.body;

      const cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        return ResponseView.error(res, 'Cliente no encontrado', 404);
      }

      if (!usuario_sol || !usuario_sol.trim()) {
        return ResponseView.error(res, 'El campo Usuario SOL es obligatorio.', 400);
      }

      if (clave_sol !== undefined && (!clave_sol || clave_sol.trim().length < 4)) {
        return ResponseView.error(res, 'La Clave SOL debe tener al menos 4 caracteres.', 400);
      }

      const updated = await Cliente.updateSunatCredentials(clienteId, {
        usuario_sol,
        clave_sol: clave_sol || undefined,
        sunat_client_id,
        sunat_client_secret
      });

      return ResponseView.success(res, {
        message: 'Credenciales SOL registradas correctamente.',
        cliente: {
          id: updated.id,
          ruc: updated.ruc,
          razon_social: updated.razon_social,
          usuario_sol: updated.usuario_sol,
          tiene_clave_sol: Boolean(updated.clave_sol),
          sunat_estado_conexion: updated.sunat_estado_conexion
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validar conexión con SUNAT y generar token de sesión para el cliente
   */
  static async validarConexion(req, res, next) {
    try {
      const { clienteId } = req.params;
      const { ruc, usuario_sol, clave_sol, sunat_client_id, sunat_client_secret } = req.body;

      const cliente = await Cliente.findById(clienteId);
      if (!cliente) {
        return ResponseView.error(res, 'Cliente no encontrado', 404);
      }

      const rucFinal = ruc || cliente.ruc;
      const usuarioFinal = usuario_sol || cliente.usuario_sol;
      const claveFinal = clave_sol || cliente.clave_sol;

      if (!usuarioFinal || !claveFinal) {
        return ResponseView.error(res, 'Se requiere Usuario SOL y Clave SOL para validar la conexión.', 400);
      }

      const resultado = await SunatService.validarYGenerarToken({
        clienteId: cliente.id,
        ruc: rucFinal,
        usuario_sol: usuarioFinal,
        clave_sol: claveFinal,
        sunat_client_id: sunat_client_id || cliente.sunat_client_id,
        sunat_client_secret: sunat_client_secret || cliente.sunat_client_secret
      });

      return ResponseView.success(res, resultado);
    } catch (error) {
      // Registrar error en cliente si existe
      if (req.params.clienteId) {
        await Cliente.updateSunatToken(req.params.clienteId, {
          sunat_estado_conexion: 'ERROR',
          sunat_ultimo_error: error.message
        }).catch(() => { });
      }
      return ResponseView.error(res, error.message, 400);
    }
  }

  /**
   * Generar token directo proporcionando credenciales sin cliente previo
   */
  static async generarTokenDirecto(req, res, next) {
    try {
      const { ruc, usuario_sol, clave_sol, sunat_client_id, sunat_client_secret } = req.body;

      const resultado = await SunatService.validarYGenerarToken({
        ruc,
        usuario_sol,
        clave_sol,
        sunat_client_id,
        sunat_client_secret
      });

      return ResponseView.success(res, resultado);
    } catch (error) {
      return ResponseView.error(res, error.message, 400);
    }
  }

  /**
   * Obtener payload de autologin para SUNAT SOL
   */
  static async getAutologin(req, res, next) {
    try {
      const { clienteId } = req.params;
      const payload = await SunatService.generarAutologinPayload(clienteId);
      return ResponseView.success(res, payload);
    } catch (error) {
      return ResponseView.error(res, error.message, 400);
    }
  }

  /**
   * Renderizar página de autologin directo (para abrir en nueva pestaña)
   */
  static async renderAutologinHtml(req, res, next) {
    try {
      const { clienteId } = req.params;
      const payload = await SunatService.generarAutologinPayload(clienteId);
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(payload.autoSubmitHtml);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`
        <div style="font-family: sans-serif; padding: 2rem; color: #b91c1c; background: #fef2f2; border-radius: 8px;">
          <h2>Error al generar sesión de Autologin SOL</h2>
          <p>${error.message}</p>
        </div>
      `);
    }
  }

  /**
   * Listar notificaciones y mensajes del Buzón SOL
   */
  static async getBuzonMensajes(req, res, next) {
    try {
      const { clienteId, ruc, estado, categoria, limit, offset } = req.query;

      const mensajes = await BuzonSol.findAll({
        clienteId,
        ruc,
        estado,
        categoria,
        limit,
        offset
      });

      const stats = await BuzonSol.getStats({ clienteId });

      return ResponseView.success(res, {
        mensajes,
        stats,
        total: stats.total
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sincronizar Buzón SOL con SUNAT para un cliente
   */
  static async sincronizarBuzon(req, res, next) {
    try {
      const { clienteId } = req.params;
      const resultado = await SunatService.sincronizarBuzon(clienteId);
      return ResponseView.success(res, resultado);
    } catch (error) {
      return ResponseView.error(res, error.message, 400);
    }
  }

  /**
   * Sincronizar Buzón SOL masivo para todos los clientes MYPE
   */
  static async sincronizarBuzonTodos(req, res, next) {
    try {
      const resultado = await SunatService.sincronizarBuzonTodos();
      return ResponseView.success(res, resultado);
    } catch (error) {
      return ResponseView.error(res, error.message, 400);
    }
  }

  /**
   * Marcar mensaje del Buzón como leído
   */
  static async marcarLeido(req, res, next) {
    try {
      const { mensajeId } = req.params;
      const actualizado = await BuzonSol.marcarLeido(mensajeId);

      if (!actualizado) {
        return ResponseView.error(res, 'Mensaje no encontrado', 404);
      }

      return ResponseView.success(res, {
        message: 'Notificación marcada como leída',
        mensaje: actualizado
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener tabla de cronograma oficial de SUNAT para un período tributario (Directo de SUNAT Oficial)
   */
  static async getCronogramaOficial(req, res, next) {
    try {
      const { periodo } = req.query;
      const crono = await CronogramaService.obtenerCronogramaOficial(periodo || '2026-08');
      return ResponseView.success(res, crono);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forzar sincronización del cronograma con el portal oficial de SUNAT
   */
  static async sincronizarCronogramaPortal(req, res, next) {
    try {
      const { periodo } = req.body;
      const resultado = await CronogramaService.sincronizarDesdePortalSunat(periodo);
      return ResponseView.success(res, resultado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener cronograma automatizado de vencimientos para todas las empresas de la cartera
   */
  static async getCronogramaClientes(req, res, next) {
    try {
      const { periodo } = req.query;
      const resultado = await CronogramaService.obtenerCronogramaClientes(periodo || '2026-08');
      return ResponseView.success(res, resultado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener vencimiento exacto para un RUC específico
   */
  static async getVencimientoRuc(req, res, next) {
    try {
      const { ruc } = req.params;
      const { periodo, buenContribuyente } = req.query;
      const vencimiento = await CronogramaService.obtenerVencimientoParaRuc(
        ruc,
        periodo || '2026-08',
        buenContribuyente === 'true' || buenContribuyente === '1'
      );
      if (!vencimiento) {
        return ResponseView.error(res, 'No se encontró publicación oficial de vencimiento en SUNAT para el RUC proporcionado.', 404);
      }
      return ResponseView.success(res, {
        ruc,
        periodo: periodo || '2026-08',
        vencimiento,
        vencimientoFormateado: CronogramaService.formatFechaLegible(vencimiento)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalle completo y enriquecido de un mensaje/notificación del Buzón SOL
   */
  static async getDetalleBuzon(req, res, next) {
    try {
      const { mensajeId } = req.params;
      const resultado = await SunatService.obtenerDetalleNotificacion(mensajeId);
      return ResponseView.success(res, resultado);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Descargar archivo adjunto oficial de SUNAT (PDF / Constancia)
   */
  static async descargarAdjunto(req, res, next) {
    try {
      const { mensajeId, codArchivo } = req.params;
      const msg = await BuzonSol.findById(mensajeId);
      if (!msg) {
        return ResponseView.error(res, 'Mensaje no encontrado', 404);
      }

      const pdfBuffer = await SunatService.descargarAdjuntoSunat({
        clienteId: msg.cliente_id,
        mensajeId: msg.id,
        codArchivo
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Constancia_SUNAT_${codArchivo}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

