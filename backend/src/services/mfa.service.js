import crypto from 'node:crypto';
import QRCode from 'qrcode';

const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Servicio de Autenticación Multifactor (MFA / 2FA) basado en TOTP (RFC 6238)
 * Compatible con Google Authenticator, Microsoft Authenticator, Authy y 1Password.
 */
export class MfaService {
  /**
   * Genera un secreto Base32 criptográficamente seguro
   * @param {number} length Longitud en bytes (20 bytes = 160 bits)
   */
  static generateBase32Secret(length = 20) {
    const bytes = crypto.randomBytes(length);
    let bits = '';
    for (let i = 0; i < bytes.length; i++) {
      bits += bytes[i].toString(2).padStart(8, '0');
    }
    let base32 = '';
    for (let i = 0; i + 5 <= bits.length; i += 5) {
      base32 += B32_CHARS[parseInt(bits.substr(i, 5), 2)];
    }
    return base32;
  }

  /**
   * Convierte un string Base32 a Buffer
   */
  static base32ToBuffer(b32) {
    const clean = String(b32).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = B32_CHARS.indexOf(clean[i]);
      if (val === -1) throw new Error(`Carácter Base32 no válido: ${clean[i]}`);
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return Buffer.from(bytes);
  }

  /**
   * Genera el código TOTP numérico de 6 dígitos para un instante dado (RFC 6238)
   */
  static generateTOTP(secret, timeStep = 30, time = Date.now(), digits = 6) {
    const key = this.base32ToBuffer(secret);
    const counter = Math.floor(time / 1000 / timeStep);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const codeInt = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % (10 ** digits);

    return String(codeInt).padStart(digits, '0');
  }

  /**
   * Valida un código TOTP ingresado por el usuario permitiendo ventana de tolerancia de ±30 seg
   */
  static verifyTOTP(token, secret, window = 1, timeStep = 30) {
    if (!token || !secret) return false;
    const cleanToken = String(token).trim().replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const now = Date.now();
    for (let i = -window; i <= window; i++) {
      const expected = this.generateTOTP(secret, timeStep, now + (i * timeStep * 1000));
      if (expected === cleanToken) {
        return true;
      }
    }
    return false;
  }

  /**
   * Prepara la configuración inicial de MFA para un usuario:
   * Genera secreto, URI otpauth:// y código QR en formato Data URL
   */
  static async setupMfa({ email, issuer = 'ContaTask' }) {
    const secret = this.generateBase32Secret(20);
    const label = encodeURIComponent(`${issuer}:${email}`);
    const encodedIssuer = encodeURIComponent(issuer);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

    // Generar código QR de alta resolución listo para escanear
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    // Formatear clave manual para fácil tipeo si la cámara no funciona (ej. ABCD EFGH 1234 5678)
    const manualKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

    return {
      secret,
      manualKey,
      otpauthUrl,
      qrCodeDataUrl,
      accountName: email,
      issuer
    };
  }

  /**
   * Genera 8 códigos de recuperación de respaldo de un solo uso
   * Formato: XXXX-XXXX (ej. 4B8K-9Z1M)
   */
  static generateRecoveryCodes(count = 8) {
    const codes = [];
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin caracteres ambiguos como 0, 1, O, I

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        if (j === 4) code += '-';
        const randIndex = crypto.randomInt(0, alphabet.length);
        code += alphabet[randIndex];
      }
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verifica y consume un código de recuperación
   */
  static verifyAndConsumeRecoveryCode(code, existingCodes) {
    if (!code || !Array.isArray(existingCodes) || existingCodes.length === 0) {
      return { valid: false, remainingCodes: existingCodes };
    }

    const cleanInput = String(code).toUpperCase().replace(/[\s-]/g, '');

    const index = existingCodes.findIndex(c => {
      const cleanStored = String(c).toUpperCase().replace(/[\s-]/g, '');
      return cleanStored === cleanInput;
    });

    if (index !== -1) {
      const remainingCodes = [...existingCodes];
      remainingCodes.splice(index, 1);
      return { valid: true, remainingCodes };
    }

    return { valid: false, remainingCodes: existingCodes };
  }
}
