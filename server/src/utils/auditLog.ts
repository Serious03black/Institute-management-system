import { AuditLog } from '../models/AuditLog';

interface LogParams {
  actorId: string;
  actorType?: 'ADMIN' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
}

export async function writeAuditLog(params: LogParams): Promise<void> {
  try {
    await AuditLog.create({
      actorId: params.actorId,
      actorType: params.actorType || 'ADMIN',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValues: params.previousValues,
      newValues: params.newValues,
      reason: params.reason,
      requestId: params.requestId,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
