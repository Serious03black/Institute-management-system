import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticalEvaluation extends Document {
  attemptId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  questionEvaluations: {
    questionId: mongoose.Types.ObjectId;
    questionText: string;
    submittedCode: string;
    isCorrect: boolean;
    awardedMarks: number;
    maximumMarks: number;
    comment?: string;
  }[];
  totalAwardedMarks: number;
  maximumMarks: number;
  evaluatedBy: string;
  evaluatedAt: Date;
  status: 'PENDING' | 'COMPLETED';
  correctionHistory: {
    correctedBy: string;
    correctedAt: Date;
    reason: string;
    previousMarks: number;
    newMarks: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const PracticalEvaluationSchema = new Schema<IPracticalEvaluation>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    questionEvaluations: [
      {
        questionId: { type: Schema.Types.ObjectId },
        questionText: { type: String },
        submittedCode: { type: String },
        isCorrect: { type: Boolean },
        awardedMarks: { type: Number },
        maximumMarks: { type: Number },
        comment: { type: String },
      },
    ],
    totalAwardedMarks: { type: Number, default: 0 },
    maximumMarks: { type: Number, default: 10 },
    evaluatedBy: { type: String },
    evaluatedAt: { type: Date },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
    correctionHistory: [
      {
        correctedBy: String,
        correctedAt: Date,
        reason: String,
        previousMarks: Number,
        newMarks: Number,
      },
    ],
  },
  { timestamps: true }
);

export const PracticalEvaluation = mongoose.model<IPracticalEvaluation>(
  'PracticalEvaluation',
  PracticalEvaluationSchema
);
