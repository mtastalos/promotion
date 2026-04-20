import express, { Express } from 'express';
import { mountRoutes } from './routes';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  mountRoutes(app);

  app.use(errorMiddleware);

  return app;
}
