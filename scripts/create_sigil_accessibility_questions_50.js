const path = require('path');
const { DATA_DIR, normalizeText, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const OUTPUT_BASE = 'sigil_accessibility_questions_50';

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const answerByIntent = new Map();
const categoryByIntent = new Map();

for (const row of sourceRows) {
  if (!row.intent || answerByIntent.has(row.intent)) continue;
  answerByIntent.set(row.intent, row.expected_answer || '');
  categoryByIntent.set(row.intent, row.category || '');
}

const questions = [
  ['L-001', 'OPF manifest 리소스 누락', 'Sigil에서 이미지 파일을 교체했는데 XHTML에는 새 파일명이 들어가 있고 OPF manifest에는 예전 파일명이 남아 있습니다. 이 상태에서 RSC_007이 날 수 있나요?'],
  ['L-002', 'img 태그 위치', 'Sigil 코드 보기에서 본문 이미지가 body 바로 아래에 혼자 있습니다. 시각장애인용 EPUB이면 figure나 p로 감싸는 편이 맞나요?'],
  ['L-003', 'br 위치와 행갈이', '시집 원고를 옮기면서 행마다 br을 넣었는데 Ace에서 위치 오류가 납니다. Sigil에서 br을 어느 태그 안으로 옮겨야 하나요?'],
  ['L-004', 'a 안 div 구조', 'Sigil에서 목차처럼 보이게 하려고 a 태그 안에 div를 넣었더니 오류가 납니다. 링크 범위와 div 구조를 어떻게 분리해야 하나요?'],
  ['L-005', 'table 내부 p 위치', 'PDF 변환 후 table 바로 아래에 p 설명문이 끼어 있습니다. Sigil에서 td 안으로 넣을지 table 밖으로 뺄지 어떻게 판단하나요?'],
  ['L-006', 'li 부모 요소', 'Sigil 정리 후 li 태그만 남고 ul이 사라진 부분이 있습니다. 화면낭독기 목록으로 읽히게 하려면 구조를 어떻게 복구해야 하나요?'],
  ['L-009', 'heading 위치 오류', '장 제목을 h2로 바꿨는데 p 태그 안에 h2가 들어가 있어서 오류가 납니다. Sigil에서 문단을 어떻게 나눠야 하나요?'],
  ['L-010', '링크 중첩', '본문 각주 링크 안에 외부 링크가 같이 들어가 a 태그가 중첩됐습니다. Sigil에서 두 링크를 어떻게 끊어야 하나요?'],
  ['L-012', 'tr/tbody 구조', 'Sigil에서 표를 직접 고쳤더니 tr이 table 바로 아래에 있습니다. tbody를 추가해야 하는 상황인가요?'],
  ['L-013', 'td/tr 구조', 'OCR 표를 정리하다가 td만 여러 개 남았습니다. Sigil에서 tr 행을 새로 만들어 감싸면 되는지 궁금합니다.'],
  ['L-017', 'manifest 파일 등록', 'Sigil에 폰트 파일을 추가하고 CSS에서 불렀는데 검사에서는 리소스가 manifest에 없다고 나옵니다. 어디를 확인해야 하나요?'],
  ['L-018', '존재하지 않는 앵커', '본문 링크가 note.xhtml#fn12로 가는데 Sigil에서 찾아보면 해당 id가 없습니다. id를 새로 만들지 링크를 바꿀지 어떻게 결정하나요?'],
  ['L-020', 'nav와 spine 순서', 'Sigil의 Book Browser 순서와 nav.xhtml 목차 순서가 다릅니다. 시각장애인 독서 순서 기준으로 어느 쪽을 맞춰야 하나요?'],
  ['L-021', 'spine idref와 manifest id', 'content.opf에서 spine idref가 manifest id와 다르게 적혀 있습니다. Sigil에서 이걸 고치면 읽기 순서 오류도 해결되나요?'],
  ['L-022', '삭제 파일 참조', 'Sigil에서 안 쓰는 XHTML을 삭제했는데 다른 파일의 href가 아직 그 파일을 가리킵니다. 검사 전에 어떤 참조를 정리해야 하나요?'],
  ['L-024', '파일명 공백/한글', '이미지 파일명이 한글과 공백으로 되어 있는데 일부 뷰어에서 안 보입니다. Sigil에서 파일명을 단순하게 바꾸는 게 안전한가요?'],
  ['L-028', '외부 리소스', '변환된 EPUB CSS가 웹폰트 URL을 그대로 불러옵니다. 시각장애인용 납품 EPUB이면 Sigil 안에 폰트를 넣어야 하나요?'],
  ['L-031', 'CSS 구문 오류', 'Sigil Preview에서는 보이는데 Ace가 CSS 구문 분석 오류를 냅니다. 중괄호나 주석 닫힘을 먼저 봐야 하나요?'],
  ['M-001', '색 대비', '원본 디자인 때문에 회색 배경에 연한 회색 글자를 유지했더니 Ace에서 대비 경고가 납니다. Sigil CSS에서 색을 바꿔도 되나요?'],
  ['M-002', 'ARIA role', '표를 레이아웃용으로 보이게 하려고 role을 넣었는데 Ace가 잘못된 ARIA라고 합니다. 기본 HTML 구조로 두는 편이 나은가요?'],
  ['M-003', 'presentation role과 alt', '장식 이미지에 alt도 있고 role=\"presentation\"도 들어가 있습니다. Sigil에서 둘 중 무엇을 정리해야 하나요?'],
  ['M-004', 'html lang', 'Sigil로 만든 여러 XHTML 중 일부만 html lang이 빠져 있습니다. 모든 본문 파일에 lang과 xml:lang을 맞춰야 하나요?'],
  ['M-005', '이미지 alt 누락', 'Sigil에서 Images 폴더를 보니 본문 삽화가 많은데 alt가 빈 이미지와 없는 이미지가 섞여 있습니다. 어떤 것부터 수정해야 하나요?'],
  ['M-006', 'heading order', '표지 다음 파일에서 h1 없이 h2부터 시작합니다. 화면낭독기 목차 흐름을 위해 h1을 넣어야 하나요?'],
  ['M-007', 'accessibilitySummary', 'Sigil Metadata Editor에는 접근성 요약 항목이 보이지 않습니다. OPF 코드에서 accessibilitySummary를 직접 넣어도 되나요?'],
  ['M-008', 'title 태그', 'chapter.xhtml 파일들의 head title이 전부 같은 책 제목입니다. 각 장 제목으로 바꾸는 게 접근성 검사에 도움이 되나요?'],
  ['M-009', 'accessModeSufficient', '본문과 alt만으로 내용을 이해할 수 있게 만든 책이면 accessModeSufficient를 textual로 넣어도 되나요?'],
  ['M-010', '링크 시각 구분', 'Sigil Preview에서 링크가 본문과 같은 색이라 눈으로 구분이 안 됩니다. CSS로 밑줄을 강제로 주는 게 맞나요?'],
  ['M-011', 'accessibilityHazard', '깜빡임이나 소리가 없는 일반 EPUB도 OPF에 accessibilityHazard none을 넣어야 하나요?'],
  ['M-012', 'accessibilityFeature', '목차, 읽기 순서, 대체텍스트를 정리한 EPUB이면 accessibilityFeature에 어떤 값을 넣어야 하나요?'],
  ['M-014', '반응형 이미지', 'Sigil Preview에서 큰 삽화가 화면 밖으로 밀립니다. img 공통 CSS에 max-width와 height auto를 넣는 방식이 안전한가요?'],
  ['M-016', '주석 왕복 링크', '각주 설명으로 이동은 되는데 다시 본문 번호로 돌아오지 못합니다. 시각장애인 독자를 위해 역방향 링크도 만들어야 하나요?'],
  ['M-017', '본문 글자 크기', '변환된 CSS가 본문 font-size를 9pt로 고정해 뒀습니다. Sigil에서 em 단위로 바꾸는 게 낫나요?'],
  ['M-019', '목차 생성', 'Sigil Generate TOC를 돌렸는데 목차가 비어 있습니다. 본문 heading 구조를 먼저 고쳐야 하나요?'],
  ['M-020', 'CSS 연결', '일부 XHTML만 CSS가 적용되지 않습니다. Sigil에서 head의 stylesheet link 경로를 일괄 확인하는 방법이 있나요?'],
  ['M-022', '본문 제목과 목차', '목차에는 안 넣고 싶은 소제목이지만 화면낭독기 구조상 제목처럼 읽혀야 합니다. h 태그를 써도 되나요?'],
  ['M-023', 'px 단위', '원본 CSS가 px로 글자 크기를 모두 고정합니다. 뷰어 확대를 생각하면 Sigil에서 em으로 바꾸는 게 안전한가요?'],
  ['M-029', '언어 코드', '한국어 책인데 XHTML마다 lang 값이 ko, ko-KR로 섞여 있습니다. Sigil에서 ko로 통일해도 되나요?'],
  ['M-034', 'letter-spacing', '디자인 때문에 letter-spacing이 음수로 들어가 있습니다. 접근성 검수 전에 0 이상으로 바꿔야 하나요?'],
  ['N-001', '미주 다중 참조', '같은 미주 설명을 본문 여러 곳에서 참조합니다. Sigil에서 각 참조마다 돌아가기 링크를 따로 만들어야 하나요?'],
  ['N-009', 'QR 코드', 'QR코드 이미지 아래에 URL 텍스트도 넣었습니다. alt에는 QR 목적만 쓰고 실제 링크는 figcaption에 두면 되나요?'],
  ['N-010', '주석 번호 분리', '원본에는 1,2,3번 주석이 한 설명에 묶여 있습니다. 접근성 EPUB에서는 주석을 번호별로 나누는 게 맞나요?'],
  ['N-012', '시 table 변환', '시 본문이 위치 맞추려고 table로 되어 있습니다. Sigil에서 p와 br 구조로 다시 푸는 게 맞나요?'],
  ['N-016', '단순 수식', '곱하기와 등호만 있는 수식 이미지가 있습니다. MathML 대신 텍스트 문자로 바꿔도 괜찮나요?'],
  ['N-017', '스크린샷 설명', '프로그램 화면 캡처가 본문에 들어가 있습니다. 버튼 이름을 alt에 모두 넣기보다 본문 설명으로 빼도 되나요?'],
  ['N-018', '표 셀 줄바꿈', '표 셀 안 항목을 줄바꿈해야 합니다. Sigil에서 td 안에 br을 쓰는 건 괜찮나요?'],
  ['N-021', '장식 이미지', '장마다 반복되는 꽃무늬 이미지는 원본에는 있지만 내용 전달은 없습니다. 삭제하지 않으면 빈 alt로 처리하면 되나요?'],
  ['N-023', '목차 숨김 제목', '본문에는 화면낭독기용 구역 제목이 필요하지만 nav 목차에는 보이고 싶지 않습니다. Sigil에서 heading과 nav를 따로 관리해도 되나요?'],
  ['N-031', '표 제목열', '표 첫 열이 항목 이름 역할을 하는데 시각적으로만 굵게 되어 있습니다. Sigil에서 첫 열 td를 th로 바꾸는 게 맞나요?'],
  ['N-035', 'figure와 figcaption', '한 figure 안에 이미지 두 장과 캡션 두 개가 들어가 있습니다. 화면낭독기 순서를 위해 figure를 나눠야 하나요?'],
];

if (questions.length !== 50) {
  throw new Error(`Expected 50 questions, got ${questions.length}`);
}

const rows = questions.map(([intent, testFocus, generatedQuestion], index) => ({
  no: index + 1,
  category: categoryByIntent.get(intent) || '',
  intent,
  test_focus: testFocus,
  generated_question: generatedQuestion,
  expected_answer: answerByIntent.get(intent) || '',
  source_category: categoryByIntent.get(intent) || '',
}));

const missingAnswers = rows.filter((row) => !row.expected_answer);
if (missingAnswers.length) {
  throw new Error(`Missing expected answers: ${missingAnswers.map((row) => row.intent).join(', ')}`);
}

const duplicateCount = rows.length - new Set(rows.map((row) => normalizeText(row.generated_question))).size;
if (duplicateCount) {
  throw new Error(`Duplicate generated questions: ${duplicateCount}`);
}

const xlsxPath = path.join(DATA_DIR, `${OUTPUT_BASE}.xlsx`);
const csvPath = path.join(DATA_DIR, `${OUTPUT_BASE}.csv`);
writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
console.log(`rows: ${rows.length}`);
