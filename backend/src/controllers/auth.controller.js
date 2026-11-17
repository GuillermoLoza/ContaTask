import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { Cliente } from '../models/Cliente.js';
import { AuthView } from '../views/auth.view.js';
import { ResponseView } from '../views/response.view.js';
import { config } from '../config/env.js';
import { MfaService } from '../services/mfa.service.js';

function parseRecoveryCodes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Controlador de Autenticación (Patrón MVC)
 * Orquesta el inicio de sesión, validación de credenciales, MFA y perfiles.
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

  // 3. Si el usuario tiene autenticación multifactor (MFA/2FA) activa:
  if (user.mfa_enabled) {
    const mfaToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'MFA_PENDING'
      },
      config.jwtSecret,
      { expiresIn: '5m' }
    );

    return ResponseView.success(res, {
      mfaRequired: true,
      mfaToken,
      email: user.email,
      nombre: user.nombre
    });
  }

  // 4. Generar token JWT con vigencia de sesión extendida (24h por defecto)
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

  // 5. Delegar presentación a la Vista
  return AuthView.renderLogin(res, token, user);
}

/**
 * Segundo paso de login con autenticación multifactor (código TOTP de 6 dígitos o código de respaldo)
 */
export async function loginMfa(req, res) {
  const { mfaToken, code } = req.body;

  if (!mfaToken || !code) {
    return ResponseView.error(res, 'Token MFA y código de autenticación requeridos', 400);
  }

  let payload;
  try {
    payload = jwt.verify(mfaToken, config.jwtSecret);
  } catch (error) {
    return ResponseView.error(res, 'La sesión de autenticación MFA ha expirado. Por favor ingrese de nuevo.', 401);
  }

  if (payload.type !== 'MFA_PENDING') {
    return ResponseView.error(res, 'Token MFA inválido', 403);
  }

  const userMfa = await Usuario.getMfaDetails(payload.id);
  if (!userMfa || !userMfa.mfa_enabled) {
    return ResponseView.error(res, 'Usuario o estado MFA no encontrado', 404);
  }

  const cleanCode = String(code).trim();
  let verified = false;
  let usedRecoveryCode = false;

  // 1. Intentar validar como código TOTP de 6 dígitos
  if (/^\d{6}$/.test(cleanCode)) {
    verified = MfaService.verifyTOTP(cleanCode, userMfa.mfa_secret);
  }

  // 2. Si no es TOTP o falló, intentar verificar como código de recuperación (formato XXXX-XXXX)
  if (!verified) {
    const recoveryCodes = parseRecoveryCodes(userMfa.mfa_recovery_codes);
    const result = MfaService.verifyAndConsumeRecoveryCode(cleanCode, recoveryCodes);
    if (result.valid) {
      verified = true;
      usedRecoveryCode = true;
      await Usuario.updateRecoveryCodes(userMfa.id, result.remainingCodes);
    }
  }

  if (!verified) {
    return ResponseView.error(res, 'Código de verificación incorrecto o expirado.', 401);
  }

  // Obtener usuario completo
  const user = await Usuario.findById(payload.id);
  if (!user || !user.activo) {
    return ResponseView.error(res, 'Usuario inactivo o suspendido', 403);
  }

  if (user.rol === 'CLIENTE' && user.ruc) {
    const cliente = await Cliente.findByRuc(user.ruc);
    if (cliente && (cliente.activo === 0 || cliente.activo === false)) {
      return ResponseView.error(
        res,
        'Acceso al portal deshabilitado: Su empresa se encuentra temporalmente inactiva.',
        403
      );
    }
  }

  // Generar token JWT final
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

  return AuthView.renderLogin(res, token, {
    ...user,
    usedRecoveryCode
  });
}

/**
 * Consulta el estado actual de MFA del usuario autenticado
 */
export async function getMfaStatus(req, res) {
  const userMfa = await Usuario.getMfaDetails(req.user.id);
  if (!userMfa) {
    return ResponseView.error(res, 'Usuario no encontrado', 404);
  }

  const recoveryCodes = parseRecoveryCodes(userMfa.mfa_recovery_codes);

  return ResponseView.success(res, {
    mfaEnabled: Boolean(userMfa.mfa_enabled),
    mfaVerifiedAt: userMfa.mfa_verified_at,
    remainingRecoveryCodes: recoveryCodes.length
  });
}

/**
 * Inicia la configuración de MFA generando un nuevo secreto y código QR
 */
export async function setupMfa(req, res) {
  try {
    const setupData = await MfaService.setupMfa({
      email: req.user.email,
      issuer: 'ContaTask'
    });

    return ResponseView.success(res, setupData);
  } catch (error) {
    return ResponseView.error(res, 'Error al generar configuración MFA: ' + error.message, 500);
  }
}

/**
 * Valida el código TOTP inicial y activa la protección multifactor en la cuenta
 */
export async function verifyAndEnableMfa(req, res) {
  const { secret, code } = req.body;

  if (!secret || !code) {
    return ResponseView.error(res, 'Secreto y código de verificación requeridos', 400);
  }

  const isValid = MfaService.verifyTOTP(code, secret);
  if (!isValid) {
    return ResponseView.error(res, 'Código incorrecto. Compruebe la hora de su dispositivo e intente de nuevo.', 400);
  }

  const recoveryCodes = MfaService.generateRecoveryCodes(8);
  await Usuario.enableMfa(req.user.id, { secret, recoveryCodes });

  return ResponseView.success(res, {
    message: 'Autenticación multifactor activada exitosamente',
    mfaEnabled: true,
    recoveryCodes
  });
}

/**
 * Desactiva la autenticación multifactor requiriendo la contraseña del usuario
 */
export async function disableMfa(req, res) {
  const { password } = req.body;

  if (!password) {
    return ResponseView.error(res, 'Debe ingresar su contraseña actual para confirmar la desactivación', 400);
  }

  const userMfa = await Usuario.getMfaDetails(req.user.id);
  if (!userMfa) {
    return ResponseView.error(res, 'Usuario no encontrado', 404);
  }

  const passwordValid = bcrypt.compareSync(password, userMfa.password_hash);
  if (!passwordValid) {
    return ResponseView.error(res, 'Contraseña incorrecta', 400);
  }

  await Usuario.disableMfa(req.user.id);

  return ResponseView.success(res, {
    message: 'Autenticación multifactor desactivada correctamente',
    mfaEnabled: false
  });
}

/**
 * Regenera nuevos códigos de recuperación de respaldo
 */
export async function regenerateRecoveryCodes(req, res) {
  const { password } = req.body;

  if (!password) {
    return ResponseView.error(res, 'Debe ingresar su contraseña actual para regenerar los códigos', 400);
  }

  const userMfa = await Usuario.getMfaDetails(req.user.id);
  if (!userMfa || !userMfa.mfa_enabled) {
    return ResponseView.error(res, 'La autenticación multifactor no está activada en su cuenta', 400);
  }

  const passwordValid = bcrypt.compareSync(password, userMfa.password_hash);
  if (!passwordValid) {
    return ResponseView.error(res, 'Contraseña incorrecta', 400);
  }

  const recoveryCodes = MfaService.generateRecoveryCodes(8);
  await Usuario.updateRecoveryCodes(req.user.id, recoveryCodes);

  return ResponseView.success(res, {
    message: 'Nuevos códigos de recuperación generados con éxito',
    recoveryCodes
  });
}

export function getCurrentUser(req, res) {
  return AuthView.renderProfile(res, req.user);
}

export async function getDemoUsers(_req, res) {
  const users = await Usuario.findActiveDemoUsers();
  return AuthView.renderDemoUsers(res, users);
}
