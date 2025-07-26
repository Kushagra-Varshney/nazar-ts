import path from 'path';

export const config = {
  port: process.env.PORT || 3000,
  gatewayPort: process.env.GATEWAY_PORT || 3001,
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3001',
  watchDirectories: [
    path.join(process.cwd(), 'test-folder'), // Test folder in current directory
    // Add more directories as needed
  ],
  database: {
    path: './file_tracker.db'
  },
  api: {
    defaultLimit: 100,
    maxLimit: 1000
  }
};