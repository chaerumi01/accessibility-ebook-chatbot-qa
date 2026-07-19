const path = require('path');
const { DATA_DIR, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const startNo = 41;
const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const answerByIntent = new Map();
const categoryByIntent = new Map();
for (const row of sourceRows) {
  if (!answerByIntent.has(row.intent)) {
    answerByIntent.set(row.intent, row.expected_answer);
    categoryByIntent.set(row.intent, row.category);
  }
}

const questions = [
  ['db_rephrase', 'M-012', 'accessibilityFeature', '전자책에 제공한 접근성 기능을 OPF 메타데이터에 적으라고 하는데 어떤 항목을 넣어야 하나요?'],
  ['db_rephrase', 'M-013', 'accessMode', 'accessMode 오류가 뜨면 content.opf에는 textual 같은 값을 어디에 써야 하나요?'],
  ['db_rephrase', 'M-014', '이미지 크기', '전자책 뷰어에서 이미지가 화면 밖으로 넘칠 때 CSS 크기 설정은 어떻게 해야 하나요?'],
  ['db_rephrase', 'M-015', '하이라이터 CSS', '본문 하이라이트 효과 때문에 검사가 깨진다면 border-bottom 같은 CSS를 지워야 하나요?'],
  ['db_rephrase', 'M-016', '주석 링크', '각주 번호를 눌러도 주석 설명으로 이동하지 않으면 a태그를 어떻게 연결해야 하나요?'],
  ['db_rephrase', 'M-017', '본문 글자 크기', '본문 글씨가 너무 작다는 지적을 받았는데 font-size는 어느 정도로 조정해야 하나요?'],
  ['db_rephrase', 'M-018', '본문 중간 이미지', '문단 중간에 이미지를 끼워 넣었더니 읽기 순서가 어색합니다. 이미지는 어디에 배치해야 하나요?'],
  ['db_rephrase', 'M-019', '목차 생성', '전자책 뷰어에 목차가 안 보이면 Sigil에서 목차를 다시 만들어야 하나요?'],
  ['db_rephrase', 'M-020', 'CSS 연결', 'XHTML에 스타일이 안 먹을 때 CSS 파일은 head 안에서 어떻게 연결해야 하나요?'],
  ['db_rephrase', 'M-021', 'xml:lang 중복', 'body 태그에도 xml:lang을 넣었더니 중복 오류가 나요. html에만 두면 되나요?'],
  ['db_rephrase', 'M-022', '헤딩 태그', '본문에 구역 제목이 있는데 목차에는 안 넣고 싶습니다. 그래도 h태그를 써야 하나요?'],
  ['db_rephrase', 'M-023', '폰트 단위', '전자책 CSS에서 글자 크기를 px로 고정해도 되나요, em으로 바꿔야 하나요?'],
  ['db_rephrase', 'M-024', 'preface 역할', '머리말 파일을 chapter로 표시했는데 preface 역할로 바꾸는 게 맞나요?'],
  ['db_rephrase', 'M-025', 'nav spine 노출', 'nav 파일이 뷰어 본문에 보이면 spine에서 linear 값을 조정해야 하나요?'],
  ['db_rephrase', 'M-026', '표지 설정', '표지 이미지가 EPUB 안에는 있는데 뷰어에서 안 보일 때 Cover 설정을 다시 해야 하나요?'],
  ['db_rephrase', 'M-027', 'blockquote 의미', '인용문이 아닌데 들여쓰기하려고 blockquote를 써도 접근성상 괜찮나요?'],
  ['db_rephrase', 'M-028', '헤딩 개행', '제목을 두 줄로 보이게 하려고 h2를 두 번 나눠 쓰면 문제가 되나요?'],
  ['db_rephrase', 'M-029', 'lang ko-KR', 'html lang을 ko-KR로 넣었는데 EPUB에서는 ko로 바꾸는 편이 맞나요?'],
  ['db_rephrase', 'M-030', '참고문헌 시맨틱', '참고문헌 페이지도 chapter로 두면 되나요, bibliography 역할을 줘야 하나요?'],
  ['db_rephrase', 'M-031', '단위 기호', 'cm나 km를 화면낭독기가 이상하게 읽으면 어떤 문자로 바꾸는 게 좋나요?'],
  ['db_rephrase', 'M-032', '헤딩 안 이미지', '목차를 눌렀을 때 제목 앞 꾸밈 이미지까지 같이 읽히면 어떻게 고쳐야 하나요?'],
  ['db_rephrase', 'M-033', '이미지 목차', '차례가 이미지로만 되어 있으면 삭제하고 텍스트 목차로 다시 만들어야 하나요?'],
  ['db_rephrase', 'M-034', '글자 간격', 'letter-spacing이 음수라서 글 간격이 너무 좁다는 지적을 받으면 얼마 이상으로 맞춰야 하나요?'],
  ['db_rephrase', 'M-035', '버티컬 바', '구분선으로 쓴 ㅣ가 화면낭독기에서 이라고 읽히면 어떤 기호로 바꿔야 하나요?'],
  ['db_rephrase', 'M-036', '문단 간격', '문단 사이 여백이 너무 커서 읽기 불편할 때 line-height나 margin을 어떻게 조정해야 하나요?'],
  ['db_rephrase', 'M-037', '판권지 role', '판권지 section에는 어떤 epub:type이나 role 값을 넣어야 하나요?'],
  ['db_rephrase', 'M-038', '메타데이터 수정', '도서 제목이나 저자 메타데이터가 잘못 들어갔으면 Sigil에서 어디를 열어 수정하나요?'],
  ['db_rephrase', 'M-039', '표지 role', '표지 이미지에는 role이나 aria-label을 따로 넣어야 하나요?'],
  ['db_rephrase', 'N-001', '미주 다중 참조', '본문에 같은 미주 번호가 여러 번 나오는데 설명은 하나라면 링크를 전부 걸어야 하나요?'],
  ['db_rephrase', 'N-002', '뷰어 95퍼 멈춤', 'EPUB 파일을 열 때 뷰어가 95퍼에서 멈추면 표지나 landmarks 설정을 의심해야 하나요?'],
  ['db_rephrase', 'N-003', 'Mac 제작 환경', '맥에서 접근성 전자책을 제작하려면 국립장애인도서관 뷰어나 Sigil은 어떻게 준비하면 되나요?'],
  ['db_rephrase', 'N-004', 'Mac ACE', 'Mac에서도 Sigil ACE 플러그인을 그대로 쓰면 되나요, 별도 앱을 쓰는 게 낫나요?'],
  ['db_rephrase', 'N-005', '한자 입력', '원본에 어려운 한자가 있는데 정확한 글자를 찾기 힘들면 어떻게 입력해야 하나요?'],
  ['db_rephrase', 'N-006', '외국어 텍스트화', 'intro 페이지의 그리스어나 아랍어 같은 외국어는 이미지로 둬도 되나요?'],
  ['db_rephrase', 'N-007', '장미주 링크 중첩', '장미주 안에 링크를 넣다가 a태그가 겹치면 링크를 어떻게 분리해야 하나요?'],
  ['db_rephrase', 'N-008', '굵게 표시 유지', '원본 본문에 굵게 표시된 단어는 전자책에서도 꼭 그대로 유지해야 하나요?'],
  ['db_rephrase', 'N-009', 'QR코드 링크', '유튜브 QR코드 이미지를 넣을 때 alt와 바로가기 링크는 어떤 구조로 넣나요?'],
  ['db_rephrase', 'N-010', '미주 1대1 링크', '여러 주석 번호가 한 설명에 묶여 있으면 번호별로 미주 내용을 나눠야 하나요?'],
  ['db_rephrase', 'N-011', 'bookid', 'EpubCheck에서 bookid 오류가 나오면 UUID를 새로 만들어 dc:identifier에 넣어야 하나요?'],
  ['db_rephrase', 'N-012', '시 table 변환', '시 본문이 table로 다단 배치돼 있으면 p태그로 풀어서 다시 구성해야 하나요?'],
  ['db_rephrase', 'N-013', 'TOC 갱신', 'TOC 순서 오류가 나면 Sigil에서 nav랑 NCX를 다시 생성해야 하나요?'],
  ['db_rephrase', 'N-014', '삭제 이미지 복구', '전에 지운 이미지를 다시 넣으려면 원본 Images 폴더에서 가져와 figure로 넣으면 되나요?'],
  ['db_rephrase', 'N-015', '이모지 처리', '본문에 이모지가 있는데 유니코드 변환이 안 되면 제작자 주로 설명해도 되나요?'],
  ['db_rephrase', 'N-016', '단순 수식', '곱하기와 등호만 있는 계산식 그림은 MathML이 아니라 텍스트로 바꿔도 되나요?'],
  ['db_rephrase', 'N-017', '스크린샷 alt', '사이트 화면 캡처 이미지 안의 모든 글자를 alt에 다 써야 하나요?'],
  ['db_rephrase', 'N-018', '표 셀 줄바꿈', '표 셀 안에서 줄바꿈이 필요하면 br 태그를 td 안에 써도 되나요?'],
  ['db_rephrase', 'N-019', '파일명과 헤딩', '파일명이 wing.xhtml이면 무조건 앞날개로 판단해야 하나요, 내용 기준으로 봐야 하나요?'],
  ['db_rephrase', 'N-020', '원본 헤딩 재구성', '원본에서 01, 02가 h1처럼 보여도 전자책에서는 h2로 위계를 바꿔도 되나요?'],
  ['db_rephrase', 'N-021', '장식 이미지 삭제', '본문 장식용 이미지는 접근성 때문에 삭제하거나 빈 alt로 처리해도 되나요?'],
  ['db_rephrase', 'N-022', '이미지 페이지만 있는 파일', '이미지 한 장만 있는 불필요한 xhtml 페이지는 이미지와 파일을 같이 삭제해도 되나요?'],
  ['narrow_free', 'M-012', 'accessibilityFeature', '목차와 읽기 순서를 제공하는 책이면 accessibilityFeature에 tableOfContents랑 readingOrder를 적으면 되나요?'],
  ['narrow_free', 'M-013', 'accessMode', '그림도 있지만 본문 텍스트로 이해 가능한 책은 accessMode를 textual로 잡아도 되나요?'],
  ['narrow_free', 'M-014', '이미지 반응형', '큰 표지나 삽화가 모바일 뷰어에서 잘리면 max-width 100%를 넣는 방식이 맞나요?'],
  ['narrow_free', 'M-016', '주석 왕복 링크', '각주 설명에서 다시 본문 각주 번호 위치로 돌아가는 링크까지 만들어야 하나요?'],
  ['narrow_free', 'M-019', '목차 수동 생성', '챕터 제목은 h태그로 되어 있는데 목차에 안 뜨면 Sigil 목차 생성 도구로 다시 만들면 되나요?'],
  ['narrow_free', 'M-020', 'CSS 일괄 연결', 'Text 폴더 안의 여러 xhtml에 같은 stylesheet를 한 번에 연결하는 방법이 있나요?'],
  ['narrow_free', 'M-022', 'TOC 숨김 헤딩', '목차에 나오면 안 되는 작은 소제목도 h3로 만들고 toc에서는 숨길 수 있나요?'],
  ['narrow_free', 'M-023', 'px 대신 em', '원본 CSS가 12px, 14px로 되어 있으면 접근성 때문에 em 단위로 바꾸는 게 좋나요?'],
  ['narrow_free', 'M-024', '서문 역할', '서문이나 머리말은 chapter가 아니라 doc-preface 역할로 표시해야 하나요?'],
  ['narrow_free', 'M-025', 'nav 본문 노출', 'nav.xhtml이 책 본문처럼 한 페이지로 보이면 linear no를 넣으면 해결되나요?'],
  ['narrow_free', 'M-026', '표지 semantic', '표지 이미지 우클릭으로 Cover Image를 체크했는지 확인해야 뷰어에 표시되나요?'],
  ['narrow_free', 'M-027', 'blockquote 레이아웃', '본문을 들여쓰기하려고 blockquote를 쓴 부분은 일반 p로 바꾸는 게 맞나요?'],
  ['narrow_free', 'M-028', '제목 줄바꿈', '긴 제목을 두 줄로 나누고 싶을 때 h태그를 두 개로 쪼개면 왜 안 되나요?'],
  ['narrow_free', 'M-030', '참고문헌 role', '참고문헌 페이지를 보조기기가 참고문헌으로 알게 하려면 어떤 role을 넣어야 하나요?'],
  ['narrow_free', 'M-031', '단위 읽기', '센티미터 단위를 cm으로 쓰면 읽기 문제가 생길 수 있어서 ㎝ 문자로 바꿔야 하나요?'],
  ['narrow_free', 'M-032', '제목 꾸밈 이미지', '장 제목 앞에 있는 꾸밈 그림 때문에 목차 읽기가 이상하면 이미지와 제목을 분리해야 하나요?'],
  ['narrow_free', 'M-033', '차례 이미지 텍스트화', '원본 차례가 이미지라면 화면낭독기를 위해 오탈자 없이 텍스트로 다시 쳐야 하나요?'],
  ['narrow_free', 'M-034', '간격 WCAG', '글자 간격이나 단어 간격이 너무 좁다는 접근성 지적이 나오면 CSS spacing 값을 양수로 조정하면 되나요?'],
  ['narrow_free', 'M-035', '기호 오독', '목차에서 구분 기호로 쓴 ㅣ가 계속 이라고 읽히면 | 기호로 교체하는 게 맞나요?'],
  ['narrow_free', 'M-036', '문단 여백', '문단 간격이 과하면 오히려 접근성 문제가 될 수 있나요? margin을 줄여야 하나요?'],
  ['narrow_free', 'M-037', '판권지 시맨틱', '판권지 페이지를 copyright-page로 표시하면 화면낭독기 사용자에게 구조가 더 잘 전달되나요?'],
  ['narrow_free', 'M-038', '판권지 기반 메타데이터', '메타데이터가 원본 판권지와 다르면 Metadata Editor에서 판권지 기준으로 고쳐야 하나요?'],
  ['narrow_free', 'M-039', '표지 aria-label', '표지 이미지 alt만 쓰면 부족하고 aria-label 표지도 같이 넣어야 하나요?'],
  ['narrow_free', 'N-001', '하나의 미주 설명', '같은 미주 설명을 여러 번호가 가리킬 때 모든 번호를 양방향 링크로 연결하면 문제가 생기나요?'],
  ['narrow_free', 'N-002', '뷰어 멈춤 표지', '파일이 열리다가 멈추면 먼저 뷰어 업데이트와 표지 semantic 설정을 확인하면 되나요?'],
  ['narrow_free', 'N-003', 'Mac 플러그인', '맥에서는 플러그인이 불안정할 수 있다면 크롬 접근성 뷰어로 검증해도 되나요?'],
  ['narrow_free', 'N-004', 'ACE 앱', 'Mac에서 ACE 검사를 해야 할 때 Sigil 플러그인 대신 Ace 전용 앱을 쓰는 절차가 있나요?'],
  ['narrow_free', 'N-005', '필기 한자', '한자가 이미지처럼 들어가 있으면 네이버 한자 필기인식기로 찾아서 텍스트로 넣어야 하나요?'],
  ['narrow_free', 'N-006', '그리스어 텍스트', '그리스어는 유니코드가 되면 이미지로 두지 말고 텍스트로 바꾸는 게 원칙인가요?'],
  ['narrow_free', 'N-007', 'a 태그 중첩 회피', '장미주 문장 전체가 링크인데 안에 또 링크가 필요하면 바깥 링크를 끊어서 분리해야 하나요?'],
  ['narrow_free', 'N-008', '강조 판단', '저자 고지에 강조 유지 말이 없으면 굵게 표시는 제작자가 가독성 보고 판단하면 되나요?'],
  ['narrow_free', 'N-009', 'QR figcaption', 'QR 이미지 아래 바로가기 문구는 figcaption 안에 링크로 넣는 게 맞나요?'],
  ['narrow_free', 'N-010', '주석 분리', '주석 번호가 1,2,3으로 묶여 한 설명에 있으면 각각 따로 미주 태그를 만들어야 하나요?'],
  ['narrow_free', 'N-011', 'UUID 생성', 'bookid가 없다고 나오면 uuidgenerator에서 만든 값을 content.opf identifier로 넣으면 되나요?'],
  ['narrow_free', 'N-012', '시 접근성', '시가 표로 배치되어 있어도 의미상 표가 아니면 문단으로 풀어 쓰는 게 맞나요?'],
  ['narrow_free', 'N-013', 'nav 정리', 'TOC가 실제 목차랑 다르면 Generate TOC랑 Update Manifest를 다시 실행해야 하나요?'],
  ['narrow_free', 'N-014', '이미지 재삽입', '삭제했던 그림을 다시 넣을 때 figure로 감싸고 alt도 새로 작성해야 하나요?'],
  ['narrow_free', 'N-015', '이모지 설명', '변환이 어려운 이모지는 기호로 감싼 설명 문구로 풀어 적어도 되나요?'],
  ['narrow_free', 'N-016', '수식 이미지 삭제', '간단한 곱셈식 이미지는 삭제하고 ×와 = 문자로 된 텍스트 글상자로 만드는 게 맞나요?'],
  ['narrow_free', 'N-017', '캡처 설명 범위', '캡처 화면 속 글자가 본문 이해에 중요하면 alt보다 figcaption에 자세히 적는 게 낫나요?'],
  ['narrow_free', 'N-018', 'td 안 br', '표 셀 안에서만 줄바꿈을 할 때 br을 쓰는 건 괜찮나요?'],
  ['narrow_free', 'N-019', '날개 파일명', 'wing.xhtml이라는 파일명보다 실제 페이지 내용이 저자 소개인지 먼저 봐야 하나요?'],
  ['narrow_free', 'N-020', '원본 구조 재해석', '종이책 디자인상 h1처럼 보이는 번호라도 전자책 논리 구조에 맞게 h2로 낮춰도 되나요?'],
  ['narrow_free', 'N-021', '장식 이미지 판단', '본문 이해에 필요 없는 장식 그림은 삭제하거나 presentation 처리하면 되나요?'],
  ['narrow_free', 'N-022', '빈 이미지 페이지 삭제', '내용 없이 이미지 페이지만 남은 xhtml은 접근성 작업 후 파일까지 삭제해도 되나요?'],
  ['narrow_free', 'N-023', '목차 숨김 제목', '목차에는 넣지 않을 제목도 화면낭독기 구조를 위해 heading으로 처리할 수 있나요?'],
  ['narrow_free', 'N-024', '북뷰 수식 간격', 'Sigil Book View에서만 수식 간격이 이상하고 Preview는 정상이면 실제 오류로 보지 않아도 되나요?'],
  ['narrow_free', 'N-025', 'Sigil Python', 'Sigil 오류 검사에서 python path가 없다고 나오면 Use Bundled Python을 체크하면 되나요?'],
  ['narrow_free', 'N-026', '표지 landmarks', '뷰어에서 표지가 안 보일 때 nav landmarks를 지우고 표지 semantic을 다시 지정해야 하나요?'],
  ['narrow_free', 'N-027', 'heading order', 'ACE에서 heading order invalid가 나오면 h1 다음 h3처럼 건너뛴 제목을 찾아 고치면 되나요?'],
  ['narrow_free', 'N-028', '자모 분리', '도서 제목이 자음 모음으로 분리되어 보이면 텍스트를 다시 복사해 넣고 문서 정리를 해야 하나요?'],
  ['narrow_free', 'N-029', 'bookid 재검사', '새 UUID를 넣은 뒤에는 content.opf 정리하고 다시 epub check를 돌리면 되나요?'],
  ['narrow_free', 'N-030', '빈 meta 삭제', '비어 있는 dcterms source meta 태그가 있으면 삭제하고 metadata 구조를 점검해야 하나요?'],
];

const rows = questions.slice(0, 100).map(([category, intent, testFocus, generatedQuestion], index) => ({
  no: startNo + index,
  category,
  intent,
  test_focus: testFocus,
  generated_question: generatedQuestion,
  expected_answer: answerByIntent.get(intent) || '',
  source_category: categoryByIntent.get(intent) || '',
}));

if (rows.some((row) => !row.expected_answer)) {
  throw new Error(`Missing expected answers: ${rows.filter((row) => !row.expected_answer).map((row) => row.intent).join(', ')}`);
}

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_100.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_100.csv');
writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
