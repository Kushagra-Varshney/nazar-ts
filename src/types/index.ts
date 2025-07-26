export interface FileEvent {
  id?: string;
  hostId: string;
  filePath: string;
  fileName: string;
  fileType: FileType;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  eventType: 'created' | 'modified' | 'deleted';
  metadata: FileMetadata;
}

export interface FileMetadata {
  extension: string;
  mimeType?: string;
  category: FileCategory;
  isDirectory: boolean;
  permissions?: string;
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  CODE = 'code',
  EXECUTABLE = 'executable',
  OTHER = 'other',
  DIRECTORY = 'directory'
}

export enum FileCategory {
  MEDIA = 'media',
  DOCUMENT = 'document',
  CODE = 'code',
  SYSTEM = 'system',
  OTHER = 'other'
}

export interface WatcherConfig {
  directories: string[];
  hostId: string;
  ignored?: string[];
  persistent?: boolean;
}

export interface HostInfo {
  id: string;
  macAddress: string;
  hostname: string;
  platform: string;
  lastSeen: Date;
}