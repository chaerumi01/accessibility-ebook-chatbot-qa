const path = require('path');
const {
  DATA_DIR,
  DEFAULT_DB_PATH,
  buildSourceQuestionKeys,
  ensureDataDir,
  normalizeText,
  parseArgs,
  readWorkbookRows,
  similarity,
  sourceQuestionConflict,
  writeCsv,
  writeWorkbook,
} = require('./utils');

const args = parseArgs();
const inputPath = args.input || DEFAULT_DB_PATH;
const targetCount = Number(args.count || 2000);
const outputBase = args.output || `targeted_questions_${targetCount}`;

const TOPICS = [
  {
    category: 'M',
    intent: 'T-M-ALT-OBJECT',
    focus: '이미지 alt 객체 유형',
    keywords: ['객체 유형', 'alt값', '이미지 설명', '대체텍스트'],
    terms: ['객체 유형', '객체 종류', '이미지 종류', '마지막에 붙이는 말', '사진/그림 같은 유형', 'alt 끝에 쓰는 유형'],
    bases: [
      '객체 유형엔 어떤 종류들이 있나요?',
      'alt값 마지막에 쓰는 객체 유형은 뭘 말하나요?',
      '이미지 설명 끝에 사진, 그림 같은 말을 꼭 붙여야 하나요?',
      '대체텍스트에 객체 종류를 쓰라는데 어떤 표현을 쓰면 되나요?',
      '삽화랑 사진은 alt 끝의 객체 유형을 다르게 써야 하나요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-ALT-LENGTH',
    focus: '이미지 alt 작성 범위',
    keywords: ['alt', '90자', '요약', '이미지 설명'],
    terms: ['alt', 'alt값', '대체텍스트', '이미지 설명', '이미지 대체문구'],
    bases: [
      '이미지 설명은 몇 글자 정도로 적어야 하나요?',
      'alt값이 길어지면 어디까지 줄여야 하나요?',
      '그림 안 글자를 전부 alt에 써야 하나요?',
      '이미지 내용을 요약할 때 꼭 빼면 안 되는 정보가 있나요?',
      '대체텍스트에 원문을 그대로 다 옮겨도 되나요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-ALT-DECORATIVE',
    focus: '장식 이미지 처리',
    keywords: ['장식 이미지', 'alt=""', 'role="presentation"', 'role="img"'],
    terms: ['장식용 이미지', '꾸밈 이미지', '의미 없는 그림', '빈 alt', 'presentation role'],
    bases: [
      '장식용 이미지는 alt값을 비워도 되나요?',
      '의미 없는 그림에는 role을 뭘로 넣어야 하나요?',
      'alt=""랑 role="presentation"을 같이 써야 하나요?',
      '꾸밈 이미지를 삭제하지 않고 남기면 접근성 오류가 나나요?',
      '의미 있는 이미지와 장식 이미지를 구분하는 기준이 뭔가요?',
    ],
  },
  {
    category: 'N',
    intent: 'T-N-FIGCAPTION-QR',
    focus: 'QR코드와 figcaption',
    keywords: ['QR코드', 'figure', 'figcaption', '바로가기'],
    terms: ['figcaption', '<figcaption>', '피그캡션', '캡션', 'figure 태그'],
    bases: [
      'QR코드 링크는 피그캡션에 넣어야 하나요?',
      'QR 이미지는 alt에 뭐라고 적으면 되나요?',
      'QR코드에 바로가기 링크를 걸 때 figcaption을 꼭 써야 하나요?',
      'QR코드 이미지를 figure로 감싸야 하는 이유가 뭔가요?',
      '유튜브 QR코드 아래 바로가기 문구는 어떻게 넣나요?',
    ],
  },
  {
    category: 'N',
    intent: 'T-N-FIGCAPTION-COUNT',
    focus: 'figure 내부 figcaption 개수',
    keywords: ['figure', 'figcaption', '캡션', '이미지 여러 개'],
    terms: ['figcaption', '피그캡션', '캡션 태그', 'figure 안 캡션', '이미지 캡션'],
    bases: [
      'figure 안에 figcaption을 두 개 넣어도 되나요?',
      '이미지가 여러 개인데 캡션도 여러 개면 figure를 나눠야 하나요?',
      '피그캡션은 이미지마다 하나씩 넣어야 하나요?',
      '캡션이 두 줄이면 figcaption을 두 번 써도 되나요?',
      '하나의 figure에 이미지 두 개와 캡션 두 개를 넣으면 오류가 나나요?',
    ],
  },
  {
    category: 'L',
    intent: 'T-L-IMG-WRAP',
    focus: 'img 태그 위치',
    keywords: ['img', '이미지 태그', 'div', 'p'],
    terms: ['img 태그', '<img>', '이미지 태그', '그림 태그', '이미지 코드'],
    bases: [
      'img 태그를 혼자 써도 되나요?',
      '이미지는 div나 p 안에 넣어야 하나요?',
      '<img>를 body 바로 아래에 두면 왜 오류가 나나요?',
      '본문 중간 이미지는 p태그 안에 넣어도 되나요?',
      '이미지 태그를 감싸는 태그는 어떤 걸 쓰면 되나요?',
    ],
  },
  {
    category: 'L',
    intent: 'T-L-P-IN-TABLE',
    focus: '표 내부 p태그 위치',
    keywords: ['표', 'table', 'p태그', 'td', 'th'],
    terms: ['표', '<table>', 'table 태그', '테이블', '표 코드'],
    bases: [
      '표 바로 아래에 p태그를 넣으면 안 되나요?',
      'table 안에서 본문 태그는 어디에 넣어야 하나요?',
      '표 안 문단은 td 안에 p로 넣어도 되나요?',
      '<p>를 tr 밖에 넣으면 왜 오류가 나나요?',
      '테이블 셀 안에 문단을 넣는 올바른 위치가 궁금해요.',
    ],
  },
  {
    category: 'L',
    intent: 'T-L-BR',
    focus: 'br 태그 위치',
    keywords: ['br', '줄바꿈', 'p', 'div', 'table'],
    terms: ['br 태그', '<br>', '<br/>', '줄바꿈 태그', '강제 줄바꿈'],
    bases: [
      'br 태그는 어디에 넣어야 오류가 안 나나요?',
      '표 안에서 줄바꿈하려고 <br>을 써도 되나요?',
      '<br/>을 body 바로 아래에 넣으면 안 되나요?',
      '문단 안 줄바꿈은 br로 처리해도 되나요?',
      '줄바꿈 태그를 ul 바로 아래에 쓰면 오류인가요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-HEADING',
    focus: '제목 태그와 헤딩 순서',
    keywords: ['h1', 'h2', '헤딩', '제목'],
    terms: ['h태그', '제목 태그', '헤딩', 'h1/h2', '장 제목'],
    bases: [
      'h1 다음에 h3가 바로 나오면 안 되나요?',
      '제목처럼 보이는 문장은 꼭 h태그로 만들어야 하나요?',
      '목차에는 없지만 본문 제목이면 h2로 넣어도 되나요?',
      '헤딩 순서가 틀렸다는 오류는 어떻게 고치나요?',
      '장 제목과 소제목은 h1, h2로 나눠야 하나요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-HEADING-IMAGE',
    focus: '헤딩 내부 장식 이미지',
    keywords: ['헤딩', '이미지 설명', '제목', '스크린리더'],
    terms: ['제목 안 이미지', '헤딩 안 그림', '장식 이미지', '꾸밈 그림', '이미지와 제목'],
    bases: [
      '제목 안에 장식 이미지가 있으면 삭제해야 하나요?',
      '헤딩 안 이미지 때문에 제목을 이상하게 읽으면 어떻게 고치나요?',
      '목차에서 이미지 설명까지 같이 읽히는 건 오류인가요?',
      '장 제목 앞 꾸밈 그림은 제목 태그 밖으로 빼야 하나요?',
      'h1 안에 이미지와 텍스트를 같이 넣어도 되나요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-META',
    focus: '접근성 메타데이터',
    keywords: ['accessibilityFeature', 'accessMode', 'accessibilitySummary', 'metadata'],
    terms: ['접근성 메타데이터', 'accessibilityFeature', 'accessMode', '접근성 요약', '메타 정보'],
    bases: [
      'accessibilityFeature에는 어떤 값을 넣어야 하나요?',
      'accessMode랑 accessModeSufficient는 뭐가 다른가요?',
      '접근성 요약에는 어떤 내용을 써야 하나요?',
      '대체텍스트를 넣은 책은 메타데이터에 뭘 표시해야 하나요?',
      'accessibilityHazard가 없으면 none이라고 써야 하나요?',
    ],
  },
  {
    category: 'N',
    intent: 'T-N-MATH-TEXT',
    focus: '단순 수식 이미지 처리',
    keywords: ['수식', 'MathML', '곱하기', '이퀄', '텍스트'],
    terms: ['수식 이미지', '계산식 그림', '곱하기 기호', '이퀄', 'MathML'],
    bases: [
      '곱하기랑 이퀄만 있는 그림도 수식 태그를 써야 하나요?',
      '단순 계산식 이미지는 텍스트로 바꿔도 되나요?',
      '수식이 적힌 이미지를 삭제하고 글자로 만들면 되나요?',
      '× 기호는 이미지 대신 유니코드 문자로 써도 되나요?',
      '간단한 연산식도 MathML로 만들어야 하나요?',
    ],
  },
  {
    category: 'N',
    intent: 'T-N-NOTE',
    focus: '주석/미주 링크',
    keywords: ['주석', '미주', '링크', '왕복 이동'],
    terms: ['주석', '미주', '각주', '주석 번호', '장미주'],
    bases: [
      '주석 번호를 누르면 설명으로 이동하게 만들어야 하나요?',
      '미주에서 본문으로 돌아오는 링크도 꼭 넣어야 하나요?',
      '주석 번호가 여러 개면 링크도 각각 걸어야 하나요?',
      '장미주 안에 링크가 꼬이면 어떻게 정리해야 하나요?',
      '본문 주석과 미주 설명은 어떻게 연결하나요?',
    ],
  },
  {
    category: 'L',
    intent: 'T-L-RESOURCE',
    focus: '누락 리소스/파일 경로',
    keywords: ['RSC_007', '이미지 누락', 'CSS 누락', '경로'],
    terms: ['누락 리소스', '없는 파일', '이미지 경로', 'CSS 경로', '파일명 대소문자'],
    bases: [
      '이미지 파일이 있는데도 없다고 나오면 뭘 확인해야 하나요?',
      'CSS 경로가 맞는지 어디에서 확인하나요?',
      '파일명 대소문자 때문에 EPUB 오류가 날 수 있나요?',
      '폰트 파일을 연결했는데 누락됐다고 나오는 이유가 뭔가요?',
      'manifest에 없는 이미지를 쓰면 어떤 오류가 나나요?',
    ],
  },
  {
    category: 'M',
    intent: 'T-M-UNIT-UNICODE',
    focus: '단위/기호 유니코드 처리',
    keywords: ['cm', 'km', '단위', '유니코드', '스크린리더'],
    terms: ['단위 기호', 'cm', 'km', '유니코드 기호', '스크린리더 읽기'],
    bases: [
      'cm이나 km는 그냥 영어로 써도 되나요?',
      '단위 기호를 스크린리더가 못 읽으면 어떻게 고치나요?',
      '센티미터 단위는 유니코드 문자로 바꿔야 하나요?',
      '본문 단위를 접근성 기준에 맞게 쓰는 방법이 궁금해요.',
      '㎝ 같은 문자를 쓰는 게 더 좋은 경우가 있나요?',
    ],
  },
  {
    category: 'N',
    intent: 'T-N-SCREENSHOT',
    focus: '스크린샷/이미지 속 텍스트',
    keywords: ['스크린샷', '이미지 설명', 'alt', '문구'],
    terms: ['화면 캡처', '스크린샷', '사이트 이미지', '이미지 안 글자', '캡처 화면'],
    bases: [
      '사이트 화면 캡처 안 글자를 alt에 전부 써야 하나요?',
      '스크린샷에 작은 문구가 많으면 이미지 설명을 어떻게 줄이나요?',
      '화면 캡처 이미지는 버튼 이름까지 다 설명해야 하나요?',
      '이미지 안 텍스트가 많을 때 figcaption으로 빼도 되나요?',
      '캡처 화면 설명은 어디까지 자세히 써야 하나요?',
    ],
  },
];

const OPENERS = ['', '전자책 만들 때 ', '검수 중에 ', '초보 제작자가 ', '접근성 작업하다가 ', 'EPUB 제작 중 ', '실무에서 '];
const ENDINGS = ['알려주세요.', '어떻게 하면 되나요?', '기준이 궁금해요.', '오류가 날 수 있나요?', '어떤 식으로 쓰면 되나요?', '쉽게 설명해 주세요.'];
const AUDIENCES = ['제작자', '검수자', '초보자', '출판사 담당자', '작업자'];

function main() {
  ensureDataDir();
  const dbRows = readWorkbookRows(inputPath).filter((row) => row.question);
  const sourceQuestionKeys = buildSourceQuestionKeys(dbRows.map((row) => row.question));
  const seen = new Set(dbRows.map((row) => normalizeText(row.question)));
  const rows = [];

  for (const topic of TOPICS) {
    for (const base of topic.bases) addQuestion(rows, dbRows, seen, sourceQuestionKeys, topic, base);
  }

  let round = 0;
  while (rows.length < targetCount && round < targetCount * 5) {
    for (const topic of TOPICS) {
      const term = topic.terms[round % topic.terms.length];
      const keyword = topic.keywords[Math.floor(round / 2) % topic.keywords.length];
      const opener = OPENERS[Math.floor(round / 3) % OPENERS.length];
      const ending = ENDINGS[Math.floor(round / 5) % ENDINGS.length];
      const audience = AUDIENCES[Math.floor(round / 7) % AUDIENCES.length];
      const templates = [
        `${opener}${term}은 ${ending}`,
        `${opener}${keyword} 관련해서 ${term}을 어떻게 처리하나요?`,
        `${audience}인데 ${term}이 뭔지 쉽게 알려주세요.`,
        `${term}이랑 ${keyword}는 같은 뜻으로 봐도 되나요?`,
        `${opener}${term}을 잘못 쓰면 접근성 검사에서 문제가 되나요?`,
        `${term}을 태그로 쓰는 경우와 한글로 말하는 경우가 헷갈려요. ${ending}`,
        `${opener}${topic.focus} 기준을 쉽게 설명해 주세요.`,
        `${keyword} 작업 중 ${term} 예시를 들어 설명해 주세요.`,
      ];
      for (const question of templates) {
        addQuestion(rows, dbRows, seen, sourceQuestionKeys, topic, question);
        if (rows.length >= targetCount) break;
      }
      if (rows.length >= targetCount) break;
    }
    round += 1;
  }

  const xlsxPath = path.join(DATA_DIR, `${outputBase}.xlsx`);
  const csvPath = path.join(DATA_DIR, `${outputBase}.csv`);
  writeWorkbook(xlsxPath, { questions: rows.slice(0, targetCount) });
  writeCsv(csvPath, rows.slice(0, targetCount));

  console.log(`generated: ${Math.min(rows.length, targetCount)}`);
  console.log(`xlsx: ${xlsxPath}`);
  console.log(`csv: ${csvPath}`);
}

function addQuestion(rows, dbRows, seen, sourceQuestionKeys, topic, rawQuestion) {
  const generatedQuestion = polish(rawQuestion);
  const key = normalizeText(generatedQuestion);
  if (!key || seen.has(key) || sourceQuestionConflict(generatedQuestion, sourceQuestionKeys)) return;
  const nearest = findNearest(generatedQuestion, dbRows);
  rows.push({
    no: rows.length + 1,
    category: topic.category,
    intent: topic.intent,
    test_focus: topic.focus,
    keywords: topic.keywords.join(', '),
    generated_question: generatedQuestion,
    expected_answer: '',
    nearest_db_category: nearest.row.category || '',
    nearest_db_intent: nearest.row.intent || '',
    nearest_db_question: nearest.row.question || '',
    nearest_db_answer: nearest.row.answer || '',
    nearest_db_similarity: Number(nearest.score.toFixed(4)),
  });
  seen.add(key);
}

function findNearest(question, rows) {
  let best = { row: {}, score: 0 };
  for (const row of rows) {
    const score = similarity(question, row.question);
    if (score > best.score) best = { row, score };
  }
  return best;
}

function polish(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/알려주세요\?$/g, '알려주세요.')
    .replace(/\?\?+/g, '?')
    .replace(/요\.$/, '요?')
    .trim();
}

main();
