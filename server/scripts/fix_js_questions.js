const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

function getCellValue(cell) {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (typeof v === 'object') {
    if ('text' in v && typeof v.text === 'string') return v.text.trim();
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map(r => r.text || '').join('').trim();
    if ('result' in v) return String(v.result ?? '').trim();
  }
  return String(v).trim();
}

function normalizeCorrectOption(raw) {
  let val = String(raw || '').toUpperCase().trim();
  if (val.startsWith('OPTION ')) val = val.replace('OPTION ', '').trim();
  if (val.startsWith('OPTION')) val = val.replace('OPTION', '').trim();
  if (val.endsWith('.') || val.endsWith(')')) val = val.slice(0, -1).trim();
  if (['1', '2', '3', '4'].includes(val)) {
    val = ['A', 'B', 'C', 'D'][Number(val) - 1];
  }
  return val;
}

function detectColumns(worksheet) {
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers.push({ col: colNumber, text: getCellValue(cell).toLowerCase().trim() });
  });

  let numCol, questionCol, optACol, optBCol, optCCol, optDCol, correctCol;

  for (const h of headers) {
    const t = h.text;
    if (/^(question\s*(no|number|num|\#)|q\.?\s*no\.?|sr\.?\s*no\.?|s\.?\s*no\.?|id|#)$/i.test(t)) {
      numCol = h.col;
    } else if (/^(question(\s*text|\s*statement|\s*title|\s*prompt)?|problem|statement)$/i.test(t)) {
      if (!questionCol || /text|statement|prompt/i.test(t)) questionCol = h.col;
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
      optACol = 2; optBCol = 3; optCCol = 4; optDCol = 5;
    } else {
      optACol = 3; optBCol = 4; optCCol = 5; optDCol = 6;
    }
  }

  if (!correctCol) {
    for (const c of [6, 7, 8]) {
      const val = normalizeCorrectOption(getCellValue(row2.getCell(c)));
      if (['A', 'B', 'C', 'D'].includes(val)) {
        correctCol = c;
        break;
      }
    }
    if (!correctCol) correctCol = optDCol ? optDCol + 1 : 7;
  }

  return { numCol, questionCol, optACol, optBCol, optCCol, optDCol, correctCol };
}

async function fix() {
  const uri = 'mongodb+srv://techmindsoftwareindia_db_user:5tk0pvrqGAQTob5q@cluster0.uooc2pa.mongodb.net/test?retryWrites=true&w=majority';
  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;

  const jsModule = await db.collection('modules').findOne({ title: /javascript/i });
  if (!jsModule) {
    console.error('JS Module not found!');
    return;
  }
  console.log('Found JS Module:', jsModule.title, jsModule._id);

  const bank = await db.collection('questionbanks').findOne({ moduleId: jsModule._id, status: 'ACTIVE' });
  if (!bank) {
    console.error('Active bank not found!');
    return;
  }
  console.log('Active bank:', bank._id, bank.sourceFileName);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/prath/Desktop/JavaScript_MCQ_4_Sheets_Normal_Level.xlsx');

  const sections = [
    { name: 'Basic', section: 'BASIC', marks: 2 },
    { name: 'Mid', section: 'MID', marks: 2 },
    { name: 'Advanced', section: 'ADVANCED', marks: 2 },
    { name: 'Practical', section: 'PRACTICAL', marks: 5 },
  ];

  const allQuestions = [];
  const counts = { basic: 0, mid: 0, advanced: 0, practical: 0 };

  for (const s of sections) {
    const ws = wb.worksheets.find(w => w.name.toLowerCase() === s.name.toLowerCase());
    if (!ws) {
      console.log('Missing worksheet:', s.name);
      continue;
    }
    const mapping = detectColumns(ws);
    console.log('Detected mapping for', s.name, ':', mapping);

    let qCount = 0;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const qText = getCellValue(row.getCell(mapping.questionCol));
      const cellA = mapping.optACol ? getCellValue(row.getCell(mapping.optACol)) : '';
      if (!qText && !cellA) return;

      qCount++;
      const A = mapping.optACol ? getCellValue(row.getCell(mapping.optACol)) : '';
      const B = mapping.optBCol ? getCellValue(row.getCell(mapping.optBCol)) : '';
      const C = mapping.optCCol ? getCellValue(row.getCell(mapping.optCCol)) : '';
      const D = mapping.optDCol ? getCellValue(row.getCell(mapping.optDCol)) : '';
      const rawCorrect = mapping.correctCol ? getCellValue(row.getCell(mapping.correctCol)) : '';
      const correctOption = normalizeCorrectOption(rawCorrect);

      allQuestions.push({
        questionBankId: bank._id,
        courseId: jsModule.courseId,
        moduleId: jsModule._id,
        section: s.section,
        questionNumber: qCount,
        questionText: qText,
        options: { A, B, C, D },
        correctOption: ['A', 'B', 'C', 'D'].includes(correctOption) ? correctOption : 'A',
        maximumMarks: s.marks,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    if (s.section === 'BASIC') counts.basic = qCount;
    if (s.section === 'MID') counts.mid = qCount;
    if (s.section === 'ADVANCED') counts.advanced = qCount;
    if (s.section === 'PRACTICAL') counts.practical = qCount;
    console.log(s.name, 'parsed:', qCount, 'questions');
  }

  console.log('Total parsed questions:', allQuestions.length, counts);

  // Delete old questions for this bank
  const delRes = await db.collection('questions').deleteMany({ questionBankId: bank._id });
  console.log('Deleted old questions:', delRes.deletedCount);

  // Insert newly parsed questions
  const insRes = await db.collection('questions').insertMany(allQuestions);
  console.log('Inserted fresh questions:', insRes.insertedCount);

  // Update bank section counts
  await db.collection('questionbanks').updateOne(
    { _id: bank._id },
    { $set: { sectionCounts: counts, updatedAt: new Date() } }
  );
  console.log('Updated questionbank counts');

  // Also remove in-progress exam attempts for this module so students don't have the old corrupted snapshot!
  const attRes = await db.collection('examattempts').deleteMany({ moduleId: jsModule._id, attemptStatus: 'IN_PROGRESS' });
  console.log('Cleared in-progress broken attempts:', attRes.deletedCount);

  await mongoose.disconnect();
  console.log('DONE!');
}

fix().catch(console.error);
