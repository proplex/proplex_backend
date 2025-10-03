import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';

dotenv.config();

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://proplex:proplex@cluster0.z61hlzq.mongodb.net/proplexDB';

// MongoDB connection options
const mongooseOptions: mongoose.ConnectOptions = {
  retryWrites: true,
  w: 'majority', // Write concern: requires a majority of the replica set to acknowledge write operations
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  serverSelectionTimeoutMS: 5000, // Time to wait for server selection before throwing an error
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
};

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async (): Promise<void> => {
  try {
    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        // Use a safer stringify method to avoid circular references
        const safeStringify = (obj: any) => {
          const cache = new Set();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (cache.has(value)) {
                return '[Circular]';
              }
              cache.add(value);
            }
            return value;
          });
        };
        
        logger.debug(`Mongoose: ${collectionName}.${method}`, {
          query: safeStringify(query),
          doc: doc ? safeStringify(doc) : undefined,
        });
      });
    }

    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Safely access database name with null check
    if (conn.connection.db) {
      logger.info(`Database: ${conn.connection.db.databaseName}`);
    } else {
      logger.warn('Connected but could not access database name');
    }
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from DB');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    logger.error(`Database connection error: ${errorMessage}`, { error });
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;