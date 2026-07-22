const fs = require('fs');
const path = require('path');
const {
  DATA_DIR,
  normalizeText,
  readWorkbookRows,
  similarity,
  writeCsv,
  writeWorkbook,
} = require('./utils');

const START_NO = 441;
const OUTPUT_BASE = 'mixed_user_questions_200_day4_core_preview';
const BANNED_PHRASES = ['초보 제작자', '실무 기준', '답해주세요', '따라 할 수 있게'];
const SPECIFIC_PATTERNS = [
  /\b[\w-]+\.(png|jpe?g|gif|webp|xhtml|html|css|opf|ttf|otf)\b/i,
  /\d+\s*(px|em|cm|km|%)/i,
  /\d+\s*[×x]\s*\d+/i,
];

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const answerByIntent = new Map();
const categoryByIntent = new Map();

for (const row of sourceRows) {
  if (!row.intent || answerByIntent.has(row.intent)) continue;
  answerByIntent.set(row.intent, row.expected_answer || '');
  categoryByIntent.set(row.intent, row.category || '');
}

const candidates = [
  ['L-001', '리소스 누락', '이미지를 불러오는 경로와 실제 파일명이 서로 다르면 RSC_007 오류가 날 수 있나요?'],
  ['L-001', '리소스 누락', '본문에서는 리소스를 참조하는데 패키지 안에 파일이 없으면 어떤 부분을 수정해야 하나요?'],
  ['L-001', '리소스 누락', '스타일에서 참조한 이미지나 폰트도 EPUB 안에 없으면 누락 리소스 오류로 보나요?'],
  ['L-002', 'img 위치', 'img 태그가 문서 구조 안에서 허용되지 않는 위치에 있을 때는 어떤 태그로 감싸야 하나요?'],
  ['L-002', 'img 위치', '이미지를 문단 사이에 넣을 때 p로 감싸는 방식과 figure로 감싸는 방식 중 어떤 기준으로 정하나요?'],
  ['L-003', 'br 위치', '줄바꿈 태그는 문단 안에서만 써야 하나요, 목록이나 표 사이에 넣어도 되나요?'],
  ['L-003', 'br 위치', '시처럼 행 구분이 필요한 본문에서 br을 사용할 때 위치 기준이 궁금합니다.'],
  ['L-004', '블록/인라인 구조', '링크나 강조 태그 안에 div 같은 블록 요소가 들어가면 오류가 나는 이유가 뭔가요?'],
  ['L-004', '블록/인라인 구조', '인라인 태그 안에 문단이나 구역 태그가 섞여 있을 때는 어떻게 구조를 나눠야 하나요?'],
  ['L-005', '표 안 문단', '표 설명문을 table 내부에 문단으로 넣으면 안 되는 경우가 있나요?'],
  ['L-005', '표 안 문단', '표 셀 안의 긴 텍스트는 p 태그로 감싸도 괜찮나요?'],
  ['L-006', '목록 구조', 'li 태그만 남아 있는 본문은 ul이나 ol로 다시 감싸야 하나요?'],
  ['L-006', '목록 구조', '실제 목록이 아닌 들여쓰기 문장에 li를 사용해도 접근성 구조상 문제가 되나요?'],
  ['L-008', 'table 위치', 'table 태그가 p 태그 안에 들어가 있으면 어떻게 분리해야 하나요?'],
  ['L-008', 'table 위치', '표는 문단 내부가 아니라 별도 블록 구조로 배치해야 하나요?'],
  ['L-009', 'heading 위치', '제목 태그가 문단 안에 들어가 있으면 p를 닫고 제목을 분리해야 하나요?'],
  ['L-009', 'heading 위치', '캡션이나 인용문 안에 제목 태그가 들어가 있을 때도 위치 오류가 날 수 있나요?'],
  ['L-010', 'a 태그 구조', 'a 태그 안에 다른 링크가 들어가 있으면 어떻게 분리해야 하나요?'],
  ['L-010', 'a 태그 구조', '링크 범위를 문단 전체로 잡기보다 실제 링크 텍스트만 감싸는 편이 맞나요?'],
  ['L-011', 'span 위치', 'span 태그가 단독 문단처럼 쓰인 경우 p 안으로 넣어야 하나요?'],
  ['L-011', 'span 위치', 'span을 줄 단위 블록처럼 사용한 코드는 어떤 구조로 바꾸는 게 좋나요?'],
  ['L-012', 'tr 구조', 'table 바로 아래에 tr이 있을 때 tbody 같은 행 그룹을 추가해야 하나요?'],
  ['L-012', 'tr 구조', '표의 제목행과 본문행은 thead와 tbody로 나눠도 되나요?'],
  ['L-013', 'td 구조', 'td 태그가 tr 밖에 있으면 행 단위로 다시 감싸야 하나요?'],
  ['L-013', 'td 구조', '빈 셀을 만들 때도 td는 반드시 해당 행 안에 있어야 하나요?'],
  ['L-014', 'b 위치', 'b 태그가 문단 밖에 단독으로 있으면 p 안으로 옮겨야 하나요?'],
  ['L-014', 'b 위치', '굵게 처리하려고 b 태그가 블록 요소까지 감싸고 있으면 어떻게 수정해야 하나요?'],
  ['L-015', 'ul 위치', 'ul 태그가 p 안에 들어가 있으면 목록을 문단 밖으로 빼야 하나요?'],
  ['L-015', 'ul 위치', '목록을 다른 인라인 태그 안에 넣으면 EPUB 검사에서 오류가 날 수 있나요?'],
  ['L-016', 'ol 위치', '번호 목록을 만들 때 ol은 문단 내부가 아니라 별도 구조로 둬야 하나요?'],
  ['L-016', 'ol 위치', '원문에 순서가 있는 항목은 ol과 li로 만드는 게 접근성에 맞나요?'],
  ['L-017', 'manifest 등록', '본문에서 참조하는 이미지나 CSS는 OPF manifest에 모두 등록되어야 하나요?'],
  ['L-017', 'manifest 등록', '새 리소스를 추가한 뒤 manifest 등록 여부를 꼭 확인해야 하나요?'],
  ['L-017', 'manifest 등록', 'manifest에 남아 있지만 실제로 쓰지 않는 리소스는 정리해도 되나요?'],
  ['L-018', '조각 식별자', '링크가 가리키는 id가 실제 문서에 없으면 조각 식별자 오류가 나는 건가요?'],
  ['L-018', '조각 식별자', '본문 링크와 대상 id의 표기가 다를 때 어느 쪽을 기준으로 맞춰야 하나요?'],
  ['L-018', '조각 식별자', '같은 문서 안에 같은 id가 중복되어 있으면 링크 오류가 생길 수 있나요?'],
  ['L-019', 'URI 형식', '파일 경로나 링크에 허용되지 않는 문자가 있으면 URI 오류가 날 수 있나요?'],
  ['L-019', 'URI 형식', '리소스 경로를 작성할 때 상대경로 기준을 어떻게 확인해야 하나요?'],
  ['L-020', '목차/읽기 순서', '목차 순서와 실제 읽기 순서가 다르면 nav와 spine을 함께 맞춰야 하나요?'],
  ['L-020', '목차/읽기 순서', '뷰어 목차는 맞아 보여도 독서 순서가 다르면 OPF spine을 확인해야 하나요?'],
  ['L-020', '목차/읽기 순서', 'landmarks 순서도 본문 읽기 흐름과 맞춰야 하나요?'],
  ['L-021', 'spine 참조', 'spine에서 참조하는 id가 manifest에 없으면 어떤 오류가 발생하나요?'],
  ['L-021', 'spine 참조', 'manifest id를 수정했다면 spine idref도 같이 확인해야 하나요?'],
  ['L-022', '파일 없음', '삭제한 파일을 본문 링크가 계속 참조하면 파일 없음 오류가 날 수 있나요?'],
  ['L-022', '파일 없음', '이미지를 삭제한 뒤에는 본문 src나 href 참조도 함께 정리해야 하나요?'],
  ['L-023', 'OPF 속성', 'OPF에 잘못된 properties 값이 들어가면 선언되지 않은 속성 오류가 날 수 있나요?'],
  ['L-023', 'OPF 속성', '파일 역할과 맞지 않는 OPF 속성은 제거하거나 수정해야 하나요?'],
  ['L-024', '파일명 규칙', 'EPUB 내부 파일명에 공백이나 특수문자가 있으면 뷰어 호환성 문제가 생길 수 있나요?'],
  ['L-024', '파일명 규칙', '내부 리소스 파일명은 단순한 영문 중심으로 정리하는 편이 안전한가요?'],
  ['L-025', '비선형 콘텐츠', 'non-linear로 둔 콘텐츠에도 독자가 접근할 수 있는 링크가 필요하나요?'],
  ['L-025', '비선형 콘텐츠', '부록이나 해설처럼 읽을 수 있어야 하는 파일은 접근 링크를 만들어야 하나요?'],
  ['L-026', 'spine 미등록', '본문에서 연결되는 콘텐츠가 spine에 없으면 오류나 접근성 문제가 생길 수 있나요?'],
  ['L-026', 'spine 미등록', '실제 독서 대상인 XHTML 파일은 spine 등록 여부를 확인해야 하나요?'],
  ['L-027', '파일 해독 오류', '특정 XHTML 파일만 열리지 않으면 인코딩이나 태그 구조를 먼저 확인해야 하나요?'],
  ['L-027', '파일 해독 오류', '이미지 확장자와 실제 파일 형식이 다르면 EPUB 검사에서 문제가 될 수 있나요?'],
  ['L-028', '외부 리소스', 'EPUB 본문에서 외부 이미지 주소를 직접 참조하면 안 되나요?'],
  ['L-028', '외부 리소스', '웹폰트나 외부 스타일을 불러오는 코드는 EPUB 내부 리소스로 바꿔야 하나요?'],
  ['L-029', '리소스 경로', 'OPF manifest의 href는 OPF 위치를 기준으로 경로를 적어야 하나요?'],
  ['L-029', '리소스 경로', '검사에서 누락 파일이 나오면 실제 파일 존재와 참조 경로를 같이 봐야 하나요?'],
  ['L-030', 'manifest 중복', '같은 리소스가 manifest에 중복 등록되어 있으면 하나만 남겨야 하나요?'],
  ['L-030', 'manifest 중복', 'id만 다르고 같은 파일을 가리키는 manifest 항목도 중복으로 보나요?'],
  ['L-031', 'CSS 오류', 'CSS 오류가 여러 줄에 걸쳐 나올 때는 첫 번째 문법 오류부터 확인하면 되나요?'],
  ['L-031', 'CSS 오류', '중괄호나 주석 닫힘이 빠지면 EPUB 검사에서 CSS 오류가 발생할 수 있나요?'],
  ['L-032', 'guide 오류', 'guide가 manifest에 없는 파일을 가리키면 guide 항목을 정리해야 하나요?'],
  ['L-032', 'guide 오류', 'EPUB3 제작본에서 예전 guide 항목 때문에 오류가 나면 nav와 표지 설정을 다시 봐야 하나요?'],
  ['L-033', 'unique identifier', 'package의 unique-identifier와 dc:identifier의 id가 서로 맞아야 하나요?'],
  ['L-033', 'unique identifier', '식별자를 새로 넣었다면 OPF에서 참조하는 id 연결도 같이 바꿔야 하나요?'],
  ['M-001', '명도 대비', '본문 색과 배경색의 대비가 낮으면 CSS에서 색상을 조정해야 하나요?'],
  ['M-001', '명도 대비', '링크나 캡션도 일반 본문처럼 명도 대비 기준을 맞춰야 하나요?'],
  ['M-001', '명도 대비', '원본 디자인 색을 유지하기 어렵다면 접근성 기준에 맞춰 색을 바꿔도 되나요?'],
  ['M-002', 'ARIA role', '제목처럼 보이게 하려고 role을 넣기보다 실제 heading 태그를 쓰는 게 맞나요?'],
  ['M-002', 'ARIA role', '동작하지 않는 요소에 버튼 같은 role이 남아 있으면 제거해야 하나요?'],
  ['M-002', 'ARIA role', '표 내용을 읽어야 하는데 presentation role이 있으면 접근성 오류가 될 수 있나요?'],
  ['M-003', 'presentation/alt', '장식 이미지에 alt 텍스트와 presentation role이 같이 있으면 어떻게 정리해야 하나요?'],
  ['M-003', 'presentation/alt', '의미 있는 이미지에는 presentation role을 빼고 alt를 유지해야 하나요?'],
  ['M-003', 'presentation/alt', '내용을 읽어야 하는 표에는 presentation role을 쓰면 안 되나요?'],
  ['M-004', '언어 속성', '한국어 본문인데 html lang이 다른 언어로 되어 있으면 ko로 수정해야 하나요?'],
  ['M-004', '언어 속성', 'lang과 xml:lang은 같은 언어 값으로 맞춰야 하나요?'],
  ['M-004', '언어 속성', '본문 일부에 외국어가 있을 때 해당 부분에만 lang을 따로 줄 수 있나요?'],
  ['M-005', '이미지 alt', 'alt가 없는 의미 있는 이미지는 대체텍스트를 반드시 작성해야 하나요?'],
  ['M-005', '이미지 alt', '본문 이해와 관계없는 장식 이미지는 빈 alt로 처리하면 되나요?'],
  ['M-005', '이미지 alt', '표지 alt를 작성할 때 표지에 있는 모든 문구를 빠짐없이 넣어야 하나요?'],
  ['M-006', '헤딩 순서', '헤딩 단계가 중간에 건너뛰면 접근성 검사에서 문제가 되나요?'],
  ['M-006', '헤딩 순서', '디자인 크기와 별개로 제목 태그는 논리적 위계에 맞춰야 하나요?'],
  ['M-006', '헤딩 순서', '본문 구역이 바뀌는 부분에는 화면낭독기용 heading을 넣어도 되나요?'],
  ['M-007', '접근성 요약', 'accessibilitySummary에는 책 소개보다 접근성 제공 사항을 적는 게 맞나요?'],
  ['M-007', '접근성 요약', '대체텍스트나 읽기 순서 제공 여부를 접근성 요약에 간단히 써도 되나요?'],
  ['M-008', '문서 title', '각 XHTML 문서의 title이 비어 있으면 접근성 오류가 날 수 있나요?'],
  ['M-008', '문서 title', '문서 title은 파일명보다 해당 장이나 내용에 맞게 작성해야 하나요?'],
  ['M-009', 'accessModeSufficient', '텍스트와 대체텍스트만으로 이해 가능한 도서는 accessModeSufficient를 어떻게 정하나요?'],
  ['M-009', 'accessModeSufficient', '이미지 설명이 충분한 경우에도 accessModeSufficient 값을 따로 입력해야 하나요?'],
  ['M-010', '링크 구분', '링크가 주변 본문과 시각적으로 구분되지 않으면 밑줄이나 색상으로 구분해야 하나요?'],
  ['M-010', '링크 구분', '각주 번호 링크도 일반 숫자와 구분되도록 스타일을 주는 게 좋나요?'],
  ['M-011', 'accessibilityHazard', '깜빡임이나 소리 위험이 없는 EPUB도 accessibilityHazard 값을 넣어야 하나요?'],
  ['M-011', 'accessibilityHazard', '움직임이나 소리 요소가 있으면 접근성 위험 메타데이터를 확인해야 하나요?'],
  ['M-012', 'accessibilityFeature', '목차와 읽기 순서가 제공되면 accessibilityFeature에 관련 값을 넣어도 되나요?'],
  ['M-012', 'accessibilityFeature', '이미지 대체텍스트를 제공한 경우 accessibilityFeature에 표시할 수 있나요?'],
  ['M-013', 'accessMode', '텍스트 중심 도서에 이미지가 포함되어 있으면 accessMode를 어떻게 적어야 하나요?'],
  ['M-013', 'accessMode', '오디오가 없는 일반 EPUB에는 auditory 값을 넣지 않는 게 맞나요?'],
  ['M-014', '이미지 크기', '큰 이미지가 화면 밖으로 넘어가면 반응형 CSS로 조정해야 하나요?'],
  ['M-014', '이미지 크기', '이미지 크기를 고정값으로 지정하면 뷰어 확대 시 문제가 생길 수 있나요?'],
  ['M-015', '하이라이터 CSS', '형광펜이나 밑줄 효과가 글자를 가리면 CSS를 단순하게 조정해야 하나요?'],
  ['M-015', '하이라이터 CSS', '뷰어마다 깨지는 장식 CSS는 접근성 검수 전에 줄이는 게 좋나요?'],
  ['M-016', '주석 링크', '본문에서 주석으로 이동했다가 다시 본문으로 돌아오는 링크도 필요하나요?'],
  ['M-016', '주석 링크', '주석 번호와 주석 설명은 양방향 링크로 구성하는 게 맞나요?'],
  ['M-017', '본문 글자 크기', '본문 글자 크기를 고정 단위로 지정하면 접근성 문제가 될 수 있나요?'],
  ['M-017', '본문 글자 크기', '캡션이나 주석 글자도 너무 작지 않게 조정해야 하나요?'],
  ['M-018', '읽기 순서', '이미지가 문장 중간에 끼어 있으면 화면낭독기 읽기 흐름이 어색해질 수 있나요?'],
  ['M-018', '읽기 순서', '도표와 설명 문단은 독자가 이해하기 쉬운 순서로 배치해야 하나요?'],
  ['M-019', '목차 생성', '자동 목차 생성에서 항목이 빠지면 heading 구조를 먼저 확인해야 하나요?'],
  ['M-019', '목차 생성', '본문 제목은 있는데 nav 목차에 없으면 목차를 다시 만들거나 수동 보완해야 하나요?'],
  ['M-020', 'CSS 연결', '일부 XHTML에만 스타일이 적용되지 않으면 stylesheet 연결 경로를 확인해야 하나요?'],
  ['M-020', 'CSS 연결', '공통 CSS가 빠진 파일이 있으면 접근성 스타일도 누락될 수 있나요?'],
  ['M-021', '언어 중복', 'html과 body에 같은 xml:lang이 중복 선언되어 있으면 하위 선언을 정리해도 되나요?'],
  ['M-021', '언어 중복', '문단마다 같은 언어 속성이 반복되어 있으면 루트 언어 선언 중심으로 정리해도 되나요?'],
  ['M-022', '제목 구조', '시각적으로 제목인 문장이 일반 문단으로만 되어 있으면 heading 태그로 바꿔야 하나요?'],
  ['M-022', '제목 구조', '목차에는 넣지 않을 제목도 문서 구조상 heading으로 만들 수 있나요?'],
  ['M-023', '폰트 단위', '본문 글자 크기를 px 같은 고정 단위보다 상대 단위로 지정하는 게 좋나요?'],
  ['M-023', '폰트 단위', '줄간격도 글자 확대에 맞게 변하는 단위로 설정하는 게 안전한가요?'],
  ['M-024', '앞부분 역할', '머리말이나 서문은 일반 chapter가 아니라 preface 역할로 지정해야 하나요?'],
  ['M-024', '앞부분 역할', '본문 앞 안내 글은 내용 성격에 맞는 section 역할을 주는 게 좋나요?'],
  ['M-025', 'nav 노출', 'nav 문서가 본문처럼 노출되면 OPF의 spine 설정을 확인해야 하나요?'],
  ['M-025', 'nav 노출', '목차 파일을 독서 흐름에 포함하지 않으려면 어떤 설정을 봐야 하나요?'],
  ['M-026', '표지 설정', '표지 이미지가 있어도 Cover Image로 지정하지 않으면 뷰어에 안 보일 수 있나요?'],
  ['M-026', '표지 설정', '표지 설정 후에도 뷰어에 안 보이면 landmarks도 함께 확인해야 하나요?'],
  ['M-027', 'blockquote', '단순 들여쓰기나 박스 모양을 위해 blockquote를 쓰면 안 되나요?'],
  ['M-027', 'blockquote', '실제 인용문이 아닌 내용은 blockquote 대신 일반 문단과 CSS로 처리해야 하나요?'],
  ['M-028', '제목 개행', '제목을 줄바꿈하려고 heading 태그를 여러 번 나누면 목차 구조가 깨질 수 있나요?'],
  ['M-028', '제목 개행', '제목과 부제를 같은 heading 안에서 처리할지 하위 heading으로 나눌지 기준이 궁금합니다.'],
  ['M-029', '언어 코드', '한국어 EPUB의 lang 값은 파일마다 같은 형식으로 통일하는 게 좋나요?'],
  ['M-029', '언어 코드', '일부 외국어 문장은 전체 lang이 아니라 해당 구간에만 언어를 지정하면 되나요?'],
  ['M-030', '참고문헌 역할', '참고문헌 페이지는 chapter보다 bibliography 역할이 더 적절한가요?'],
  ['M-030', '참고문헌 역할', '색인이나 찾아보기 페이지도 내용 성격에 맞는 역할을 줄 수 있나요?'],
  ['M-031', '단위 표기', '본문의 단위 기호가 화면낭독기에서 어색하게 읽히면 표기를 바꿔도 되나요?'],
  ['M-031', '단위 표기', '표 안의 단위도 스크린리더가 읽기 쉬운 문자로 정리해야 하나요?'],
  ['M-032', '헤딩 안 이미지', 'heading 안에 장식 이미지가 같이 있으면 화면낭독기에서 제목과 함께 읽힐 수 있나요?'],
  ['M-032', '헤딩 안 이미지', '목차나 제목 안의 장식 이미지는 숨김 처리하거나 밖으로 빼야 하나요?'],
  ['M-033', '이미지 차례', '이미지로만 된 차례는 텍스트 목차로 다시 만드는 게 맞나요?'],
  ['M-033', '이미지 차례', '차례 이미지 안의 장 제목과 페이지 정보는 텍스트로 옮겨야 하나요?'],
  ['M-034', '글자 간격', 'letter-spacing이나 word-spacing이 너무 좁으면 접근성 검수에서 문제가 되나요?'],
  ['M-034', '글자 간격', '글자 간격을 음수로 줄인 CSS는 제거하거나 조정해야 하나요?'],
  ['M-035', '구분 기호', '구분선처럼 보이는 문자가 화면낭독기에서 다르게 읽히면 다른 기호로 바꿔야 하나요?'],
  ['M-035', '구분 기호', '문장 구분용 기호가 오독을 일으키면 접근성 관점에서 수정 대상인가요?'],
  ['M-036', '문단 간격', '문단 간격이 과하게 넓으면 CSS 여백을 줄여도 되나요?'],
  ['M-036', '문단 간격', '줄간격이나 문단 여백도 읽기 편한 범위로 조정해야 하나요?'],
  ['M-037', '판권지 역할', '판권지 파일에는 copyright-page 역할을 지정하는 게 맞나요?'],
  ['M-037', '판권지 역할', '저작권 정보가 있는 section은 일반 본문과 구분해 역할을 줘야 하나요?'],
  ['M-038', '메타데이터', 'OPF 메타데이터가 판권지 정보와 다르면 어느 쪽을 기준으로 수정해야 하나요?'],
  ['M-038', '메타데이터', '도서 제목이나 식별자 메타데이터는 납품 전 다시 확인해야 하나요?'],
  ['M-039', '표지 역할', '표지 이미지에는 표지임을 알 수 있는 role이나 label을 넣어야 하나요?'],
  ['M-039', '표지 역할', '표지 alt와 표지 역할 정보는 서로 별도로 확인해야 하나요?'],
  ['N-001', '미주 다중 참조', '하나의 미주 설명을 본문 여러 곳에서 참조할 때 링크는 어떻게 구성해야 하나요?'],
  ['N-001', '미주 다중 참조', '같은 미주로 연결되는 번호가 여러 개일 때 돌아가기 링크가 꼬이지 않게 하려면 어떻게 해야 하나요?'],
  ['N-002', '뷰어 멈춤', 'EPUB이 뷰어에서 끝까지 열리지 않으면 표지 설정이나 landmarks를 확인해야 하나요?'],
  ['N-002', '뷰어 멈춤', '검사 오류가 없어도 뷰어에서 열림 문제가 있으면 표지 시맨틱을 다시 봐야 하나요?'],
  ['N-003', 'Mac 환경', 'Mac 환경에서 윈도우용 제작 도구를 못 쓰면 대체 검수 도구를 사용해도 되나요?'],
  ['N-003', 'Mac 환경', 'Mac에서 전자책 접근성 검수를 할 때 어떤 방식으로 환경을 맞추면 좋나요?'],
  ['N-004', 'ACE 사용', 'Sigil 플러그인 대신 별도 Ace 앱으로 검사해도 같은 기준으로 볼 수 있나요?'],
  ['N-004', 'ACE 사용', 'Mac에서 Ace 플러그인이 불안정하면 Ace 앱 검사 결과를 기준으로 삼아도 되나요?'],
  ['N-005', '한자 입력', '원문 한자가 흐릿할 때는 사전이나 필기 인식으로 확인한 뒤 입력해야 하나요?'],
  ['N-005', '한자 입력', '정확하지 않은 한자를 임의로 넣기보다 확인 가능한 한자를 찾아 입력하는 게 맞나요?'],
  ['N-006', '외국어 처리', '유니코드로 표현 가능한 외국어는 이미지가 아니라 텍스트로 입력해야 하나요?'],
  ['N-006', '외국어 처리', '입력이 어려운 외국어 이미지는 제작자 주로 설명 처리할 수 있나요?'],
  ['N-007', '주석 안 링크', '주석 설명 안에 다른 링크가 있으면 본문 복귀 링크와 중첩되지 않게 분리해야 하나요?'],
  ['N-007', '주석 안 링크', '미주 전체를 링크로 감싸면 내부 링크와 충돌할 수 있나요?'],
  ['N-008', '강조 유지', '굵게 표시된 단어가 의미 있는 강조인지 확인한 뒤 유지 여부를 판단해야 하나요?'],
  ['N-008', '강조 유지', '변환 과정에서 생긴 의미 없는 굵게 처리는 제거해도 되나요?'],
  ['N-009', 'QR 코드', 'QR 코드 이미지는 alt에 목적을 쓰고 실제 링크는 캡션에 두면 되나요?'],
  ['N-009', 'QR 코드', 'QR 코드 주변 안내 문구는 alt보다 본문이나 figcaption으로 제공하는 게 좋나요?'],
  ['N-010', '주석 분리', '여러 주석 번호가 하나의 설명에 묶여 있으면 번호별로 분리해야 하나요?'],
  ['N-010', '주석 분리', '본문 주석 번호와 미주 설명은 일대일로 맞추는 게 원칙인가요?'],
  ['N-011', 'bookid', 'bookid 오류가 나면 UUID와 dc:identifier 연결을 함께 확인해야 하나요?'],
  ['N-011', 'bookid', '식별자를 새로 만들면 unique-identifier도 새 식별자를 바라보게 해야 하나요?'],
  ['N-012', '시 구조', '시 본문을 배치용 table로 만든 경우 p와 br 중심으로 다시 구성해야 하나요?'],
  ['N-012', '시 구조', '다단처럼 보이는 시도 낭독 순서에 맞게 한 흐름으로 풀어야 하나요?'],
  ['N-013', 'TOC 오류', 'TOC 오류가 나면 nav 목차와 OPF spine 순서를 함께 확인해야 하나요?'],
  ['N-013', 'TOC 오류', '목차 클릭 순서와 실제 읽기 순서가 다르면 어디를 수정해야 하나요?'],
  ['N-014', '이미지 복원', '삭제한 이미지가 본문 이해에 필요한 경우 원본에서 다시 넣고 alt도 작성해야 하나요?'],
  ['N-014', '이미지 복원', '이미지를 다시 삽입할 때는 figure 구조와 대체텍스트도 같이 확인해야 하나요?'],
  ['N-015', '이모지 처리', '유니코드로 표시되는 이모지는 그대로 둘 수 있나요?'],
  ['N-015', '이모지 처리', '뷰어에서 깨지는 이모지나 아이콘은 텍스트 설명으로 바꾸는 게 좋나요?'],
  ['N-016', '단순 수식', '단순 계산식 이미지는 MathML 대신 텍스트로 바꿔도 되나요?'],
  ['N-016', '단순 수식', '이미지로 된 간단한 수식은 유니코드 기호와 텍스트로 입력하는 게 맞나요?'],
  ['N-017', '화면 캡처', '화면 캡처 이미지의 모든 문구를 alt에 넣어야 하나요?'],
  ['N-017', '화면 캡처', '화면 캡처의 핵심 조작 설명은 alt보다 본문이나 figcaption으로 빼도 되나요?'],
  ['N-018', '표 줄바꿈', '표 셀 안에서 줄바꿈이 필요할 때 br 태그를 사용해도 되나요?'],
  ['N-018', '표 줄바꿈', '표 제목 셀 안의 긴 문구도 셀 내부에서 줄바꿈 처리할 수 있나요?'],
  ['N-019', '파일명과 heading', 'XHTML 파일명보다 실제 본문 내용 기준으로 heading을 정해야 하나요?'],
  ['N-019', '파일명과 heading', '파일명이 특정 역할처럼 보여도 내용이 다르면 heading은 내용 기준으로 잡나요?'],
  ['N-020', '헤딩 재구성', '원본 디자인의 제목 크기와 전자책 heading 위계가 다르면 전자책 구조에 맞춰 수정해야 하나요?'],
  ['N-020', '헤딩 재구성', '장 안의 소제목을 모두 같은 상위 heading으로 두면 목차 위계가 깨질 수 있나요?'],
  ['N-021', '장식 이미지', '본문 이해와 관계없는 반복 장식 이미지는 빈 alt와 presentation으로 처리하면 되나요?'],
  ['N-021', '장식 이미지', '의미 없는 배경 이미지도 접근성 설명 없이 숨김 처리할 수 있나요?'],
  ['N-022', '이미지 페이지', '이미지만 있고 본문 흐름과 무관한 페이지는 이미지와 XHTML을 함께 정리해도 되나요?'],
  ['N-022', '이미지 페이지', '이미지를 삭제한 뒤 빈 XHTML이 남으면 spine과 nav 참조도 같이 정리해야 하나요?'],
  ['N-023', '목차 제외 제목', '본문 구조상 필요한 제목을 nav 목차에는 보이지 않게 처리할 수 있나요?'],
  ['N-023', '목차 제외 제목', '화면에는 보이지 않는 구조용 heading을 넣을 때 목차 노출을 따로 제어해야 하나요?'],
  ['N-024', '미리보기 차이', 'Sigil Book View와 Preview 표시가 다르면 실제 뷰어와 Preview 기준으로 판단해도 되나요?'],
  ['N-024', '미리보기 차이', 'Book View에서만 간격이 이상해 보이는 경우 실제 출력 기준을 다시 확인해야 하나요?'],
  ['N-025', 'Sigil 검사 설정', 'Sigil 검사에서 Python 경로 오류가 나오면 번들 Python 설정을 확인해야 하나요?'],
  ['N-025', 'Sigil 검사 설정', '검사 플러그인이 실행되지 않을 때는 Sigil 환경설정부터 확인하면 되나요?'],
  ['N-026', '표지 미노출', 'EPUB 검사 통과 후에도 표지가 안 보이면 cover semantic과 landmarks를 확인해야 하나요?'],
  ['N-026', '표지 미노출', '뷰어 책장에 표지가 안 나오면 표지 이미지 지정 문제일 수 있나요?'],
  ['N-027', 'heading order', 'heading order invalid 오류는 헤딩 단계가 건너뛰었다는 뜻인가요?'],
  ['N-027', 'heading order', '본문 중간에 낮은 단계 heading이 먼저 나오면 논리 순서에 맞게 수정해야 하나요?'],
  ['N-028', '자모 분리', '뷰어에서 한글 자모가 분리되어 보이면 텍스트 인코딩이나 정규화를 확인해야 하나요?'],
  ['N-028', '자모 분리', '일부 한글만 깨져 보이면 원문 텍스트를 다시 입력해 보는 게 도움이 되나요?'],
  ['N-029', 'bookid 오류', 'epub check의 identifier 오류는 UUID 값과 id 연결을 함께 봐야 하나요?'],
  ['N-029', 'bookid 오류', 'dc:identifier가 있어도 package 참조가 다르면 bookid 오류가 날 수 있나요?'],
  ['N-030', '빈 meta', '값이 없는 OPF meta 태그는 삭제하는 게 맞나요?'],
  ['N-030', '빈 meta', 'metadata 안에 비어 있는 항목이 있으면 EPUB 검사 오류가 날 수 있나요?'],
  ['N-031', '표 제목열', '표의 첫 열이 항목명 역할이면 td 대신 th로 바꿔야 하나요?'],
  ['N-031', '표 제목열', '제목행이 아니라 제목열인 표도 헤더 셀을 따로 지정해야 하나요?'],
  ['N-032', '표지 이미지', '표지 화면은 맞는데 실제 img src가 다른 이미지를 가리키면 src를 수정해야 하나요?'],
  ['N-032', '표지 이미지', '표지 이미지를 교체했다면 XHTML 경로와 OPF 표지 설정을 함께 확인해야 하나요?'],
  ['N-033', '만화 이미지', '만화 대사가 본문에 이미 있으면 figcaption에 반복하지 않아도 되나요?'],
  ['N-033', '만화 이미지', '본문에 없는 만화 속 대사는 figcaption으로 제공해야 하나요?'],
  ['N-034', '이미지 오류', '이미지 관련 EPUB 오류가 나면 OPF의 중복 등록과 누락을 함께 확인해야 하나요?'],
  ['N-034', '이미지 오류', '이미지를 교체한 뒤에는 manifest와 본문 참조가 모두 맞는지 확인해야 하나요?'],
  ['N-035', 'figure 구조', '한 figure 안에 여러 figcaption이 있으면 figure를 나눠야 하나요?'],
  ['N-035', 'figure 구조', '여러 이미지를 하나의 설명으로 묶을 때 figcaption은 하나만 두면 되나요?'],
  ['N-036', 'guide 정리', 'guide가 manifest에 없는 파일을 가리키면 guide를 삭제하고 표지 설정을 다시 잡아야 하나요?'],
  ['N-036', 'guide 정리', 'EPUB3에서 guide 항목 때문에 오류가 나면 nav landmarks 중심으로 정리하면 되나요?'],
];

const omittedCandidateNumbers = new Set([
  3, 5, 7, 15, 23, 37, 42, 55,
  71, 75, 80, 85, 90, 95, 100, 105,
  154, 158, 162, 166, 170, 174, 178, 182,
]);

const selectedCandidates = candidates.filter((_, index) => !omittedCandidateNumbers.has(index + 1));

if (selectedCandidates.length !== 200) {
  throw new Error(`Expected 200 selected candidates, got ${selectedCandidates.length}`);
}

for (const phrase of BANNED_PHRASES) {
  const hit = selectedCandidates.find((candidate) => candidate[2].includes(phrase));
  if (hit) throw new Error(`Banned phrase "${phrase}" found in: ${hit[2]}`);
}

for (const pattern of SPECIFIC_PATTERNS) {
  const hit = selectedCandidates.find((candidate) => pattern.test(candidate[2]));
  if (hit) throw new Error(`Over-specific expression found in: ${hit[2]}`);
}

const previousQuestions = loadPreviousQuestions();
const previousKeys = new Set(previousQuestions.map((question) => normalizeText(question)).filter(Boolean));

const rows = selectedCandidates.map(([intent, testFocus, generatedQuestion], index) => ({
  no: START_NO + index,
  category: categoryByIntent.get(intent) || '',
  intent,
  test_focus: testFocus,
  generated_question: generatedQuestion,
  expected_answer: answerByIntent.get(intent) || '',
  source_category: categoryByIntent.get(intent) || '',
}));

const missingMappings = rows.filter((row) => !row.expected_answer || !row.category);
if (missingMappings.length) {
  throw new Error(`Missing source mapping: ${missingMappings.map((row) => `${row.no}:${row.intent}`).join(', ')}`);
}

const keys = rows.map((row) => normalizeText(row.generated_question));
const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
if (duplicateKeys.length) {
  throw new Error(`Duplicate generated questions in output: ${duplicateKeys.length}`);
}

const exactConflicts = rows.filter((row) => previousKeys.has(normalizeText(row.generated_question)));
if (exactConflicts.length) {
  throw new Error(`Exact conflicts with previous data: ${exactConflicts.map((row) => row.no).join(', ')}`);
}

const closeMatches = rows
  .map((row) => {
    let best = { score: 0, previousQuestion: '' };
    for (const previous of previousQuestions) {
      const score = similarity(row.generated_question, previous);
      if (score > best.score) best = { score, previousQuestion: previous };
    }
    return { no: row.no, generatedQuestion: row.generated_question, ...best };
  })
  .filter((match) => match.score >= 0.88)
  .sort((a, b) => b.score - a.score);

const xlsxPath = path.join(DATA_DIR, `${OUTPUT_BASE}.xlsx`);
const csvPath = path.join(DATA_DIR, `${OUTPUT_BASE}.csv`);
writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
console.log(`rows: ${rows.length}`);
console.log(`first no: ${rows[0].no}`);
console.log(`last no: ${rows[rows.length - 1].no}`);
console.log(`close matches >= 0.88: ${closeMatches.length}`);
for (const match of closeMatches.slice(0, 20)) {
  console.log(`${match.no}\t${match.score.toFixed(4)}\t${match.generatedQuestion}\t=>\t${match.previousQuestion}`);
}

function loadPreviousQuestions() {
  const questions = [];
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => /\.xlsx$/i.test(file) && file !== `${OUTPUT_BASE}.xlsx`);

  for (const file of files) {
    const rows = readWorkbookRows(path.join(DATA_DIR, file));
    for (const row of rows) {
      for (const key of ['generated_question', 'source_question', 'question']) {
        if (row[key]) questions.push(String(row[key]).replace(/\s+/g, ' ').trim());
      }
    }
  }

  return [...new Set(questions.filter(Boolean))];
}
