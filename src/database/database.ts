import sqlite3 from 'sqlite3';
import { FileEvent, HostInfo } from '../types';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './file_tracker.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    const run = (sql: string, params?: any[]) => {
      return new Promise<void>((resolve, reject) => {
        this.db.run(sql, params || [], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    await run(`
      CREATE TABLE IF NOT EXISTS hosts (
        id TEXT PRIMARY KEY,
        mac_address TEXT UNIQUE NOT NULL,
        hostname TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_seen DATETIME NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS file_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        modified_at DATETIME NOT NULL,
        event_type TEXT NOT NULL,
        extension TEXT,
        mime_type TEXT,
        category TEXT NOT NULL,
        is_directory BOOLEAN NOT NULL,
        FOREIGN KEY (host_id) REFERENCES hosts (id)
      )
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_file_events_host_id ON file_events (host_id)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_file_events_created_at ON file_events (created_at)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_file_events_category ON file_events (category)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_file_events_event_type ON file_events (event_type)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_file_events_extension ON file_events (extension)
    `);

    // Analytics tables
    await run(`
      CREATE TABLE IF NOT EXISTS daily_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        host_id TEXT NOT NULL,
        total_events INTEGER DEFAULT 0,
        files_created INTEGER DEFAULT 0,
        files_modified INTEGER DEFAULT 0,
        files_deleted INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        unique_extensions INTEGER DEFAULT 0,
        peak_hour INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, host_id),
        FOREIGN KEY (host_id) REFERENCES hosts (id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS hourly_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        hour INTEGER NOT NULL,
        host_id TEXT NOT NULL,
        event_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, hour, host_id),
        FOREIGN KEY (host_id) REFERENCES hosts (id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS directory_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory_path TEXT NOT NULL,
        host_id TEXT NOT NULL,
        event_count INTEGER DEFAULT 0,
        last_activity DATETIME NOT NULL,
        file_count INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(directory_path, host_id),
        FOREIGN KEY (host_id) REFERENCES hosts (id)
      )
    `);
  }

  async insertHost(hostInfo: HostInfo): Promise<void> {
    const run = (sql: string, params: any[]) => {
      return new Promise<void>((resolve, reject) => {
        this.db.run(sql, params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    await run(`
      INSERT OR REPLACE INTO hosts (id, mac_address, hostname, platform, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `, [hostInfo.id, hostInfo.macAddress, hostInfo.hostname, hostInfo.platform, hostInfo.lastSeen.toISOString()]);
  }

  async insertFileEvent(event: FileEvent): Promise<void> {
    const run = (sql: string, params: any[]) => {
      return new Promise<void>((resolve, reject) => {
        this.db.run(sql, params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };
    
    await run(`
      INSERT INTO file_events (
        host_id, file_path, file_name, file_type, size, created_at, modified_at,
        event_type, extension, mime_type, category, is_directory
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event.hostId,
      event.filePath,
      event.fileName,
      event.fileType,
      event.size,
      event.createdAt.toISOString(),
      event.modifiedAt.toISOString(),
      event.eventType,
      event.metadata.extension,
      event.metadata.mimeType,
      event.metadata.category,
      event.metadata.isDirectory ? 1 : 0
    ]);
  }

  async getFileEvents(hostId?: string, limit: number = 100, offset: number = 0): Promise<FileEvent[]> {
    const all = (sql: string, params: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    let query = `
      SELECT * FROM file_events
      ${hostId ? 'WHERE host_id = ?' : ''}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = hostId ? [hostId, limit, offset] : [limit, offset];
    const rows = await all(query, params);
    
    return rows.map(row => ({
      id: row.id.toString(),
      hostId: row.host_id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileType: row.file_type,
      size: row.size,
      createdAt: new Date(row.created_at),
      modifiedAt: new Date(row.modified_at),
      eventType: row.event_type,
      metadata: {
        extension: row.extension,
        mimeType: row.mime_type,
        category: row.category,
        isDirectory: row.is_directory === 1
      }
    }));
  }

  async getHosts(): Promise<HostInfo[]> {
    const all = (sql: string) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    const rows = await all('SELECT * FROM hosts ORDER BY last_seen DESC');
    
    return rows.map(row => ({
      id: row.id,
      macAddress: row.mac_address,
      hostname: row.hostname,
      platform: row.platform,
      lastSeen: new Date(row.last_seen)
    }));
  }

  async getStats(hostId?: string): Promise<any> {
    const all = (sql: string, params: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    const get = (sql: string, params: any[]) => {
      return new Promise<any>((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };
    
    // Basic stats
    const basicQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN is_directory = 1 THEN 1 END) as directories,
        COUNT(CASE WHEN is_directory = 0 THEN 1 END) as files,
        SUM(size) as total_size,
        COUNT(CASE WHEN event_type = 'created' THEN 1 END) as files_created,
        COUNT(CASE WHEN event_type = 'modified' THEN 1 END) as files_modified,
        COUNT(CASE WHEN event_type = 'deleted' THEN 1 END) as files_deleted
      FROM file_events
      ${hostId ? 'WHERE host_id = ?' : ''}
    `;
    
    // Category breakdown
    const categoryQuery = `
      SELECT category, COUNT(*) as count, SUM(size) as total_size
      FROM file_events
      ${hostId ? 'WHERE host_id = ?' : ''}
      GROUP BY category
      ORDER BY count DESC
    `;
    
    // Extension breakdown
    const extensionQuery = `
      SELECT extension, COUNT(*) as count
      FROM file_events
      ${hostId ? 'WHERE host_id = ? AND' : 'WHERE'} extension IS NOT NULL
      GROUP BY extension
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const params = hostId ? [hostId] : [];
    const [basicStats, categoryStats, extensionStats] = await Promise.all([
      get(basicQuery, params),
      all(categoryQuery, params),
      all(extensionQuery, hostId ? [hostId] : [])
    ]);
    
    return {
      basic: basicStats,
      categories: categoryStats,
      topExtensions: extensionStats
    };
  }

  async getAnalytics(hostId?: string, timeRange?: string): Promise<any> {
    const all = (sql: string, params: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    // Time-based analytics
    const timeFilter = timeRange === 'week' ? 'DATE(created_at) >= DATE(\'now\', \'-7 days\')' :
                      timeRange === 'month' ? 'DATE(created_at) >= DATE(\'now\', \'-30 days\')' :
                      'DATE(created_at) >= DATE(\'now\', \'-1 day\')';
    
    const hourlyQuery = `
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as event_count
      FROM file_events
      WHERE ${timeFilter} ${hostId ? 'AND host_id = ?' : ''}
      GROUP BY hour
      ORDER BY hour
    `;
    
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as event_count,
        COUNT(CASE WHEN event_type = 'created' THEN 1 END) as created,
        COUNT(CASE WHEN event_type = 'modified' THEN 1 END) as modified,
        COUNT(CASE WHEN event_type = 'deleted' THEN 1 END) as deleted
      FROM file_events
      WHERE ${timeFilter} ${hostId ? 'AND host_id = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const directoryQuery = `
      SELECT 
        SUBSTR(file_path, 1, INSTR(file_path || '/', '/') - 1) as directory,
        COUNT(*) as event_count,
        MAX(created_at) as last_activity
      FROM file_events
      WHERE ${timeFilter} ${hostId ? 'AND host_id = ?' : ''}
      GROUP BY directory
      ORDER BY event_count DESC
      LIMIT 10
    `;
    
    const params = hostId ? [hostId] : [];
    const [hourlyData, dailyData, directoryData] = await Promise.all([
      all(hourlyQuery, params),
      all(dailyQuery, params),
      all(directoryQuery, params)
    ]);
    
    return {
      hourly: hourlyData,
      daily: dailyData,
      topDirectories: directoryData
    };
  }
  
  async getFileTypeDistribution(hostId?: string): Promise<any[]> {
    const all = (sql: string, params: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    const query = `
      SELECT 
        file_type,
        COUNT(*) as count,
        SUM(size) as total_size,
        AVG(size) as avg_size
      FROM file_events
      ${hostId ? 'WHERE host_id = ?' : ''}
      GROUP BY file_type
      ORDER BY count DESC
    `;
    
    const params = hostId ? [hostId] : [];
    return await all(query, params);
  }
  
  async getActivityTrends(hostId?: string, days: number = 7): Promise<any[]> {
    const all = (sql: string, params: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    };
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        strftime('%w', created_at) as day_of_week,
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'created' THEN 1 END) as created_count,
        COUNT(CASE WHEN event_type = 'modified' THEN 1 END) as modified_count,
        COUNT(CASE WHEN event_type = 'deleted' THEN 1 END) as deleted_count,
        SUM(size) as total_size
      FROM file_events
      WHERE DATE(created_at) >= DATE('now', '-' || ? || ' days') ${hostId ? 'AND host_id = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const params = hostId ? [days, hostId] : [days];
    return await all(query, params);
  }

  close(): void {
    this.db.close();
  }
}

export const database = new Database();