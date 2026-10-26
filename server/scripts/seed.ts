import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Admin } from '../src/models/Admin';
import { Settings } from '../src/models/Settings';
import { Batch } from '../src/models/Batch';
import config from '../src/config';

async function seed() {
  if (!config.MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create admin if not exists
  const existingAdmin = await Admin.findOne({ username: config.ADMIN_INIT_USERNAME });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(config.ADMIN_INIT_PASSWORD, 12);
    await Admin.create({
      adminId: 'ADMIN001',
      username: config.ADMIN_INIT_USERNAME,
      passwordHash,
      profile: { name: 'System Administrator' },
      status: 'ACTIVE',
    });
    console.log(`✅ Admin created: ${config.ADMIN_INIT_USERNAME} / ${config.ADMIN_INIT_PASSWORD}`);
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Create default settings
  const existingSettings = await Settings.findOne({ key: 'APP_SETTINGS' });
  if (!existingSettings) {
    await Settings.create({
      key: 'APP_SETTINGS',
      instituteName: 'Institute Management System',
      defaultRegistrationFee: 100,
      exam: {
        durationMinutes: 60,
        passingMarks: 40,
        questionDistribution: { basic: 10, mid: 10, advanced: 20, practical: 2 },
        marksPerObjectiveQuestion: 2,
        practicalMaxMarks: 10,
      },
    });
    console.log('✅ Default settings created');
  }

  // Seed default batch slots
  const batchCount = await Batch.countDocuments();
  if (batchCount === 0) {
    const dailySlots = [
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '12:00', end: '13:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
      { start: '16:00', end: '17:00' },
      { start: '17:00', end: '18:00' },
      { start: '18:00', end: '19:00' },
    ];
    const alternateSlotsA = [
      { start: '10:00', end: '12:00', group: 'A', days: ['Monday', 'Wednesday', 'Friday'] },
      { start: '12:00', end: '14:00', group: 'A', days: ['Monday', 'Wednesday', 'Friday'] },
      { start: '15:00', end: '17:00', group: 'A', days: ['Monday', 'Wednesday', 'Friday'] },
      { start: '17:00', end: '19:00', group: 'A', days: ['Monday', 'Wednesday', 'Friday'] },
    ];
    const alternateSlotsB = [
      { start: '10:00', end: '12:00', group: 'B', days: ['Tuesday', 'Thursday', 'Saturday'] },
      { start: '12:00', end: '14:00', group: 'B', days: ['Tuesday', 'Thursday', 'Saturday'] },
      { start: '15:00', end: '17:00', group: 'B', days: ['Tuesday', 'Thursday', 'Saturday'] },
      { start: '17:00', end: '19:00', group: 'B', days: ['Tuesday', 'Thursday', 'Saturday'] },
    ];

    const batches = [
      ...dailySlots.map((s, i) => ({
        batchId: `BAT-DAILY-${i + 1}`,
        batchType: 'DAILY',
        startTime: s.start,
        endTime: s.end,
        applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        durationMinutes: 60,
      })),
      ...alternateSlotsA.map((s, i) => ({
        batchId: `BAT-ALT-A-${i + 1}`,
        batchType: 'ALTERNATE',
        alternateGroup: 'A',
        startTime: s.start,
        endTime: s.end,
        applicableDays: s.days,
        durationMinutes: 120,
      })),
      ...alternateSlotsB.map((s, i) => ({
        batchId: `BAT-ALT-B-${i + 1}`,
        batchType: 'ALTERNATE',
        alternateGroup: 'B',
        startTime: s.start,
        endTime: s.end,
        applicableDays: s.days,
        durationMinutes: 120,
      })),
      {
        batchId: 'BAT-WEEKLY-1',
        batchType: 'WEEKLY',
        startTime: '09:00',
        endTime: '13:00',
        applicableDays: ['Saturday'],
        durationMinutes: 240,
      },
    ];

    await Batch.insertMany(batches);
    console.log(`✅ ${batches.length} batch slots seeded`);
  }

  console.log('🎉 Seed complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
