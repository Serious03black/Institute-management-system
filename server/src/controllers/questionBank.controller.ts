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

interface ColumnMapping {
  numCol?: number;
  questionCol: number;
  optACol?: number;
  optBCol?: number;
  optCCol?: number;
  optDCol?: number;
  correctCol?: number;
}

function detectColumns(worksheet: ExcelJS.Worksheet): ColumnMapping {
  const headerRow = worksheet.getRow(1);
  const headers: { col: number; text: string }[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers.push({ col: colNumber, text: getCellValue(cell).toLowerCase().trim() });
  });

  let numCol: number | undefined;
  let questionCol: number | undefined;
  let optACol: number | undefined;
  let optBCol: number | undefined;
  let optCCol: number | undefined;
  let optDCol: number | undefined;
  let correctCol: number | undefined;

  for (const h of headers) {
    const t = h.text;
    if (/^(question\s*(no|number|num|\#)|q\.?\s*no\.?|sr\.?\s*no\.?|s\.?\s*no\.?|id|#)$/i.test(t)) {
      numCol = h.col;
    } else if (/^(question(\s*text|\s*statement|\s*title|\s*prompt)?|problem|statement)$/i.test(t)) {
      if (!questionCol || /text|statement|prompt/i.test(t)) {
        questionCol = h.col;
      }
    } else if (/^(option\s*a|opt\s*a|\(a\)|a)$/i.test(t)) {
      optACol = h.col;
    } else if (/^(option\s*b|opt\s*b|\(b\)|b)$/i.test(t)) {
      optBCol = h.col;
    } else if (/^(option\s*c|opt\s*c|\(c\)|c)$/i.test(t)) {
      optCCol = h.col;
    } else if (/^(option\s*d|opt\s*d|\(d\)|d)$/i.test(t)) {
      optDCol = h.col;
    } else if (/^(correct\s*(option|answer|choice)?|answer|ans|correct)$/i.test(t)) {
      correctCol = h.col;
    }
  }

  // Fallbacks if header matching did not detect columns:
  const row2 = worksheet.getRow(2);
  const cell1 = getCellValue(row2.getCell(1));
  const cell2 = getCellValue(row2.getCell(2));

  if (!questionCol) {
    if (!isNaN(Number(cell1)) && cell1 !== '' && cell2.length > 5) {
      numCol = 1;
      questionCol = 2;
    } else {
      questionCol = 1;
    }
  }

  if (!optACol) {
    if (questionCol === 1) {
      optACol = 2;
      optBCol = 3;
      optCCol = 4;
      optDCol = 5;
    } else {
      optACol = 3;
      optBCol = 4;
      optCCol = 5;
      optDCol = 6;
    }
  }

  if (!correctCol) {
    const possibleCols = [6, 7, 8];
    for (const c of possibleCols) {
      const val = normalizeCorrectOption(getCellValue(row2.getCell(c)));
      if (['A', 'B', 'C', 'D'].includes(val)) {
        correctCol = c;
        break;
      }
    }
    if (!correctCol) {
      correctCol = optDCol ? optDCol + 1 : 7;
    }
  }

  return { numCol, questionCol, optACol, optBCol, optCCol, optDCol, correctCol };
}

async function parseSheet(worksheet: ExcelJS.Worksheet, section: SectionName): Promise<ParsedQuestion[]> {
  const questions: ParsedQuestion[] = [];
  const seenNumbers = new Set<number>();
  const mapping = detectColumns(worksheet);

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row

    // Question number
    let qNum = questions.length + 1;
    if (mapping.numCol) {
      const cellNum = getCellValue(row.getCell(mapping.numCol));
      const parsedNum = Number(cellNum);
      if (cellNum && !isNaN(parsedNum)) {
        qNum = parsedNum;
      }
    }

    const qText = getCellValue(row.getCell(mapping.questionCol));

    // Silently skip completely empty rows
    const cellA = mapping.optACol ? getCellValue(row.getCell(mapping.optACol)) : '';
    if (!qText && !cellA) return;

    const errors: string[] = [];
    if (!qText) {
      errors.push(`Row ${rowNumber}: Empty question text`);
    }

    if (seenNumbers.has(qNum)) {
      qNum = questions.length + 1;
    }
    seenNumbers.add(qNum);

    if (section !== 'PRACTICAL') {
      const A = mapping.optACol ? getCellValue(row.getCell(mapping.optACol)) : '';
      const B = mapping.optBCol ? getCellValue(row.getCell(mapping.optBCol)) : '';
      const C = mapping.optCCol ? getCellValue(row.getCell(mapping.optCCol)) : '';
      const D = mapping.optDCol ? getCellValue(row.getCell(mapping.optDCol)) : '';
      const rawCorrect = mapping.correctCol ? getCellValue(row.getCell(mapping.correctCol)) : '';
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
      // Practical section: Check if this sheet has MCQ options or open coding prompt
      const A = mapping.optACol ? getCellValue(row.getCell(mapping.optACol)) : '';
      const B = mapping.optBCol ? getCellValue(row.getCell(mapping.optBCol)) : '';
      const C = mapping.optCCol ? getCellValue(row.getCell(mapping.optCCol)) : '';
      const D = mapping.optDCol ? getCellValue(row.getCell(mapping.optDCol)) : '';
      const rawCorrect = mapping.correctCol ? getCellValue(row.getCell(mapping.correctCol)) : '';
      const correct = normalizeCorrectOption(rawCorrect);

      if (A && B && C && D && ['A', 'B', 'C', 'D'].includes(correct)) {
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

async function recalculateBankCounts(bankId: any): Promise<void> {
  const bank = await QuestionBank.findById(bankId);
  if (!bank) return;
  const basic = await Question.countDocuments({ questionBankId: bank._id, section: 'BASIC', status: 'ACTIVE' });
  const mid = await Question.countDocuments({ questionBankId: bank._id, section: 'MID', status: 'ACTIVE' });
  const advanced = await Question.countDocuments({ questionBankId: bank._id, section: 'ADVANCED', status: 'ACTIVE' });
  const practical = await Question.countDocuments({ questionBankId: bank._id, section: 'PRACTICAL', status: 'ACTIVE' });
  bank.sectionCounts = { basic, mid, advanced, practical };
  await bank.save();
}

export const getQuestionBankQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      res.status(404).json({ success: false, message: 'Question bank not found' });
      return;
    }
    const questions = await Question.find({ questionBankId: bank._id })
      .select('+correctOption')
      .sort({ questionNumber: 1 });
    res.json({ success: true, data: questions });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { questionText, section, options, correctOption, maximumMarks } = req.body;

    const question = await Question.findById(id).select('+correctOption');
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    if (questionText !== undefined) question.questionText = questionText.trim();
    if (section && ['BASIC', 'MID', 'ADVANCED', 'PRACTICAL'].includes(section)) {
      question.section = section;
    }
    if (options !== undefined) {
      question.options = {
        A: options?.A?.trim() || '',
        B: options?.B?.trim() || '',
        C: options?.C?.trim() || '',
        D: options?.D?.trim() || '',
      };
    }
    if (correctOption !== undefined) {
      question.correctOption = ['A', 'B', 'C', 'D'].includes(String(correctOption).toUpperCase())
        ? (String(correctOption).toUpperCase() as 'A' | 'B' | 'C' | 'D')
        : undefined;
    }
    if (maximumMarks !== undefined && !isNaN(Number(maximumMarks))) {
      question.maximumMarks = Number(maximumMarks);
    }

    await question.save();
    await recalculateBankCounts(question.questionBankId);

    await writeAuditLog({
      actorId: req.admin?.adminId || 'admin',
      action: 'QUESTION_UPDATED',
      entityType: 'Question',
      entityId: question._id.toString(),
      newValues: {
        questionText: question.questionText,
        section: question.section,
        options: question.options,
        correctOption: question.correctOption,
        maximumMarks: question.maximumMarks,
      },
    });

    res.json({ success: true, message: 'Question updated successfully', data: question });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    const bankId = question.questionBankId;
    await Question.findByIdAndDelete(id);
    await recalculateBankCounts(bankId);

    await writeAuditLog({
      actorId: req.admin?.adminId || 'admin',
      action: 'QUESTION_DELETED',
      entityType: 'Question',
      entityId: id,
      newValues: { questionBankId: bankId.toString() },
    });

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};

export const addQuestionToBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      res.status(404).json({ success: false, message: 'Question bank not found' });
      return;
    }

    const { questionText, section, options, correctOption, maximumMarks } = req.body;
    if (!questionText || !section) {
      res.status(400).json({ success: false, message: 'Question text and section are required' });
      return;
    }

    const lastQ = await Question.findOne({ questionBankId: bank._id }).sort({ questionNumber: -1 });
    const questionNumber = (lastQ?.questionNumber || 0) + 1;

    const newQ = await Question.create({
      questionBankId: bank._id,
      courseId: bank.courseId,
      moduleId: bank.moduleId,
      section,
      questionNumber,
      questionText: questionText.trim(),
      options: section !== 'PRACTICAL' ? options : undefined,
      correctOption: section !== 'PRACTICAL' ? correctOption : undefined,
      maximumMarks: maximumMarks ? Number(maximumMarks) : (section === 'PRACTICAL' ? 5 : 2),
      status: 'ACTIVE',
    });

    await recalculateBankCounts(bank._id);

    await writeAuditLog({
      actorId: req.admin?.adminId || 'admin',
      action: 'QUESTION_CREATED',
      entityType: 'Question',
      entityId: newQ._id.toString(),
      newValues: { questionNumber, section, questionText },
    });

    res.status(201).json({ success: true, message: 'Question added successfully', data: newQ });
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ success: false, message: 'Failed to add question' });
  }
};

export const deleteQuestionBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      res.status(404).json({ success: false, message: 'Question bank not found' });
      return;
    }

    await Question.deleteMany({ questionBankId: bank._id });
    await QuestionBank.findByIdAndDelete(bank._id);

    // If module referenced this bank, reset reference
    await Module.findByIdAndUpdate(bank.moduleId, { $unset: { questionBankId: 1 } });

    await writeAuditLog({
      actorId: req.admin?.adminId || 'admin',
      action: 'QUESTION_BANK_DELETED',
      entityType: 'QuestionBank',
      entityId: bank._id.toString(),
    });

    res.json({ success: true, message: 'Question bank and all associated questions deleted successfully' });
  } catch (err) {
    console.error('Delete question bank error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question bank' });
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
