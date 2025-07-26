import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

export const setupSecurityMiddleware = (app: express.Application): void => {
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json());
};