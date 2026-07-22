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
const OUTPUT_BASE = 'mixed_user_questions_200_day4_preview';
const BANNED_PHRASES = ['초보 제작자', '실무 기준', '답해주세요', '따라 할 수 있게'];

const sourceRows = readWorkbookRows(path.join(DATA_DIR, 'questions_2000.xlsx'));
const answerByIntent = new Map();
const categoryByIntent = new Map();

for (const row of sourceRows) {
  if (!row.intent || answerByIntent.has(row.intent)) continue;
  answerByIntent.set(row.intent, row.expected_answer || '');
  categoryByIntent.set(row.intent, row.category || '');
}

const candidates = [
  ['L-001', 'manifest 리소스 누락', '본문에서 ../Images/map01.png를 부르는데 Images 폴더에는 map_01.png만 있습니다. RSC_007이면 파일명을 맞추는 쪽이 맞나요?'],
  ['L-001', 'CSS 이미지 경로', 'CSS background-image에 예전 이미지 경로가 남아 있으면 본문 img가 아니어도 누락 리소스 오류가 날 수 있나요?'],
  ['L-001', '폰트 참조 누락', '폰트 파일을 삭제했는데 CSS의 @font-face가 그대로 남아 있습니다. 이 경우 manifest와 CSS 중 어디를 먼저 정리해야 하나요?'],
  ['L-001', '대소문자 경로', '이미지 파일은 Cover.JPG인데 코드에는 cover.jpg로 들어가 있습니다. 윈도우에서는 보여도 EPUB 검사에서는 오류가 날 수 있나요?'],
  ['L-002', 'img 감싸기', '본문 첫머리에 img 태그만 바로 놓여 있는데, 표지 다음 장식 이미지라도 p나 figure로 감싸야 하나요?'],
  ['L-002', '삽화 위치', '문단 사이에 들어가는 삽화를 div로 감싸도 되는지, figure로 처리하는 편이 나은지 궁금합니다.'],
  ['L-002', 'img 단독 오류', 'Sigil에서 자동 정리 후 img가 body 바로 아래로 빠졌습니다. 접근성 검사 전에 어떤 구조로 돌려놔야 하나요?'],
  ['L-003', 'br 목록 위치', '목록 항목 사이 간격을 만들려고 ul 안에 br을 넣었습니다. li 안으로 옮겨야 오류가 없어지나요?'],
  ['L-003', '시 줄바꿈', '시 본문에서 연마다 p를 나누고 행 안에서만 br을 쓰면 ACE 위치 오류를 피할 수 있나요?'],
  ['L-003', '표 밖 br', '표 아래 여백을 만들려고 table 다음에 br만 넣었는데 오류가 납니다. CSS 여백으로 바꾸는 게 맞나요?'],
  ['L-004', '블록 요소 중첩', '링크 전체를 크게 잡으려고 a 안에 div와 p를 넣었습니다. 링크는 텍스트나 span 범위로 줄여야 하나요?'],
  ['L-004', 'span 안 div', '강조 span 안에 주석용 div가 들어가면서 오류가 났습니다. div를 밖으로 빼면 구조상 맞을까요?'],
  ['L-004', 'b 안 문단', '굵게 처리된 안내문 전체가 b 태그 안에 p 여러 개로 들어가 있습니다. b 대신 CSS 클래스로 처리해야 하나요?'],
  ['L-005', 'table 설명문 위치', '표 설명문을 table 바로 안에 p로 넣었더니 오류가 납니다. caption이나 table 밖 문단으로 빼야 하나요?'],
  ['L-005', '셀 안 문단', '표 셀 안에 긴 설명이 있어서 p를 넣으려는데 td 내부라면 허용되는 구조인가요?'],
  ['L-005', '변환 표 정리', 'PDF 변환본에서 table 아래 p가 여러 개 끼어 있습니다. 표 내용이면 td 안으로 옮기고 아니면 밖으로 분리하면 되나요?'],
  ['L-006', 'li 부모 복구', '목록처럼 보여야 하는 문장들이 li만 남아 있습니다. ul과 ol 중 원문 번호 유무로 선택하면 되나요?'],
  ['L-006', '목록 아닌 li', '들여쓰기 때문에 li를 쓴 부분이 있는데 실제 목록은 아닙니다. 접근성 구조상 p로 바꾸는 게 맞나요?'],
  ['L-006', '중첩 목록', '하위 항목 li가 부모 li 밖으로 빠져 있습니다. 화면낭독기 순서를 위해 부모 li 안에 ul을 넣어야 하나요?'],
  ['L-008', 'table 문단 내부', '문단 중간에 표가 들어가도록 p 안에 table을 넣었더니 검사 오류가 납니다. p를 닫고 table을 분리해야 하나요?'],
  ['L-008', '레이아웃 표 위치', '본문 박스 모양을 만들려고 span 안에 table을 넣은 파일이 있습니다. div 밖의 별도 table로 옮겨야 하나요?'],
  ['L-009', 'heading 문단 분리', '장 제목이 p 안에서 h2로 감싸져 있습니다. h2를 p 밖으로 빼고 다음 문단을 따로 두면 되나요?'],
  ['L-009', '소제목 위치', '이미지 캡션 안에 h3가 들어가 있는데 캡션 텍스트는 일반 문장으로 두는 게 맞나요?'],
  ['L-009', '제목 태그 오류', 'blockquote 안에 h2를 넣어 장 제목처럼 보이게 했습니다. 장 제목은 section 앞쪽으로 분리해야 하나요?'],
  ['L-010', '링크 중첩 해소', '각주 번호 링크 안에 참고 URL 링크가 같이 들어가 있습니다. 두 a 태그를 나눠서 배치해야 하나요?'],
  ['L-010', '블록 링크', '목차 항목 전체를 누르게 하려고 a가 p를 감싸고 있습니다. p 안의 텍스트만 링크로 잡아도 되나요?'],
  ['L-010', '빈 링크', 'href만 있고 링크 텍스트가 없는 a 태그가 남아 있습니다. 삭제하거나 보이는 텍스트를 넣어야 하나요?'],
  ['L-011', 'span 단독', 'body 바로 아래에 span class="indent"만 놓인 줄이 많습니다. p로 감싸야 검사 오류가 사라지나요?'],
  ['L-011', 'span 줄바꿈', '줄마다 span을 블록처럼 사용한 변환본입니다. 문단 구조를 p로 만들고 span은 문장 내부에만 쓰면 되나요?'],
  ['L-012', 'tbody 누락', 'table 바로 아래에 tr만 반복되어 있습니다. tbody를 넣는 것만으로 구조 오류가 해결되나요?'],
  ['L-012', 'thead와 tbody', '첫 행은 제목행이고 나머지는 본문행입니다. tr을 thead와 tbody로 나눠 감싸는 게 좋나요?'],
  ['L-013', 'td 행 감싸기', 'OCR 정리 중 td들이 table 아래에 바로 들어갔습니다. 행 단위로 tr을 만들어 묶어야 하나요?'],
  ['L-013', '빈 셀 구조', '빈칸을 표현하려고 td를 행 밖에 하나 더 넣었습니다. 빈 셀도 해당 tr 안에 넣어야 하나요?'],
  ['L-014', 'b 위치', '굵은 글씨 한 단어가 body 바로 아래 b로 남아 있습니다. p 안으로 넣거나 strong으로 바꿔야 하나요?'],
  ['L-014', '강조 태그 정리', 'b 태그가 문단 전체를 감싸면서 div까지 포함합니다. 강조는 문장 내부에만 남기는 게 맞나요?'],
  ['L-015', 'ul 위치', 'p 안에 ul이 들어가 있어서 오류가 납니다. 목록 앞뒤 문단을 끊고 ul을 별도로 두면 되나요?'],
  ['L-015', '목록 여백', '목록 간격을 맞추려고 ul을 span 안에 넣은 부분이 있습니다. 블록 구조로 분리해야 하나요?'],
  ['L-016', 'ol 위치', '번호 목록을 p 내부에 넣었더니 ACE가 ol 위치를 지적합니다. p 밖으로 빼는 방식이 맞나요?'],
  ['L-016', '번호 목록 복원', '원문 번호가 1, 2, 3으로 이어지는데 변환본은 p만 있습니다. ol/li로 바꾸는 게 접근성에 더 맞나요?'],
  ['L-017', 'manifest 등록', '새 CSS 파일을 추가했는데 content.opf manifest에는 없습니다. Sigil에서 파일 추가만으로 자동 등록되는지 확인해야 하나요?'],
  ['L-017', 'manifest id 불일치', 'manifest에는 img-map으로 등록됐는데 본문 경로는 맞습니다. id 이름이 달라도 href가 맞으면 괜찮나요?'],
  ['L-017', '미사용 manifest', 'manifest에는 남아 있지만 어디에서도 쓰지 않는 이미지 파일이 있습니다. 검사 전에 지워도 되나요?'],
  ['L-018', '앵커 오탈자', '주석 링크는 #note-12인데 실제 id는 note12입니다. href를 고치는 게 맞나요, id를 바꾸는 게 맞나요?'],
  ['L-018', '대상 id 중복', '같은 XHTML 안에 id="ref1"이 두 번 있습니다. 링크 오류가 나면 중복 id부터 정리해야 하나요?'],
  ['L-018', '파일 간 앵커', '다른 파일의 특정 문단으로 보내는 링크가 깨졌습니다. 파일 경로와 #id를 둘 다 확인해야 하나요?'],
  ['L-019', 'URI 특수문자', '파일명에 # 문자가 들어간 이미지가 있습니다. 링크가 조각 식별자로 해석될 수 있으니 파일명을 바꾸는 게 맞나요?'],
  ['L-019', '공백 인코딩', 'href에 공백이 있는 파일명을 %20으로 고쳐도 되는지, 파일명 자체를 바꾸는 게 나은지 궁금합니다.'],
  ['L-019', '상대경로', 'Text 폴더 파일에서 Images 폴더 이미지를 부를 때 ../Images/로 시작하지 않으면 URI 오류가 날 수 있나요?'],
  ['L-020', 'nav 순서', 'nav.xhtml 목차는 장 순서대로인데 spine에는 부록이 앞에 들어가 있습니다. 독서 순서 기준으로 spine을 맞춰야 하나요?'],
  ['L-020', '목차 링크 순서', '목차에서 프롤로그 다음에 2장이 먼저 연결됩니다. nav 항목 순서만 고치면 되는지 spine도 같이 봐야 하나요?'],
  ['L-020', '랜드마크 순서', 'landmarks의 표지와 본문 순서가 spine 흐름과 다르면 접근성 검사에서 문제가 될 수 있나요?'],
  ['L-021', 'spine idref', 'spine idref 값이 manifest item id와 한 글자 다릅니다. 이 경우 본문 파일이 읽기 순서에서 빠질 수 있나요?'],
  ['L-021', 'manifest id 변경', 'manifest id를 바꾼 뒤 spine idref를 안 바꿨습니다. 두 값을 같은 이름으로 맞춰야 하나요?'],
  ['L-022', '삭제 파일 참조', '삭제한 note.xhtml을 본문 링크가 아직 가리키고 있습니다. 링크를 지우거나 새 주석 파일로 바꿔야 하나요?'],
  ['L-022', '이미지 삭제 후 참조', 'Images 폴더에서 안 쓰는 그림을 지웠더니 본문 어딘가에서 파일 없음 오류가 납니다. 전체 검색으로 src를 찾아야 하나요?'],
  ['L-023', 'OPF 속성 선언', 'OPF에서 properties 값을 추가했는데 검사에서 선언되지 않은 속성이라고 합니다. 허용된 EPUB 속성인지 확인해야 하나요?'],
  ['L-023', '잘못된 properties', 'nav가 아닌 XHTML 파일에 properties="nav"가 들어가 있습니다. 파일 역할에 맞게 properties를 정리해야 하나요?'],
  ['L-024', '파일명 정리', '이미지 파일명에 괄호와 공백이 많습니다. EPUB 납품 전에 영문, 숫자, 하이픈 정도로 정리하는 게 안전한가요?'],
  ['L-024', '한글 파일명', '한글 파일명이 뷰어마다 다르게 보입니다. 내부 파일명은 영문으로 바꾸고 본문 경로도 같이 수정해야 하나요?'],
  ['L-025', 'non-linear 링크', '정답 해설 파일을 non-linear로 뒀는데 본문에서 갈 수 있는 링크가 없습니다. nav나 본문에 링크를 추가해야 하나요?'],
  ['L-025', '부록 접근', '부록 XHTML을 spine에서 non-linear로 처리했습니다. 독자가 접근해야 하는 내용이면 링크를 만들어야 하나요?'],
  ['L-026', 'spine 미등록', '본문에서 appendix.xhtml로 링크가 있는데 appendix가 spine에 없습니다. 실제 콘텐츠라면 spine에 넣어야 하나요?'],
  ['L-026', '참조 전용 파일', '팝업처럼 쓰는 주석 파일이 spine에 없을 때도 오류가 날 수 있나요? 링크 접근 가능 여부를 봐야 하나요?'],
  ['L-027', '파일 손상', '특정 XHTML만 열면 Sigil Preview가 멈춥니다. 인코딩이나 태그 닫힘 문제를 먼저 확인해야 하나요?'],
  ['L-027', '이미지 포맷', '확장자는 jpg인데 실제 파일은 webp에서 바꾼 것 같습니다. EPUB 검사에서 해독 오류가 날 수 있나요?'],
  ['L-028', '외부 이미지', '본문 img src가 https 주소로 남아 있습니다. 이미지를 EPUB 내부로 내려받아 포함해야 하나요?'],
  ['L-028', '외부 폰트', 'CSS에서 구글 폰트를 import하고 있습니다. 접근성 EPUB에서는 외부 호출을 제거해야 하나요?'],
  ['L-029', 'OPF 경로 점검', 'manifest href는 ../Images/photo.jpg로 되어 있는데 OPF 기준 경로가 아닌 것 같습니다. OPF 위치 기준으로 다시 써야 하나요?'],
  ['L-029', '누락 파일 추가', '검사 로그에 없는 파일명이 나오는데 Book Browser에는 보이지 않습니다. 파일을 다시 넣거나 참조를 삭제하면 되나요?'],
  ['L-030', 'manifest 중복', '같은 CSS 파일이 manifest에 id만 다르게 두 번 들어가 있습니다. 하나만 남기면 되나요?'],
  ['L-030', 'cover 중복 등록', '표지 이미지가 cover-image와 image 두 항목으로 중복 등록된 것 같습니다. href가 같으면 중복을 정리해야 하나요?'],
  ['L-031', 'CSS 괄호 오류', 'CSS에서 중괄호 하나가 빠진 뒤 여러 줄이 한꺼번에 오류로 잡힙니다. 첫 오류 위치부터 고치는 게 맞나요?'],
  ['L-031', 'CSS 주석', '주석 닫는 표시가 빠져서 뒤쪽 스타일이 전부 무시됩니다. 검사 오류가 CSS 주석 때문에 생길 수 있나요?'],
  ['L-032', 'guide manifest', 'guide에서 cover.xhtml을 가리키는데 manifest에는 cover 파일이 없습니다. guide를 지우거나 manifest를 맞춰야 하나요?'],
  ['L-032', 'guide 정리', 'EPUB3 파일인데 예전 guide 항목이 남아 있습니다. 오류가 나면 landmarks와 cover 설정을 다시 확인하면 되나요?'],
  ['L-033', 'unique identifier', 'package unique-identifier가 BookId인데 dc:identifier id는 bookid로 되어 있습니다. 대소문자도 맞춰야 하나요?'],
  ['L-033', 'identifier 누락', 'UUID를 새로 넣었는데 package의 unique-identifier가 예전 id를 보고 있습니다. 연결 id를 같이 바꿔야 하나요?'],
  ['M-001', '명도 대비', '원본 색을 유지하니 작은 회색 본문이 배경과 잘 구분되지 않습니다. CSS에서 글자색을 더 진하게 바꾸면 되나요?'],
  ['M-001', '링크 대비', '본문 링크 색만 연해서 대비 경고가 납니다. 링크 색과 밑줄을 함께 조정하는 편이 맞나요?'],
  ['M-001', '캡션 대비', 'figcaption만 연한 회색이라 검사에서 대비가 걸립니다. 캡션도 본문과 같은 대비 기준으로 봐야 하나요?'],
  ['M-002', 'ARIA role', 'p 태그에 role="heading"을 넣어 제목처럼 만들었습니다. 실제 h 태그로 바꾸는 게 더 적절한가요?'],
  ['M-002', '잘못된 role 제거', 'span에 button role이 남아 있는데 실제 동작은 없습니다. EPUB 본문에서는 이런 role을 제거해야 하나요?'],
  ['M-002', 'table role', '데이터 표에 role="presentation"이 들어가 있습니다. 표 내용을 읽어야 하면 role을 빼야 하나요?'],
  ['M-003', '장식 이미지 alt', '장식 구분선 이미지에 alt="구분선"과 role="presentation"이 같이 있습니다. 빈 alt로 정리하는 게 맞나요?'],
  ['M-003', '의미 이미지 role', '설명해야 하는 삽화에 role="presentation"이 들어가 있습니다. alt를 유지하려면 role을 제거해야 하나요?'],
  ['M-003', '표 presentation', '레이아웃용 표라서 role="presentation"을 넣었는데 셀 안에 읽어야 할 텍스트가 있습니다. 표 구조를 다시 잡아야 하나요?'],
  ['M-004', 'html lang', '일부 XHTML은 lang="en"으로 남아 있고 본문은 한국어입니다. html lang을 ko로 통일해야 하나요?'],
  ['M-004', 'xml lang', 'html에는 lang만 있고 xml:lang은 없습니다. EPUB 검사에서 요구하면 둘 다 ko로 넣어야 하나요?'],
  ['M-004', '부분 외국어', '책 전체는 한국어이고 인용문만 영어입니다. html lang은 ko로 두고 인용문에만 lang="en"을 주면 되나요?'],
  ['M-005', 'alt 누락', '본문 삽화 중 alt가 아예 없는 img만 오류로 잡힙니다. 의미 있는 삽화부터 설명을 채우면 되나요?'],
  ['M-005', '빈 alt 판단', '장 제목 옆 아이콘은 본문 이해와 관계없습니다. alt=""로 두고 role="presentation"을 넣어도 되나요?'],
  ['M-005', '표지 alt', '표지 alt를 만들 때 표지의 모든 홍보 문구와 띠지 문구까지 다 적어야 하나요?'],
  ['M-006', '헤딩 순서', 'h1 다음에 디자인상 작은 제목이 h4로 들어가 있습니다. h2나 h3로 위계를 다시 맞춰야 하나요?'],
  ['M-006', '부록 헤딩', '본문 마지막에 부록 제목이 h3로 시작합니다. 앞 장 구조와 상관없이 부록도 적절한 상위 heading이 필요하나요?'],
  ['M-006', '숨은 제목', '화면에는 제목처럼 보이지 않지만 구역이 바뀌는 부분입니다. 화면낭독기용 heading을 넣어도 되나요?'],
  ['M-007', 'accessibilitySummary', '접근성 요약을 넣을 때 "대체텍스트 제공"처럼 작업 내용을 간단히 쓰면 충분한가요?'],
  ['M-007', '요약 문구', 'accessibilitySummary에 책 소개문을 그대로 넣어도 되는지, 접근성 제공 사항을 써야 하는지 궁금합니다.'],
  ['M-008', '문서 title', '각 XHTML title이 모두 Untitled로 남아 있습니다. 장 제목이나 파일 내용을 반영해서 바꿔야 하나요?'],
  ['M-008', '빈 title', 'head title이 빈칸인 파일이 몇 개 있습니다. 화면에 보이지 않아도 반드시 채워야 하나요?'],
  ['M-009', 'accessModeSufficient', '본문 텍스트와 이미지 alt만으로 이해되는 도서라면 accessModeSufficient를 textual로 지정하면 되나요?'],
  ['M-009', '시각 자료 포함', '사진 설명이 충분히 들어간 여행서입니다. accessModeSufficient 값을 정할 때 visual도 함께 봐야 하나요?'],
  ['M-010', '링크 구분', '본문 링크가 검은색 일반 글자와 같고 밑줄도 없습니다. CSS에서 링크 스타일을 따로 줘야 하나요?'],
  ['M-010', '각주 링크 표시', '각주 번호 링크가 본문 숫자와 구분되지 않습니다. 시각적으로 구분되게 스타일을 넣어도 되나요?'],
  ['M-011', 'accessibilityHazard', '움직이는 이미지나 소리가 없는 책이면 accessibilityHazard를 none으로 넣는 게 맞나요?'],
  ['M-011', '깜빡임 요소', '원본에 번쩍이는 GIF가 들어가 있는데 EPUB에 그대로 포함하면 hazard 메타데이터도 표시해야 하나요?'],
  ['M-012', 'accessibilityFeature', '목차와 읽기 순서를 정리했고 표 헤더도 넣었습니다. accessibilityFeature에 structuralNavigation 같은 값을 넣나요?'],
  ['M-012', '대체텍스트 기능', '모든 의미 이미지에 alt를 작성했습니다. accessibilityFeature에 alternativeText를 추가해도 되나요?'],
  ['M-013', 'accessMode', '텍스트 중심 도서에 일부 삽화만 있습니다. accessMode는 textual과 visual을 같이 넣어야 하나요?'],
  ['M-013', '오디오 없음', '소리가 없는 일반 EPUB인데 accessMode에 auditory를 넣으면 안 되나요?'],
  ['M-014', '반응형 이미지', '큰 도표 이미지가 모바일 뷰어에서 잘립니다. img에 max-width:100%와 height:auto를 공통 적용해도 되나요?'],
  ['M-014', '고정 크기 이미지', '이미지 width와 height가 px로 고정되어 확대 시 화면 밖으로 나갑니다. CSS를 비율 기준으로 바꿔야 하나요?'],
  ['M-015', '하이라이터 CSS', '밑줄 효과를 만들려고 border-bottom을 크게 줬더니 글자가 겹칩니다. 다른 배경색 방식으로 바꾸는 게 낫나요?'],
  ['M-015', '투명 테두리', '형광펜 효과 CSS가 뷰어마다 다르게 보입니다. 접근성 검사 전에는 과한 border 값을 줄여야 하나요?'],
  ['M-016', '주석 왕복 링크', '본문에서 미주로 이동은 되지만 미주에서 본문으로 돌아오는 링크가 없습니다. 역방향 링크도 만들어야 하나요?'],
  ['M-016', '각주 링크 대상', '각주 번호는 링크인데 주석 설명 쪽에는 id만 있고 돌아가기 a가 없습니다. 양방향으로 구성해야 하나요?'],
  ['M-017', '본문 글자 크기', '본문 CSS가 font-size: 10px로 고정되어 있습니다. em 단위로 바꾸는 게 접근성에 맞나요?'],
  ['M-017', '캡션 글자 크기', '캡션만 0.7em으로 작게 들어가 있습니다. 본문보다 작아도 최소 가독성 기준을 맞춰야 하나요?'],
  ['M-018', '이미지 읽기 순서', '문장 중간에 이미지가 끼어 있어 화면낭독기 흐름이 끊깁니다. 문단 앞이나 뒤로 옮기는 게 맞나요?'],
  ['M-018', '도표 위치', '도표 설명보다 도표 이미지가 먼저 나오는데, 읽기 흐름상 설명 문단과 순서를 조정해야 하나요?'],
  ['M-019', '목차 생성', 'Sigil Generate TOC를 실행했는데 일부 장만 잡힙니다. 누락된 장의 heading 태그부터 확인해야 하나요?'],
  ['M-019', 'nav 누락', '본문에는 장 제목이 있는데 nav.xhtml에 빠져 있습니다. 목차를 다시 생성하거나 수동으로 추가해야 하나요?'],
  ['M-020', 'CSS 연결', '한 장만 스타일이 적용되지 않습니다. 해당 XHTML head의 link 경로를 먼저 확인하면 되나요?'],
  ['M-020', '여러 CSS', '본문 파일마다 서로 다른 CSS를 물고 있습니다. 공통 스타일 누락 때문에 접근성 오류가 날 수 있나요?'],
  ['M-021', 'lang 중복', 'html과 body에 xml:lang이 둘 다 들어가 있습니다. body 쪽 중복 선언은 삭제해도 되나요?'],
  ['M-021', '하위 lang', '문단마다 xml:lang="ko"가 반복되어 있습니다. 루트 html에만 두는 쪽으로 정리해도 되나요?'],
  ['M-022', '제목 구조', '본문에서 절 제목처럼 보이는 문장이 bold p로만 되어 있습니다. h2나 h3로 바꾸는 게 맞나요?'],
  ['M-022', '목차 제외 heading', '목차에는 넣지 않을 안내 제목도 구조상 heading으로 만들 필요가 있나요?'],
  ['M-023', 'px 폰트', 'CSS 전체가 px 단위라 뷰어 글자 확대가 어색합니다. 본문 font-size를 em 기준으로 바꾸는 게 좋나요?'],
  ['M-023', '고정 line-height', 'line-height가 px로 고정되어 글자 확대 시 겹칩니다. em이나 단위 없는 값으로 바꾸면 되나요?'],
  ['M-024', '서문 role', '머리말 파일에 epub:type="chapter"가 들어가 있습니다. preface로 바꾸는 게 맞나요?'],
  ['M-024', '감사의 글', '본문 앞 감사의 글도 chapter로 둬도 되는지, 별도 section 역할을 줘야 하는지 궁금합니다.'],
  ['M-025', 'nav spine', 'nav.xhtml이 뷰어 본문처럼 열립니다. spine에서 linear 설정이나 nav 등록을 확인해야 하나요?'],
  ['M-025', '목차 노출', '목차 파일을 독서 흐름에 노출하지 않으려면 OPF에서 어떤 부분을 확인해야 하나요?'],
  ['M-026', '표지 설정', 'cover.jpg는 있는데 뷰어 책장에 표지가 안 나옵니다. Sigil에서 Cover Image로 지정해야 하나요?'],
  ['M-026', 'landmark 표지', '표지 이미지 설정은 했는데 landmarks 쪽 표지 연결이 빠진 것 같습니다. nav도 같이 확인해야 하나요?'],
  ['M-027', 'blockquote 의미', '들여쓰기 모양 때문에 본문 전체를 blockquote로 감싼 부분이 있습니다. 인용이 아니면 p와 CSS로 바꿔야 하나요?'],
  ['M-027', '인용문 판단', '원문에 따옴표가 있는 실제 인용문만 blockquote를 쓰고, 단순 강조 박스는 div로 처리하면 되나요?'],
  ['M-028', 'heading 분리', '제목 두 줄을 h2 두 개로 나눴더니 목차에 두 항목으로 나옵니다. 하나의 h2 안에서 처리해야 하나요?'],
  ['M-028', '제목 개행', '장 제목과 부제를 각각 h1로 넣은 파일이 있습니다. 부제는 같은 heading 안이나 별도 하위 heading으로 조정해야 하나요?'],
  ['M-029', '언어 코드', '한국어 본문 파일마다 ko-KR과 ko가 섞여 있습니다. 납품 전 ko로 통일하는 편이 안전한가요?'],
  ['M-029', '부분 언어', '일본어 제목이 한 문장 들어가 있습니다. 파일 lang은 ko로 두고 해당 문장에만 ja를 넣어도 되나요?'],
  ['M-030', '참고문헌 role', '참고문헌 파일이 chapter로 되어 있습니다. bibliography 역할로 바꾸는 게 접근성 구조에 맞나요?'],
  ['M-030', '색인 section', '찾아보기 페이지도 일반 chapter로 두기보다 index 역할을 줄 수 있나요?'],
  ['M-031', '단위 읽기', '본문에 10cm, 5km가 많이 나옵니다. 스크린리더 오독을 줄이려면 단위 문자를 바꾸는 게 좋나요?'],
  ['M-031', '기호 단위', '표 안의 cm 단위도 유니코드 단위 기호로 바꾸는 편이 나은가요?'],
  ['M-032', '헤딩 이미지', '장 제목 h1 안에 장식 이미지와 텍스트가 같이 들어가 있습니다. 이미지는 heading 밖으로 빼야 하나요?'],
  ['M-032', '목차 읽기', '목차 항목을 누르면 아이콘 alt와 제목이 함께 읽힙니다. 목차 안 장식 이미지는 숨겨야 하나요?'],
  ['M-033', '이미지 차례', '원본 차례가 이미지 한 장으로 되어 있습니다. 접근성 EPUB에서는 텍스트 목차로 다시 만들어야 하나요?'],
  ['M-033', '차례 텍스트화', '차례 이미지의 페이지 번호와 장 제목을 모두 텍스트로 옮겨야 하는지 궁금합니다.'],
  ['M-034', 'letter spacing', 'CSS에 letter-spacing:-1px이 들어가 글자가 붙어 보입니다. 0 이상으로 바꾸는 게 맞나요?'],
  ['M-034', 'word spacing', '단어 간격을 음수로 줄인 스타일이 있습니다. 접근성 검수 전에 제거해야 하나요?'],
  ['M-035', '세로선 문자', '구분 기호로 한글 자모 ㅣ를 사용한 부분이 있습니다. 버티컬 바 문자로 바꿔야 하나요?'],
  ['M-035', '오독 기호', '목차에서 ㅣ가 "이"로 읽힙니다. 단순 구분선이면 다른 기호로 교체하는 게 맞나요?'],
  ['M-036', '문단 간격', '문단마다 margin-top이 3em이라 화면 확대 시 간격이 너무 벌어집니다. 값을 줄여야 하나요?'],
  ['M-036', '줄간격', 'line-height가 너무 커서 한 문단이 여러 화면으로 밀립니다. 접근성 기준에서 과한 줄간격도 조정 대상인가요?'],
  ['M-037', '판권지 역할', '판권지 XHTML이 일반 chapter로 되어 있습니다. copyright-page 역할을 넣어야 하나요?'],
  ['M-037', '저작권 정보', '저작권 안내만 있는 파일도 section role을 판권지에 맞게 지정해야 하나요?'],
  ['M-038', '메타데이터 확인', '판권지의 ISBN과 OPF identifier가 다릅니다. Metadata Editor에서 어떤 값을 기준으로 맞춰야 하나요?'],
  ['M-038', '제목 메타데이터', '표지 제목과 OPF dc:title 표기가 조금 다릅니다. 납품 전 메타데이터를 판권지 기준으로 정리해야 하나요?'],
  ['M-039', '표지 role', '표지 img에 alt는 있는데 role="doc-cover"가 없습니다. 표지임을 알려주는 role을 추가해야 하나요?'],
  ['M-039', '표지 aria-label', '표지 이미지를 figure로 감싼 경우에도 img나 section에 표지 aria-label을 넣어야 하나요?'],
  ['N-001', '미주 다중 참조', '같은 미주 설명을 본문 세 곳에서 참조합니다. 첫 번째 참조만 왕복 링크로 두고 나머지는 어떻게 처리해야 하나요?'],
  ['N-001', '주석 돌아가기', '미주 설명 하나에 돌아가기 링크가 여러 개 들어가면 뷰어 이동이 꼬일 수 있나요?'],
  ['N-002', '뷰어 멈춤', 'EPUB을 뷰어에 넣으면 거의 다 열리다가 멈춥니다. 표지 설정이나 nav landmarks를 먼저 확인해야 하나요?'],
  ['N-002', '표지 문제', '검사 오류는 없는데 뷰어 책장이 95%에서 멈춥니다. 표지 시맨틱을 다시 잡아볼 필요가 있나요?'],
  ['N-003', 'Mac 제작 환경', 'Mac에서 ABViewer 설치가 안 됩니다. 검수는 다른 뷰어와 Ace 앱으로 진행해도 되나요?'],
  ['N-003', 'Mac 대체 도구', '맥북에서 윈도우용 뷰어를 못 쓰는 상황이면 접근성 확인을 어떤 도구로 대신하면 좋나요?'],
  ['N-004', 'Mac ACE', 'Mac Sigil에서 Ace 플러그인이 불안정합니다. 별도 Ace 앱으로 검사한 결과를 기준으로 봐도 되나요?'],
  ['N-004', 'ACE 앱 검사', 'Sigil 플러그인 대신 DAISY Ace 앱으로 돌리면 같은 접근성 오류를 확인할 수 있나요?'],
  ['N-005', '한자 입력', '원문에 흐릿한 한자가 있어 정확한 글자를 모르겠습니다. 필기 인식으로 찾은 한자를 넣어도 되나요?'],
  ['N-005', '한자 불명확', '스캔본 한자가 뭉개져 보일 때 임의로 비슷한 글자를 넣기보다 사전으로 확인해야 하나요?'],
  ['N-006', '외국어 이미지', '그리스어 한 줄이 이미지로 들어가 있습니다. 유니코드 입력이 가능하면 텍스트로 바꿔야 하나요?'],
  ['N-006', '아랍어 처리', '아랍어 문장이 이미지인데 정확히 입력하기 어렵습니다. 제작자 주로 설명 처리해도 되는 상황인가요?'],
  ['N-007', '주석 안 링크', '장미주 설명 안에 참고 URL이 들어가 있어 본문 복귀 링크와 겹칩니다. 링크를 분리해 배치해야 하나요?'],
  ['N-007', 'a 태그 중첩', '미주 전체를 본문 복귀 링크로 감싼 상태에서 URL도 링크로 넣었습니다. 중첩을 풀어야 하나요?'],
  ['N-008', '굵은 글씨 유지', '본문 일부 단어만 굵게 되어 있는데 저자 의도인지 애매합니다. 일러두기 확인 후 유지 여부를 판단하면 되나요?'],
  ['N-008', '강조 삭제', '변환 과정에서 모든 첫 단어가 굵게 들어갔습니다. 의미 없는 강조라면 제거해도 되나요?'],
  ['N-009', 'QR alt', 'QR 코드 이미지에 바로가기 링크도 있습니다. alt에는 QR 목적을 쓰고 실제 URL은 캡션 링크로 두면 되나요?'],
  ['N-009', 'QR 설명', 'QR 이미지 안에 짧은 안내 문구가 같이 있습니다. alt에 문구를 다 넣기보다 figcaption으로 빼는 게 맞나요?'],
  ['N-010', '주석 분리', '주석 1, 2가 같은 설명 문단에 묶여 있습니다. 번호별로 미주 항목을 나누는 게 맞나요?'],
  ['N-010', '복합 주석', '한 미주에 여러 번호가 같이 적힌 원고입니다. 본문 번호와 설명을 1:1로 맞춰야 하나요?'],
  ['N-011', 'bookid UUID', 'EpubCheck에서 bookid가 없다고 합니다. 새 UUID를 만들고 dc:identifier와 package를 연결하면 되나요?'],
  ['N-011', 'identifier 교체', '기존 ISBN 대신 UUID를 넣어야 하는 상황이면 unique-identifier도 새 id를 바라보게 해야 하나요?'],
  ['N-012', '시 표 해제', '시 행을 맞추려고 2열 table로 만든 부분이 있습니다. 낭독 순서를 위해 p와 br로 다시 구성해야 하나요?'],
  ['N-012', '다단 시', '좌우로 배치된 시가 table 구조입니다. 원문 순서대로 한 줄 흐름으로 풀어 제작하는 게 맞나요?'],
  ['N-013', 'TOC 순서', 'TOC 오류가 나는데 nav 목차와 OPF spine 순서가 서로 다릅니다. 두 순서를 일치시켜야 하나요?'],
  ['N-013', '목차 실제 순서', '뷰어 목차는 맞는데 읽기 순서가 다르게 넘어갑니다. nav만 보지 말고 spine도 확인해야 하나요?'],
  ['N-014', '삭제 이미지 복원', '장식인 줄 알고 지운 이미지가 본문 설명에 필요했습니다. 원본에서 다시 넣고 alt도 작성해야 하나요?'],
  ['N-014', '이미지 재삽입', '삭제했던 삽화를 다시 넣을 때 단순 img 삽입보다 figure 구조로 넣는 게 맞나요?'],
  ['N-015', '이모지 처리', '본문에 웃는 얼굴 이모지가 있습니다. 유니코드 문자로 표현되면 그대로 두고 설명이 필요한 경우만 풀어 쓰면 되나요?'],
  ['N-015', '아이콘 대체', '원본에 앱 아이콘 모양 이모지가 있는데 뷰어에서 깨집니다. 텍스트 설명으로 바꾸는 게 맞나요?'],
  ['N-016', '단순 수식', '이미지 안에 3×4=12만 들어 있습니다. MathML 없이 텍스트로 바꿔도 되나요?'],
  ['N-016', '수식 이미지', '덧셈식 그림이 본문 이해에 필요합니다. 이미지 삭제 후 유니코드 기호로 식을 입력하면 되나요?'],
  ['N-017', '화면 캡처 alt', '프로그램 화면 캡처에 메뉴명이 많이 보입니다. 본문 이해에 필요한 메뉴명만 figcaption에 옮기면 되나요?'],
  ['N-017', '스크린샷 텍스트', '스크린샷 안의 모든 버튼명을 alt에 넣으니 너무 깁니다. 핵심 조작 설명은 본문으로 빼도 되나요?'],
  ['N-018', '표 셀 줄바꿈', 'td 안에서 두 줄로 보여야 하는 항목이 있습니다. 셀 내부 br 사용은 허용되나요?'],
  ['N-018', 'th 줄바꿈', '표 제목 셀 안의 긴 제목을 줄바꿈하려면 th 안에 br을 써도 괜찮나요?'],
  ['N-019', '파일명과 헤딩', 'wing.xhtml 파일 내용이 저자 소개입니다. 파일명보다 실제 내용 기준으로 heading을 정하면 되나요?'],
  ['N-019', '앞날개 판단', '앞날개 파일처럼 보이지만 본문상 추천사입니다. nav 제목은 원문 역할에 맞춰 정해야 하나요?'],
  ['N-020', '원본 헤딩 재구성', '원본 디자인에서 01, 02가 모두 h1처럼 보입니다. 전자책에서는 장 아래 h2로 정리해도 되나요?'],
  ['N-020', '숫자 제목', '장 안의 번호 소제목을 전부 h1로 두면 목차 위계가 깨집니다. h2 이하로 낮춰야 하나요?'],
  ['N-021', '장식 이미지 처리', '장마다 반복되는 테두리 이미지는 내용 전달이 없습니다. 삭제하지 않을 경우 빈 alt와 presentation으로 처리하면 되나요?'],
  ['N-021', '배경 이미지', '본문 배경 무늬 이미지가 파일로 들어가 있습니다. 의미가 없으면 접근성 설명 없이 숨겨도 되나요?'],
  ['N-022', '이미지 페이지 삭제', '광고성 이미지 한 장만 있는 XHTML이 본문 흐름과 무관합니다. 이미지와 페이지를 같이 삭제해도 되나요?'],
  ['N-022', '빈 XHTML 정리', '이미지를 삭제하고 나니 빈 xhtml 파일만 남았습니다. spine과 nav 참조를 정리한 뒤 삭제해야 하나요?'],
  ['N-023', '목차 제외 제목', '본문 구역 구분을 위해 h3가 필요하지만 목차에는 보이면 안 됩니다. sigil_not_in_toc 같은 방식으로 숨길 수 있나요?'],
  ['N-023', '숨김 heading', '화면에는 없는 안내 heading을 넣어 구조만 보강해도 되나요? 목차 노출은 따로 제어해야 하나요?'],
  ['N-024', 'Book View 수식', 'Book View에서 수식 간격이 벌어져 보이는데 Preview에서는 정상입니다. 실제 출력 기준으로 판단해도 되나요?'],
  ['N-024', '미리보기 차이', 'Sigil Book View와 Preview의 수식 표시가 다릅니다. 검수는 Preview와 뷰어 화면을 우선하면 되나요?'],
  ['N-025', 'Sigil 검사 설정', 'Sigil 오류 검사에서 Python 경로가 없다고 나옵니다. 번들 Python 사용 설정을 켜야 하나요?'],
  ['N-025', '플러그인 실행 오류', '검사 플러그인이 실행되지 않고 interpreter 메시지가 나옵니다. Sigil 환경설정을 먼저 봐야 하나요?'],
  ['N-026', '표지 미노출', 'EPUB 검사 통과 후에도 뷰어에 표지가 안 보입니다. cover semantic과 landmarks를 다시 확인해야 하나요?'],
  ['N-026', '책장 표지', '본문 첫 페이지에는 표지가 있는데 뷰어 책장 썸네일은 비어 있습니다. cover image 지정 문제일 수 있나요?'],
  ['N-027', 'heading order', 'ACE에서 heading order invalid가 나왔습니다. h1 다음 h3처럼 건너뛴 부분을 찾아야 하나요?'],
  ['N-027', '헤딩 건너뜀', '본문 중간에 h2 없이 h4가 먼저 나옵니다. 디자인 크기와 별개로 논리 순서에 맞춰야 하나요?'],
  ['N-028', '자모 분리', '뷰어에서 제목의 자음과 모음이 분리되어 보입니다. 텍스트를 다시 복사해 정규화하면 해결될 수 있나요?'],
  ['N-028', '인코딩 문제', '일부 한글만 깨져 보이고 XHTML 코드는 정상처럼 보입니다. 원문 텍스트 인코딩을 다시 확인해야 하나요?'],
  ['N-029', 'bookid 연결', 'epub check에서 identifier 관련 오류가 반복됩니다. UUID 값뿐 아니라 id 연결도 같이 확인해야 하나요?'],
  ['N-029', 'dc identifier', 'dc:identifier는 있는데 package에서 다른 id를 참조합니다. bookid 오류 원인이 될 수 있나요?'],
  ['N-030', '빈 meta', 'OPF metadata에 값이 없는 meta 태그가 남아 있습니다. 빈 meta는 삭제하는 게 맞나요?'],
  ['N-030', 'dcterms source', 'dcterms:source meta가 비어 있어서 오류가 납니다. 값이 없으면 해당 meta를 제거해도 되나요?'],
  ['N-031', '제목열 th', '표 첫 열이 각 행의 항목명입니다. 굵게 표시만 하지 말고 첫 열 셀을 th로 바꿔야 하나요?'],
  ['N-031', '첫 행 아닌 헤더', '표에 제목행은 없고 제목열만 있습니다. 자동 표 생성 뒤 td를 th로 수동 수정하면 되나요?'],
  ['N-032', '표지 src', '표지 XHTML은 맞는데 img src가 다른 이미지로 연결되어 있습니다. src를 cover 파일명으로 바꾸면 되나요?'],
  ['N-032', '표지 이미지 교체', '표지 파일을 새로 넣었는데 기존 cover.xhtml이 예전 파일을 부릅니다. img 경로와 OPF 표지 설정을 같이 바꿔야 하나요?'],
  ['N-033', '만화 대사', '만화 컷의 대사가 본문에 이미 텍스트로 제공됩니다. figcaption에는 반복하지 않고 상황만 alt로 요약해도 되나요?'],
  ['N-033', '새 대화 내용', '만화 이미지 안에 본문에 없는 대사가 있습니다. 그 대사는 figcaption으로 옮겨야 하나요?'],
  ['N-034', '이미지 중복 오류', 'epub check에서 이미지 관련 오류가 나고 manifest에 같은 href가 두 번 보입니다. 중복 item을 제거해야 하나요?'],
  ['N-034', '누락 이미지 오류', '이미지 파일을 교체한 뒤 epub check 오류가 납니다. content.opf 중복과 누락을 함께 확인해야 하나요?'],
  ['N-035', 'figcaption 개수', '한 figure 안에 이미지 두 장과 캡션 두 개가 있습니다. 이미지별로 figure를 나누는 게 맞나요?'],
  ['N-035', '캡션 통합', '연속 이미지 두 장을 하나의 설명으로 묶고 싶습니다. figcaption 하나로 통합해도 되는 상황인가요?'],
  ['N-036', 'guide 오류', 'guide가 예전 cover 파일을 가리키는데 manifest에는 없습니다. guide를 삭제하고 표지 설정을 다시 잡아야 하나요?'],
  ['N-036', 'EPUB3 guide', 'EPUB3 제작본에 guide 항목이 남아 manifest 오류를 냅니다. nav landmarks로 정리하는 편이 맞나요?'],
];

const omittedCandidateNumbers = new Set([
  3, 7, 10, 13, 16, 19, 21, 24, 27, 29,
  80, 86, 88, 95, 97, 99, 101, 103, 105, 109, 111, 113, 117,
  163, 165, 167, 169, 171, 173, 175, 177, 179, 181,
]);

const selectedCandidates = candidates.filter((_, index) => !omittedCandidateNumbers.has(index + 1));

if (selectedCandidates.length !== 200) {
  throw new Error(`Expected 200 selected candidates, got ${selectedCandidates.length}`);
}

for (const phrase of BANNED_PHRASES) {
  const hit = selectedCandidates.find((candidate) => candidate[2].includes(phrase));
  if (hit) throw new Error(`Banned phrase "${phrase}" found in: ${hit[2]}`);
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

const missingAnswers = rows.filter((row) => !row.expected_answer || !row.category);
if (missingAnswers.length) {
  throw new Error(`Missing source mapping: ${missingAnswers.map((row) => `${row.no}:${row.intent}`).join(', ')}`);
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
  .filter((match) => match.score >= 0.82)
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
console.log(`close matches >= 0.82: ${closeMatches.length}`);
for (const match of closeMatches.slice(0, 20)) {
  console.log(`${match.no}\t${match.score.toFixed(4)}\t${match.generatedQuestion}\t=>\t${match.previousQuestion}`);
}

function loadPreviousQuestions() {
  const questions = [];
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => /\.xlsx$/i.test(file) && file !== `${OUTPUT_BASE}.xlsx`);

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const rows = readWorkbookRows(filePath);
    for (const row of rows) {
      for (const key of ['generated_question', 'source_question', 'question']) {
        if (row[key]) questions.push(String(row[key]).replace(/\s+/g, ' ').trim());
      }
    }
  }

  return [...new Set(questions.filter(Boolean))];
}
