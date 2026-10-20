import { PlameService } from '../services/plame.service.js';

export class PlameController {
  static async getPeriodo(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      const data = await PlameService.getPeriodoPlame(clienteId, periodo || '2026-08');
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async guardarTrabajador(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      await PlameService.guardarTrabajador(clienteId, periodo || '2026-08', req.body);
      const data = await PlameService.getPeriodoPlame(clienteId, periodo || '2026-08');
      res.json({ success: true, message: 'Trabajador registrado en la nómina.', ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async eliminarTrabajador(req, res) {
    try {
      const { trabajadorId } = req.params;
      await PlameService.eliminarTrabajador(trabajadorId);
      res.json({ success: true, message: 'Trabajador eliminado de la nómina.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async validarPlanilla(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      const validacion = await PlameService.validarPlanilla(clienteId, periodo || '2026-08');
      res.json({ success: true, ...validacion });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async generarArchivos(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.query;
      const archivos = await PlameService.generarArchivosPlame(clienteId, periodo || '2026-08');
      res.json({ success: true, message: 'Estructuras de importación PDT PLAME generadas.', ...archivos });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async declararPlame(req, res) {
    try {
      const { clienteId } = req.params;
      const { periodo } = req.body;
      const resultado = await PlameService.declararPlame(clienteId, periodo || '2026-08');
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
