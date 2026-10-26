import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  key: string; // singleton: 'APP_SETTINGS'
  instituteName: string;
  instituteAddress?: string;
  institutePhone?: string;
  defaultRegistrationFee: number;
  exam: {
    durationMinutes: number;
    passingMarks: number;
    questionDistribution: {
      basic: number;
      mid: number;
      advanced: number;
      practical: number;
    };
    marksPerObjectiveQuestion: number;
    practicalMaxMarks: number;
  };
  updatedAt: Date;
  updatedBy?: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: 'APP_SETTINGS' },
    instituteName: { type: String, default: 'Institute Management System' },
    instituteAddress: { type: String },
    institutePhone: { type: String },
    defaultRegistrationFee: { type: Number, default: 100 },
    exam: {
      durationMinutes: { type: Number, default: 60 },
      passingMarks: { type: Number, default: 40 },
      questionDistribution: {
        basic: { type: Number, default: 10 },
        mid: { type: Number, default: 10 },
        advanced: { type: Number, default: 20 },
        practical: { type: Number, default: 2 },
      },
      marksPerObjectiveQuestion: { type: Number, default: 2 },
      practicalMaxMarks: { type: Number, default: 10 },
    },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
