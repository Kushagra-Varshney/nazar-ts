import { Request, Response } from 'express';
import { database } from '../database/database';

export class DashboardController {
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { hostId } = req.query;
      
      const [stats, analytics, fileTypes, trends] = await Promise.all([
        database.getStats(hostId as string),
        database.getAnalytics(hostId as string, 'day'),
        database.getFileTypeDistribution(hostId as string),
        database.getActivityTrends(hostId as string, 7)
      ]);
      
      res.json({
        dashboard: {
          stats,
          analytics,
          fileTypes: fileTypes.slice(0, 5),
          weeklyTrends: trends
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}