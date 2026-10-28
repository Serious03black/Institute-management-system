import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import config from '../config';
import { AuthRequest } from '../middleware/auth';
import { writeAuditLog } from '../utils/auditLog';

function signAccessToken(payload: object): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' });
}
function signRefreshToken(payload: object): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

import { isDbConnected } from '../config/database';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({
        success: false,
        message: 'Database is not connected. Please provide a valid MongoDB Atlas connection string in server/.env',
      });
      return;
    }
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }
    const admin = await Admin.findOne({ username: username.toLowerCase() }).select('+passwordHash');
    if (!admin || admin.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const payload = { id: admin._id.toString(), username: admin.username, adminId: admin.adminId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store hashed refresh token
    admin.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
    await admin.save();

    const isProd = config.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    await writeAuditLog({ actorId: admin.adminId, action: 'ADMIN_LOGIN', entityType: 'Admin', entityId: admin.adminId });

    res.json({
      success: true,
      data: {
        adminId: admin.adminId,
        username: admin.username,
        profile: admin.profile,
        accessToken, // also return in body for non-cookie clients
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: string; username: string; adminId: string };
    const admin = await Admin.findById(decoded.id).select('+refreshTokenHash');
    if (!admin) {
      res.status(401).json({ success: false, message: 'Account not found' });
      return;
    }
    const valid = await bcrypt.compare(token, admin.refreshTokenHash || '');
    if (!valid) {
      res.status(401).json({ success: false, message: 'Refresh token invalid' });
      return;
    }

    const payload = { id: admin._id.toString(), username: admin.username, adminId: admin.adminId };
    const accessToken = signAccessToken(payload);
    const newRefresh = signRefreshToken(payload);

    admin.refreshTokenHash = await bcrypt.hash(newRefresh, 8);
    await admin.save();

    const isProd = config.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    res.json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.admin) {
      await Admin.findOneAndUpdate({ adminId: req.admin.adminId }, { refreshTokenHash: undefined });
    }
    const isProd = config.NODE_ENV === 'production';
    res.clearCookie('accessToken', { secure: isProd, sameSite: isProd ? 'none' : 'lax' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh', secure: isProd, sameSite: isProd ? 'none' : 'lax' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const admin = await Admin.findById(req.admin?.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    res.json({ success: true, data: { adminId: admin.adminId, username: admin.username, profile: admin.profile } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

export const changeCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, newUsername } = req.body;
    if (!currentPassword) {
      res.status(400).json({ success: false, message: 'Current password is required' });
      return;
    }
    const admin = await Admin.findById(req.admin?.id).select('+passwordHash');
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    const oldUsername = admin.username;
    if (newUsername) admin.username = newUsername.toLowerCase().trim();
    if (newPassword) admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    await writeAuditLog({
      actorId: admin.adminId,
      action: 'ADMIN_CREDENTIAL_CHANGE',
      entityType: 'Admin',
      entityId: admin.adminId,
      previousValues: { username: oldUsername },
      newValues: { username: admin.username, passwordChanged: !!newPassword },
    });

    res.json({ success: true, message: 'Credentials updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update credentials' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, mobile } = req.body;
    const admin = await Admin.findById(req.admin?.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin not found' });
      return;
    }
    if (name) admin.profile.name = name;
    if (email !== undefined) admin.profile.email = email;
    if (mobile !== undefined) admin.profile.mobile = mobile;
    await admin.save();
    res.json({ success: true, data: admin.profile });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
