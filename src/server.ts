import dotenv from 'dotenv';
import 'tsconfig-paths/register';
import app from '@/app';
import connectDB from '@/config/database';
import { logger } from '@/utils/logger';
import { initializeSentry } from '@/config/sentry';

// Load environment variables
const envPath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envPath });

// Initialize error tracking
initializeSentry();

// Constants
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  
  // In production, wait for pending requests to finish before shutting down
  if (isProduction) {
    server.close(() => {
      logger.info('Process terminated due to uncaught exception');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB().catch(err => {
  logger.error('Failed to connect to MongoDB', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  
  // Log important environment information
  logger.debug('Environment Information', {
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: process.memoryUsage(),
    environment: NODE_ENV,
  });
});

// Handle unhandled promise rejections (asynchronous errors)
process.on('unhandledRejection', (reason: Error | any) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  
  // Gracefully close the server
  server.close(() => {
    logger.info('Process terminated due to unhandled rejection');
    process.exit(1);
  });
});

// Handle termination signals
const shutdownSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

const gracefulShutdown = (signal: NodeJS.Signals) => {
  logger.info(`👋 ${signal} received. Shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('💤 Server closed');
    
    // Close database connections here if needed
    // e.g., mongoose.connection.close()
    
    logger.info('👋 Process terminated!');
    process.exit(0);
  });
  
  // Force shutdown if server takes too long to close
  setTimeout(() => {
    logger.error('⚠️ Forcing shutdown...');
    process.exit(1);
  }, 5000);
};

// Register signal handlers
shutdownSignals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Handle any other uncaught errors
process.on('exit', (code) => {
  if (code !== 0) {
    logger.error(`Process exited with code ${code}`);
  } else {
    logger.info('Process completed successfully');
  }
});

export default server;
