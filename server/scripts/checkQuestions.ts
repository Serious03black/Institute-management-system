import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Question } from '../src/models/Question';
import { Module } from '../src/models/Module';
import { Course } from '../src/models/Course';
import { Settings } from '../src/models/Settings';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('MongoDB connected');

  const settings = await Settings.findOne({ key: 'APP_SETTINGS' });
  console.log('Exam distribution settings:', JSON.stringify(settings?.exam?.questionDistribution));

  const courses = await Course.find();
  for (const c of courses) {
    console.log(`Course: ${c.courseId} - ${c.title}`);
  }

  const modules = await Module.find();
  console.log(`Found ${modules.length} modules:`);
  for (const m of modules) {
    const basic = await Question.countDocuments({ moduleId: m._id, section: 'BASIC', status: 'ACTIVE' });
    const mid = await Question.countDocuments({ moduleId: m._id, section: 'MID', status: 'ACTIVE' });
    const adv = await Question.countDocuments({ moduleId: m._id, section: 'ADVANCED', status: 'ACTIVE' });
    const prac = await Question.countDocuments({ moduleId: m._id, section: 'PRACTICAL', status: 'ACTIVE' });
    console.log(`- Module ${m.moduleId} (${m.title}): BASIC=${basic}, MID=${mid}, ADVANCED=${adv}, PRACTICAL=${prac}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
