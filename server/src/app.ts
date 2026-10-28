import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { connectDB, isDbConnected } from './config/database';
import config from './config';
import { errorHandler, notFound } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import studentRoutes from './routes/student.routes';
import facultyRoutes from './routes/faculty.routes';
import courseRoutes from './routes/course.routes';
import moduleRoutes from './routes/module.routes';
import batchRoutes from './routes/batch.routes';
import questionBankRoutes from './routes/questionBank.routes';
import examRoutes from './routes/exam.routes';
import resultsRoutes from './routes/results.routes';
import settingsRoutes from './routes/settings.routes';
import auditLogRoutes from './routes/auditLog.routes';

const app = express();

// Trust proxy for Vercel/reverse proxy deployments (preserves HTTPS for cookies & rate limiters)
app.set('trust proxy', 1);

// Vercel serverless: /var/task is read-only, use /tmp instead
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch { /* skip if read-only */ }

// Security
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        config.CLIENT_URL,
        'https://techmindssoftwreindia.vercel.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
      ];
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, credentials preserved
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Serverless DB connection check
app.use(async (_req, _res, next) => {
  if (!isDbConnected() && config.MONGODB_URI) {
    try {
      await connectDB();
    } catch {
      // Allow request to proceed, controllers/error handlers will respond if DB is down
    }
  }
  next();
});

// Rate limiting — more relaxed in development
const isDev = config.NODE_ENV !== 'production';
app.use(
  '/api/v1/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 100 : 20, message: { success: false, message: 'Too many login attempts' } })
);
app.use(
  '/api/v1/exam/access/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 100 : 30, message: { success: false, message: 'Too many exam login attempts' } })
);
app.use(
  rateLimit({ windowMs: 1 * 60 * 1000, max: isDev ? 1000 : 200, message: { success: false, message: 'Too many requests' } })
);

// Logging
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/question-banks', questionBankRoutes);
app.use('/api/question-banks', questionBankRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/exam', examRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1', settingsRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(config.PORT);

// Only listen on port in non-serverless environments
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${config.NODE_ENV}]`);
  });

  connectDB().catch((err) => {
    console.error('⚠️  Running without database connection:', err.message);
  });
}

export default app;
