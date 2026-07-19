const path = require('path');
const { DATA_DIR, writeCsv, writeWorkbook } = require('./utils');

const rows = [
  {
    no: 1,
    category: 'db_rephrase',
    intent: 'L-001',
    test_focus: '누락 리소스/파일 경로',
    generated_question: 'EPUB 검사에서 이미지 파일을 못 찾는다고 나오는데 먼저 어디를 확인해야 해요?',
    expected_answer:
      'EPUB 파일에 없는 이미지, 폰트, CSS 파일 등을 사용했을 때 표시되는 오류로 올바른 경로 지정을 해주세요. 또한 확장자의 대소문자를 구분해주세요.',
  },
  {
    no: 2,
    category: 'db_rephrase',
    intent: 'L-002',
    test_focus: 'img 태그 위치',
    generated_question: '이미지 태그를 본문에 넣었더니 위치가 잘못됐다고 해요. 어떤 태그 안에 넣어야 하나요?',
    expected_answer:
      '<img> 태그는 단독으로 사용할 수 없으며, <div>나 <p> 같은 허용된 블록 요소 안에 넣어야 합니다. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 3,
    category: 'db_rephrase',
    intent: 'L-003',
    test_focus: 'br 태그 위치',
    generated_question: '줄바꿈하려고 br을 넣었는데 오류가 납니다. br은 어디에 써야 안전한가요?',
    expected_answer:
      '<br>은 <p>, <div> 등 텍스트 단락 안에서만 사용 가능하며, <ul>, <table>, <body> 바로 아래처럼 블록 구조 외부에서는 사용 불가합니다. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 4,
    category: 'db_rephrase',
    intent: 'T-M-ALT-DECORATIVE',
    test_focus: '장식 이미지 alt 처리',
    generated_question: '본문 내용이랑 상관없는 꾸밈 그림도 대체텍스트를 적어야 하나요?',
    expected_answer:
      '본문 내용과 직접적인 관련이 없는 이미지는 삭제하거나, role="presentation"과 alt="" 속성을 기입하여 장식용 이미지 처리해주세요.',
  },
  {
    no: 5,
    category: 'db_rephrase',
    intent: 'T-N-FIGCAPTION-QR',
    test_focus: 'QR코드/바로가기 처리',
    generated_question: '책에 QR코드를 넣을 때 QR 이미지 설명이랑 바로가기 링크는 어떻게 넣는 게 맞나요?',
    expected_answer:
      'QR코드 이미지는 <figure> 태그로 감싸고 alt 값은 “~ QR 코드”로 명시해주세요. 링크는 <figcaption>에 "바로가기" 문구를 링크 태그로 감싸 제공해주세요.',
  },
  {
    no: 6,
    category: 'narrow_free',
    intent: 'T-M-ALT-LENGTH',
    test_focus: '이미지 속 텍스트 alt 범위',
    generated_question: '이미지 안에 글자가 많은데 alt에 글자를 전부 옮겨야 하나요, 핵심만 요약해도 되나요?',
    expected_answer:
      '이미지의 의미 전달에 필요한 핵심 정보는 대체텍스트로 제공하되, 너무 길어지는 경우 본문이나 캡션 등 다른 방식으로 분리해 제공해야 한다.',
  },
  {
    no: 7,
    category: 'narrow_free',
    intent: 'T-N-FIGCAPTION-COUNT',
    test_focus: 'figure 내부 figcaption 개수',
    generated_question: '한 figure 안에 이미지가 두 개 들어가면 캡션도 두 개 넣어도 되나요?',
    expected_answer:
      '<figure> 태그 안에는 하나의 <figcaption>만 존재해야 합니다. 이미지가 다수일 경우 각각을 <figure>로 분리하거나 <figcaption>을 하나로 통합해야 합니다.',
  },
  {
    no: 8,
    category: 'narrow_free',
    intent: 'T-M-HEADING',
    test_focus: '헤딩 순서/제목 구조',
    generated_question: '소제목을 예쁘게 보이게만 만들고 h태그를 안 쓰면 접근성 검사에서 문제가 될까요?',
    expected_answer:
      '제목 역할을 하는 문장은 시각적 스타일만 적용하지 말고 h1~h6 같은 제목 태그로 구조를 제공해야 하며, 헤딩 순서도 건너뛰지 않도록 구성해야 한다.',
  },
  {
    no: 9,
    category: 'narrow_free',
    intent: 'T-M-META',
    test_focus: '접근성 메타데이터',
    generated_question: '대체텍스트랑 목차를 다 넣은 전자책이면 접근성 메타데이터에는 어떤 내용을 적어야 하나요?',
    expected_answer:
      '제공한 접근성 기능에 맞춰 accessMode, accessibilityFeature, accessibilitySummary 등 접근성 메타데이터를 실제 콘텐츠 상태와 일치하게 작성해야 한다.',
  },
  {
    no: 10,
    category: 'narrow_free',
    intent: 'T-N-NOTE',
    test_focus: '주석/미주 링크',
    generated_question: '본문에 각주 번호가 있는데 누르면 설명으로 갔다가 다시 본문으로 돌아오게 해야 하나요?',
    expected_answer:
      '본문의 주석 번호와 주석 설명은 서로 이동할 수 있도록 링크로 연결하고, 필요한 경우 설명에서 본문으로 돌아오는 링크도 제공해야 한다.',
  },
];

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_10.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_10.csv');

writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
