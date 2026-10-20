/**
 * Vista Base de Respuestas (Patrón MVC)
 * Estandariza la serialización y presentación de respuestas HTTP para la API.
 */
export class ResponseView {
  static send(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }

  static success(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
  }

  static error(res, message, statusCode = 400, details = null) {
    const payload = { error: message };
    if (details) payload.details = details;
    return res.status(statusCode).json(payload);
  }
}
