import mongoose from 'mongoose';
import config from './index';
import { ensureInitialData } from '../utils/seedDefaults';

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDB(): Promise<void> {
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('✅ MongoDB Atlas connected');
    await ensureInitialData();
  } catch (err: any) {
    console.error('❌ MongoDB connection failed:', err.message || err);
    console.error('⚠️  Server will continue running — please configure a valid MONGODB_URI in server/.env');
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
