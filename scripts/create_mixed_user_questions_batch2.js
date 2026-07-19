const path = require('path');
const { DATA_DIR, writeCsv, writeWorkbook } = require('./utils');

const rows = [
  {
    no: 11,
    category: 'db_rephrase',
    intent: 'L-004',
    test_focus: 'div 태그 위치',
    generated_question: 'span이나 a 안에 div를 넣었더니 오류가 나는데 div를 어디로 빼야 하나요?',
    expected_answer:
      '<div>는 블록 요소이므로 <span>, <a>, <b> 등 인라인 요소 내부에서는 사용할 수 없습니다. <div>를 인라인 요소 밖으로 이동하거나, 인라인 구조 내에서는 <span>으로 대체해야 합니다. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 12,
    category: 'db_rephrase',
    intent: 'L-005',
    test_focus: 'table 내부 p 태그 위치',
    generated_question: '표 안에 설명 문단을 넣고 싶은데 p태그는 table 바로 아래에 두면 안 되나요?',
    expected_answer:
      '<p>는 <td>나 <th> 같은 테이블 셀 내부에서만 사용할 수 있으며, <table> 바로 아래에는 사용할 수 없습니다. <p>를 <td> 또는 <th> 안으로 옮기거나, 불필요하다면 제거해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 13,
    category: 'db_rephrase',
    intent: 'L-006',
    test_focus: 'li 태그 위치',
    generated_question: '목록 항목 li가 잘못된 위치라고 뜨는데 ul이나 ol로 감싸면 해결되나요?',
    expected_answer:
      '<li>는 반드시 <ul> 또는 <ol> 내부에서만 사용해야 합니다. <li>가 이들 목록 요소 밖에 있다면, <ul>이나 <ol>로 감싸서 올바른 목록 구조로 수정해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 14,
    category: 'db_rephrase',
    intent: 'L-010',
    test_focus: 'a 태그 중첩/위치',
    generated_question: '링크 안에 또 다른 링크를 넣었더니 검사 오류가 납니다. 어떻게 고쳐야 해요?',
    expected_answer:
      '<a>는 인라인 요소이며, <a> 안에 또 다른 <a>를 중첩하거나 블록 요소(<div>, <p> 등)를 넣을 수 없습니다. <a>가 잘못된 위치에 있다면 중첩 구조를 해제하거나, 인라인 요소(<span>, <em> 등) 내부로 적절히 배치해 주세요. 문법에 어긋난 코드를 수정해주세요.',
  },
  {
    no: 15,
    category: 'db_rephrase',
    intent: 'L-017',
    test_focus: 'manifest 리소스 등록',
    generated_question: '본문에서는 이미지를 쓰고 있는데 OPF manifest에 없다고 하면 뭘 추가해야 하나요?',
    expected_answer:
      '본문에서 참조된 리소스(이미지, CSS, 폰트 등)가 content.opf 파일 내 <manifest> 항목에 정확히 등록되지 않았을 때 발생하는 오류이며, 등록 누락, 파일명 불일치, 경로 오류, 대소문자 오타 등을 점검하고 수정해주세요.',
  },
  {
    no: 16,
    category: 'narrow_free',
    intent: 'L-018',
    test_focus: '조각 식별자/id 링크',
    generated_question: '본문에서 #note1로 링크를 걸었는데 대상이 없다고 나와요. id 이름을 어디서 맞춰야 하나요?',
    expected_answer:
      'EPUB 파일 내부에서 하이퍼링크로 참조한 ID 조각(#id)이 해당 문서에 존재하지 않거나 일치하지 않는 경우 발생하는 오류입니다. ID 오탈자, 대상 요소 누락, 경로 오류 등이 원인일 수 있으며, 연결 대상이 존재하는지 확인 후 수정해야 합니다.',
  },
  {
    no: 17,
    category: 'narrow_free',
    intent: 'L-024',
    test_focus: '파일명 공백/URI 오류',
    generated_question: '이미지 파일 이름에 띄어쓰기가 들어가도 EPUB에서 괜찮나요?',
    expected_answer:
      'EPUB 내부에 공백이 포함된 파일명이 있을 경우 URI 처리 오류가 발생하므로, 파일명에서 공백을 제거해주세요.',
  },
  {
    no: 18,
    category: 'narrow_free',
    intent: 'L-028',
    test_focus: '외부 이미지 링크',
    generated_question: '웹에 있는 이미지를 주소로 바로 연결해서 전자책에 넣어도 검사 통과가 되나요?',
    expected_answer:
      'EPUB 파일은 외부 리소스를 참조하면 안 되며, 모든 리소스는 내부(OCF)에 포함되어야 합니다. 외부 링크가 있으면 내부 리소스로 대체하고 경로를 수정해주세요.',
  },
  {
    no: 19,
    category: 'narrow_free',
    intent: 'L-020',
    test_focus: '목차 링크 순서와 spine 순서',
    generated_question: '목차에서는 3장이 먼저 나오는데 실제 읽기 순서는 2장이 먼저면 문제가 되나요?',
    expected_answer:
      '목차(nav.xhtml)에 설정된 링크 순서와 본문의 실제 파일 순서(content.opf의 spine)가 일치하지 않아 발생하는 오류입니다. 읽는 흐름이 어긋나므로, 순서를 통일하여 수정해주세요.',
  },
  {
    no: 20,
    category: 'narrow_free',
    intent: 'L-030',
    test_focus: 'manifest 중복 등록',
    generated_question: '같은 CSS 파일을 manifest에 두 번 넣어도 되나요, 아니면 하나는 지워야 하나요?',
    expected_answer:
      '같은 리소스 파일이 OPF의 <manifest> 섹션에 중복으로 등록되어 있습니다. OPF 파일에서 href나 id가 동일한 항목이 있는지 확인하고, 중복된 항목을 제거하거나 고유한 id와 올바른 href를 갖도록 수정해야 합니다.',
  },
];

const xlsxPath = path.join(DATA_DIR, 'mixed_user_questions_batch2.xlsx');
const csvPath = path.join(DATA_DIR, 'mixed_user_questions_batch2.csv');

writeWorkbook(xlsxPath, { questions: rows });
writeCsv(csvPath, rows);

console.log(`wrote ${xlsxPath}`);
console.log(`wrote ${csvPath}`);
