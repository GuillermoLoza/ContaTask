import { Router } from 'express';
import {
  login,
  loginMfa,
  getMfaStatus,
  setupMfa,
  verifyAndEnableMfa,
  disableMfa,
  regenerateRecoveryCodes,
  getCurrentUser,
  getDemoUsers
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas de autenticación pública
router.post('/login', login);
router.post('/login-mfa', loginMfa);
router.get('/demo-users', getDemoUsers);

// Rutas autenticadas
router.get('/me', authenticateToken, getCurrentUser);

// Rutas de gestión de Autenticación Multifactor (MFA / 2FA)
router.get('/mfa/status', authenticateToken, getMfaStatus);
router.post('/mfa/setup', authenticateToken, setupMfa);
router.post('/mfa/verify-and-enable', authenticateToken, verifyAndEnableMfa);
router.post('/mfa/disable', authenticateToken, disableMfa);
router.post('/mfa/regenerate-recovery-codes', authenticateToken, regenerateRecoveryCodes);

export default router;
