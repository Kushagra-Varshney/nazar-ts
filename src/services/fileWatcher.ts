import chokidar, { FSWatcher } from 'chokidar';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { FileEvent, WatcherConfig } from '../types';
import { classifyFile } from '../utils/fileClassifier';
import { getHostInfo } from '../utils/hostUtils';
import { messageQueue } from './messageQueue';

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private config: WatcherConfig;
  private hostInfo = getHostInfo();
  private customEventHandler?: (event: FileEvent) => Promise<void>;

  constructor(config: WatcherConfig, customEventHandler?: (event: FileEvent) => Promise<void>) {
    this.config = config;
    this.customEventHandler = customEventHandler;
  }

  async start(): Promise<void> {
    console.log(`Starting file watcher for host: ${this.hostInfo.hostname} (${this.hostInfo.macAddress})`);
    console.log(`Watching directories: ${this.config.directories.join(', ')}`);

    // Initialize Kafka message queue only if no custom handler is provided
    if (!this.customEventHandler) {
      await messageQueue.initialize();
    }

    this.watcher = chokidar.watch(this.config.directories, {
      ignored: this.config.ignored || [
        '**/node_modules/**',
        '**/.git/**',
        '**/.*',
        '**/*.tmp',
        '**/*.temp'
      ],
      persistent: this.config.persistent !== false,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10
    });

    this.watcher
      .on('add', (path: string) => this.handleFileEvent(path, 'created', false))
      .on('addDir', (path: string) => this.handleFileEvent(path, 'created', true))
      .on('change', (path: string) => this.handleFileEvent(path, 'modified', false))
      .on('unlink', (path: string) => this.handleFileEvent(path, 'deleted', false))
      .on('unlinkDir', (path: string) => this.handleFileEvent(path, 'deleted', true))
      .on('error', (error: unknown) => {
        console.error('File watcher error:', error);
      })
      .on('ready', () => {
        console.log('File watcher is ready and watching for changes...');
      });
  }

  private async handleFileEvent(filePath: string, eventType: 'created' | 'modified' | 'deleted', isDirectory: boolean): Promise<void> {
    try {
      const fileName = basename(filePath);
      const metadata = classifyFile(filePath, isDirectory);
      
      let size = 0;
      let createdAt = new Date();
      let modifiedAt = new Date();

      if (eventType !== 'deleted') {
        try {
          const stats = await stat(filePath);
          size = stats.size;
          createdAt = stats.birthtime;
          modifiedAt = stats.mtime;
        } catch (error) {
          console.warn(`Could not get stats for ${filePath}:`, error);
        }
      }

      // Determine proper file type based on extension and classification
      let fileType: string;
      if (isDirectory) {
        fileType = 'directory';
      } else {
        // Map file extension to FileType enum
        const ext = metadata.extension.toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'].includes(ext)) {
          fileType = 'image';
        } else if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
          fileType = 'document';
        } else if (['.mp4', '.avi', '.mkv', '.mov', '.wmv'].includes(ext)) {
          fileType = 'video';
        } else if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(ext)) {
          fileType = 'audio';
        } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
          fileType = 'archive';
        } else if (['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'].includes(ext)) {
          fileType = 'code';
        } else if (['.exe', '.msi', '.deb', '.dmg', '.app'].includes(ext)) {
          fileType = 'executable';
        } else {
          fileType = 'other';
        }
      }

      const fileEvent: FileEvent = {
        hostId: this.hostInfo.id,
        filePath,
        fileName,
        fileType: fileType as any,
        size,
        createdAt,
        modifiedAt,
        eventType,
        metadata
      };

      console.log(`${eventType.toUpperCase()}: ${filePath} (${metadata.category})`);
      
      // Use custom event handler if provided, otherwise use default message queue
      if (this.customEventHandler) {
        await this.customEventHandler(fileEvent);
      } else {
        await messageQueue.publish(fileEvent);
      }
    } catch (error) {
      console.error(`Error handling file event for ${filePath}:`, error);
    }
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('File watcher stopped');
    }
    
    // Disconnect from Kafka only if no custom handler is used
    if (!this.customEventHandler) {
      await messageQueue.disconnect();
    }
  }

  getWatchedPaths(): string[] {
    return this.watcher ? this.watcher.getWatched() as any : [];
  }
}

export function createFileWatcher(directories: string[], customEventHandler?: (event: FileEvent) => Promise<void>, hostId?: string): FileWatcher {
  const config: WatcherConfig = {
    directories,
    hostId: hostId || getHostInfo().id
  };

  return new FileWatcher(config, customEventHandler);
}