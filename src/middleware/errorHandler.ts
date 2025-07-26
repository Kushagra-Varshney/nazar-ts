import express from 'express';

export const errorHandler = (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

export const notFoundHandler = (_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
};