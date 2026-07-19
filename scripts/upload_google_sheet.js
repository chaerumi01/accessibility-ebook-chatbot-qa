const path = require('path');
const { google } = require('googleapis');
const { DATA_DIR, parseArgs, readWorkbookRows } = require('./utils');

const args = parseArgs();
const resultFile = args['result-file'] || path.join(DATA_DIR, 'chatbot_results.xlsx');
const spreadsheetId = args['sheet-id'] || process.env.GOOGLE_SHEET_ID || '';
const sheetNameArg = args['sheet-name'] || process.env.GOOGLE_SHEET_NAME || '';
const typeField = args['type-field'] || '';
const startCell = args['start-cell'] || 'B2';
const dryRun = Boolean(args['dry-run']);
const mode = args.mode || 'append';
const DOMAIN_TYPES = new Set([
  '접근성',
  '객체',
  '문법/태그구조',
  '표',
  '링크',
  '메타데이터',
  'EPUB 구조',
  '스타일/CSS',
  '목차/탐색',
  '기타',
]);

async function main() {
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID 환경변수 또는 --sheet-id 옵션이 필요합니다.');
  }
  if (!dryRun && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 JSON 경로를 지정하세요.');
  }

  const rows = readWorkbookRows(resultFile);
  if (!rows.length) {
    console.log('업로드할 결과가 없습니다.');
    return;
  }

  const values = rows.map((row) => [
    resolveType(row),
    firstValue(row, ['generated_question', 'question']),
    firstValue(row, ['answer', 'chatbot_answer', '챗봇답변']),
  ]);

  if (dryRun) {
    console.log(`dry-run rows: ${values.length}`);
    console.log(JSON.stringify(values.slice(0, 10), null, 2));
    return;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = await resolveSheetName(sheets, spreadsheetId, sheetNameArg);
  const targetCell = mode === 'overwrite' ? startCell : await findAppendCell(sheets, spreadsheetId, sheetName);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!${targetCell}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log(`uploaded rows: ${rows.length}`);
  console.log(`sheet: ${sheetName}`);
  console.log(`mode: ${mode}`);
  console.log(`start: ${targetCell}`);
}

async function resolveSheetName(sheets, spreadsheetId, sheetName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  if (sheetName) {
    const exists = spreadsheet.data.sheets.some((sheet) => sheet.properties.title === sheetName);
    if (!exists) {
      throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
    }
    return sheetName;
  }

  const gidZeroSheet = spreadsheet.data.sheets.find((sheet) => sheet.properties.sheetId === 0);
  const targetSheet = gidZeroSheet || spreadsheet.data.sheets[0];
  if (!targetSheet) {
    throw new Error('스프레드시트에 시트가 없습니다.');
  }
  return targetSheet.properties.title;
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return '';
}

async function findAppendCell(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!B:D`,
  });
  const values = response.data.values || [];
  let lastFilledIndex = 0;
  values.forEach((row, index) => {
    if (row.some((cell) => String(cell || '').trim() !== '')) {
      lastFilledIndex = index + 1;
    }
  });
  return `B${Math.max(lastFilledIndex + 1, 2)}`;
}

function resolveType(row) {
  if (typeField) return firstValue(row, [typeField]);
  if (DOMAIN_TYPES.has(row.category)) return row.category;

  const primaryText = normalizeForType(
    [
      row.test_focus,
      row.keywords,
      row.generated_question,
      row.question,
      row.nearest_db_question,
      row.source_question,
    ].join(' '),
  );
  const secondaryText = normalizeForType([row.expected_answer, row.answer, row.nearest_db_answer].join(' '));

  const rules = [
    ['표', ['표관련', '표구조', '표작성', '표는', '표를', '표의', '표에', '표에서', '데이터표', '테이블', 'table', 'caption', 'thead', 'tbody', 'tfoot', 'scope', 'headers', '셀']],
    ['메타데이터', ['메타데이터', 'metadata', 'dc:', 'dc-', 'title', 'creator', 'publisher', 'identifier', 'language', 'lang', '언어', 'modified', 'rendition', 'schema', 'isbn', '제목정보', '저자정보', '출판사']],
    ['스타일/CSS', ['css', '스타일', '폰트', 'font', '글꼴', '색상', '여백', '레이아웃', 'display', 'position']],
    ['EPUB 구조', ['epub', 'opf', 'xhtml', 'html', 'manifest', 'spine', 'resource', '리소스', '파일', '경로', '확장자', '패키지']],
    ['이미지/대체텍스트', ['이미지', '그림', '사진', '삽화', '도표', '그래프', 'img', 'cover', 'alt', '대체텍스트', '대체 텍스트', '이미지설명', '이미지 설명']],
    ['목차/탐색', ['목차', '탐색', '내비게이션', '네비게이션', 'nav', 'toc', 'landmark', 'page-list', 'pagelist', '페이지목록', '페이지 목록']],
    ['링크', ['링크', '하이퍼링크', 'href', 'url', 'uri', '외부링크', '내부링크', '앵커']],
    ['문서구조', ['태그', '문법', '문단', '제목', '헤딩', 'heading', 'h1', 'h2', 'h3', 'section', 'article', 'aside', 'body', 'div', 'span', 'br', 'li', 'ul', 'ol', 'blockquote', '본문구조', '문서구조']],
    ['멀티미디어', ['오디오', '비디오', '동영상', 'audio', 'video', '자막', '캡션', '미디어']],
    ['접근성', ['접근성', '스크린리더', '스크린 리더', '화면낭독기', '장애인', 'aria', 'role', '시맨틱', 'semantic', '독서장애인', '보조공학', '입력칸', '레이블']],
    ['오류', ['오류', '에러', '경고', '검사', '검증', 'epubcheck', 'rsc_', 'opf_', 'nav_', 'acc_', 'css_', 'htm_', 'fatal', 'warning', 'error']],
  ];

  return matchType(primaryText, rules) || matchType(secondaryText, rules) || '기타';
}

function matchType(text, rules) {
  const matched = rules.find(([, keywords]) => keywords.some((keyword) => text.includes(normalizeForType(keyword))));
  return matched ? matched[0] : '';
}

function normalizeForType(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
