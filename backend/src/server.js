import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Servidor ContaTask Backend activo en http://localhost:${PORT}`);
  console.log(`📡 Modo de ejecución: ${config.nodeEnv}`);
  console.log(`💾 Base de datos: PostgreSQL (${config.db.database} en ${config.db.host}:${config.db.port})`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});
