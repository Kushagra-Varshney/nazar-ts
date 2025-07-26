import { extname } from 'path';
import { FileType, FileCategory, FileMetadata } from '../types';

const FILE_TYPE_MAP: Record<string, FileType> = {
  // Images
  '.jpg': FileType.IMAGE,
  '.jpeg': FileType.IMAGE,
  '.png': FileType.IMAGE,
  '.gif': FileType.IMAGE,
  '.bmp': FileType.IMAGE,
  '.svg': FileType.IMAGE,
  '.webp': FileType.IMAGE,
  '.ico': FileType.IMAGE,
  
  // Documents
  '.pdf': FileType.DOCUMENT,
  '.doc': FileType.DOCUMENT,
  '.docx': FileType.DOCUMENT,
  '.xls': FileType.DOCUMENT,
  '.xlsx': FileType.DOCUMENT,
  '.ppt': FileType.DOCUMENT,
  '.pptx': FileType.DOCUMENT,
  '.txt': FileType.DOCUMENT,
  '.rtf': FileType.DOCUMENT,
  '.odt': FileType.DOCUMENT,
  
  // Video
  '.mp4': FileType.VIDEO,
  '.avi': FileType.VIDEO,
  '.mkv': FileType.VIDEO,
  '.mov': FileType.VIDEO,
  '.wmv': FileType.VIDEO,
  '.flv': FileType.VIDEO,
  '.webm': FileType.VIDEO,
  '.m4v': FileType.VIDEO,
  
  // Audio
  '.mp3': FileType.AUDIO,
  '.wav': FileType.AUDIO,
  '.flac': FileType.AUDIO,
  '.aac': FileType.AUDIO,
  '.ogg': FileType.AUDIO,
  '.wma': FileType.AUDIO,
  '.m4a': FileType.AUDIO,
  
  // Archives
  '.zip': FileType.ARCHIVE,
  '.rar': FileType.ARCHIVE,
  '.7z': FileType.ARCHIVE,
  '.tar': FileType.ARCHIVE,
  '.gz': FileType.ARCHIVE,
  '.bz2': FileType.ARCHIVE,
  
  // Code
  '.js': FileType.CODE,
  '.ts': FileType.CODE,
  '.py': FileType.CODE,
  '.java': FileType.CODE,
  '.cpp': FileType.CODE,
  '.c': FileType.CODE,
  '.h': FileType.CODE,
  '.css': FileType.CODE,
  '.html': FileType.CODE,
  '.php': FileType.CODE,
  '.rb': FileType.CODE,
  '.go': FileType.CODE,
  '.rs': FileType.CODE,
  '.json': FileType.CODE,
  '.xml': FileType.CODE,
  '.yaml': FileType.CODE,
  '.yml': FileType.CODE,
  
  // Executables
  '.exe': FileType.EXECUTABLE,
  '.msi': FileType.EXECUTABLE,
  '.deb': FileType.EXECUTABLE,
  '.rpm': FileType.EXECUTABLE,
  '.dmg': FileType.EXECUTABLE,
  '.pkg': FileType.EXECUTABLE,
  '.app': FileType.EXECUTABLE,
};

const MIME_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
};

export function classifyFile(filePath: string, isDirectory: boolean): FileMetadata {
  if (isDirectory) {
    return {
      extension: '',
      category: FileCategory.OTHER,
      isDirectory: true,
      mimeType: undefined
    };
  }

  const extension = extname(filePath).toLowerCase();
  const fileType = FILE_TYPE_MAP[extension] || FileType.OTHER;
  const mimeType = MIME_TYPE_MAP[extension];
  
  let category: FileCategory;
  
  switch (fileType) {
    case FileType.IMAGE:
    case FileType.VIDEO:
    case FileType.AUDIO:
      category = FileCategory.MEDIA;
      break;
    case FileType.DOCUMENT:
      category = FileCategory.DOCUMENT;
      break;
    case FileType.CODE:
      category = FileCategory.CODE;
      break;
    case FileType.EXECUTABLE:
    case FileType.ARCHIVE:
      category = FileCategory.SYSTEM;
      break;
    default:
      category = FileCategory.OTHER;
  }

  return {
    extension,
    mimeType,
    category,
    isDirectory: false
  };
}