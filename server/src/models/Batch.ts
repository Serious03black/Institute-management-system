import mongoose, { Document, Schema } from 'mongoose';

export type BatchType = 'DAILY' | 'ALTERNATE' | 'WEEKLY';
export type AlternateGroup = 'A' | 'B';

export interface IBatch extends Document {
  batchId: string;
  batchType: BatchType;
  alternateGroup?: AlternateGroup;
  startTime: string; // e.g. "10:00"
  endTime: string;   // e.g. "11:00"
  applicableDays: string[];
  durationMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchId: { type: String, required: true, unique: true },
    batchType: { type: String, enum: ['DAILY', 'ALTERNATE', 'WEEKLY'], required: true },
    alternateGroup: { type: String, enum: ['A', 'B'] },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    applicableDays: [{ type: String }],
    durationMinutes: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

BatchSchema.index({ batchType: 1, status: 1 });

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);
