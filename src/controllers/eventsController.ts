import { Request, Response } from 'express';
import { database } from '../database/database';

export class EventsController {
  static async getAllEvents(req: Request, res: Response): Promise<void> {
    try {
      const { hostId, limit = 100, offset = 0 } = req.query;
      
      const events = await database.getFileEvents(
        hostId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({
        events,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: events.length
        }
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getEventsByHost(req: Request, res: Response): Promise<void> {
    try {
      const { hostId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const events = await database.getFileEvents(
        hostId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json({
        hostId,
        events,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: events.length
        }
      });
    } catch (error) {
      console.error('Error fetching host events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}