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
const outputBase = args.output || `exploratory_questions_${targetCount}`;

const GROUPS = [
  {
    category: 'L',
    intentPrefix: 'EX-L',
    focus: 'EPUB 구조/검사 오류 탐색',
    topics: [
      ['mimetype 파일', ['mimetype', 'zip', 'EPUB 패키징'], ['압축할 때 mimetype 파일 순서가 바뀌면 EPUBCheck에서 어떤 오류가 나나요?', 'mimetype을 압축 파일 안 첫 번째로 넣지 않으면 뷰어에서 열리지 않을 수 있나요?']],
      ['OPF manifest', ['OPF', 'manifest', '리소스 선언'], ['이미지는 보이는데 manifest에 빠져 있으면 접근성 검사에서도 문제가 되나요?', '사용하지 않는 CSS가 manifest에 남아 있으면 삭제해야 하나요?']],
      ['spine 읽기 순서', ['spine', '읽기 순서', 'linear'], ['본문 파일 순서와 spine 순서가 다르면 화면낭독기 읽기 순서도 달라지나요?', '프롤로그를 spine에서 뒤로 보냈는데 목차는 앞에 있어도 괜찮나요?']],
      ['nav와 목차', ['nav.xhtml', '목차', '랜드마크'], ['nav 목차에는 없지만 본문에는 제목이 많은데 모두 넣어야 하나요?', '목차 항목 이름이 실제 h1 제목과 조금 달라도 검사에 걸리나요?']],
      ['파일명/경로', ['파일명', '공백', '한글 경로'], ['이미지 파일명에 한글과 공백을 같이 써도 EPUB 뷰어에서 안전한가요?', 'CSS에서 ../images 경로를 쓰면 검사 도구가 못 찾는 경우가 있나요?']],
      ['XHTML 구조', ['XHTML', '태그 중첩', '문서 구조'], ['p 태그 안에 작은 이미지를 같이 넣었는데 항상 div로 분리해야 하나요?', 'span 안에 ruby 태그를 넣어도 EPUBCheck에서 허용되나요?']],
      ['링크/앵커', ['href', 'id', '조각 식별자'], ['주석 링크가 왕복 이동하지 않고 한쪽만 이동해도 접근성 문제가 되나요?', '본문 중복 id가 많을 때 가장 빨리 찾는 방법이 있나요?']],
      ['CSS 검증', ['CSS', '스타일', '지원 속성'], ['position fixed를 쓰면 일부 EPUB 뷰어에서 접근성 문제가 생기나요?', 'display grid를 EPUB 본문 레이아웃에 써도 괜찮나요?']],
      ['외부 리소스', ['외부 링크', '원격 이미지', '보안'], ['유튜브 썸네일 이미지를 외부 URL로 연결해도 EPUB 표준에 맞나요?', '웹폰트를 외부 CDN으로 불러오면 검사에서 실패할 수 있나요?']],
      ['뷰어 호환', ['뷰어', '렌더링', '열림 오류'], ['검사는 통과했는데 특정 뷰어에서 80%에서 멈추면 어떤 파일을 먼저 봐야 하나요?', 'Sigil에서는 보이는데 모바일 뷰어에서 이미지가 안 보이면 원인이 뭔가요?']],
    ],
  },
  {
    category: 'M',
    intentPrefix: 'EX-M',
    focus: '접근성 준수/사용자 경험 탐색',
    topics: [
      ['대체텍스트 범위', ['alt', '대체텍스트', '이미지 설명'], ['인포그래픽 안의 모든 문장을 alt에 다 넣어야 하나요?', '장식 이미지인지 정보 이미지인지 애매할 때 alt를 어떻게 정하나요?']],
      ['복잡한 표', ['table', 'th', 'scope'], ['표 머리글이 위와 왼쪽에 모두 있으면 scope를 어떻게 나눠야 하나요?', '셀 병합이 많은 표는 단순화해서 다시 만드는 게 좋나요?']],
      ['수식 접근성', ['MathML', '수식', '음성 읽기'], ['수식 이미지를 MathML로 바꾸기 어려울 때 대체텍스트만으로 충분한가요?', '분수와 루트가 섞인 수식은 화면낭독기에서 어떻게 읽히게 해야 하나요?']],
      ['언어 전환', ['lang', '다국어', '외국어'], ['본문 중간에 일본어 문장이 한 줄 나오면 span에 lang을 따로 줘야 하나요?', '영어 약어와 한국어가 섞인 제목은 lang을 어떻게 처리하나요?']],
      ['제목 구조', ['heading', 'h1', '문서 구조'], ['시각적으로 제목처럼 보이지만 목차에는 없는 문장도 h 태그를 써야 하나요?', '부록 안에서 h1을 다시 시작해도 접근성 검사에서 문제가 되나요?']],
      ['링크 텍스트', ['링크', '목적 설명', 'URL'], ['“여기”라는 링크 텍스트를 그대로 두면 어떤 문제가 생기나요?', 'QR코드 옆 URL 링크에는 어떤 문구를 넣는 게 좋나요?']],
      ['색/명암', ['명암비', '색상', 'WCAG'], ['원본 디자인 색을 유지하면 대비가 낮은데 접근성 때문에 색을 바꿔도 되나요?', '밑줄 없이 색상만으로 링크를 표시하면 안 되나요?']],
      ['읽기 순서', ['읽기 순서', '레이아웃', '2단'], ['2단 편집 페이지를 그대로 EPUB로 옮기면 화면낭독기 순서가 꼬일 수 있나요?', '이미지 캡션을 이미지 앞에 둬도 읽기 순서상 괜찮나요?']],
      ['메타데이터', ['accessibilityFeature', 'accessMode', 'schema.org'], ['음성 지원이 없는 책도 accessibilityFeature에 대체텍스트를 적어야 하나요?', '접근성 요약에는 검사 통과 사실만 적으면 되나요?']],
      ['키보드/포커스', ['키보드', '포커스', '상호작용'], ['본문 안 접기/펼치기 요소를 넣으면 키보드 조작 기준을 어떻게 확인하나요?', '오디오 컨트롤이 있는 EPUB은 포커스 순서를 어떻게 점검하나요?']],
    ],
  },
  {
    category: 'N',
    intentPrefix: 'EX-N',
    focus: '제작 실무/콘텐츠 특수 사례 탐색',
    topics: [
      ['만화/삽화', ['만화', '말풍선', '이미지 페이지'], ['만화 말풍선 대사가 본문에도 있으면 이미지 alt에는 뭘 써야 하나요?', '한 페이지 전체가 삽화이면 본문 텍스트 없이 이미지 설명만 넣어도 되나요?']],
      ['시/희곡', ['시', '행갈이', '희곡'], ['시의 줄바꿈을 br로 유지해야 하나요, p를 나눠야 하나요?', '희곡에서 인물 이름과 대사를 어떻게 구조화하면 읽기 좋나요?']],
      ['주석/미주', ['주석', '미주', '왕복 링크'], ['주석 번호가 한 문장에 여러 개 붙어 있으면 링크를 각각 만들어야 하나요?', '미주 설명이 긴 경우 본문 흐름을 방해하지 않게 처리하는 방법이 있나요?']],
      ['한자/특수문자', ['한자', '특수문자', '유니코드'], ['폰트에 없는 한자를 이미지로 넣어도 접근성 전자책으로 인정되나요?', '원문에 동그라미 숫자가 많으면 유니코드 문자로 바꾸는 게 좋나요?']],
      ['QR/동영상', ['QR코드', '동영상', '외부 자료'], ['QR코드가 강의 영상으로 연결되면 alt에 링크 목적을 어디까지 적어야 하나요?', '유튜브 링크가 책의 핵심 자료이면 접근성 메타데이터에 반영해야 하나요?']],
      ['스크린샷', ['스크린샷', 'UI 이미지', '설명'], ['소프트웨어 화면 캡처는 버튼 이름을 전부 alt에 넣어야 하나요?', '웹사이트 캡처 이미지의 작은 글씨가 많을 때 설명 기준은 어떻게 잡나요?']],
      ['지도/그래프', ['지도', '그래프', '차트'], ['지도 이미지는 장소 이름만 설명하면 충분한가요?', '막대그래프 수치를 표로 별도 제공하면 alt는 간단히 써도 되나요?']],
      ['어린이책', ['어린이책', '그림책', '반복 문장'], ['그림책에서 그림이 이야기 이해에 중요하면 alt를 길게 써도 되나요?', '반복되는 장식 캐릭터는 매번 설명해야 하나요?']],
      ['원본 훼손 판단', ['원본 유지', '편집 변경', '판권'], ['접근성을 위해 원본의 2단 구성을 1단으로 바꿔도 되나요?', '이미지 안 텍스트를 본문으로 빼면 원본과 달라졌다고 볼 수 있나요?']],
      ['작업 도구', ['Sigil', 'InDesign', '변환'], ['InDesign에서 내보낸 EPUB의 태그 구조를 어디서 먼저 점검해야 하나요?', 'HWP에서 변환한 HTML에 불필요한 span이 많으면 모두 지워야 하나요?']],
    ],
  },
];

const AUDIENCES = ['초보 제작자가', '검수 담당자가', '출판사 실무자가', '외주 제작자가', '접근성 담당자가', '편집자가'];
const STAGES = ['원고 변환 후', 'EPUB 제작 중', 'ACE 검사 전', 'EPUBCheck 통과 후', '최종 납품 전', '뷰어 확인 중'];
const TONES = ['간단히 알려주세요.', '판단 기준을 알려주세요.', '실무 기준으로 답해주세요.', '어떤 데이터를 추가로 넣어야 할지 알 수 있게 설명해 주세요.', '예외가 있는지도 알려주세요.'];
const CONTEXTS = ['리플로우형 EPUB에서', '고정 레이아웃 EPUB에서', '모바일 뷰어 기준으로', '화면낭독기 사용자를 기준으로', '저시력 사용자를 기준으로', '납품 검수 기준으로', '국내 제작 실무 기준으로', '여러 뷰어 호환성을 고려하면'];
const MATERIALS = ['교재', '문학책', '그림책', '학술서', '문제집', '보고서', '시집', '만화책', '역사서', '요리책'];

function main() {
  ensureDataDir();
  const dbRows = readWorkbookRows(inputPath).filter((row) => row.question);
  const sourceQuestionKeys = buildSourceQuestionKeys(dbRows.map((row) => row.question));
  const seen = new Set(dbRows.map((row) => normalizeText(row.question)));
  const generated = [];

  let cursor = 0;
  while (generated.length < targetCount && cursor < targetCount * 20) {
    for (const group of GROUPS) {
      for (let topicIndex = 0; topicIndex < group.topics.length; topicIndex += 1) {
        const [topic, keywords, seeds] = group.topics[topicIndex];
        const seed = seeds[cursor % seeds.length];
        const variants = buildVariants(seed, topic, keywords, cursor);

        for (const question of variants) {
          const key = normalizeText(question);
          if (!key || seen.has(key) || sourceQuestionConflict(question, sourceQuestionKeys)) continue;
          const nearest = findNearest(question, dbRows);
          generated.push({
            no: generated.length + 1,
            category: group.category,
            intent: `${group.intentPrefix}-${String(topicIndex + 1).padStart(3, '0')}`,
            test_focus: group.focus,
            topic,
            keywords: keywords.join(', '),
            novelty: nearest.score >= 0.55 ? '기존 DB 인접 질문' : nearest.score >= 0.35 ? '관련 주제 신규 표현' : '신규/경계 질문',
            generated_question: question,
            expected_answer: '',
            nearest_db_category: nearest.row.category || '',
            nearest_db_intent: nearest.row.intent || '',
            nearest_db_question: nearest.row.question || '',
            nearest_db_answer: nearest.row.answer || '',
            nearest_db_similarity: Number(nearest.score.toFixed(4)),
          });
          seen.add(key);
          if (generated.length >= targetCount) break;
        }
        if (generated.length >= targetCount) break;
      }
      if (generated.length >= targetCount) break;
    }
    cursor += 1;
  }

  const xlsxPath = path.join(DATA_DIR, `${outputBase}.xlsx`);
  const csvPath = path.join(DATA_DIR, `${outputBase}.csv`);
  writeWorkbook(xlsxPath, { questions: generated });
  writeCsv(csvPath, generated);

  console.log(`generated: ${generated.length}`);
  console.log(`xlsx: ${xlsxPath}`);
  console.log(`csv: ${csvPath}`);
}

function buildVariants(seed, topic, keywords, salt) {
  const audience = AUDIENCES[salt % AUDIENCES.length];
  const stage = STAGES[Math.floor(salt / 2) % STAGES.length];
  const tone = TONES[Math.floor(salt / 3) % TONES.length];
  const context = CONTEXTS[Math.floor(salt / 5) % CONTEXTS.length];
  const material = MATERIALS[Math.floor(salt / 7) % MATERIALS.length];
  const mainKeyword = keywords[salt % keywords.length];

  return [
    seed,
    `${topic}는 어떻게 해야 하나요?`,
    `${mainKeyword} 기준이 헷갈리는데 ${tone}`,
    `${topic}를 잘못 만들면 문제가 되나요?`,
    `${stage} ${mainKeyword} 때문에 오류가 나면 어떻게 고치나요?`,
    `${topic}는 꼭 넣어야 하나요?`,
    `${context} ${topic}는 어떻게 작성하면 되나요?`,
    `${material}를 만들 때 ${mainKeyword}는 어떻게 처리하나요?`,
    `${stage} ${topic} 문제가 보이면 어디를 먼저 확인해야 하나요?`,
    `${mainKeyword}만 짧게 물어보면 어떤 뜻인지 알려줄 수 있나요?`,
    `${context} ${mainKeyword}를 잘못 넣은 건지 어떻게 확인하나요?`,
    `${material} 원본을 유지하면서 ${topic}를 고칠 수 있나요?`,
    `${stage} ${topic} 때문에 원본을 바꿔도 되나요?`,
    `${mainKeyword} 설명이 너무 어렵게 나오는데 쉽게 알려주세요.`,
    `${topic}는 제작할 때랑 검수할 때 기준이 다른가요?`,
  ].map(polish);
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
    .replace(/ 담당자가 무엇/g, ' 담당자는 무엇')
    .replace(/ 제작자가 무엇/g, ' 제작자는 무엇')
    .replace(/ 실무자가 무엇/g, ' 실무자는 무엇')
    .replace(/ 편집자가 무엇/g, ' 편집자는 무엇')
    .replace(/mimetype 파일는/g, 'mimetype 파일은')
    .replace(/mimetype 파일를/g, 'mimetype 파일을')
    .replace(/mimetype는/g, 'mimetype은')
    .replace(/mimetype를/g, 'mimetype을')
    .replace(/manifest는/g, 'manifest는')
    .replace(/manifest를/g, 'manifest를')
    .replace(/스타일를/g, '스타일을')
    .replace(/스타일는/g, '스타일은')
    .replace(/CSS를/g, 'CSS를')
    .replace(/CSS는/g, 'CSS는')
    .replace(/([가-힣]{2,})를는/g, '$1는')
    .replace(/([가-힣]{2,})을는/g, '$1은')
    .replace(/\?\?+/g, '?')
    .trim();
}

main();
