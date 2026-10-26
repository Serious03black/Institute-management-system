import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Student } from '../src/models/Student';
import { Module } from '../src/models/Module';
import { Question } from '../src/models/Question';
import { Settings } from '../src/models/Settings';

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('MongoDB connected');

  const settings = await Settings.findOne({ key: 'APP_SETTINGS' });
  const dist = settings?.exam?.questionDistribution || { basic: 10, mid: 10, advanced: 20, practical: 2 };
  console.log('Target distribution:', dist);

  const modules = await Module.find();
  let allPass = true;

  for (const m of modules) {
    const basic = await Question.countDocuments({ moduleId: m._id, section: 'BASIC', status: 'ACTIVE' });
    const mid = await Question.countDocuments({ moduleId: m._id, section: 'MID', status: 'ACTIVE' });
    const adv = await Question.countDocuments({ moduleId: m._id, section: 'ADVANCED', status: 'ACTIVE' });
    const prac = await Question.countDocuments({ moduleId: m._id, section: 'PRACTICAL', status: 'ACTIVE' });

    const ok = basic >= dist.basic && mid >= dist.mid && adv >= dist.advanced && prac >= dist.practical;
    console.log(`Module "${m.title}": BASIC=${basic}/${dist.basic}, MID=${mid}/${dist.mid}, ADV=${adv}/${dist.advanced}, PRAC=${prac}/${dist.practical} -> ${ok ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!ok) allPass = false;
  }

  if (allPass) {
    console.log('🎉 ALL MODULES HAVE SUFFICIENT QUESTIONS TO START EXAMS!');
  } else {
    console.log('❌ Some modules still have insufficient questions.');
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
