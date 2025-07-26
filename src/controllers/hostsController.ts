import { Request, Response } from 'express';
import { database } from '../database/database';

export class HostsController {
  static async getAllHosts(req: Request, res: Response): Promise<void> {
    try {
      const hosts = await database.getHosts();
      res.json({ hosts });
    } catch (error) {
      console.error('Error fetching hosts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}