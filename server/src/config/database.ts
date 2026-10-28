import mongoose from 'mongoose';
import config from './index';
import { ensureInitialData } from '../utils/seedDefaults';

let dbConnectionPromise: Promise<void> | null = null;

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDB(): Promise<void> {
  if (isDbConnected()) return;
  if (dbConnectionPromise) return dbConnectionPromise;

  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  dbConnectionPromise = mongoose
    .connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    })
    .then(async () => {
      console.log('✅ MongoDB Atlas connected');
      await ensureInitialData().catch((e) => console.warn('Seed initialization error:', e));
    })
    .catch((err: any) => {
      dbConnectionPromise = null;
      console.error('❌ MongoDB connection failed:', err.message || err);
      throw err;
    });

  return dbConnectionPromise;
}

mongoose.connection.on('disconnected', () => {
  dbConnectionPromise = null;
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
