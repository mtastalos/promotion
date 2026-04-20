import { Express } from 'express';
import authRoutes      from './auth.routes';
import profileRoutes   from './profile.routes';
import postRoutes      from './post.routes';
import mediaRoutes     from './media.routes';
import analyticsRoutes from './analytics.routes';
import queueRoutes     from './queue.routes';

export function mountRoutes(app: Express): void {
  app.use('/auth',      authRoutes);
  app.use('/profiles',  profileRoutes);
  app.use('/posts',     postRoutes);
  app.use('/media',     mediaRoutes);
  app.use('/analytics', analyticsRoutes);
  app.use('/queue',     queueRoutes);
}
