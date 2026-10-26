import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionBank extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  version: number;
  sourceFileName: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'ACTIVE' | 'REPLACED' | 'INVALID';
  sectionCounts: {
    basic: number;
    mid: number;
    advanced: number;
    practical: number;
  };
  importSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    version: { type: Number, default: 1 },
    sourceFileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'REPLACED', 'INVALID'], default: 'ACTIVE' },
    sectionCounts: {
      basic: { type: Number, default: 0 },
      mid: { type: Number, default: 0 },
      advanced: { type: Number, default: 0 },
      practical: { type: Number, default: 0 },
    },
    importSummary: { type: String },
  },
  { timestamps: true }
);

QuestionBankSchema.index({ moduleId: 1, status: 1 });

export const QuestionBank = mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);
