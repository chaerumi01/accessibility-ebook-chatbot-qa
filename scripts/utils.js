const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DEFAULT_DB_PATH = 'C:/Users/seocy/Downloads/(25)QA3000_데이터베이스.xlsx';
const DEFAULT_URL = 'https://www.nld.go.kr/eac/cert.do';

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readWorkbookRows(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath);
  const name = sheetName || workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
}

function writeWorkbook(filePath, sheets) {
  ensureDataDir();
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filePath);
}

function writeCsv(filePath, rows) {
  ensureDataDir();
  if (!rows.length) {
    fs.writeFileSync(filePath, '\uFEFF', 'utf8');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\r\n')}`, 'utf8');
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\u200b]+/g, '')
    .replace(/[“”‘’"'`.,!?()[\]{}<>:;·ㆍ…~\-_/\\|]/g, '');
}

function charNgrams(value, n = 2) {
  const text = normalizeText(value);
  const grams = new Set();
  if (!text) return grams;
  if (text.length <= n) {
    grams.add(text);
    return grams;
  }
  for (let i = 0; i <= text.length - n; i += 1) {
    grams.add(text.slice(i, i + n));
  }
  return grams;
}

function similarity(a, b) {
  const left = charNgrams(a);
  const right = charNgrams(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const gram of left) {
    if (right.has(gram)) hit += 1;
  }
  return hit / Math.max(left.size, right.size);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function noAnswerFlag(answer) {
  const text = normalizeText(answer);
  const patterns = [
    '응답할수없는질문',
    '응답찾을수없',
    '답변할수없는질문',
    '답변할수없',
    '응답할수없',
    '학습되지않',
    '알수없',
    '죄송',
    '이해하지못',
    '다시질문',
    '지원하지않',
  ];
  return patterns.some((pattern) => text.includes(pattern));
}

function buildSourceQuestionKeys(sourceQuestions) {
  return [...new Set(sourceQuestions.map((sourceQuestion) => normalizeText(sourceQuestion)).filter(Boolean))];
}

function sourceQuestionConflict(question, sourceQuestionKeys) {
  const key = normalizeText(question);
  if (!key) return true;
  return sourceQuestionKeys.some((sourceKey) => {
    return key === sourceKey || key.includes(sourceKey) || sourceKey.includes(key);
  });
}

function getChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

module.exports = {
  ROOT,
  DATA_DIR,
  DEFAULT_DB_PATH,
  DEFAULT_URL,
  ensureDataDir,
  getChromePath,
  buildSourceQuestionKeys,
  noAnswerFlag,
  normalizeText,
  parseArgs,
  readWorkbookRows,
  sourceQuestionConflict,
  similarity,
  writeCsv,
  writeWorkbook,
};
