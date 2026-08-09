const path = require('path');
const { google } = require('googleapis');
const { DATA_DIR, parseArgs, readWorkbookRows } = require('./utils');

const args = parseArgs();
const resultFile = args['result-file'] || path.join(DATA_DIR, 'provisional_chatbot_results_250_2026-08-09.xlsx');
const credentialFile =
  args.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '..', 'service_account.json');
const requestedSpreadsheetId = args['sheet-id'] || process.env.GOOGLE_SHEET_ID || '';
const requestedSheetName = args['sheet-name'] || process.env.GOOGLE_SHEET_NAME || '';
const dryRun = Boolean(args['dry-run']);

async function main() {
  const results = readWorkbookRows(resultFile).filter((row) => questionOf(row) && row.status === 'ok');
  if (!results.length) throw new Error('기록할 정상 챗봇 결과가 없습니다.');

  const answerByQuestion = new Map(results.map((row) => [questionOf(row), String(row.answer || '')]));
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialFile,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const target = requestedSpreadsheetId
    ? await findTargetInSpreadsheet(sheets, requestedSpreadsheetId, requestedSheetName, answerByQuestion)
    : await discoverTarget(auth, sheets, requestedSheetName, answerByQuestion);

  if (!target) {
    throw new Error('서비스 계정에 공유된 Google 시트에서 결과 질문과 일치하는 행을 찾지 못했습니다.');
  }

  const updates = target.matches.map(({ rowNumber, question }) => ({
    range: `${quoteSheetName(target.sheetName)}!D${rowNumber}`,
    values: [[answerByQuestion.get(question)]],
  }));

  console.log(`spreadsheet: ${target.spreadsheetName || target.spreadsheetId}`);
  console.log(`sheet: ${target.sheetName}`);
  console.log(`matched rows: ${updates.length}/${answerByQuestion.size}`);
  if (updates.length !== answerByQuestion.size) {
    throw new Error('일부 질문이 시트와 일치하지 않아 답변 기록을 중단했습니다. 질문이 모두 일치하는지 확인하세요.');
  }
  if (dryRun) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: target.spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
  console.log(`updated answers: ${updates.length}`);
}

async function discoverTarget(auth, sheets, requestedSheetName, answerByQuestion) {
  const drive = google.drive({ version: 'v3', auth });
  let pageToken;
  do {
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'nextPageToken,files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
      pageToken,
    });
    for (const file of response.data.files || []) {
      const target = await findTargetInSpreadsheet(sheets, file.id, requestedSheetName, answerByQuestion);
      if (target) return { ...target, spreadsheetName: file.name };
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return null;
}

async function findTargetInSpreadsheet(sheets, spreadsheetId, requestedSheetName, answerByQuestion) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title,sheets.properties' });
  const candidates = (metadata.data.sheets || [])
    .map((sheet) => sheet.properties.title)
    .filter((name) => !requestedSheetName || name === requestedSheetName);

  for (const sheetName of candidates) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!C:C`,
    });
    const rows = response.data.values || [];
    const matches = [];
    rows.forEach((row, index) => {
      const question = String(row[0] || '').trim();
      if (answerByQuestion.has(question)) matches.push({ rowNumber: index + 1, question });
    });
    if (matches.length) {
      return { spreadsheetId, spreadsheetName: metadata.data.properties.title, sheetName, matches };
    }
  }
  return null;
}

function questionOf(row) {
  return String(row.generated_question || row.question || '').trim();
}

function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
