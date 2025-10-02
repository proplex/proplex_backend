import 'tsconfig-paths/register';
import app from './src/app';
import { logger } from './src/utils/logger';

// Constants
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Debug Server running in ${NODE_ENV} mode on port ${PORT}`);
  
  // Simple health check
  logger.info('Server routes are now available');
  logger.info(`Try accessing: http://localhost:${PORT}/health`);
  logger.info(`Admin login: http://localhost:${PORT}/api/admin/login`);
  logger.info(`Admin register: http://localhost:${PORT}/api/admin/register`);
});

export default server;