const fs = require('fs');
const path = require('path');
const { DATA_DIR, normalizeText, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const START_NO = 241;
const TARGET_COUNT = 200;
const OUTPUT_BASE = 'mixed_user_questions_200_day3';

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const previousQuestionKeys = loadPreviousQuestionKeys();

const rows = [];
for (const row of sourceRows) {
  if (Number(row.no) < START_NO) continue;
  if (hasBlockedTopic(row)) continue;

  const key = normalizeText(row.generated_question || row.question);
  if (!key || previousQuestionKeys.has(key)) continue;

  rows.push({
    no: START_NO + rows.length,
    category: row.category || '',
    intent: row.intent || '',
    test_focus: row.source_question || row.test_focus || '',
    generated_question: row.generated_question || row.question || '',
    expected_answer: row.expected_answer || '',
    source_category: row.category || '',
    source_no: row.no || '',
  });

  previousQuestionKeys.add(key);
  if (rows.length >= TARGET_COUNT) break;
}

if (rows.length !== TARGET_COUNT) {
  throw new Error(`Expected ${TARGET_COUNT} questions, got ${rows.length}`);
}

const missingAnswers = rows.filter((row) => !row.expected_answer);
if (missingAnswers.length) {
  throw new Error(`Missing expected answers: ${missingAnswers.map((row) => row.no).join(', ')}`);
}

const duplicateCount = rows.length - new Set(rows.map((row) => normalizeText(row.generated_question))).size;
if (duplicateCount) {
  throw new Error(`Duplicate generated questions in output: ${duplicateCount}`);
}

const xlsxPath = path.join(DATA_DIR, `${OUTPUT_BASE}.xlsx`);
const csvPath = path.join(DATA_DIR, `${OUTPUT_BASE}.csv`);
writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
console.log(`rows: ${rows.length}`);
console.log(`first no: ${rows[0].no}`);
console.log(`last no: ${rows[rows.length - 1].no}`);

function loadPreviousQuestionKeys() {
  const keys = new Set();
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => /^mixed_user_questions_.*\.xlsx$/i.test(file) && file !== `${OUTPUT_BASE}.xlsx`);

  for (const file of files) {
    const rows = readWorkbookRows(path.join(DATA_DIR, file));
    for (const row of rows) {
      const key = normalizeText(row.generated_question || row.question);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function hasBlockedTopic(row) {
  return /svg/i.test([row.generated_question, row.source_question, row.expected_answer].join(' '));
}
