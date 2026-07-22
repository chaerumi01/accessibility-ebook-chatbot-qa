const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { chromium } = require('playwright');
const {
  DATA_DIR,
  DEFAULT_URL,
  getChromePath,
  noAnswerFlag,
  parseArgs,
  readWorkbookRows,
  similarity,
  writeCsv,
  writeWorkbook,
} = require('./utils');

const args = parseArgs();
const questionFile = args['question-file'] || path.join(DATA_DIR, 'questions_2000.xlsx');
const resultFile = args['result-file'] || path.join(DATA_DIR, 'chatbot_results.xlsx');
const resultCsv = resultFile.replace(/\.xlsx$/i, '.csv');
const url = args.url || DEFAULT_URL;
const delayMs = Number(args['delay-ms'] || 5000);
const limit = args.limit ? Number(args.limit) : Infinity;
const offset = Number(args.offset || 0);
const headless = !args.headful;
const timeoutMs = Number(args['timeout-ms'] || 45000);
const navTimeoutMs = Number(args['nav-timeout-ms'] || 120000);

async function main() {
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error('Chrome/Edge 실행 파일을 찾지 못했습니다. CHROME_PATH 환경변수로 지정하세요.');
  }

  const questions = readWorkbookRows(questionFile).map(normalizeQuestionRow);
  const existing = loadExistingResults(resultFile);
  const done = new Set(existing.map((row) => row.generated_question || row.question));
  const queue = questions
    .slice(offset)
    .filter((row) => !done.has(row.generated_question))
    .slice(0, limit);

  console.log(`questions: ${questions.length}`);
  console.log(`existing results: ${existing.length}`);
  console.log(`queue: ${queue.length}`);
  console.log(`delay-ms: ${delayMs}`);

  if (!queue.length) return;

  const browser = await chromium.launch({
    headless,
    executablePath: chromePath,
  });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
    await openChat(page);

    const results = [...existing];
    for (const item of queue) {
      const startedAt = new Date();
      const result = await ask(page, item, timeoutMs).catch((error) => ({
        ...baseResult(item, startedAt),
        status: 'error',
        answer: '',
        elapsed_ms: Date.now() - startedAt.getTime(),
        similarity: 0,
        no_answer: false,
        error: error.message || String(error),
      }));

      results.push(result);
      writeWorkbook(resultFile, { results });
      writeCsv(resultCsv, results);

      console.log(
        `[${results.length}] ${result.status} ${result.intent} no_answer=${result.no_answer} sim=${result.similarity} ${item.generated_question}`,
      );

      await page.waitForTimeout(delayMs);
    }
  } finally {
    await browser.close();
  }
}

async function openChat(page) {
  const legacyInput = page.locator('#c_input');
  const currentInput = page.locator('#inputText');

  if (await legacyInput.isVisible()) return;
  if (await currentInput.isVisible()) return;

  const currentButton = page.locator('.chat-bot-btn');
  if (await currentButton.isVisible()) {
    await currentButton.click({ timeout: 10000 });
    await currentInput.waitFor({ state: 'visible', timeout: 10000 });
    return;
  }

  await page.locator('a.chatbot').click({ timeout: 10000 });
  await legacyInput.waitFor({ state: 'visible', timeout: 10000 });
}

async function ask(page, item, timeoutMs) {
  const startedAt = new Date();
  let answer = '';

  if (await page.locator('#inputText').isVisible()) {
    const before = await page.locator('#chatContainer .qna-bx.chat-bot').count();
    await page.locator('#inputText').fill(item.generated_question);
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      (count) => document.querySelectorAll('#chatContainer .qna-bx.chat-bot').length > count,
      before,
      { timeout: timeoutMs },
    );
    answer = await page.locator('#chatContainer .qna-bx.chat-bot').last().innerText({ timeout: 5000 });
  } else {
    const before = await page.locator('.chat_cont .cc_item').count();
    await page.locator('#c_input').fill(item.generated_question);
    await page.keyboard.press('Enter');

    await page.waitForFunction(
      (count) => document.querySelectorAll('.chat_cont .cc_item').length >= count + 2,
      before,
      { timeout: timeoutMs },
    );

    answer = await page
      .locator('.chat_cont .cc_item:not(.you) .c_item')
      .last()
      .innerText({ timeout: 5000 });
  }

  const score = similarity(item.expected_answer, answer);
  return {
    ...baseResult(item, startedAt),
    status: 'ok',
    answer,
    elapsed_ms: Date.now() - startedAt.getTime(),
    similarity: Number(score.toFixed(4)),
    no_answer: noAnswerFlag(answer),
    error: '',
  };
}

function baseResult(item, startedAt) {
  return {
    no: item.no,
    category: item.category,
    intent: item.intent,
    test_focus: item.test_focus || '',
    keywords: item.keywords || '',
    novelty: item.novelty || '',
    nearest_db_intent: item.nearest_db_intent || '',
    nearest_db_question: item.nearest_db_question || '',
    nearest_db_answer: item.nearest_db_answer || '',
    nearest_db_similarity: item.nearest_db_similarity || '',
    generated_question: item.generated_question,
    expected_answer: item.expected_answer,
    asked_at: startedAt.toISOString(),
  };
}

function normalizeQuestionRow(row, index) {
  return {
    no: row.no || index + 1,
    category: row.category || '',
    intent: row.intent || '',
    test_focus: row.test_focus || '',
    keywords: row.keywords || '',
    novelty: row.novelty || '',
    nearest_db_intent: row.nearest_db_intent || '',
    nearest_db_question: row.nearest_db_question || '',
    nearest_db_answer: row.nearest_db_answer || '',
    nearest_db_similarity: row.nearest_db_similarity || '',
    generated_question: row.generated_question || row.question || '',
    expected_answer: row.expected_answer || row.reference_answer || row.answer || '',
  };
}

function loadExistingResults(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
