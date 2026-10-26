import mongoose, { Document, Schema } from 'mongoose';

export interface IModule extends Document {
  moduleId: string;
  title: string;
  courseId: mongoose.Types.ObjectId;
  version: number;
  status: 'ACTIVE' | 'INACTIVE';
  questionBankId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>(
  {
    moduleId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    questionBankId: { type: Schema.Types.ObjectId, ref: 'QuestionBank' },
  },
  { timestamps: true }
);

ModuleSchema.index({ courseId: 1 });

export const Module = mongoose.model<IModule>('Module', ModuleSchema);
