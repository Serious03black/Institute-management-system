import mongoose, { Document, Schema } from 'mongoose';

export type AttemptType = 'REGULAR' | 'REEXAM';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'TIMED_OUT' | 'EVALUATED';

export interface ISelectedQuestion {
  questionId: mongoose.Types.ObjectId;
  section: string;
  questionText: string; // snapshot
  options?: { A: string; B: string; C: string; D: string }; // snapshot
  maximumMarks: number;
}

export interface IAnswer {
  questionId: mongoose.Types.ObjectId;
  selectedOption?: string; // for objective
  codeAnswer?: string;     // for practical
  savedAt: Date;
}

export interface IExamAttempt extends Document {
  attemptId: string;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  attemptType: AttemptType;
  questionBankVersion: number;
  selectedQuestions: ISelectedQuestion[];
  questionOrder: mongoose.Types.ObjectId[];
  startTime: Date;
  deadline: Date;
  submissionTime?: Date;
  durationSeconds?: number;
  answers: IAnswer[];
  attemptStatus: AttemptStatus;
  objectiveEvaluation?: {
    totalObjectiveQuestions: number;
    answeredCorrectly: number;
    answeredIncorrectly: number;
    unanswered: number;
    totalObjectiveMarks: number;
    evaluatedAt: Date;
  };
  practicalEvaluationStatus: 'PENDING' | 'COMPLETED' | 'NOT_REQUIRED';
  createdAt: Date;
  updatedAt: Date;
}

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    attemptId: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    attemptType: { type: String, enum: ['REGULAR', 'REEXAM'], default: 'REGULAR' },
    questionBankVersion: { type: Number },
    selectedQuestions: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
        section: { type: String },
        questionText: { type: String },
        options: {
          A: String,
          B: String,
          C: String,
          D: String,
        },
        maximumMarks: { type: Number },
      },
    ],
    questionOrder: [{ type: Schema.Types.ObjectId }],
    startTime: { type: Date, required: true },
    deadline: { type: Date, required: true },
    submissionTime: { type: Date },
    durationSeconds: { type: Number },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId },
        selectedOption: { type: String },
        codeAnswer: { type: String },
        savedAt: { type: Date, default: Date.now },
      },
    ],
    attemptStatus: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'TIMED_OUT', 'EVALUATED'],
      default: 'IN_PROGRESS',
    },
    objectiveEvaluation: {
      totalObjectiveQuestions: Number,
      answeredCorrectly: Number,
      answeredIncorrectly: Number,
      unanswered: Number,
      totalObjectiveMarks: Number,
      evaluatedAt: Date,
    },
    practicalEvaluationStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'NOT_REQUIRED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

ExamAttemptSchema.index({ studentId: 1, moduleId: 1 });
ExamAttemptSchema.index({ attemptStatus: 1 });
ExamAttemptSchema.index({ deadline: 1 });

export const ExamAttempt = mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
