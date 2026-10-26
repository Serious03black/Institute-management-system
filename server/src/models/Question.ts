import mongoose, { Document, Schema } from 'mongoose';

export type QuestionSection = 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL';

export interface IQuestion extends Document {
  questionBankId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  section: QuestionSection;
  questionNumber: number;
  questionText: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D'; // stored server-side, never exposed to student
  maximumMarks: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionBankId: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    section: { type: String, enum: ['BASIC', 'MID', 'ADVANCED', 'PRACTICAL'], required: true },
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    options: {
      A: { type: String },
      B: { type: String },
      C: { type: String },
      D: { type: String },
    },
    correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], select: false }, // never exposed
    maximumMarks: { type: Number, default: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

QuestionSchema.index({ moduleId: 1, section: 1, status: 1 });
QuestionSchema.index({ questionBankId: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
