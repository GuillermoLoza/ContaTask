import { Router } from 'express';
import {
  uploadDocumentoSustento,
  uploadDocumentosMasivo,
  getDocumentoFile,
  getDocumentosByTransaccion
} from '../controllers/documentos.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadSustento } from '../middlewares/upload.middleware.js';

const router = Router();

// Subir documento individual de sustento
router.post('/upload/:transaccionId', authenticateToken, uploadSustento.single('sustento'), uploadDocumentoSustento);

// Subida masiva de documentos de sustento
router.post('/upload-masivo', authenticateToken, uploadSustento.array('archivos', 50), uploadDocumentosMasivo);

// Ver / descargar archivo
router.get('/:id/file', authenticateToken, getDocumentoFile);

// Obtener lista de sustentos de una transacción
router.get('/transaccion/:transaccionId', authenticateToken, getDocumentosByTransaccion);

export default router;
