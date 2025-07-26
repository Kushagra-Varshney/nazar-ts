import { Request, Response } from 'express';
import { database } from '../database/database';

export class AnalyticsController {
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { hostId, timeRange = 'day' } = req.query;
      const analytics = await database.getAnalytics(hostId as string, timeRange as string);
      res.json({ analytics });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFileTypeDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { hostId } = req.query;
      const distribution = await database.getFileTypeDistribution(hostId as string);
      res.json({ fileTypes: distribution });
    } catch (error) {
      console.error('Error fetching file type distribution:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getActivityTrends(req: Request, res: Response): Promise<void> {
    try {
      const { hostId, days = 7 } = req.query;
      const trends = await database.getActivityTrends(
        hostId as string, 
        parseInt(days as string)
      );
      res.json({ trends });
    } catch (error) {
      console.error('Error fetching activity trends:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}