import mongoose, { Document, Schema } from 'mongoose';

export interface IExamCredential extends Document {
  examUsername: string;
  studentId: mongoose.Types.ObjectId;
  passwordHash: string;
  allowedModuleIds: mongoose.Types.ObjectId[];
  status: 'ACTIVE' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
}

const ExamCredentialSchema = new Schema<IExamCredential>(
  {
    examUsername: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    allowedModuleIds: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ExamCredentialSchema.index({ examUsername: 1 });
ExamCredentialSchema.index({ studentId: 1 });

export const ExamCredential = mongoose.model<IExamCredential>('ExamCredential', ExamCredentialSchema);
