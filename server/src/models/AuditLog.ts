import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: string;
  actorType: 'ADMIN' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: String, required: true },
  actorType: { type: String, enum: ['ADMIN', 'SYSTEM'], default: 'ADMIN' },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String },
  previousValues: { type: Schema.Types.Mixed },
  newValues: { type: Schema.Types.Mixed },
  reason: { type: String },
  requestId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Audit logs are append-only — no update/delete hooks
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
