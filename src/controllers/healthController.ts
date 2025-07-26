import { Request, Response } from 'express';
import { config } from '../config/app';

export class HealthController {
  static async getHealth(req: Request, res: Response): Promise<void> {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      watchDirectories: config.watchDirectories
    });
  }
}