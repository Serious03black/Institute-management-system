import mongoose, { Document, Schema } from 'mongoose';

export type ResultStatus = 'PENDING_REVIEW' | 'PASS' | 'FAIL';

export interface IModuleResult extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  latestValidAttemptId: mongoose.Types.ObjectId;
  objectiveMarks: number;
  practicalMarks: number;
  totalMarks: number;
  maximumMarks: number;
  passingMarks: number;
  status: ResultStatus;
  finalizedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}

const ModuleResultSchema = new Schema<IModuleResult>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    latestValidAttemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt' },
    objectiveMarks: { type: Number, default: 0 },
    practicalMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    maximumMarks: { type: Number, default: 50 },
    passingMarks: { type: Number, default: 40 },
    status: { type: String, enum: ['PENDING_REVIEW', 'PASS', 'FAIL'], default: 'PENDING_REVIEW' },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

ModuleResultSchema.index({ studentId: 1, moduleId: 1 }, { unique: true });
ModuleResultSchema.index({ status: 1 });

export const ModuleResult = mongoose.model<IModuleResult>('ModuleResult', ModuleResultSchema);
