const path = require('path');
const { DATA_DIR, writeCsv, writeWorkbook } = require('./utils');

const rows = [
  {
    no: 31,
    category: 'db_rephrase',
    intent: 'M-001',
    test_focus: '텍스트 명도 대비',
    generated_question: '글자색이 배경색이랑 비슷해서 명도 대비 오류가 나면 CSS에서 뭘 바꿔야 하나요?',
    expected_answer:
      '텍스트 색상과 배경색의 명도 대비가 낮아, 시각적 접근성 기준을 충족하지 못하고 있습니다. 일반 텍스트는 최소 4.5:1, 큰 텍스트는 3:1 이상의 대비비율을 확보하고, CSS의 color와 background-color를 조정한 뒤 contrast checker로 확인해주세요.',
  },
  {
    no: 32,
    category: 'db_rephrase',
    intent: 'M-002',
    test_focus: 'ARIA role 허용 여부',
    generated_question: '태그에 role을 넣었는데 ARIA 역할이 맞지 않는다고 나와요. role을 그냥 지워도 되나요?',
    expected_answer:
      '특정 HTML 태그에 적용할 수 없는 ARIA role을 사용해서 발생한 오류입니다. 각 HTML 요소에 맞는 허용된 role만 사용해야 합니다. 적절하지 않은 role은 제거하거나 알맞은 role로 교체해주세요.',
  },
  {
    no: 33,
    category: 'db_rephrase',
    intent: 'M-003',
    test_focus: 'role presentation과 alt 충돌',
    generated_question: 'alt를 적은 이미지에 role presentation을 같이 넣었더니 충돌한다고 합니다. 어떤 걸 바꿔야 하나요?',
    expected_answer:
      '의미 있는 요소에 alt값을 채운 상태로 role="presentation"을 사용할 경우 접근성 오류가 발생합니다. 의미 없는 경우에는 alt="" role="presentation"로 기입하고, 의미가 있는 경우에는 alt를 채우고 role="img"를 사용해주세요.',
  },
  {
    no: 34,
    category: 'db_rephrase',
    intent: 'M-004',
    test_focus: 'html lang 속성',
    generated_question: 'XHTML 파일마다 html 태그에 언어 표시를 넣어야 하나요? 한글책이면 lang 값을 뭐로 쓰나요?',
    expected_answer:
      '모든 XHTML 문서의 <html> 태그에 lang="ko" 언어를 명시해주세요.',
  },
  {
    no: 35,
    category: 'db_rephrase',
    intent: 'M-005',
    test_focus: '이미지 alt 누락',
    generated_question: '이미지에 alt가 없다고 뜨는데 모든 img에 alt 속성을 넣어야 하나요?',
    expected_answer:
      '<img> 태그에는 반드시 대체 텍스트(alt) 속성이 필요합니다. 의미 있는 이미지는 alt 텍스트를 작성하고, 장식용 이미지는 alt=""(공란)로 명시 + role="presentation" 속성을 기입해주세요.',
  },
  {
    no: 36,
    category: 'narrow_free',
    intent: 'M-007',
    test_focus: 'accessibilitySummary',
    generated_question: '접근성 요약 정보가 없다고 나오는데 content.opf 안에 어떤 meta를 추가해야 하나요?',
    expected_answer:
      'EPUB의 메타데이터에 <meta property="schema:accessibilitySummary"> 요소가 누락된 경우 발생되는 오류입니다. 도서의 접근성 수준 또는 접근 방식을 요약하는 짧은 문장을 추가해주세요.',
  },
  {
    no: 37,
    category: 'narrow_free',
    intent: 'M-008',
    test_focus: 'XHTML title 요소',
    generated_question: '각 XHTML 파일 head에 title이 비어 있으면 접근성 검사에서 문제가 되나요?',
    expected_answer:
      '모든 XHTML 문서는 <head> 안에 <title> 요소를 포함해야 합니다. <title> 요소는 빈칸이 아니고 의미 있는 텍스트가 있어야 하며, 문서 식별 및 접근성 확보를 위해 필수적입니다.',
  },
  {
    no: 38,
    category: 'narrow_free',
    intent: 'M-009',
    test_focus: 'accessModeSufficient',
    generated_question: '텍스트로 읽을 수 있는 책이면 accessModeSufficient에는 textual이라고 넣으면 되나요?',
    expected_answer:
      'EPUB의 접근성 메타데이터 중 accessModeSufficient가 누락되면 content.opf 파일의 <metadata> 블록 안에 <meta property="schema:accessModeSufficient">textual</meta> 항목을 명시해주세요.',
  },
  {
    no: 39,
    category: 'narrow_free',
    intent: 'M-010',
    test_focus: '링크 텍스트 구분',
    generated_question: '본문 링크가 주변 글자랑 똑같이 보여도 되나요, 밑줄이나 색으로 구분해야 하나요?',
    expected_answer:
      '링크는 주변 텍스트와 시각적·구조적으로 구분되어야 합니다. 별도 문장으로 분리하거나, 밑줄 또는 색상 대비처럼 시각적으로 명확히 표시해주세요.',
  },
  {
    no: 40,
    category: 'narrow_free',
    intent: 'M-011',
    test_focus: 'accessibilityHazard',
    generated_question: '깜빡임이나 소리 위험 요소가 없는 전자책도 accessibilityHazard를 적어야 하나요?',
    expected_answer:
      '접근성 위험 정보(accessibilityHazard)가 메타데이터에 누락되면 오류가 발생할 수 있습니다. 위험요소가 없을 때는 content.opf metadata에 <meta property="schema:accessibilityHazard">none</meta>처럼 지정해주세요.',
  },
];

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_batch4.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_batch4.csv');

writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
