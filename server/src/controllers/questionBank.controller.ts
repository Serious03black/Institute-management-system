import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import fs from 'fs';
import { QuestionBank } from '../models/QuestionBank';
import { Question } from '../models/Question';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { writeAuditLog } from '../utils/auditLog';

type SectionName = 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL';

interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  options?: { A: string; B: string; C: string; D: string };
  correctOption?: string;
  section: SectionName;
  errors: string[];
}

function getCellValue(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (typeof v === 'object') {
    if ('text' in v && typeof (v as { text?: unknown }).text === 'string') {
      return ((v as { text: string }).text || '').trim();
    }
    if ('richText' in v && Array.isArray((v as { richText?: Array<{ text?: string }> }).richText)) {
      return (v as { richText: Array<{ text?: string }> }).richText.map((r) => r.text || '').join('').trim();
    }
    if ('result' in v) {
      return String((v as { result?: unknown }).result ?? '').trim();
    }
  }
  return String(v).trim();
}

function findWorksheet(workbook: ExcelJS.Workbook, targetName: string): ExcelJS.Worksheet | undefined {
  const norm = targetName.trim().toLowerCase();
  return workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === norm);
}

function normalizeCorrectOption(raw: string): string {
  let val = raw.toUpperCase().trim();
  if (val.startsWith('OPTION ')) val = val.replace('OPTION ', '').trim();
  if (val.startsWith('OPTION')) val = val.replace('OPTION', '').trim();
  if (val.endsWith('.') || val.endsWith(')')) val = val.slice(0, -1).trim();
  if (['1', '2', '3', '4'].includes(val)) {
    val = (['A', 'B', 'C', 'D'] as const)[Number(val) - 1];
  }
  return val;
}

async function parseSheet(worksheet: ExcelJS.Worksheet, section: SectionName): Promise<ParsedQuestion[]> {
  const questions: ParsedQuestion[] = [];
  const seenNumbers = new Set<number>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row

    const cell1 = getCellValue(row.getCell(1));
    const cell2 = getCellValue(row.getCell(2));

    // Silently skip completely empty rows
    if (!cell1 && !cell2) return;

    let qNum = Number(cell1);
    if (!cell1 || isNaN(qNum)) {
      qNum = questions.length + 1;
    }

    const qText = cell2;
    const errors: string[] = [];

    if (!qText) {
      errors.push(`Row ${rowNumber}: Empty question text`);
    }
    if (seenNumbers.has(qNum)) {
      // In case of duplicate number in sheet, assign next sequential number rather than blocking
      qNum = questions.length + 1;
    }
    seenNumbers.add(qNum);

    if (section !== 'PRACTICAL') {
      const A = getCellValue(row.getCell(3));
      const B = getCellValue(row.getCell(4));
      const C = getCellValue(row.getCell(5));
      const D = getCellValue(row.getCell(6));
      const rawCorrect = getCellValue(row.getCell(7));
      const correct = normalizeCorrectOption(rawCorrect);

      if (!['A', 'B', 'C', 'D'].includes(correct)) {
        errors.push(`Row ${rowNumber}: Correct option must be A, B, C, or D (got "${rawCorrect}")`);
      }
      if (!A || !B || !C || !D) {
        errors.push(`Row ${rowNumber}: All four options (A, B, C, D) are required`);
      }

      questions.push({
        questionNumber: qNum,
        questionText: qText,
        options: { A, B, C, D },
        correctOption: correct,
        section,
        errors,
      });
    } else {
      questions.push({
        questionNumber: qNum,
        questionText: qText,
        section,
        errors,
      });
    }
  });

  return questions;
}

export const uploadQuestionBank = async (req: AuthRequest, res: Response): Promise<void> => {
  const uploadedFile = req.file;
  try {
    if (!uploadedFile) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const { courseId: courseIdStr, moduleId: moduleIdStr, preview } = req.body;

    const course = await Course.findOne({ courseId: courseIdStr });
    const module = await Module.findOne({ moduleId: moduleIdStr });
    if (!course || !module) {
      res.status(400).json({ success: false, message: 'Course or module not found' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadedFile.path);

    const requiredSections: { name: string; section: SectionName }[] = [
      { name: 'Basic', section: 'BASIC' },
      { name: 'Mid', section: 'MID' },
      { name: 'Advanced', section: 'ADVANCED' },
      { name: 'Practical', section: 'PRACTICAL' },
    ];

    const missingSheets: string[] = [];
    const foundWorksheets: Record<string, ExcelJS.Worksheet> = {};

    for (const reqSec of requiredSections) {
      const ws = findWorksheet(workbook, reqSec.name);
      if (!ws) {
        missingSheets.push(reqSec.name);
      } else {
        foundWorksheets[reqSec.name] = ws;
      }
    }

    if (missingSheets.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing worksheets: ${missingSheets.join(', ')}. Excel file must have 4 sheets named: Basic, Mid, Advanced, Practical.`,
      });
      return;
    }

    const allSections: Record<string, ParsedQuestion[]> = {};
    const allErrors: string[] = [];

    for (const reqSec of requiredSections) {
      const ws = foundWorksheets[reqSec.name];
      const parsed = await parseSheet(ws, reqSec.section);
      allSections[reqSec.name] = parsed;
      parsed.forEach((q) => allErrors.push(...q.errors.map((e) => `[${reqSec.name}] ${e}`)));
    }

    if (allErrors.length > 0) {
      res.status(422).json({
        success: false,
        message: `Validation failed: Found ${allErrors.length} issue(s) in the Excel file`,
        errors: allErrors.slice(0, 15), // return top 15 errors
      });
      return;
    }

    // Verify minimum questions present
    const counts = {
      basic: allSections['Basic'].length,
      mid: allSections['Mid'].length,
      advanced: allSections['Advanced'].length,
      practical: allSections['Practical'].length,
    };

    if (counts.basic === 0 || counts.mid === 0 || counts.advanced === 0) {
      res.status(422).json({
        success: false,
        message: `Each section must contain at least 1 question. Current counts: Basic=${counts.basic}, Mid=${counts.mid}, Advanced=${counts.advanced}, Practical=${counts.practical}`,
      });
      return;
    }

    // If preview only, return counts
    if (preview === 'true') {
      res.json({
        success: true,
        preview: true,
        counts,
        totalQuestions: Object.values(allSections).flat().length,
      });
      return;
    }

    // Mark existing active bank as replaced
    await QuestionBank.updateMany({ moduleId: module._id, status: 'ACTIVE' }, { status: 'REPLACED' });
    await Question.updateMany({ moduleId: module._id, status: 'ACTIVE' }, { status: 'INACTIVE' });

    // Get latest version
    const lastBank = await QuestionBank.findOne({ moduleId: module._id }).sort({ version: -1 });
    const version = (lastBank?.version || 0) + 1;

    const bank = await QuestionBank.create({
      courseId: course._id,
      moduleId: module._id,
      version,
      sourceFileName: uploadedFile.originalname,
      uploadedBy: req.admin!.adminId,
      status: 'ACTIVE',
      sectionCounts: counts,
    });

    // Insert questions
    const questionDocs = requiredSections.flatMap((reqSec) =>
      allSections[reqSec.name].map((q) => ({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: module._id,
        section: reqSec.section,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        maximumMarks: reqSec.name === 'Practical' ? 5 : 2,
        status: 'ACTIVE',
      }))
    );
    await Question.insertMany(questionDocs);

    // Update module to reference this bank
    await Module.findByIdAndUpdate(module._id, { questionBankId: bank._id });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'QUESTION_BANK_UPLOADED',
      entityType: 'QuestionBank',
      entityId: bank._id.toString(),
      newValues: {
        moduleId: module.moduleId,
        version,
        counts: bank.sectionCounts,
      },
    });

    res.json({
      success: true,
      message: `Question bank imported successfully! (${questionDocs.length} questions loaded)`,
      data: { bankId: bank._id, version, counts: bank.sectionCounts },
    });
  } catch (err) {
    console.error('Question bank upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to process question bank file' });
  } finally {
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch {
        // ignore
      }
    }
  }
};

export const getQuestionBanks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { moduleId } = req.query;
    const filter: Record<string, unknown> = {};
    if (moduleId) {
      const mod = await Module.findOne({ moduleId: moduleId as string });
      if (mod) filter.moduleId = mod._id;
    }
    const banks = await QuestionBank.find(filter)
      .populate('courseId', 'title courseId')
      .populate('moduleId', 'title moduleId')
      .sort({ uploadedAt: -1 });
    res.json({ success: true, data: banks });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch question banks' });
  }
};

export const getQuestionBankQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      res.status(404).json({ success: false, message: 'Question bank not found' });
      return;
    }
    const questions = await Question.find({ questionBankId: bank._id }).select('-correctOption');
    res.json({ success: true, data: questions });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
};

// Download Pre-Formatted Excel Template
export const downloadTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IMS Examination Portal';

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark slate
    };
    const headerFont: Partial<ExcelJS.Font> = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };

    const mcqHeaders = [
      'Question Number',
      'Question Text',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Option',
    ];

    const sheetsConfig = [
      {
        name: 'Basic',
        sample: [
          [1, 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Text Machine Language', 'Hyperlink Text Management Language', 'Home Tool Markup Language', 'A'],
          [2, 'Which HTML tag is used to define an internal style sheet?', '<script>', '<style>', '<css>', '<link>', 'B'],
          [3, 'What is the correct HTML element for inserting a line break?', '<break>', '<lb>', '<br>', '<newline>', 'C'],
          [4, 'Which character is used to indicate an end tag?', '*', '/', '<', '^', 'B'],
          [5, 'Which tag is used to create a hyperlink?', '<a>', '<link>', '<href>', '<hyperlink>', 'A'],
          [6, 'Which input type defines a slider control?', 'slider', 'controls', 'range', 'search', 'C'],
          [7, 'Which HTML attribute specifies an alternate text for an image?', 'title', 'alt', 'src', 'longdesc', 'B'],
          [8, 'What is the correct HTML for creating a text input field?', '<input type="textfield">', '<textinput>', '<input type="text">', '<textfield>', 'C'],
          [9, 'Which HTML element is used to specify a footer for a document or section?', '<bottom>', '<footer>', '<section>', '<header>', 'B'],
          [10, 'In HTML, which attribute is used to specify that an input field must be filled out?', 'validate', 'required', 'placeholder', 'mandatory', 'B'],
        ],
      },
      {
        name: 'Mid',
        sample: [
          [1, 'Which CSS property controls the text size?', 'font-style', 'text-size', 'font-size', 'text-style', 'C'],
          [2, 'How do you display hyperlinks without an underline in CSS?', 'a {underline: none;}', 'a {text-decoration: none;}', 'a {text-style: no-underline;}', 'a {decoration: none;}', 'B'],
          [3, 'Which property is used to change the background color of an element?', 'color', 'bgcolor', 'background-color', 'canvas-color', 'C'],
          [4, 'Which CSS selector selects all paragraph elements inside a div?', 'div.p', 'div + p', 'div p', 'div > p only', 'C'],
          [5, 'What is the default value of the position property in CSS?', 'relative', 'fixed', 'absolute', 'static', 'D'],
          [6, 'Which unit is relative to the font-size of the root element (html)?', 'em', 'rem', '%', 'vh', 'B'],
          [7, 'How do you make each word in a text start with a capital letter using CSS?', 'text-transform: capitalize', 'text-style: capitalize', 'transform: capitalize', 'font-transform: capitalize', 'A'],
          [8, 'Which CSS display value enables a flexbox layout container?', 'display: grid', 'display: box', 'display: flex', 'display: inline-flex only', 'C'],
          [9, 'Which property controls the space between the content and border of an element?', 'margin', 'padding', 'spacing', 'border-spacing', 'B'],
          [10, 'Which CSS pseudo-class matches an element when a user hovers over it?', ':focus', ':active', ':hover', ':visited', 'C'],
        ],
      },
      {
        name: 'Advanced',
        sample: [
          [1, 'Which keyword in JavaScript declares a block-scoped variable that cannot be reassigned?', 'var', 'let', 'const', 'static', 'C'],
          [2, 'What does the Promise.all() method return?', 'The first resolved promise', 'A single promise that resolves to an array of results', 'An array of promises', 'A rejection handler', 'B'],
          [3, 'Which array method returns a new array with all elements that pass a test?', 'map()', 'filter()', 'forEach()', 'reduce()', 'B'],
          [4, 'What is the event loop primarily responsible for in Node.js?', 'Allocating memory', 'Executing callbacks and handling non-blocking I/O', 'Rendering HTML', 'Compiling TypeScript', 'B'],
          [5, 'What is the output of typeof null in JavaScript?', '"null"', '"undefined"', '"object"', '"boolean"', 'C'],
          [6, 'Which mechanism allows a function to access variables from its outer enclosing scope?', 'Closure', 'Hoisting', 'Prototype chain', 'Currying', 'A'],
          [7, 'What does HTTP status code 401 indicate?', 'Forbidden', 'Not Found', 'Unauthorized', 'Bad Request', 'C'],
          [8, 'Which method converts a JavaScript object into a JSON string?', 'JSON.parse()', 'JSON.stringify()', 'JSON.objectify()', 'JSON.encode()', 'B'],
          [9, 'In Express.js, what is the third parameter passed to middleware functions?', 'res', 'req', 'next', 'dispatch', 'C'],
          [10, 'Which database index type is best for querying unique values?', 'Compound index', 'Unique index', 'Sparse index', 'Text index', 'B'],
          [11, 'Which method is used to remove the last element from an array in JavaScript?', 'shift()', 'pop()', 'splice()', 'slice()', 'B'],
          [12, 'What is the purpose of the async/await syntax in JavaScript?', 'Run code on a separate thread', 'Write asynchronous code in a cleaner synchronous style', 'Speed up network requests', 'Prevent race conditions', 'B'],
          [13, 'Which operator is used for safe nullish coalescing in modern JavaScript?', '||', '&&', '??', '?:', 'C'],
          [14, 'What does the term REST stand for in web architecture?', 'Representational State Transfer', 'Remote Execution State Table', 'Relational State Technology', 'Realtime Endpoint System Tree', 'A'],
          [15, 'Which HTTP method is idempotent?', 'POST', 'PATCH', 'PUT', 'CONNECT', 'C'],
          [16, 'What does CORS stand for?', 'Cross-Origin Resource Sharing', 'Cross-Online Resource Security', 'Content-Origin Response System', 'Client-Origin Request Standard', 'A'],
          [17, 'Which JavaScript built-in object is used to store unique values of any type?', 'Map', 'Set', 'WeakMap', 'Object', 'B'],
          [18, 'Which header is sent by a client to authenticate with a bearer token?', 'Token', 'Authentication', 'Authorization', 'Bearer-Token', 'C'],
          [19, 'What is the time complexity of looking up a key in a hash map on average?', 'O(n)', 'O(log n)', 'O(1)', 'O(n^2)', 'C'],
          [20, 'Which lifecycle or hook in React is typically used to trigger data fetching?', 'useEffect', 'useState', 'useRef', 'useCallback', 'A'],
        ],
      },
    ];

    for (const conf of sheetsConfig) {
      const ws = workbook.addWorksheet(conf.name);
      const headerRow = ws.addRow(mcqHeaders);
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 24;

      conf.sample.forEach((row) => ws.addRow(row));

      ws.columns = [
        { width: 18 },
        { width: 55 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 35 },
        { width: 16 },
      ];
    }

    // Practical sheet
    const practicalWs = workbook.addWorksheet('Practical');
    const pHeaderRow = practicalWs.addRow(['Question Number', 'Question Text']);
    pHeaderRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    pHeaderRow.height = 24;

    const samplePractical = [
      [1, 'Write a JavaScript function "calculateTax(income)" that returns the computed income tax according to progressive tax slabs: 0% up to 250000, 10% from 250001 to 500000, and 20% for any amount above 500000.'],
      [2, 'Implement an asynchronous function "fetchUserData(userId)" that fetches user profile data from an API endpoint, handles potential HTTP error statuses, and returns a formatted user summary object.'],
      [3, 'Write a function "findDuplicateNumbers(arr)" that accepts an array of integers and returns an array containing only the elements that appear more than once, with duplicates removed from the output.'],
      [4, 'Create a function "validatePassword(password)" that verifies whether a password meets security criteria: minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol.'],
    ];

    samplePractical.forEach((r) => practicalWs.addRow(r));
    practicalWs.columns = [{ width: 18 }, { width: 90 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="IMS_Question_Bank_Template.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Template download error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

// Auto-generate starter question bank for any module
export const autoGenerateBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId: courseIdStr, moduleId: moduleIdStr } = req.body;
    const course = await Course.findOne({ courseId: courseIdStr });
    const module = await Module.findOne({ moduleId: moduleIdStr });
    if (!course || !module) {
      res.status(400).json({ success: false, message: 'Course or module not found' });
      return;
    }

    const title = module.title.trim();

    // Mark previous bank as replaced
    await QuestionBank.updateMany({ moduleId: module._id, status: 'ACTIVE' }, { status: 'REPLACED' });
    await Question.updateMany({ moduleId: module._id, status: 'ACTIVE' }, { status: 'INACTIVE' });

    const lastBank = await QuestionBank.findOne({ moduleId: module._id }).sort({ version: -1 });
    const version = (lastBank?.version || 0) + 1;

    const bank = await QuestionBank.create({
      courseId: course._id,
      moduleId: module._id,
      version,
      sourceFileName: `System_Generated_${title.replace(/\s+/g, '_')}_Bank.xlsx`,
      uploadedBy: req.admin!.adminId,
      status: 'ACTIVE',
      sectionCounts: { basic: 10, mid: 10, advanced: 20, practical: 4 },
    });

    const generatedQuestions: Array<{
      questionBankId: unknown;
      courseId: unknown;
      moduleId: unknown;
      section: SectionName;
      questionNumber: number;
      questionText: string;
      options?: { A: string; B: string; C: string; D: string };
      correctOption?: string;
      maximumMarks: number;
      status: string;
    }> = [];

    // 10 Basic
    for (let i = 1; i <= 10; i++) {
      generatedQuestions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: module._id,
        section: 'BASIC',
        questionNumber: i,
        questionText: `[${title}] Fundamental concept question #${i}: Which of the following is a primary characteristic or principle of ${title}?`,
        options: {
          A: `Core fundamental principle A of ${title}`,
          B: `Secondary auxiliary attribute B of ${title}`,
          C: `Alternative implementation feature C of ${title}`,
          D: `None of the above`,
        },
        correctOption: 'A',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 10 Mid
    for (let i = 1; i <= 10; i++) {
      generatedQuestions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: module._id,
        section: 'MID',
        questionNumber: i,
        questionText: `[${title}] Intermediate technical question #${i}: When developing applications using ${title}, what is the recommended best practice for optimization?`,
        options: {
          A: `Avoid structured caching`,
          B: `Follow standard modular design and lifecycle patterns in ${title}`,
          C: `Hardcode configuration parameters directly in components`,
          D: `Disable error boundaries and exception logging`,
        },
        correctOption: 'B',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 20 Advanced
    for (let i = 1; i <= 20; i++) {
      generatedQuestions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: module._id,
        section: 'ADVANCED',
        questionNumber: i,
        questionText: `[${title}] Advanced architecture scenario #${i}: How does the execution runtime or compiler handle concurrency and state mutations in ${title}?`,
        options: {
          A: `Through synchronous blocking execution loops`,
          B: `Using event delegation, immutability, and structured async handlers in ${title}`,
          C: `By ignoring thread safety and race conditions`,
          D: `By executing only on single-threaded legacy interpreters`,
        },
        correctOption: 'B',
        maximumMarks: 2,
        status: 'ACTIVE',
      });
    }

    // 4 Practical
    const practicalPrompts = [
      `Write a complete, syntactically correct code implementation demonstrating foundational syntax and algorithms for ${title}. Include parameter validation and expected return values.`,
      `Implement an error-resilient utility function in ${title} that handles edge cases such as null inputs, boundary values, and empty data collections.`,
      `Design and write an optimized data processing pipeline for ${title} that filters, transforms, and aggregates records efficiently.`,
      `Write an end-to-end practical solution solving an interactive real-world user workflow utilizing ${title} best practices.`,
    ];

    practicalPrompts.forEach((text, i) => {
      generatedQuestions.push({
        questionBankId: bank._id,
        courseId: course._id,
        moduleId: module._id,
        section: 'PRACTICAL',
        questionNumber: i + 1,
        questionText: `[${title} Practical Task #${i + 1}] ${text}`,
        maximumMarks: 5,
        status: 'ACTIVE',
      });
    });

    await Question.insertMany(generatedQuestions);
    await Module.findByIdAndUpdate(module._id, { questionBankId: bank._id });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'QUESTION_BANK_UPLOADED',
      entityType: 'QuestionBank',
      entityId: bank._id.toString(),
      newValues: {
        moduleId: module.moduleId,
        version,
        autoGenerated: true,
        counts: bank.sectionCounts,
      },
    });

    res.json({
      success: true,
      message: `Successfully generated starter question bank for "${title}"! (44 questions loaded)`,
      data: { bankId: bank._id, version, counts: bank.sectionCounts },
    });
  } catch (err) {
    console.error('Auto generate bank error:', err);
    res.status(500).json({ success: false, message: 'Failed to auto-generate question bank' });
  }
};
