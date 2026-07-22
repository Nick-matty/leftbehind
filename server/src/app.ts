import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { env } from './env';
import { logger } from './logger';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/error';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { filesRouter } from './routes/files';

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Fly/Heroku/etc.) so rate-limit sees real client IPs.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Native mobile apps send no Origin header -> allow.
        if (!origin) return callback(null, true);
        // Production must set an explicit allow-list (fail closed).
        if (env.corsOrigins.length === 0) {
          if (env.isProd) return callback(new Error('Not allowed by CORS'));
          return callback(null, true); // permissive only in development
        }
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: env.MAX_BODY_SIZE }));
  app.use(hpp());
  app.use(pinoHttp({ logger }));
  app.use(globalLimiter);

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/files', filesRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
