const path = require('path');
const {
  DATA_DIR,
  DEFAULT_DB_PATH,
  buildSourceQuestionKeys,
  ensureDataDir,
  normalizeText,
  parseArgs,
  readWorkbookRows,
  sourceQuestionConflict,
  writeCsv,
  writeWorkbook,
} = require('./utils');

const args = parseArgs();
const inputPath = args.input || DEFAULT_DB_PATH;
const targetCount = Number(args.count || 2000);

const OPENERS = [
  '',
  '검사했더니 ',
  '작업하다가 ',
  '전자책 만들 때 ',
  '파일을 올렸더니 ',
  'EPUB 만들다가 ',
  '초보자인데 ',
];

const ENDINGS = [
  '어떻게 해야 하나요?',
  '어떻게 고치면 되나요?',
  '이럴 땐 어떡하나요?',
  '그냥 둬도 되나요?',
  '어디를 봐야 하나요?',
  '쉽게 알려주세요.',
];

const TOPIC_HINTS = [
  ['QR', ['QR코드', 'QR 코드']],
  ['대체텍스트', ['alt', '대체텍스트', '이미지 설명']],
  ['alt', ['alt', '대체텍스트', '이미지 설명']],
  ['이미지', ['이미지', '그림', '사진']],
  ['본문', ['본문', '본문 내용']],
  ['표', ['표', '테이블']],
  ['메타데이터', ['메타데이터', '메타 정보']],
  ['목차', ['목차', '차례']],
  ['주석', ['주석', '각주', '미주']],
  ['링크', ['링크', '바로가기']],
  ['수식', ['수식']],
  ['제목', ['제목', 'h태그', '헤딩']],
  ['CSS', ['CSS', '스타일']],
  ['폰트', ['폰트', '글꼴']],
  ['파일', ['파일', '리소스']],
];

function main() {
  ensureDataDir();
  const sourceRows = readWorkbookRows(inputPath)
    .map((row, index) => ({
      source_row: index + 2,
      category: clean(row.category),
      intent: clean(row.intent),
      question: clean(row.question),
      answer: clean(row.answer),
    }))
    .filter((row) => row.intent && row.question && row.answer);

  const groups = groupByIntent(sourceRows);
  const generated = [];
  const sourceQuestionKeys = buildSourceQuestionKeys(sourceRows.map((row) => row.question));
  const seen = new Set(sourceRows.map((row) => normalizeText(row.question)));
  const groupList = [...groups.values()].sort((a, b) => a.intent.localeCompare(b.intent));

  let guard = 0;
  while (generated.length < targetCount && guard < targetCount * 80) {
    const group = groupList[guard % groupList.length];
    const seed = group.questions[Math.floor(guard / groupList.length) % group.questions.length];
    for (const question of buildVariants(seed.question, group.answer, guard)) {
      const key = normalizeText(question);
      if (!key || seen.has(key) || sourceQuestionConflict(question, sourceQuestionKeys)) continue;
      seen.add(key);
      generated.push({
        no: generated.length + 1,
        category: group.category,
        intent: group.intent,
        source_question: seed.question,
        generated_question: question,
        expected_answer: group.answer,
        source_answer_count: group.answer_count,
      });
      if (generated.length >= targetCount) break;
    }
    guard += 1;
  }

  if (generated.length < targetCount) {
    throw new Error(`Only generated ${generated.length} questions. Need ${targetCount}.`);
  }

  const xlsxPath = path.join(DATA_DIR, `questions_${targetCount}.xlsx`);
  const csvPath = path.join(DATA_DIR, `questions_${targetCount}.csv`);
  writeWorkbook(xlsxPath, { questions: generated });
  writeCsv(csvPath, generated);

  console.log(`source rows: ${sourceRows.length}`);
  console.log(`intents: ${groupList.length}`);
  console.log(`generated: ${generated.length}`);
  console.log(`xlsx: ${xlsxPath}`);
  console.log(`csv: ${csvPath}`);
}

function groupByIntent(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.intent)) {
      groups.set(row.intent, {
        category: row.category,
        intent: row.intent,
        answer: row.answer,
        answer_count: 0,
        questions: [],
      });
    }
    const group = groups.get(row.intent);
    group.questions.push(row);
    group.answer_count += 1;
    if (row.answer.length > group.answer.length) group.answer = row.answer;
  }
  return groups;
}

function buildVariants(question, answer, salt) {
  const topic = pickTopic(question, answer, salt);
  const base = simplifyQuestion(question);
  const rephrased = rephraseQuestion(base, salt);
  const opener = OPENERS[salt % OPENERS.length];
  const ending = ENDINGS[Math.floor(salt / OPENERS.length) % ENDINGS.length];
  const shortTopic = topic.replace(/\s+/g, ' ');

  const isDiagnostic = /오류|경고|에러|RSC_|OPF|ACC_|CSS_|HTM_|EPUBCheck|이펍체크|검사|통과/.test(`${shortTopic} ${base}`);
  const variants = isDiagnostic ? [
    `${shortTopic} 오류가 나는데 어떻게 해야 하나요?`,
    `${shortTopic} 오류가 뜨면 어디를 고치면 되나요?`,
    `${opener}${shortTopic} 문제가 있다고 나와요. ${ending}`,
    `${shortTopic} 때문에 전자책 검사가 안 통과돼요. 어떻게 고치나요?`,
    `${shortTopic} 문제가 뜨는데 이게 무슨 뜻인가요?`,
    `${shortTopic} 오류는 그냥 둬도 되나요?`,
    `${shortTopic} 관련해서 뭘 확인하면 되나요?`,
    `${rephrased}`.trim(),
  ] : [
    `${shortTopic}는 어떻게 작성해야 하나요?`,
    `${shortTopic}는 어떻게 만들면 되나요?`,
    `${shortTopic}를 넣어야 한다는데 어떻게 해야 하나요?`,
    `${shortTopic}를 잘못 넣으면 문제가 되나요?`,
    `${shortTopic}는 꼭 넣어야 하나요?`,
    `${opener}${shortTopic} 때문에 헷갈려요. ${ending}`,
    `${shortTopic} 작성 방법을 쉽게 알려주세요.`,
    `${rephrased}`.trim(),
  ];

  return variants.map(polish);
}

function simplifyQuestion(question) {
  let text = clean(question)
    .replace(/^\s*(질문|문의|Q|Q\.|Q:)\s*/i, '')
    .replace(/\s+/g, ' ');
  if (!/[?？요까다]$/.test(text)) text += ' 어떻게 해야 하나요?';
  return text;
}

function rephraseQuestion(question, salt) {
  const replacements = [
    ['안 되나요', '문제가 되나요'],
    ['어떻게 해야 하나요', '이럴 땐 어떡하나요'],
    ['어떻게 해결하나요', '어떻게 고치면 되나요'],
    ['어떻게 수정하나요', '어떻게 고치면 되나요'],
    ['어떻게 입력하나요', '어떻게 쓰면 되나요'],
    ['어디에 넣어야 하나요', '어디에 넣으면 되나요'],
    ['무엇을 확인해야 하나요', '뭘 확인하면 되나요'],
    ['어떤 작업이 필요한가요', '어떻게 하면 되나요'],
    ['수정 방법이 있을까요', '어떻게 고치면 되나요'],
    ['궁금합니다', '알려주세요'],
    ['되나요', '괜찮나요'],
    ['하나요', '하나요'],
  ];
  let text = question;
  for (let i = 0; i < replacements.length; i += 1) {
    const [from, to] = replacements[(salt + i) % replacements.length];
    if (text.includes(from)) return text.replace(from, to);
  }
  const topic = pickTopic(question, '', salt);
  return `${topic} 관련해서 어떻게 해야 하나요?`;
}

function pickTopic(question, answer, salt) {
  const questionText = clean(question);
  const source = `${questionText} ${answer}`;
  const errorCode = source.match(/\b[A-Z]{2,}_[0-9]{3,}\b/i);
  if (errorCode) return `${errorCode[0]} 오류`;

  const htmlTag = questionText.match(/\b(img|br|div|span|p|li|a|table|tr|td|th|ul|ol|h[1-6]|figure|figcaption|ruby|rt|nav|item|meta|link)\b/i);
  if (htmlTag) return `${htmlTag[1]} 태그`;

  const tag = questionText.match(/<?([a-zA-Z][\w:-]*)>?\s*(태그|요소|element)/);
  if (tag) return `${tag[1]} ${tag[2]}`;

  const direct = pickDirectTopic(questionText) || pickDirectTopic(answer);
  if (direct) return direct;

  const quoted = questionText.match(/[<“"'`]?([a-zA-Z][\w:-]{1,}|[가-힣A-Za-z0-9]{2,12})[>”"'`]?\s*(속성|오류|경고|파일|문서|코드)/);
  if (quoted && !BAD_TOPIC_WORDS.has(quoted[1])) return `${quoted[1]} ${quoted[2]}`;

  const hit = TOPIC_HINTS.find(([keyword]) => questionText.includes(keyword));
  if (hit) return hit[1][salt % hit[1].length];

  const tokens = questionText
    .replace(/[^\w가-힣A-Za-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token) && !/(하는|되는|나요|은요|인가요|까요|해주세요)$/.test(token));
  if (!tokens.length) return '접근성 전자책 제작';

  const score = new Map();
  for (const token of tokens) score.set(token, (score.get(token) || 0) + 1);
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[salt % Math.min(score.size, 5)][0];
}

function pickDirectTopic(text) {
  const source = clean(text);
  const rules = [
    [/QR\s*코드|QR/i, 'QR코드'],
    [/대체\s*텍스트|대체텍스트|alt\s*값?|alt/i, 'alt'],
    [/본문.*이미지|이미지.*본문|이미지.*글자|그림.*글자/, '이미지 속 글자'],
    [/접근성\s*요약/, '접근성 요약'],
    [/메타\s*데이터|메타\s*정보|metadata/i, '메타데이터'],
    [/표|테이블|table/i, '표'],
    [/목차|차례|toc|nav/i, '목차'],
    [/주석|각주|미주/, '주석'],
    [/링크|바로가기|href|url/i, '링크'],
    [/수식|mathml/i, '수식'],
    [/글자\s*크기|font-size|em\b/i, '글자 크기'],
    [/css|스타일|하이라이터/i, '스타일'],
    [/제목|헤딩|h1|h2|h3/i, '제목'],
    [/role|epub:type|epubtype/i, 'role 속성'],
    [/강조|볼드|굵게/, '강조 표시'],
    [/말줄임표|줄임표/, '말줄임표'],
    [/언어|lang/i, '언어 설정'],
    [/명암|대비|색상/, '색상 대비'],
    [/폰트|글꼴/, '폰트'],
    [/python|파이썬/i, 'Python 오류'],
    [/플러그인|ace/i, 'ACE 플러그인'],
    [/리소스.*여러|여러.*리소스|중복.*리소스|리소스.*중복/, '리소스 중복'],
    [/리소스|파일|이미지.*없|CSS.*없|누락/, '누락된 파일'],
  ];
  const hit = rules.find(([pattern]) => pattern.test(source));
  return hit ? hit[1] : '';
}

function polish(question) {
  return question
    .replace(/\s+/g, ' ')
    .replace(/오류 오류/g, '오류')
    .replace(/누락된 파일라고/g, '누락된 파일이라고')
    .replace(/누락된 파일는/g, '누락된 파일은')
    .replace(/누락된 파일를/g, '누락된 파일을')
    .replace(/제목라고/g, '제목이라고')
    .replace(/표라고/g, '표라고')
    .replace(/메타데이터라고/g, '메타데이터라고')
    .replace(/폰트라고/g, '폰트라고')
    .replace(/링크라고/g, '링크라고')
    .replace(/스타일를/g, '스타일을')
    .replace(/스타일는/g, '스타일은')
    .replace(/글자 크기를/g, '글자 크기를')
    .replace(/한자를는/g, '한자는')
    .replace(/([가-힣]{2,})를는/g, '$1는')
    .replace(/([가-힣]{2,})을는/g, '$1은')
    .replace(/안 괜찮나요/g, '문제가 되나요')
    .replace(/ACE 플러그인 때문에 전자책 검사가 안 통과돼요/g, 'ACE 검사 때문에 전자책 검사가 안 통과돼요')
    .replace(/문제가 있다고 나와요\. 어떻게 해야 하나요\?/g, '문제가 있다고 나와요. 어떻게 해야 하나요?')
    .replace(/요\.\s*어떻게/g, '요. 어떻게')
    .replace(/알려주세요\?/g, '알려주세요.')
    .replace(/\?\?+/g, '?')
    .replace(/요\?$/, '요?')
    .trim();
}

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set([
  '어떻게',
  '하나요',
  '되나요',
  '있나요',
  '합니다',
  '주세요',
  '전자책',
  'EPUB',
  '이펍',
  '파일',
  '오류',
  '접근성',
  '제작',
  '검사',
  '경우',
  '관련',
  '무엇을',
  '판단해주세요',
  '판단하나요',
  '발생되는',
  '사용하는',
  '지적이',
  '방법은요',
  '알려주세요',
  '궁금합니다',
  '통과',
  '해결',
  '방법',
  '설명',
  '내용',
]);

const BAD_TOPIC_WORDS = new Set([
  '판단해주세요',
  '판단',
  '발생되는',
  '해결',
  '수정',
  '관련',
  '내용',
  '검사',
]);

main();
