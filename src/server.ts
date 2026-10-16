import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes.js';
import { errorHandler } from './shared/middlewares/errorHandler.middleware.js';
import { pool } from './shared/config/db.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Documentación interactiva Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Redireccionar raíz a la documentación
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Ruta de estado / health check
app.get('/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      dbTime: dbRes.rows[0].now,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'DEGRADED',
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// Rutas de la API
app.use('/api', apiRoutes);

// Manejador global de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`📖 Documentación Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión con PostgreSQL exitosa');
  } catch (err: any) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL automáticamente:', err.message);
    console.warn('ℹ️ Asegúrate de que el servicio PostgreSQL esté activo y revisa las credenciales en .env');
  }
});
