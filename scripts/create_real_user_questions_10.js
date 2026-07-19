const path = require('path');
const { DATA_DIR, writeWorkbook, writeCsv } = require('./utils');

const rows = [
  {
    no: 1,
    category: 'real_user',
    intent: 'object_accessibility',
    generated_question: '전자책 안에 사진을 넣었는데 시각장애인도 내용을 알 수 있게 하려면 뭘 써야 하나요?',
    expected_answer:
      '이미지에는 의미를 전달하는 대체텍스트를 제공해야 하며, 장식용 이미지는 보조기술이 불필요하게 읽지 않도록 처리해야 한다.',
  },
  {
    no: 2,
    category: 'real_user',
    intent: 'table_accessibility',
    generated_question: '표를 만들었는데 화면낭독기에서 헷갈리지 않게 하려면 어떤 걸 확인해야 해요?',
    expected_answer:
      '표 제목이나 요약, 머리글 셀과 데이터 셀의 관계를 명확히 해야 하며 단순 배치용 표 사용은 피해야 한다.',
  },
  {
    no: 3,
    category: 'real_user',
    intent: 'heading_structure',
    generated_question: '장마다 제목 크기만 키워놨는데 접근성 검사에서 문제될 수 있나요?',
    expected_answer: '제목처럼 보이게 꾸미는 것만으로는 부족하며 h1, h2 같은 올바른 제목 구조를 사용해야 한다.',
  },
  {
    no: 4,
    category: 'real_user',
    intent: 'reading_order',
    generated_question: '이미지랑 설명 글을 나란히 배치했는데 읽는 순서가 이상하면 어디를 봐야 하나요?',
    expected_answer:
      '콘텐츠의 실제 마크업 순서와 화면낭독기 읽기 순서를 확인하고, 시각적 배치와 의미 흐름이 맞도록 구조를 수정해야 한다.',
  },
  {
    no: 5,
    category: 'real_user',
    intent: 'link_text',
    generated_question: "본문에 '여기를 클릭하세요' 링크가 여러 개 있는데 괜찮은가요?",
    expected_answer:
      "'여기를 클릭하세요'처럼 모호한 링크는 피하고, 링크 텍스트만 읽어도 목적지를 알 수 있도록 구체적으로 작성해야 한다.",
  },
  {
    no: 6,
    category: 'real_user',
    intent: 'language_metadata',
    generated_question: '한글 전자책인데 언어 설정을 안 넣으면 접근성에 영향이 있나요?',
    expected_answer: '전자책의 기본 언어를 올바르게 지정해야 화면낭독기 발음과 보조기술 처리가 정확해진다.',
  },
  {
    no: 7,
    category: 'real_user',
    intent: 'color_contrast',
    generated_question: '중요한 문장을 빨간색으로만 표시해도 접근성 기준에 맞나요?',
    expected_answer:
      '색상만으로 정보를 전달하면 안 되며 텍스트, 기호, 설명 같은 추가 단서를 제공하고 명도 대비도 확인해야 한다.',
  },
  {
    no: 8,
    category: 'real_user',
    intent: 'caption_audio',
    generated_question: '동영상이나 음성 자료를 전자책에 넣을 때 접근성 때문에 같이 넣어야 하는 게 있나요?',
    expected_answer: '동영상에는 자막이나 대체 수단을, 음성 자료에는 원고나 대본 같은 텍스트 대안을 제공해야 한다.',
  },
  {
    no: 9,
    category: 'real_user',
    intent: 'file_validation',
    generated_question: 'EPUB 검사를 돌렸더니 파일 경로나 이미지 쪽 오류가 나는데 처음에 뭘 확인하면 되나요?',
    expected_answer: 'OPF manifest와 실제 파일 위치, 파일명, 확장자 대소문자, 상대경로가 서로 일치하는지 확인해야 한다.',
  },
  {
    no: 10,
    category: 'real_user',
    intent: 'form_input',
    generated_question: '전자책 안에 퀴즈 입력칸을 넣고 싶은데 접근성 쪽에서 주의할 게 있나요?',
    expected_answer: '입력칸에는 목적을 알 수 있는 레이블이나 설명을 연결하고, 키보드와 보조기술로도 조작 가능해야 한다.',
  },
];

const xlsxPath = path.join(DATA_DIR, 'real_user_questions_10.xlsx');
const csvPath = path.join(DATA_DIR, 'real_user_questions_10_utf8.csv');

writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
