import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { Cliente } from '../models/Cliente.js';
import { AuthView } from '../views/auth.view.js';
import { ResponseView } from '../views/response.view.js';
import { config } from '../config/env.js';

/**
 * Controlador de Autenticación (Patrón MVC)
 * Orquesta el inicio de sesión, validación de credenciales y consulta de perfiles.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return ResponseView.error(res, 'Debe ingresar correo electrónico y contraseña', 400);
  }

  // 1. Invocar Modelo
  const user = await Usuario.findByEmail(email);

  if (!user || !user.activo) {
    return ResponseView.error(res, 'Credenciales inválidas o usuario inactivo', 401);
  }

  // 2. Verificar contraseña cifrada
  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return ResponseView.error(res, 'Credenciales inválidas o usuario inactivo', 401);
  }

  // Si el usuario pertenece a una empresa MYPE, verificar que la empresa esté activa
  if (user.rol === 'CLIENTE' && user.ruc) {
    const cliente = await Cliente.findByRuc(user.ruc);
    if (cliente && (cliente.activo === 0 || cliente.activo === false)) {
      return ResponseView.error(
        res,
        'Acceso al portal deshabilitado: Su empresa se encuentra temporalmente inactiva. Comuníquese con su estudio contable.',
        403
      );
    }
  }

  // 3. Generar token JWT con vigencia de sesión extendida (24h por defecto)
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      rol: user.rol,
      ruc: user.ruc
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || '24h' }
  );

  // 4. Delegar presentación a la Vista
  return AuthView.renderLogin(res, token, user);
}

export function getCurrentUser(req, res) {
  return AuthView.renderProfile(res, req.user);
}

export async function getDemoUsers(_req, res) {
  const users = await Usuario.findActiveDemoUsers();
  return AuthView.renderDemoUsers(res, users);
}
