import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_INIT_USERNAME: process.env.ADMIN_INIT_USERNAME || 'admin',
  ADMIN_INIT_PASSWORD: process.env.ADMIN_INIT_PASSWORD || 'Admin@123',
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10'),
};

export default config;
