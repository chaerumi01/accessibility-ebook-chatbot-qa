const path = require('path');
const { DATA_DIR, writeCsv, writeWorkbook } = require('./utils');

const rows = [
  {
    no: 21,
    category: 'db_rephrase',
    intent: 'L-011',
    test_focus: 'span 태그 위치',
    generated_question: 'span 태그를 div 바로 아래에 혼자 넣었더니 오류가 나요. 어디 안으로 옮겨야 하나요?',
    expected_answer:
      '<span>은 인라인 요소이므로 <body>나 <div> 등 블록 요소 바로 아래에는 단독으로 올 수 없습니다. <span>을 <p>나 <div> 같은 텍스트 단락 내부로 옮기거나, 블록 구조 내에서 올바르게 포함되도록 수정해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 22,
    category: 'db_rephrase',
    intent: 'L-012',
    test_focus: 'tr 태그 위치',
    generated_question: 'table 바로 아래에 tr을 넣었는데 검사에서 틀렸다고 해요. tbody를 꼭 넣어야 하나요?',
    expected_answer:
      '<tr>은 반드시 <thead>, <tbody>, 또는 <tfoot> 내부에서만 사용할 수 있습니다. <tr>이 <table> 바로 아래에 있다면, <tbody>로 감싸서 올바른 구조로 수정해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 23,
    category: 'db_rephrase',
    intent: 'L-013',
    test_focus: 'td 태그 위치',
    generated_question: 'td를 tbody 바로 밑에 넣으면 안 되나요? tr로 한 번 더 감싸야 하는지 궁금해요.',
    expected_answer:
      '<td>는 반드시 <tr> 내부에 위치해야 하며, <table>이나 <tbody> 바로 아래에 둘 수 없습니다. <td>가 잘못된 위치에 있다면 <tr>로 감싸서 올바른 테이블 행 구조로 수정해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 24,
    category: 'db_rephrase',
    intent: 'L-014',
    test_focus: 'b 태그 위치',
    generated_question: '굵게 표시하려고 b태그를 div 아래에 바로 썼는데 오류가 나면 p 안으로 넣어야 하나요?',
    expected_answer:
      '<b>는 인라인 요소이므로 <body>나 <div> 같은 블록 요소 바로 아래에는 사용할 수 없습니다. <b>를 <p>나 <div> 등 텍스트 단락 내부로 옮기거나, 인라인 문맥 안에서만 사용하도록 수정해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 25,
    category: 'db_rephrase',
    intent: 'L-015',
    test_focus: 'ul 태그 위치',
    generated_question: '문단 안에 ul 목록을 넣었더니 허용되지 않는 위치라고 나옵니다. 목록은 어디로 빼야 하나요?',
    expected_answer:
      '<ul>은 블록 요소이므로 <p>나 인라인 요소 내부에서는 사용할 수 없습니다. <ul>를 <div>나 <p> 등 블록 구조 안으로 이동시켜 올바른 위치에 배치해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 26,
    category: 'narrow_free',
    intent: 'L-016',
    test_focus: 'ol 태그 위치',
    generated_question: '번호 목록 ol을 p태그 안에 넣으면 EPUB 검사에서 문제가 생기나요?',
    expected_answer:
      '<ol>은 블록 요소이므로 <p>나 인라인 요소 내부에서는 사용할 수 없습니다. <ol>를 <div>나 <p> 등 블록 구조 안으로 이동시켜 올바른 위치에 배치해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 27,
    category: 'narrow_free',
    intent: 'L-021',
    test_focus: 'manifest ID 참조',
    generated_question: '본문에서 참조한 리소스 id가 OPF manifest에 없다고 나오면 item을 새로 추가해야 하나요?',
    expected_answer:
      'EPUB 문서 내에서 참조하고 있는 리소스(ID)가 content.opf의 <manifest> 안에 등록되어 있지 않아서 발생하는 오류입니다. ID가 존재하는지 확인하고, 누락된 경우 <item>으로 추가하거나, 참조 ID를 맞게 고쳐주세요.',
  },
  {
    no: 28,
    category: 'narrow_free',
    intent: 'L-023',
    test_focus: 'OPF 속성 선언',
    generated_question: 'OPF에서 어떤 속성이 선언되지 않았다고 나오는데 그 속성은 어디에 추가해야 하나요?',
    expected_answer:
      'OPF 파일에서 참조하는 속성이 정의되어 있지 않아서 발생한 오류입니다. OPF 파일에서 참조하는 속성이 매니페스트나 메타데이터 등 적절한 위치에 선언되어 있는지 확인하고, 누락되었다면 추가하거나 올바른 속성명으로 수정해주세요.',
  },
  {
    no: 29,
    category: 'narrow_free',
    intent: 'L-025',
    test_focus: 'non-linear 콘텐츠 접근 링크',
    generated_question: 'non-linear로 둔 부록 파일은 본문이나 목차에서 링크를 걸어줘야 하나요?',
    expected_answer:
      'non-linear로 설정된 콘텐츠 파일에 독자가 접근할 수 있는 링크가 존재하지 않을 때 발생하는 오류이며, 링크를 통해 접근 가능한 구조(nav 또는 본문 등)로 수정해주세요.',
  },
  {
    no: 30,
    category: 'narrow_free',
    intent: 'L-026',
    test_focus: 'spine 미등록 파일 참조',
    generated_question: 'spine에 안 넣은 xhtml 파일을 본문에서 링크로 연결해도 괜찮나요?',
    expected_answer:
      'EPUB에서 스파인(spine)에 등록되지 않은 파일을 본문에서 참조하면 오류가 발생하며, spine에 등록하거나 참조 구조를 수정해야 합니다.',
  },
];

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_batch3.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_batch3.csv');

writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
