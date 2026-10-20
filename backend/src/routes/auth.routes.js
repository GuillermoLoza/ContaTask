import { Router } from 'express';
import { login, getCurrentUser, getDemoUsers } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/demo-users', getDemoUsers);

export default router;
