import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proplex';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error(`Database connection error: ${errorMessage}`);
    process.exit(1);
  }
};

export default connectDB;
