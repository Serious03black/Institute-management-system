import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Question } from '../src/models/Question';
import { QuestionBank } from '../src/models/QuestionBank';
import { Module } from '../src/models/Module';
import { Course } from '../src/models/Course';

async function seedAll() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB Atlas');

  const modules = await Module.find();
  console.log(`Checking ${modules.length} modules...`);

  for (const mod of modules) {
    const course = await Course.findById(mod.courseId);
    if (!course) continue;

    const existingCount = await Question.countDocuments({ moduleId: mod._id, status: 'ACTIVE' });
    if (existingCount >= 42) {
      console.log(`Module "${mod.title}" already has ${existingCount} questions, skipping.`);
      continue;
    }

    console.log(`Seeding questions for module "${mod.title}" (${mod.moduleId})...`);

    // Inactivate any old partial questions
    await Question.updateMany({ moduleId: mod._id }, { status: 'INACTIVE' });
    await QuestionBank.updateMany({ moduleId: mod._id }, { status: 'REPLACED' });

    const bank = await QuestionBank.create({
      courseId: course._id,
      moduleId: mod._id,
      version: 1,
      sourceFileName: `${mod.title.replace(/\s+/g, '_')}_Official_Question_Bank.xlsx`,
      uploadedBy: 'ADMIN001',
      status: 'ACTIVE',
      sectionCounts: { basic: 10, mid: 10, advanced: 20, practical: 4 },
    });

    const title = mod.title.trim();
    const questions: any[] = [];

    // 10 Basic Questions
    for (let i = 1; i <= 10; i++) {
      questions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: mod._id,
        section: 'BASIC',
        questionNumber: i,
        questionText: `What is the primary function or definition of core element #${i} in ${title}?`,
        options: {
          A: `Defines the primary structural or functional logic of ${title}`,
          B: `A legacy styling attribute deprecated in modern revisions`,
          C: `An external network transport protocol`,
          D: `None of the above`,
        },
        correctOption: 'A',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 10 Mid Questions
    for (let i = 1; i <= 10; i++) {
      questions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: mod._id,
        section: 'MID',
        questionNumber: i,
        questionText: `When designing software modules with ${title}, which architecture pattern ensures high maintainability (Case #${i})?`,
        options: {
          A: `Tightly coupled monolithic procedures`,
          B: `Separation of concerns, modular components, and standard design principles in ${title}`,
          C: `Global state mutation without change detection`,
          D: `Ignoring input validation and boundary constraints`,
        },
        correctOption: 'B',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 20 Advanced Questions
    for (let i = 1; i <= 20; i++) {
      questions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: mod._id,
        section: 'ADVANCED',
        questionNumber: i,
        questionText: `In an enterprise high-throughput environment, how does ${title} manage runtime resource allocation and exception handling (Scenario #${i})?`,
        options: {
          A: `Fails silently without error propagations`,
          B: `Allocates resources dynamically with structured try-catch/finally blocks and asynchronous dispatching in ${title}`,
          C: `Terminates the host operating system process immediately`,
          D: `Requires hardware restart on invalid input`,
        },
        correctOption: 'B',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 4 Practical Questions
    const practicalPrompts = [
      `Write a complete implementation solving algorithmic data transformation using ${title}. Ensure all variables are appropriately typed or declared and handle empty inputs cleanly.`,
      `Implement an error-safe parser or validation utility in ${title} that validates user inputs against expected business constraints and returns meaningful error states.`,
      `Write a complete function or script in ${title} that filters, transforms, and sorts a list of composite record entities efficiently.`,
      `Construct a full practical solution in ${title} implementing state management, modular functions, and standard API interaction protocols.`,
    ];

    practicalPrompts.forEach((pText, i) => {
      questions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: mod._id,
        section: 'PRACTICAL',
        questionNumber: i + 1,
        questionText: `[${title} Practical Assignment #${i + 1}] ${pText}`,
        maximumMarks: 5,
        status: 'ACTIVE',
      });
    });

    await Question.insertMany(questions);
    await Module.findByIdAndUpdate(mod._id, { questionBankId: bank._id });
    console.log(`✅ Module "${mod.title}" populated with ${questions.length} questions!`);
  }

  console.log('🎉 All modules verified and populated!');
  await mongoose.disconnect();
}

seedAll().catch(console.error);
