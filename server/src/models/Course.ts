import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  courseId: string;
  title: string;
  description?: string;
  moduleIds: mongoose.Types.ObjectId[];
  version: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    courseId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    moduleIds: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

CourseSchema.index({ title: 'text' });

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
