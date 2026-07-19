const path = require('path');
const { DATA_DIR, readWorkbookRows, writeCsv, writeWorkbook } = require('./utils');

const startNo = 141;
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
  ['db_rephrase', 'M-012', 'accessibilityFeature 값', '접근성 기능을 메타데이터에 넣으라는 오류가 나오면 accessibilityFeature에는 어떤 값을 적어야 하나요?'],
  ['db_rephrase', 'L-002', 'img 배치 구조', 'img 태그를 body 바로 아래에 두었더니 문법 오류가 납니다. div나 p로 감싸야 하나요?'],
  ['db_rephrase', 'L-003', 'br 허용 위치', '목록 바로 아래에 br을 넣었더니 오류가 뜨는데 br은 문단 안에서만 써야 하나요?'],
  ['db_rephrase', 'L-004', 'div 중첩 위치', 'a 태그 안에 div를 넣은 부분이 검사에 걸리면 div를 밖으로 빼야 하나요?'],
  ['db_rephrase', 'L-005', 'table 안 p 위치', 'table 바로 밑에 p 태그가 있어서 오류가 나면 td 안으로 옮기는 게 맞나요?'],
  ['db_rephrase', 'L-006', 'li 부모 요소', 'li 태그만 따로 남아 있을 때 ul이나 ol로 감싸면 문법 오류가 해결되나요?'],
  ['db_rephrase', 'L-031', 'CSS 인코딩 점검', 'CSS 파일 오류가 날 때 속성 문법뿐 아니라 UTF-8 인코딩으로 저장됐는지도 확인해야 하나요?'],
  ['db_rephrase', 'L-008', 'p 안 table', '문단 안에 표가 들어가 있어서 오류가 뜹니다. p를 닫고 table을 별도로 배치해야 하나요?'],
  ['db_rephrase', 'L-009', 'p 안 heading', 'p 태그 안에 h2가 들어간 부분은 문단을 나눈 뒤 제목을 밖으로 빼야 하나요?'],
  ['db_rephrase', 'L-010', 'a 태그 중첩', '링크 안에 또 링크가 들어가 있다는 오류가 나면 안쪽 a 태그를 분리해야 하나요?'],
  ['db_rephrase', 'L-011', 'span 단독 배치', 'span이 div 바로 아래에 혼자 있어서 오류가 날 때 p 안으로 넣으면 되나요?'],
  ['db_rephrase', 'L-012', 'tr tbody 누락', 'table 아래에 tr을 바로 썼는데 tbody가 필요하다는 오류는 어떻게 고치나요?'],
  ['db_rephrase', 'L-013', 'td tr 누락', 'td가 tr 없이 들어가 있다는 검사 오류가 나오면 행 구조를 새로 만들어야 하나요?'],
  ['db_rephrase', 'L-014', 'b 태그 위치', 'b 태그가 div 바로 아래에 있어서 문제라면 p 안의 텍스트 일부에만 적용해야 하나요?'],
  ['db_rephrase', 'L-015', 'ul 배치 위치', 'p 태그 안에 ul을 넣었더니 EPUBCheck가 오류를 냅니다. 목록을 밖으로 빼야 하나요?'],
  ['db_rephrase', 'L-016', 'ol 배치 위치', '번호 목록 ol이 문단 내부에 있을 때 div 같은 블록 안으로 이동하면 되나요?'],
  ['db_rephrase', 'L-017', 'manifest 누락', '본문에서 쓰는 폰트 파일이 manifest에 없다고 나오면 content.opf에 item을 추가해야 하나요?'],
  ['db_rephrase', 'L-018', '존재하지 않는 id 링크', 'href가 #note23을 가리키는데 실제 id가 없으면 대상 id를 만들거나 링크를 고쳐야 하나요?'],
  ['db_rephrase', 'L-019', 'URI 형식 오류', '파일 경로에 특수문자나 잘못된 상대경로가 있어서 URI 오류가 날 때 어떻게 정리하나요?'],
  ['db_rephrase', 'L-020', 'nav spine 순서', 'nav 목차 순서와 spine 순서가 다르다는 오류가 나오면 어느 파일 기준으로 맞춰야 하나요?'],
  ['db_rephrase', 'L-021', '참조 ID 미등록', 'OPF에서 itemref가 가리키는 id가 manifest에 없다고 나오면 id를 맞춰야 하나요?'],
  ['db_rephrase', 'L-022', '누락 파일 참조', 'XHTML에서 참조한 파일이 EPUB 안에 없다는 오류가 뜨면 파일을 추가해야 하나요, 경로를 바꿔야 하나요?'],
  ['db_rephrase', 'L-023', 'OPF 속성 선언', 'content.opf에서 참조한 속성이 정의되지 않았다는 오류는 어디를 확인해야 하나요?'],
  ['db_rephrase', 'L-024', '파일명 공백', '이미지 파일명에 공백이 들어가서 경로 오류가 날 수 있나요? 파일명을 바꿔야 하나요?'],
  ['db_rephrase', 'L-025', 'non-linear 접근 링크', 'linear no로 된 파일에 접근 링크가 없다고 나오면 nav나 본문에 링크를 추가해야 하나요?'],
  ['db_rephrase', 'L-026', 'spine 미등록 참조', '본문에서 참조하는 xhtml이 spine에 없다는 오류는 spine에 추가하면 해결되나요?'],
  ['db_rephrase', 'L-027', '손상 파일', 'ACE가 EPUB 안의 특정 파일을 해석하지 못한다고 할 때 파일 포맷이나 손상을 먼저 봐야 하나요?'],
  ['db_rephrase', 'L-028', '외부 리소스 참조', 'CSS나 이미지가 외부 URL을 가리키면 EPUB 안에 넣고 내부 경로로 바꿔야 하나요?'],
  ['db_rephrase', 'L-029', 'OPF href 실제 파일', 'manifest href는 있는데 실제 파일이 없다는 오류가 나오면 대소문자까지 확인해야 하나요?'],
  ['db_rephrase', 'L-030', 'manifest 중복 item', 'content.opf manifest에 같은 이미지가 두 번 등록되어 있으면 하나를 지우면 되나요?'],
  ['db_rephrase', 'L-031', 'CSS 문법 오류', 'CSS 검사에서 중괄호나 세미콜론 오류가 나온다면 해당 줄을 고치고 UTF-8 저장까지 확인해야 하나요?'],
  ['db_rephrase', 'L-032', 'guide manifest 누락', 'guide에서 참조하는 파일이 manifest에 없다고 나오면 item 등록을 추가해야 하나요?'],
  ['db_rephrase', 'L-033', 'unique identifier', 'package의 unique-identifier와 dc:identifier id가 안 맞으면 어떤 값을 맞춰야 하나요?'],
  ['db_rephrase', 'N-031', '표 제목열 th 처리', '표에서 첫 열이 제목 역할이면 자동 제목행 옵션을 끄고 첫 열 셀을 th로 바꿔야 하나요?'],
  ['db_rephrase', 'N-032', '표지 이미지 src', '표지가 다른 이미지로 표시될 때 cover.xhtml의 img src를 실제 표지 파일명으로 바꾸면 되나요?'],
  ['db_rephrase', 'N-033', '만화 대화 figcaption', '만화 말풍선 내용이 본문에 이미 있으면 figcaption 없이 alt만 요약해도 되나요?'],
  ['db_rephrase', 'N-034', '이미지 중복 item', '이미지가 누락되거나 중복됐다는 오류가 나면 content.opf의 item 중복을 먼저 정리해야 하나요?'],
  ['db_rephrase', 'N-035', 'figure figcaption 개수', 'figure 하나에 figcaption이 두 개 들어가 있으면 이미지별로 figure를 나눠야 하나요?'],
  ['db_rephrase', 'N-036', 'guide 삭제와 cover 설정', 'guide가 manifest에 없는 파일을 가리키는 오류는 guide를 지우고 표지를 다시 설정하면 되나요?'],
  ['db_rephrase', 'M-006', '헤딩 단계 건너뜀', 'h1 다음에 바로 h3가 나오는 구조가 ACE에서 걸리면 h2를 넣어 순서를 맞춰야 하나요?'],
  ['db_rephrase', 'M-007', 'accessibilitySummary 문구', 'accessibilitySummary가 빠졌다는 오류가 나오면 접근성 수준 설명을 짧게 써 넣어야 하나요?'],
  ['db_rephrase', 'M-008', 'XHTML title 누락', '여러 XHTML의 head title이 비어 있으면 각 파일마다 의미 있는 제목을 넣어야 하나요?'],
  ['db_rephrase', 'M-009', 'accessModeSufficient 누락', '텍스트 접근이 가능한 책인데 accessModeSufficient가 없으면 textual 값을 추가하면 되나요?'],
  ['db_rephrase', 'M-010', '링크 시각 구분', '본문 링크가 일반 글자와 구분되지 않는다는 지적을 받으면 밑줄이나 색 대비를 줘야 하나요?'],
  ['db_rephrase', 'M-011', 'accessibilityHazard none', '위험 요소가 없는 책도 accessibilityHazard none을 OPF 메타데이터에 넣어야 하나요?'],
  ['db_rephrase', 'M-014', '이미지 overflow', '삽화가 뷰어 화면을 넘어가면 CSS에 height auto와 max-width 100%를 넣으면 되나요?'],
  ['db_rephrase', 'M-017', '본문 font-size', '본문 폰트가 0.8em으로 되어 있으면 접근성을 위해 1em 이상으로 조정해야 하나요?'],
  ['db_rephrase', 'M-029', 'lang 값 단순화', '한글 EPUB에서 html lang을 ko-KR 대신 ko로 통일하는 게 더 안전한가요?'],
  ['db_rephrase', 'M-034', '음수 letter-spacing', 'letter-spacing 값이 -0.05em이면 접근성 검사 전에 양수 값으로 바꿔야 하나요?'],
  ['narrow_free', 'L-001', '이미지 확장자 대소문자', 'Images/Cover.JPG로 등록했는데 실제 파일은 cover.jpg라면 대소문자 차이도 오류 원인이 되나요?'],
  ['narrow_free', 'L-002', '단독 img 감싸기', '본문 이미지가 한 장만 있는 페이지라도 img만 두지 말고 figure나 div 안에 넣어야 하나요?'],
  ['narrow_free', 'L-003', '빈 줄 br 남용', '여백을 만들려고 body 바로 아래 br을 여러 개 넣은 건 삭제하고 CSS margin으로 바꾸는 게 맞나요?'],
  ['narrow_free', 'L-004', '링크 내부 블록 제거', '페이지 전체를 누르게 하려고 a 안에 div를 넣은 코드는 EPUB에서 구조상 피해야 하나요?'],
  ['narrow_free', 'L-005', '표 안 문단 정리', '표 셀 밖에 설명 문단이 끼어 있으면 table 밖 설명문으로 빼거나 td 안으로 넣어야 하나요?'],
  ['narrow_free', 'L-006', '목록 조각 복구', '목록 변환 중 li만 남아 있으면 ul을 새로 만들고 li를 그 안에 넣으면 되나요?'],
  ['narrow_free', 'N-030', '빈 메타 태그 정리', '값이 비어 있는 dcterms source meta 태그가 EPUBCheck에 걸리면 삭제하고 메타데이터를 다시 봐야 하나요?'],
  ['narrow_free', 'L-008', '레이아웃 표 위치', '문단 중간에 레이아웃용 table을 넣은 부분은 문단을 나누고 접근성 구조도 다시 봐야 하나요?'],
  ['narrow_free', 'L-009', '제목 구조 분리', '본문 문장 중간에 들어간 소제목을 h3로 만들려면 앞뒤 p를 분리해야 하나요?'],
  ['narrow_free', 'L-010', '주석 링크 중첩 해소', '주석 번호 링크 안에 외부 바로가기 링크가 들어가면 두 링크를 따로 끊어 작성해야 하나요?'],
  ['narrow_free', 'L-011', 'span을 p로 교체', 'span만으로 한 문단을 만든 곳은 p 태그로 바꾸는 편이 맞나요?'],
  ['narrow_free', 'L-012', 'thead tbody 구조', '표 제목행과 본문행을 구분하려면 tr을 thead나 tbody 안에 넣어 정리해야 하나요?'],
  ['narrow_free', 'L-013', 'td 누락 행 생성', '복사 과정에서 tr이 빠진 표 셀은 각 줄마다 tr을 만들어 td를 넣어야 하나요?'],
  ['narrow_free', 'L-014', '굵게 태그 문맥', '굵은 글씨가 한 줄 전체라면 b만 단독으로 두지 말고 p 안에서 처리해야 하나요?'],
  ['narrow_free', 'L-015', '문단 뒤 목록', '문단 설명 뒤에 목록이 이어질 때 p를 닫고 ul을 별도 블록으로 놓아야 하나요?'],
  ['narrow_free', 'L-016', '번호 목록 구조', 'ol이 span 안에 들어가 있으면 span 밖으로 빼서 블록 구조를 맞춰야 하나요?'],
  ['narrow_free', 'L-017', '폰트 manifest 등록', 'CSS에서 font-face로 부르는 otf 파일도 OPF manifest에 등록되어 있어야 하나요?'],
  ['narrow_free', 'L-018', '목차 앵커 점검', '목차 링크를 눌렀을 때 이동하지 않으면 href의 파일명과 id가 실제 본문과 같은지 봐야 하나요?'],
  ['narrow_free', 'L-019', '공백 URI 인코딩', '파일 경로에 공백이나 한글 특수문자가 섞여 있으면 파일명을 단순하게 바꾸는 게 낫나요?'],
  ['narrow_free', 'L-020', '읽기 순서 통일', '목차에서는 3장이 먼저 나오는데 spine은 2장이 먼저면 nav와 spine 순서를 통일해야 하나요?'],
  ['narrow_free', 'L-021', 'itemref idref 확인', 'spine의 idref 값이 manifest item id와 정확히 일치하는지 확인해야 하나요?'],
  ['narrow_free', 'L-022', '삭제 파일 참조 제거', '이미 삭제한 chapter.xhtml을 아직 링크가 가리키고 있으면 링크나 파일 참조를 제거해야 하나요?'],
  ['narrow_free', 'L-023', '잘못된 OPF 속성명', 'OPF에 잘못 적은 속성명 때문에 오류가 나면 표준 속성 이름으로 바꿔야 하나요?'],
  ['narrow_free', 'L-024', '공백 없는 파일명 규칙', 'cover image.jpg 같은 파일명은 cover_image.jpg처럼 바꾸고 참조도 같이 수정해야 하나요?'],
  ['narrow_free', 'L-025', '부록 접근 경로', '부록 파일을 linear no로 뒀다면 독자가 갈 수 있도록 목차나 본문 링크가 필요하나요?'],
  ['narrow_free', 'L-026', '참조 파일 spine 포함 여부', '본문처럼 읽혀야 하는 xhtml을 다른 파일에서 링크한다면 spine에도 포함되어야 하나요?'],
  ['narrow_free', 'L-027', '깨진 이미지 파일 교체', 'EPUB 안 이미지 파일이 손상되어 ACE가 멈추면 원본에서 다시 추출해 교체해야 하나요?'],
  ['narrow_free', 'L-028', '웹폰트 외부 참조', 'CSS에서 구글 폰트 URL을 불러오는 방식은 EPUB에 맞지 않으니 내부 폰트로 넣어야 하나요?'],
  ['narrow_free', 'L-029', 'manifest 경로 상대 위치', 'OPF가 Styles/style.css를 가리키는데 실제 폴더가 styles라면 폴더명 대소문자를 맞춰야 하나요?'],
  ['narrow_free', 'L-030', '중복 id 정리', 'manifest에 같은 href가 id만 다르게 두 번 있으면 하나만 남기고 참조 id를 정리해야 하나요?'],
  ['narrow_free', 'L-031', 'CSS 주석 오류', 'CSS 주석이 닫히지 않아 뒤 속성이 모두 깨질 수 있나요? 검사 줄 번호를 보고 고치면 되나요?'],
  ['narrow_free', 'L-032', 'guide와 manifest 일치', 'guide href가 필요한 파일이면 manifest item을 추가하고, 불필요하면 guide 참조를 지워도 되나요?'],
  ['narrow_free', 'L-033', 'BookId 연결', 'unique-identifier가 BookId라면 dc:identifier에도 id="BookId"가 있어야 하나요?'],
  ['narrow_free', 'N-031', '제목열 strong 불필요', '표 첫 열을 th로 바꾸면 굵게 보이게 하려고 strong을 따로 넣지 않아도 되나요?'],
  ['narrow_free', 'N-032', 'cover src 교체', '표지 페이지는 있는데 엉뚱한 이미지가 보이면 img src만 실제 cover 파일로 고쳐도 되나요?'],
  ['narrow_free', 'N-033', '만화 alt 요약', '만화 속 대사가 본문에 반복되어 있다면 alt에는 장면 설명만 간단히 쓰는 게 맞나요?'],
  ['narrow_free', 'N-034', 'Ctrl F 정리 재검사', 'OPF 이미지 중복을 지운 뒤 Sigil 정리 기능을 돌리고 다시 EPUBCheck를 해야 하나요?'],
  ['narrow_free', 'N-035', '다중 이미지 캡션', '여러 이미지를 한 figure에 넣고 캡션을 각각 달았으면 figure를 여러 개로 나눠야 하나요?'],
  ['narrow_free', 'N-036', '낡은 guide 제거', 'EPUB3 작업에서 오래된 guide 참조가 오류를 만들면 guide를 삭제하고 cover semantic을 다시 잡아야 하나요?'],
  ['narrow_free', 'M-006', '헤딩 위계 재배치', '디자인 때문에 h4처럼 보이는 제목이라도 실제 구조가 h2면 태그를 h2로 맞춰야 하나요?'],
  ['narrow_free', 'M-007', '요약 메타데이터 작성', '접근성 요약에는 이 책이 텍스트와 목차를 제공한다는 식으로 실제 제공 기능을 적으면 되나요?'],
  ['narrow_free', 'M-008', '파일별 title 값', 'chapter01.xhtml title을 전부 빈값으로 두지 말고 장 제목에 맞춰 넣어야 하나요?'],
  ['narrow_free', 'M-009', '충분 접근 방식', '시각 자료가 있어도 본문 텍스트만으로 이해 가능하면 accessModeSufficient를 textual로 둘 수 있나요?'],
  ['narrow_free', 'M-010', '색만으로 부족한 링크', '링크를 색만 조금 다르게 표시한 경우 밑줄까지 넣는 편이 접근성에 더 안전한가요?'],
  ['narrow_free', 'M-011', '위험요소 메타 none', '깜빡임과 소리, 동작 시뮬레이션이 없는 일반 텍스트 책이면 hazard 값을 none으로 쓰면 되나요?'],
  ['narrow_free', 'M-014', '반응형 이미지 CSS', '본문 그림마다 width를 고정하지 말고 img에 max-width와 height auto를 공통 CSS로 주면 되나요?'],
  ['narrow_free', 'M-017', '상대 글자 크기', '뷰어 확대를 고려하면 본문 font-size를 px보다 em 기준으로 1em 이상 두는 게 맞나요?'],
  ['narrow_free', 'M-029', '문서 언어 ko', '모든 XHTML html 태그의 lang과 xml:lang을 ko로 맞춰도 되나요?'],
  ['narrow_free', 'M-034', 'spacing 접근성', '자간을 좁히려고 음수 값을 넣은 CSS는 삭제하거나 0 이상으로 바꾸는 게 맞나요?'],
  ['narrow_free', 'M-015', '하이라이트 CSS 제거', '제목 밑줄 효과로 넣은 border-bottom 값이 검사 오류를 만들면 해당 CSS를 지우는 게 맞나요?'],
  ['narrow_free', 'M-016', '주석 양방향 연결', '본문 각주 번호와 주석 설명을 서로 오갈 수 있게 a 태그 id와 href를 맞춰야 하나요?'],
];

if (questions.length !== 100) {
  throw new Error(`Expected 100 questions, got ${questions.length}`);
}

const rows = questions.map(([category, intent, testFocus, generatedQuestion], index) => ({
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

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_100_day2.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_100_day2.csv');
writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
