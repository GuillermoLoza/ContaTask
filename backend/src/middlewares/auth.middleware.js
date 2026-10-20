import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { Usuario } from '../models/Usuario.js';

/**
 * Middleware para verificar token JWT
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado'
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    
    // Verificar si el usuario sigue activo en base de datos
    const user = await Usuario.findById(payload.id);

    if (!user || !user.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo o no autorizado'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sesión expirada por inactividad. Por favor ingrese nuevamente.'
      });
    }
    return res.status(403).json({
      error: 'Token inválido o manipulado'
    });
  }
}

/**
 * Middleware para validar roles específicos (ej: 'CONTADOR', 'CLIENTE')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere rol ${roles.join(' o ')}`
      });
    }

    next();
  };
}
