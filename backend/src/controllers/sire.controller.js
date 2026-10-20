import { SireService } from '../services/sire.service.js';

export class SireController {
  static async getPropuesta(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo, tipo = 'RCE' } = req.query;
      const data = await SireService.getPropuesta(clienteId, periodo || '2026-08', tipo);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async extraerPropuesta(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo, tipo = 'RCE' } = req.body;
      const propuesta = await SireService.extraerPropuestaSire(clienteId, periodo || '2026-08', tipo);
      res.json({ success: true, message: 'Propuesta SIRE extraída de SUNAT con éxito.', propuesta });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async excluirComprobante(req, res) {
    try {
      const { comprobanteId } = req.params;
      const { motivo } = req.body;
      const comp = await SireService.excluirComprobante(comprobanteId, motivo);
      res.json({ success: true, message: 'Comprobante excluido de la propuesta.', comprobante: comp });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async incluirComprobante(req, res) {
    try {
      const { comprobanteId } = req.params;
      const comp = await SireService.incluirComprobante(comprobanteId);
      res.json({ success: true, message: 'Comprobante reincorporado a la propuesta.', comprobante: comp });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async agregarManual(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      const comp = await SireService.agregarComprobanteManual(clienteId, periodo || '2026-08', req.body);
      res.json({ success: true, message: 'Comprobante manual agregado a la propuesta.', comprobante: comp });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async consolidarPropuesta(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo, tipo = 'RCE' } = req.body;
      const propuesta = await SireService.consolidarPropuestaFinal(clienteId, periodo || '2026-08', tipo);
      res.json({ success: true, message: 'Propuesta final consolidada y lista para SUNAT.', propuesta });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async calcularLiquidacion(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      const liquidacion = await SireService.calcularLiquidacionMensual(clienteId, periodo || '2026-08');
      res.json({ success: true, liquidacion });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async declararNps(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.body;
      const declaracion = await SireService.declararYGenerarNps(clienteId, periodo || '2026-08');
      res.json({ success: true, message: 'Declaración jurada registrada y NPS generado.', declaracion });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async descargarPlano(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo, tipo = 'RCE' } = req.query;
      const plano = await SireService.generarArchivoPlanoSire(clienteId, periodo || '2026-08', tipo);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${plano.filename}"`);
      res.send(plano.content);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
