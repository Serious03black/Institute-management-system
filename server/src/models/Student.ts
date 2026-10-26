import mongoose, { Document, Schema } from 'mongoose';

export type StudentStatus = 'CURRENT' | 'COMPLETED' | 'CANCELLED';

export interface IStudent extends Document {
  studentId: string;
  personalInfo: {
    name: string;
    address: string;
    mobile: string;
    parentMobile: string;
    dateOfBirth: Date;
    email?: string;
    education: string;
  };
  enrollment: {
    courseId: mongoose.Types.ObjectId;
    courseTitleSnapshot: string;
    moduleIds: mongoose.Types.ObjectId[];
    moduleSnapshots: { moduleId: mongoose.Types.ObjectId; title: string }[];
    joiningDate: Date;
    courseDuration: string;
    batchType: 'DAILY' | 'ALTERNATE' | 'WEEKLY';
    batchId?: mongoose.Types.ObjectId;
    batchTime?: string;
    facultyId: mongoose.Types.ObjectId;
    facultyNameSnapshot?: string;
  };
  fees: {
    registrationFee: number;
    courseFee: number;
  };
  status: StudentStatus;
  cancellationDetails?: {
    cancelledAt: Date;
    reason: string;
    cancelledBy: string;
  };
  completionDetails?: {
    completedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true },
    personalInfo: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      mobile: { type: String, required: true },
      parentMobile: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      email: { type: String },
      education: { type: String, required: true },
    },
    enrollment: {
      courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
      courseTitleSnapshot: { type: String, required: true },
      moduleIds: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
      moduleSnapshots: [
        {
          moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
          title: { type: String },
        },
      ],
      joiningDate: { type: Date, required: true },
      courseDuration: { type: String, required: true },
      batchType: { type: String, enum: ['DAILY', 'ALTERNATE', 'WEEKLY'], required: true },
      batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
      batchTime: { type: String },
      facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
      facultyNameSnapshot: { type: String },
    },
    fees: {
      registrationFee: { type: Number, default: 100 },
      courseFee: { type: Number, required: true },
    },
    status: { type: String, enum: ['CURRENT', 'COMPLETED', 'CANCELLED'], default: 'CURRENT' },
    cancellationDetails: {
      cancelledAt: { type: Date },
      reason: { type: String },
      cancelledBy: { type: String },
    },
    completionDetails: {
      completedAt: { type: Date },
    },
  },
  { timestamps: true }
);

StudentSchema.index({ studentId: 1 });
StudentSchema.index({ status: 1 });
StudentSchema.index({ 'enrollment.courseId': 1 });
StudentSchema.index({ 'enrollment.facultyId': 1 });
StudentSchema.index({ 'personalInfo.name': 'text' });

export const Student = mongoose.model<IStudent>('Student', StudentSchema);
