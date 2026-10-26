import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  adminId: string;
  username: string;
  passwordHash: string;
  profile: {
    name: string;
    email?: string;
    mobile?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    adminId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    profile: {
      name: { type: String, default: 'Administrator' },
      email: { type: String },
      mobile: { type: String },
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
