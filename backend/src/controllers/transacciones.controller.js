import { Transaccion } from '../models/Transaccion.js';
import { Cliente } from '../models/Cliente.js';
import { DocumentoSustento } from '../models/DocumentoSustento.js';
import { HistorialAuditoria } from '../models/HistorialAuditoria.js';
import { TransaccionView } from '../views/transaccion.view.js';
import { ResponseView } from '../views/response.view.js';

/**
 * Controlador de Transacciones y Evaluación de Sustentos (Patrón MVC con Knex)
 */
export async function getTransacciones(req, res, next) {
  try {
    const { clienteId, ruc, periodo, estado, requiereBancarizacion } = req.query;

    // Control de aislamiento: Si el usuario es CLIENTE, forzar filtro por su propio RUC (RF-C05 Criterio 4)
    if (req.user.rol === 'CLIENTE') {
      const clientRecord = await Cliente.findByRuc(req.user.ruc);
      if (!clientRecord || clientRecord.activo === 0 || clientRecord.activo === false) {
        return ResponseView.error(res, 'Acceso al portal deshabilitado: Su empresa se encuentra inactiva en el sistema.', 403);
      }
      // Si intentó consultar otro clienteId, denegar con 403
      if (clienteId && Number(clienteId) !== clientRecord.id) {
        return ResponseView.error(res, 'Acceso denegado a transacciones de terceros', 403);
      }
    }

    // Invocar Modelo
    const transacciones = await Transaccion.findAll({
      clienteId: req.user.rol === 'CLIENTE' ? undefined : clienteId,
      ruc: req.user.rol === 'CLIENTE' ? req.user.ruc : ruc,
      periodo,
      estado,
      requiereBancarizacion
    });

    // Delegar a la Vista
    return TransaccionView.renderList(res, transacciones);
  } catch (error) {
    next(error);
  }
}

export async function getTransaccionById(req, res, next) {
  try {
    const { id } = req.params;

    const transaccion = await Transaccion.findById(id);

    if (!transaccion) {
      return ResponseView.error(res, 'Transacción no encontrada', 404);
    }

    // Verificación de aislamiento de cliente
    if (req.user.rol === 'CLIENTE' && transaccion.cliente_ruc !== req.user.ruc) {
      return ResponseView.error(res, 'Acceso denegado: No puede consultar transacciones de otros clientes', 403);
    }

    // Documentos adjuntos e historial de auditoría vía Modelos
    const documentos = await DocumentoSustento.findByTransaccionId(transaccion.id);
    const historial = await HistorialAuditoria.findByTransaccionId(transaccion.id);

    return TransaccionView.renderDetail(res, transaccion, documentos, historial);
  } catch (error) {
    next(error);
  }
}

/**
 * Evaluación de documentos por el Contador (RF-C04)
 * Aprobación -> 'VALIDADO'
 * Rechazo con motivo -> 'RECHAZADO'
 */
export async function evaluarTransaccion(req, res, next) {
  try {
    const { id } = req.params;
    const { accion, motivo } = req.body; // accion: 'APROBAR' | 'RECHAZAR'

    if (!accion || !['APROBAR', 'RECHAZAR'].includes(accion)) {
      return ResponseView.error(res, 'Acción inválida. Debe ser APROBAR o RECHAZAR', 400);
    }

    if (accion === 'RECHAZAR' && (!motivo || !motivo.trim())) {
      return ResponseView.error(res, 'Debe especificar el motivo de rechazo de la observación', 400);
    }

    const trx = await Transaccion.findById(id);
    if (!trx) {
      return ResponseView.error(res, 'Transacción no encontrada', 404);
    }

    const estadoAnterior = trx.estado_sustento;
    const nuevoEstado = accion === 'APROBAR' ? 'VALIDADO' : 'RECHAZADO';

    // 1. Actualizar estado de la transacción (Modelo Transaccion)
    await Transaccion.updateEstado(trx.id, nuevoEstado, motivo || null);

    // 2. Actualizar estado de revisión del sustento (Modelo DocumentoSustento)
    await DocumentoSustento.updateRevision(
      trx.id,
      accion === 'APROBAR' ? 'APROBADO' : 'RECHAZADO',
      motivo || null
    );

    // 3. Registrar auditoría (Modelo HistorialAuditoria)
    await HistorialAuditoria.create({
      transaccionId: trx.id,
      usuarioId: req.user.id,
      accion: `EVALUACION_${accion}`,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      motivo: motivo || 'Conforme con la normativa tributaria'
    });

    // 4. Delegar a la Vista
    return TransaccionView.renderEvaluationResult(res, trx.id, nuevoEstado, accion);
  } catch (error) {
    next(error);
  }
}
