import mongoose, { Document, Schema } from 'mongoose';

export interface IFaculty extends Document {
  facultyId: string;
  name: string;
  address: string;
  education: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  dateOfBirth: Date;
  teachingCourseIds: mongoose.Types.ObjectId[];
  teachingModuleIds: mongoose.Types.ObjectId[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema = new Schema<IFaculty>(
  {
    facultyId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    education: { type: String, required: true },
    mobile: { type: String, required: true },
    alternateMobile: { type: String },
    email: { type: String },
    dateOfBirth: { type: Date, required: true },
    teachingCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    teachingModuleIds: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

FacultySchema.index({ facultyId: 1 });
FacultySchema.index({ name: 'text' });

export const Faculty = mongoose.model<IFaculty>('Faculty', FacultySchema);
