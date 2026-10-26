import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { Admin } from '../models/Admin';

export interface AuthRequest extends Request {
  admin?: { id: string; username: string; adminId: string };
  examStudent?: { studentId: string; examUsername: string };
}

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; username: string; adminId: string };
    const admin = await Admin.findById(decoded.id).select('adminId username status');
    if (!admin || admin.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Account not found or inactive' });
      return;
    }

    req.admin = { id: decoded.id, username: decoded.username, adminId: decoded.adminId };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const examAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token =
      req.cookies?.examToken ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      res.status(401).json({ success: false, message: 'Exam authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET + '_exam') as {
      studentId: string;
      examUsername: string;
    };
    req.examStudent = { studentId: decoded.studentId, examUsername: decoded.examUsername };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired exam token' });
  }
};
