import multer from 'multer';

/**
 * Manejador global de errores para la API Express
 */
export function errorHandler(err, _req, res, _next) {
  // Manejo de errores de Multer (RF-C02)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'El archivo excede el tamaño máximo permitido de 10 MB.'
      });
    }
    return res.status(400).json({
      error: `Error en la carga del archivo: ${err.message}`
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: err.message
    });
  }

  console.error('Error no controlado:', err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

/**
 * Middleware para rutas no encontradas (404)
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}
