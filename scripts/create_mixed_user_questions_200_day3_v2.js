const fs = require('fs');
const path = require('path');
const { DATA_DIR, normalizeText, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const START_NO = 241;
const TARGET_COUNT = 200;
const OUTPUT_BASE = 'mixed_user_questions_200_day3_v2';

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const previousQuestionKeys = loadPreviousQuestionKeys();
const sourceQuestionKeys = new Set();
const rows = [];

for (const row of sourceRows) {
  if (Number(row.no) < START_NO) continue;
  if (hasBlockedTopic(row)) continue;

  const sourceQuestion = clean(row.source_question || row.generated_question || row.question);
  const sourceKey = normalizeText(sourceQuestion);
  if (!sourceKey || sourceQuestionKeys.has(sourceKey)) continue;

  sourceQuestionKeys.add(sourceKey);
  const generatedQuestion = buildPracticalQuestion(sourceQuestion, rows.length);
  const generatedKey = normalizeText(generatedQuestion);
  if (!generatedKey || previousQuestionKeys.has(generatedKey)) continue;

  rows.push({
    no: START_NO + rows.length,
    category: sourceCategoryToMixedCategory(row.category, rows.length),
    intent: row.intent || '',
    test_focus: sourceQuestion,
    generated_question: generatedQuestion,
    expected_answer: row.expected_answer || '',
    source_category: row.category || '',
    source_no: row.no || '',
  });

  previousQuestionKeys.add(generatedKey);
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

function buildPracticalQuestion(sourceQuestion, index) {
  const stem = clean(sourceQuestion).replace(/[?？]\s*$/, '');
  const templates = [
    `${stem}. 실무 기준으로 답해주세요.`,
    `${stem}. 초보 제작자가 따라 할 수 있게 알려주세요.`,
    `${stem}. 검수할 때 먼저 확인할 부분이 뭔가요?`,
    `${stem}. 그대로 둬도 되는지, 수정해야 하는지 알려주세요.`,
  ];
  return polish(templates[index % templates.length]);
}

function polish(value) {
  return clean(value)
    .replace(/\.\./g, '.')
    .replace(/요\.\s*실무/g, '요? 실무')
    .replace(/요\.\s*초보/g, '요? 초보')
    .replace(/요\.\s*검수/g, '요? 검수')
    .replace(/요\.\s*그대로/g, '요? 그대로')
    .replace(/니다\.\s*실무/g, '니다. 실무')
    .replace(/니다\.\s*초보/g, '니다. 초보')
    .replace(/니다\.\s*검수/g, '니다. 검수')
    .replace(/니다\.\s*그대로/g, '니다. 그대로')
    .replace(/\?\?+/g, '?')
    .trim();
}

function sourceCategoryToMixedCategory(sourceCategory, index) {
  if (index % 2 === 0) return 'db_rephrase';
  return sourceCategory ? `practical_${sourceCategory}` : 'practical';
}

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

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}
