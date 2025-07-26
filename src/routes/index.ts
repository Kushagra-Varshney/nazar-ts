import { Application } from 'express';
import healthRoutes from './health';
import eventsRoutes from './events';
import hostsRoutes from './hosts';
import statsRoutes from './stats';
import analyticsRoutes from './analytics';
import dashboardRoutes from './dashboard';

export const setupRoutes = (app: Application): void => {
  // Health check route (no /api prefix)
  app.use('/', healthRoutes);
  
  // API routes with /api prefix
  app.use('/api', eventsRoutes);
  app.use('/api', hostsRoutes);
  app.use('/api', statsRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', dashboardRoutes);
};