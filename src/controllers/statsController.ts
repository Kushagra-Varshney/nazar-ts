import { Request, Response } from 'express';
import { database } from '../database/database';

export class StatsController {
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { hostId } = req.query;
      const stats = await database.getStats(hostId as string);
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}