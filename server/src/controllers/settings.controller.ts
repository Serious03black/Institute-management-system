import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Settings } from '../models/Settings';
import { writeAuditLog } from '../utils/auditLog';

export const getSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    let settings = await Settings.findOne({ key: 'APP_SETTINGS' });
    if (!settings) {
      settings = await Settings.create({ key: 'APP_SETTINGS' });
    }
    res.json({ success: true, data: settings });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const prev = await Settings.findOne({ key: 'APP_SETTINGS' });
    const settings = await Settings.findOneAndUpdate(
      { key: 'APP_SETTINGS' },
      { ...req.body, updatedBy: req.admin!.adminId },
      { new: true, upsert: true, runValidators: true }
    );

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'SETTINGS_UPDATED',
      entityType: 'Settings',
      entityId: 'APP_SETTINGS',
      previousValues: (prev?.toObject() as unknown) as Record<string, unknown> ?? {},
      newValues: req.body as Record<string, unknown>,
    });

    res.json({ success: true, data: settings });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
