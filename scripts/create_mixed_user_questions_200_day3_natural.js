const fs = require('fs');
const path = require('path');
const { DATA_DIR, normalizeText, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const START_NO = 241;
const TARGET_COUNT = 200;
const OUTPUT_BASE = 'mixed_user_questions_200_day3_natural';
const CATEGORY_ORDER = ['L', 'M', 'N'];
const BANNED_PHRASES = [
  '실무 기준',
  '초보 제작자',
  '검수할 때 먼저',
  '그대로 둬도 되는지',
  '따라 할 수 있게',
  '답해주세요',
];

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const previousQuestionKeys = loadPreviousQuestionKeys();
const candidatesByCategory = buildCandidatesByCategory(sourceRows);
const categoryQueues = new Map(
  CATEGORY_ORDER.map((category) => [category, buildIntentRoundRobinQueue(candidatesByCategory.get(category) || [])]),
);

const rows = [];
let cursor = 0;
let guard = 0;

while (rows.length < TARGET_COUNT && guard < TARGET_COUNT * 20) {
  const category = CATEGORY_ORDER[cursor % CATEGORY_ORDER.length];
  const queue = categoryQueues.get(category) || [];
  const candidate = queue.shift();

  if (candidate) {
    rows.push({
      no: START_NO + rows.length,
      category: candidate.category,
      intent: candidate.intent,
      test_focus: candidate.intentFocus,
      generated_question: candidate.question,
      expected_answer: candidate.expectedAnswer,
      source_category: candidate.category,
      source_no: candidate.sourceNo,
    });
  }

  cursor += 1;
  guard += 1;
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

function buildCandidatesByCategory(rows) {
  const byCategory = new Map();
  const seenSourceQuestions = new Set();

  for (const row of rows) {
    const question = clean(row.source_question || row.question || row.generated_question);
    const key = normalizeText(question);
    if (!question || !key || seenSourceQuestions.has(key)) continue;
    if (previousQuestionKeys.has(key)) continue;
    if (hasBlockedTopic(row) || hasBannedPhrase(question)) continue;
    if (!row.expected_answer) continue;

    seenSourceQuestions.add(key);
    const category = row.category || 'N';
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push({
      category,
      intent: row.intent || '',
      intentFocus: inferFocus(question),
      question,
      expectedAnswer: row.expected_answer,
      sourceNo: row.no || '',
    });
  }

  return byCategory;
}

function buildIntentRoundRobinQueue(candidates) {
  const byIntent = new Map();
  for (const candidate of candidates) {
    if (!byIntent.has(candidate.intent)) byIntent.set(candidate.intent, []);
    byIntent.get(candidate.intent).push(candidate);
  }

  const intents = [...byIntent.keys()].sort((a, b) => a.localeCompare(b));
  const queue = [];
  let added = true;

  while (added) {
    added = false;
    for (const intent of intents) {
      const group = byIntent.get(intent);
      if (group && group.length) {
        queue.push(group.shift());
        added = true;
      }
    }
  }

  return queue;
}

function inferFocus(question) {
  const rules = [
    [/alt|대체\s*텍스트|이미지 설명/i, '대체텍스트'],
    [/표|table|tr|td|th/i, '표 구조'],
    [/목차|nav|TOC/i, '목차/탐색'],
    [/메타|accessibility|accessMode|bookid|identifier/i, '메타데이터'],
    [/CSS|스타일|font|letter-spacing|간격/i, '스타일/CSS'],
    [/링크|href|id|주석|미주/i, '링크/주석'],
    [/role|aria|헤딩|h1|h2|h3|heading/i, '문서구조'],
    [/EPUB|ACE|검사|오류|에러|manifest|spine|OPF/i, '검사 오류'],
  ];
  const hit = rules.find(([pattern]) => pattern.test(question));
  return hit ? hit[1] : '제작 실무';
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

function hasBannedPhrase(value) {
  return BANNED_PHRASES.some((phrase) => value.includes(phrase));
}

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}
