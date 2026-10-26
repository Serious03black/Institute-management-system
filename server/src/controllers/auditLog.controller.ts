import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, action, entityType, actorId, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (entityType) filter.entityType = entityType;
    if (actorId) filter.actorId = { $regex: actorId, $options: 'i' };
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = new Date(from as string);
      if (to) (filter.timestamp as Record<string, unknown>).$lte = new Date(to as string);
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, total, page: Number(page), limit: Number(limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};
