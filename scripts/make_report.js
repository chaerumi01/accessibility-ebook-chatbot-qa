const path = require('path');
const {
  DATA_DIR,
  noAnswerFlag,
  parseArgs,
  readWorkbookRows,
  similarity,
  writeWorkbook,
} = require('./utils');

const args = parseArgs();
const resultFile = args['result-file'] || path.join(DATA_DIR, 'chatbot_results.xlsx');
const reportFile = args['report-file'] || path.join(DATA_DIR, 'chatbot_report.xlsx');
const threshold = Number(args.threshold || 0.35);

function main() {
  const rows = readWorkbookRows(resultFile).map((row) => {
    const hasExpected = Boolean(row.expected_answer);
    const sim = hasExpected ? Number(row.similarity || similarity(row.expected_answer, row.answer)) : '';
    const noAnswer = Boolean(row.no_answer) || noAnswerFlag(row.answer);
    const tooShort = row.status === 'ok' && !noAnswer && String(row.answer || '').trim().length < 25;
    return {
      ...row,
      similarity: hasExpected ? Number(sim.toFixed(4)) : '',
      no_answer: noAnswer,
      too_short: tooShort,
      needs_review: row.status !== 'ok' || noAnswer || tooShort || (hasExpected && sim < threshold),
    };
  });

  const summary = buildSummary(rows);
  const byIntent = buildIntentStats(rows);
  const noAnswerRows = rows.filter((row) => row.no_answer);
  const lowSimilarity = rows
    .filter((row) => row.expected_answer && !row.no_answer && row.status === 'ok' && row.similarity < threshold)
    .sort((a, b) => a.similarity - b.similarity);
  const tooShort = rows.filter((row) => row.too_short);
  const errors = rows.filter((row) => row.status !== 'ok');

  writeWorkbook(reportFile, {
    summary,
    by_intent: byIntent,
    no_answer: noAnswerRows,
    too_short: tooShort,
    low_similarity: lowSimilarity,
    errors,
    all_results: rows,
  });

  console.log(`results: ${rows.length}`);
  console.log(`no_answer: ${noAnswerRows.length}`);
  console.log(`too_short: ${tooShort.length}`);
  console.log(`low_similarity: ${lowSimilarity.length}`);
  console.log(`errors: ${errors.length}`);
  console.log(`report: ${reportFile}`);
}

function buildSummary(rows) {
  const total = rows.length;
  const ok = rows.filter((row) => row.status === 'ok').length;
  const noAnswer = rows.filter((row) => row.no_answer).length;
  const errors = rows.filter((row) => row.status !== 'ok').length;
  const lowSimilarity = rows.filter(
    (row) => row.expected_answer && !row.no_answer && row.status === 'ok' && Number(row.similarity) < threshold,
  ).length;
  const tooShort = rows.filter((row) => row.too_short).length;
  const avgSimilarity = average(rows.filter((row) => row.status === 'ok').map((row) => Number(row.similarity)));

  return [
    { metric: 'total', value: total },
    { metric: 'ok', value: ok },
    { metric: 'error', value: errors },
    { metric: 'no_answer', value: noAnswer },
    { metric: 'too_short', value: tooShort },
    { metric: 'low_similarity', value: lowSimilarity },
    { metric: 'needs_review', value: noAnswer + errors + tooShort + lowSimilarity },
    { metric: 'avg_similarity', value: Number(avgSimilarity.toFixed(4)) },
    { metric: 'threshold', value: threshold },
  ];
}

function buildIntentStats(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.intent || '(empty)';
    if (!map.has(key)) {
      map.set(key, {
        intent: key,
        category: row.category || '',
        total: 0,
        ok: 0,
        error: 0,
        no_answer: 0,
        low_similarity: 0,
        avg_similarity: 0,
        _scores: [],
      });
    }
    const stat = map.get(key);
    stat.total += 1;
    if (row.status === 'ok') stat.ok += 1;
    else stat.error += 1;
    if (row.no_answer) stat.no_answer += 1;
    if (row.expected_answer && !row.no_answer && row.status === 'ok' && Number(row.similarity) < threshold) stat.low_similarity += 1;
    if (row.status === 'ok') stat._scores.push(Number(row.similarity));
  }

  return [...map.values()]
    .map((stat) => {
      stat.avg_similarity = Number(average(stat._scores).toFixed(4));
      delete stat._scores;
      return stat;
    })
    .sort((a, b) => b.no_answer - a.no_answer || b.low_similarity - a.low_similarity || a.intent.localeCompare(b.intent));
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

main();
