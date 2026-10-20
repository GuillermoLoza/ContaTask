import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { initDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import transaccionesRoutes from './routes/transacciones.routes.js';
import documentosRoutes from './routes/documentos.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import emailRoutes from './routes/email.routes.js';
import sunatRoutes from './routes/sunat.routes.js';
import sireRoutes from './routes/sire.routes.js';
import plameRoutes from './routes/plame.routes.js';

// Inicializar esquema de base de datos relacional con Knex
await initDatabase();

const app = express();

// Middlewares de seguridad y utilidad
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de verificación de salud (Health Check)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    app: 'ContaTask Backend API',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/transacciones', transaccionesRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sunat', sunatRoutes);
app.use('/api/sire', sireRoutes);
app.use('/api/plame', plameRoutes);

// Manejo de errores y 404
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
