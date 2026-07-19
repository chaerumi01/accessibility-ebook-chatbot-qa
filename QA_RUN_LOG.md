# 챗봇 QA 실행 기록

작성일: 2026-06-22

## 작업 기준

- 목적: 접근성 전자책 제작자가 실제로 할 법한 질문으로 챗봇 응답 품질 확인
- 질문 구성 원칙:
  - 기존 DB/작년 엑셀의 질문을 그대로 복사하지 않음
  - 약 50%는 기존 DB에 기입된 의도를 문장만 바꿔 확인
  - 약 50%는 같은 주제권 안에서 실제 사용자 상황을 조금 반영한 질문
  - 너무 중구난방한 질문은 피하고 EPUB 제작, 접근성 검사, 메타데이터, 이미지/대체텍스트, 목차, 주석, CSS, 태그 구조 중심으로 좁힘
- 구글 시트 적재 방식:
  - 시트명: `챗봇검사`
  - 범위: `B:D`
  - 형식: `유형 | 질문 | 챗봇답변`
  - 업로드 모드: append

## 주의할 파일

- `data/real_user_results_10.xlsx`, `data/real_user_results_10.csv`
  - 처음 CSV 인코딩 문제로 질문 한글이 깨져 들어간 결과
  - 검토/보고 대상에서 제외
- `data/chatbot_results_reopen_10.xlsx`
  - 초기에 예시용 `questions_2000.xlsx` 앞 10개를 잘못 실행한 결과
  - 사용자가 원한 실제 사용자형 검증이 아니므로 참고용으로만 취급

## 실제 유효 실행 기록

### 1. 실제 사용자형 10개

- 질문 파일: `data/real_user_questions_10.xlsx`
- 결과 파일: `data/real_user_results_10_v2.xlsx`
- 보고서: `data/real_user_report_10_v2.xlsx`
- 구글 시트 적재 위치: `B25:D34`
- 결과 요약:
  - 총 10건
  - 응답 찾을 수 없음: 8건
  - 답변은 나왔지만 의도와 다른 답변: 2건
- 비고:
  - 너무 자유로운 질문이 많아 이후부터 DB 주제권 안으로 질문 범위를 좁히기로 함

### 2. DB 검증형 + 좁힌 사용자형 10개

- 질문 파일: `data/mixed_user_questions_10.xlsx`
- 결과 파일: `data/mixed_user_results_10.xlsx`
- 보고서: `data/mixed_user_report_10.xlsx`
- 구글 시트 적재 위치: `B35:D44`
- 결과 요약:
  - 총 10건
  - 응답 찾을 수 없음: 2건
  - 검토 필요: 3건
- 구성:
  - 1~5번: 기존 DB 의도 문장 변형
  - 6~10번: DB 주제권 안의 좁힌 사용자형 질문

### 3. 배치 2

- 질문 파일: `data/mixed_user_questions_batch2.xlsx`
- 결과 파일: `data/mixed_user_results_batch2.xlsx`
- 보고서: `data/mixed_user_report_batch2.xlsx`
- 구글 시트 적재 위치: `B45:D54`
- 결과 요약:
  - 총 10건
  - 응답 찾을 수 없음: 5건
  - 낮은 유사도: 2건
  - 실행 오류: 0건
- 주요 주제:
  - `div`, `p/table`, `li`, `a`, `manifest`
  - 조각 식별자, 파일명 공백, 외부 리소스, 목차 순서, manifest 중복

### 4. 배치 3

- 질문 파일: `data/mixed_user_questions_batch3.xlsx`
- 결과 파일: `data/mixed_user_results_batch3.xlsx`
- 보고서: `data/mixed_user_report_batch3.xlsx`
- 구글 시트 적재 위치: `B55:D64`
- 결과 요약:
  - 총 10건
  - 응답 찾을 수 없음: 5건
  - 낮은 유사도: 1건
  - 실행 오류: 0건
- 주요 주제:
  - `span`, `tr`, `td`, `b`, `ul`, `ol`
  - manifest ID, OPF 속성, non-linear 콘텐츠, spine 미등록 파일 참조

### 5. 배치 4

- 질문 파일: `data/mixed_user_questions_batch4.xlsx`
- 결과 파일: `data/mixed_user_results_batch4.xlsx`
- 보고서: `data/mixed_user_report_batch4.xlsx`
- 구글 시트 적재 위치: `B65:D74`
- 결과 요약:
  - 총 10건
  - 응답 찾을 수 없음: 5건
  - 낮은 유사도: 2건
  - 실행 오류: 0건
- 주요 주제:
  - 명도 대비, ARIA role, role presentation과 alt 충돌
  - `html lang`, 이미지 alt, 접근성 메타데이터, 링크 구분, accessibilityHazard

## 100개 추가 실행

- 질문 파일: `data/mixed_user_questions_100.xlsx`
- 질문 번호: 41~140
- 실행 단위: 10개씩 batch5~batch14
- 구글 시트 적재 범위: `B75:D174`
- 전체 결과:
  - 총 100건
  - 응답 찾을 수 없음: 24건
  - 낮은 유사도: 20건
  - 실행 오류: 0건

### 100개 배치별 상세

| 배치 | 결과 파일 | 보고서 파일 | 시트 범위 | 응답불가 | 낮은 유사도 | 오류 |
|---|---|---|---|---:|---:|---:|
| batch5 | `data/mixed_user_results_100_batch5.xlsx` | `data/mixed_user_report_100_batch5.xlsx` | `B75:D84` | 3 | 1 | 0 |
| batch6 | `data/mixed_user_results_100_batch6.xlsx` | `data/mixed_user_report_100_batch6.xlsx` | `B85:D94` | 1 | 0 | 0 |
| batch7 | `data/mixed_user_results_100_batch7.xlsx` | `data/mixed_user_report_100_batch7.xlsx` | `B95:D104` | 2 | 1 | 0 |
| batch8 | `data/mixed_user_results_100_batch8.xlsx` | `data/mixed_user_report_100_batch8.xlsx` | `B105:D114` | 1 | 4 | 0 |
| batch9 | `data/mixed_user_results_100_batch9.xlsx` | `data/mixed_user_report_100_batch9.xlsx` | `B115:D124` | 1 | 3 | 0 |
| batch10 | `data/mixed_user_results_100_batch10.xlsx` | `data/mixed_user_report_100_batch10.xlsx` | `B125:D134` | 6 | 2 | 0 |
| batch11 | `data/mixed_user_results_100_batch11.xlsx` | `data/mixed_user_report_100_batch11.xlsx` | `B135:D144` | 5 | 3 | 0 |
| batch12 | `data/mixed_user_results_100_batch12.xlsx` | `data/mixed_user_report_100_batch12.xlsx` | `B145:D154` | 2 | 3 | 0 |
| batch13 | `data/mixed_user_results_100_batch13.xlsx` | `data/mixed_user_report_100_batch13.xlsx` | `B155:D164` | 1 | 1 | 0 |
| batch14 | `data/mixed_user_results_100_batch14.xlsx` | `data/mixed_user_report_100_batch14.xlsx` | `B165:D174` | 2 | 2 | 0 |

## 생성/수정한 주요 스크립트

- `scripts/create_real_user_questions_10.js`
  - 실제 사용자형 10개 질문 생성
- `scripts/create_mixed_user_questions_10.js`
  - DB 변형 5개 + 좁힌 사용자형 5개 생성
- `scripts/create_mixed_user_questions_batch2.js`
- `scripts/create_mixed_user_questions_batch3.js`
- `scripts/create_mixed_user_questions_batch4.js`
  - 10개 단위 추가 질문 생성
- `scripts/create_mixed_user_questions_100.js`
  - 100개 추가 질문 생성
- `scripts/upload_google_sheet.js`
  - 유형 자동분류 순서 일부 보정
  - 예: `문서구조`, `메타데이터`, `EPUB 구조` 등이 더 적절히 잡히도록 조정

## 실행 명령 패턴

질문 실행:

```powershell
node scripts/run_chatbot_qa.js --question-file data\mixed_user_questions_100.xlsx --result-file data\mixed_user_results_100_batch5.xlsx --offset 0 --limit 10 --delay-ms 4000
```

보고서 생성:

```powershell
node scripts/make_report.js --result-file data\mixed_user_results_100_batch5.xlsx --report-file data\mixed_user_report_100_batch5.xlsx
```

구글 시트 업로드:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\작업\QA\service_account.json"
node scripts/upload_google_sheet.js --result-file data\mixed_user_results_100_batch5.xlsx
```

## 현재까지 구글 시트 적재 총량

- 유효 적재 시작: `B25`
- 마지막 적재: `B274`
- 유효 적재 행 수: 250행
  - 실제 사용자형 10개: 10행
  - 혼합형 10개: 10행
  - batch2~4: 30행
  - 추가 100개: 100행
  - 2026-06-23 추가 100개: 100행

## 2026-06-23 질문 100개 추가 실행

- 질문 파일: `data/mixed_user_questions_100_day2.xlsx`
- CSV 파일: `data/mixed_user_questions_100_day2.csv`
- 생성 스크립트: `scripts/create_mixed_user_questions_100_day2.js`
- 질문 번호: 141~240
- 구성:
  - 기존 질문 파일 양식 유지: `no | category | intent | test_focus | generated_question | expected_answer | source_category`
  - `category`: 기존과 동일하게 `db_rephrase` 49건, `narrow_free` 51건
  - 시트 `유형`: 업로드 스크립트가 기존 유형명 기준으로 자동 분류
- 검증:
  - 총 100건
  - expected_answer 빈값: 0건
  - 파일 내부 정확 중복: 0건
  - 이전 질문 파일과 정확 중복: 0건
  - SVG 포함 질문: 0건
- 실행 단위: 10개씩 batch15~batch24
- 구글 시트 적재 범위: `B175:D274`
- 전체 결과:
  - 총 100건
  - 응답 찾을 수 없음: 53건
  - 낮은 유사도: 20건
  - 실행 오류: 0건

### 2026-06-23 배치별 상세

| 배치 | 결과 파일 | 보고서 파일 | 시트 범위 | 응답불가 | 낮은 유사도 | 오류 |
|---|---|---|---|---:|---:|---:|
| batch15 | `data/mixed_user_results_100_day2_batch15.xlsx` | `data/mixed_user_report_100_day2_batch15.xlsx` | `B175:D184` | 3 | 1 | 0 |
| batch16 | `data/mixed_user_results_100_day2_batch16.xlsx` | `data/mixed_user_report_100_day2_batch16.xlsx` | `B185:D194` | 5 | 0 | 0 |
| batch17 | `data/mixed_user_results_100_day2_batch17.xlsx` | `data/mixed_user_report_100_day2_batch17.xlsx` | `B195:D204` | 4 | 4 | 0 |
| batch18 | `data/mixed_user_results_100_day2_batch18.xlsx` | `data/mixed_user_report_100_day2_batch18.xlsx` | `B205:D214` | 2 | 3 | 0 |
| batch19 | `data/mixed_user_results_100_day2_batch19.xlsx` | `data/mixed_user_report_100_day2_batch19.xlsx` | `B215:D224` | 5 | 1 | 0 |
| batch20 | `data/mixed_user_results_100_day2_batch20.xlsx` | `data/mixed_user_report_100_day2_batch20.xlsx` | `B225:D234` | 7 | 3 | 0 |
| batch21 | `data/mixed_user_results_100_day2_batch21.xlsx` | `data/mixed_user_report_100_day2_batch21.xlsx` | `B235:D244` | 7 | 3 | 0 |
| batch22 | `data/mixed_user_results_100_day2_batch22.xlsx` | `data/mixed_user_report_100_day2_batch22.xlsx` | `B245:D254` | 8 | 2 | 0 |
| batch23 | `data/mixed_user_results_100_day2_batch23.xlsx` | `data/mixed_user_report_100_day2_batch23.xlsx` | `B255:D264` | 3 | 3 | 0 |
| batch24 | `data/mixed_user_results_100_day2_batch24.xlsx` | `data/mixed_user_report_100_day2_batch24.xlsx` | `B265:D274` | 9 | 0 | 0 |
- 비고:
  - 사용자 요청으로 최초 1번 질문과 SVG 관련 질문 2건은 제외하고 대체 질문으로 재생성
  - `scripts/upload_google_sheet.js`의 유형 자동분류 키워드를 보강해 `img`, `태그`, `문법`, `br`, `li`, `ul`, `ol` 등이 기존 유형명에 더 잘 매핑되도록 수정

## 2026-07-02 질문 200개 추가 실행

- 최종 질문 파일: `data/mixed_user_questions_200_day3_natural.xlsx`
- CSV 파일: `data/mixed_user_questions_200_day3_natural.csv`
- 생성 스크립트: `scripts/create_mixed_user_questions_200_day3_natural.js`
- 질문 번호: 241~440
- 구성:
  - 기존 질문 파일 양식 유지: `no | category | intent | test_focus | generated_question | expected_answer | source_category | source_no`
  - 원 DB의 `source_question`을 실제 제작자형 원문 질문으로 사용
  - `실무 기준으로 답해주세요`, `초보 제작자가 따라 할 수 있게 알려주세요` 같은 작위적 꼬리 문장 제거
  - L/M/N 카테고리를 라운드로빈으로 섞어 구성
  - 이전 혼합 질문 파일과 정확 중복 제외
  - SVG 포함 질문 제외
- 검증:
  - 총 200건
  - expected_answer 빈값: 0건
  - 파일 내부 정확 중복: 0건
  - 이전 질문 파일과 정확 중복: 0건
  - SVG 포함 질문: 0건
- 실행 단위: 10개씩 batch25~batch44
- 구글 시트 적재 범위: `B276:D475`
- 시트 검증:
  - `챗봇검사!B276:D475` 조회 결과 200행
  - 질문/답변 빈 행: 0건
  - 작위적 꼬리 문구 포함 행: 0건
- 전체 결과:
  - 총 200건
  - 응답 찾을 수 없음: 0건
  - 낮은 유사도: 0건
  - 실행 오류: 0건
- 비고:
  - 최초 생성한 `data/mixed_user_questions_200_day3.xlsx`와 `data/mixed_user_results_200_day3_batch25.xlsx`~`batch35.xlsx`는 자동 생성 문장 품질 문제로 최종 적재에서 제외
  - 이후 생성한 `_v2` 파일은 작위적 꼬리 문장 문제로 `챗봇검사!B276:D475`에서 삭제
  - 최종 적재는 `_natural` 파일만 사용
  - 최종 분포: L 67건, M 67건, N 66건 / 고유 intent 107개 / intent별 최대 3건

### 2026-07-02 배치별 상세

| 배치 | 결과 파일 | 보고서 파일 | 시트 범위 | 응답불가 | 낮은 유사도 | 오류 |
|---|---|---|---|---:|---:|---:|
| batch25 | `data/mixed_user_results_200_day3_natural_batch25.xlsx` | `data/mixed_user_report_200_day3_natural_batch25.xlsx` | `B276:D285` | 0 | 0 | 0 |
| batch26 | `data/mixed_user_results_200_day3_natural_batch26.xlsx` | `data/mixed_user_report_200_day3_natural_batch26.xlsx` | `B286:D295` | 0 | 0 | 0 |
| batch27 | `data/mixed_user_results_200_day3_natural_batch27.xlsx` | `data/mixed_user_report_200_day3_natural_batch27.xlsx` | `B296:D305` | 0 | 0 | 0 |
| batch28 | `data/mixed_user_results_200_day3_natural_batch28.xlsx` | `data/mixed_user_report_200_day3_natural_batch28.xlsx` | `B306:D315` | 0 | 0 | 0 |
| batch29 | `data/mixed_user_results_200_day3_natural_batch29.xlsx` | `data/mixed_user_report_200_day3_natural_batch29.xlsx` | `B316:D325` | 0 | 0 | 0 |
| batch30 | `data/mixed_user_results_200_day3_natural_batch30.xlsx` | `data/mixed_user_report_200_day3_natural_batch30.xlsx` | `B326:D335` | 0 | 0 | 0 |
| batch31 | `data/mixed_user_results_200_day3_natural_batch31.xlsx` | `data/mixed_user_report_200_day3_natural_batch31.xlsx` | `B336:D345` | 0 | 0 | 0 |
| batch32 | `data/mixed_user_results_200_day3_natural_batch32.xlsx` | `data/mixed_user_report_200_day3_natural_batch32.xlsx` | `B346:D355` | 0 | 0 | 0 |
| batch33 | `data/mixed_user_results_200_day3_natural_batch33.xlsx` | `data/mixed_user_report_200_day3_natural_batch33.xlsx` | `B356:D365` | 0 | 0 | 0 |
| batch34 | `data/mixed_user_results_200_day3_natural_batch34.xlsx` | `data/mixed_user_report_200_day3_natural_batch34.xlsx` | `B366:D375` | 0 | 0 | 0 |
| batch35 | `data/mixed_user_results_200_day3_natural_batch35.xlsx` | `data/mixed_user_report_200_day3_natural_batch35.xlsx` | `B376:D385` | 0 | 0 | 0 |
| batch36 | `data/mixed_user_results_200_day3_natural_batch36.xlsx` | `data/mixed_user_report_200_day3_natural_batch36.xlsx` | `B386:D395` | 0 | 0 | 0 |
| batch37 | `data/mixed_user_results_200_day3_natural_batch37.xlsx` | `data/mixed_user_report_200_day3_natural_batch37.xlsx` | `B396:D405` | 0 | 0 | 0 |
| batch38 | `data/mixed_user_results_200_day3_natural_batch38.xlsx` | `data/mixed_user_report_200_day3_natural_batch38.xlsx` | `B406:D415` | 0 | 0 | 0 |
| batch39 | `data/mixed_user_results_200_day3_natural_batch39.xlsx` | `data/mixed_user_report_200_day3_natural_batch39.xlsx` | `B416:D425` | 0 | 0 | 0 |
| batch40 | `data/mixed_user_results_200_day3_natural_batch40.xlsx` | `data/mixed_user_report_200_day3_natural_batch40.xlsx` | `B426:D435` | 0 | 0 | 0 |
| batch41 | `data/mixed_user_results_200_day3_natural_batch41.xlsx` | `data/mixed_user_report_200_day3_natural_batch41.xlsx` | `B436:D445` | 0 | 0 | 0 |
| batch42 | `data/mixed_user_results_200_day3_natural_batch42.xlsx` | `data/mixed_user_report_200_day3_natural_batch42.xlsx` | `B446:D455` | 0 | 0 | 0 |
| batch43 | `data/mixed_user_results_200_day3_natural_batch43.xlsx` | `data/mixed_user_report_200_day3_natural_batch43.xlsx` | `B456:D465` | 0 | 0 | 0 |
| batch44 | `data/mixed_user_results_200_day3_natural_batch44.xlsx` | `data/mixed_user_report_200_day3_natural_batch44.xlsx` | `B466:D475` | 0 | 0 | 0 |

## 2026-07-02 Sigil 접근성 제작자형 질문 50개 추가 실행

- 질문 파일: `data/sigil_accessibility_questions_50.xlsx`
- CSV 파일: `data/sigil_accessibility_questions_50.csv`
- 생성 스크립트: `scripts/create_sigil_accessibility_questions_50.js`
- 질문 성격:
  - Sigil로 시각장애인용 접근성 EPUB을 직접 제작하는 상황 중심
  - XHTML/OPF/nav/CSS, manifest, heading, alt, 주석 왕복 링크, 표 구조, 접근성 메타데이터 등 실제 편집 작업 위주
  - 기존 DB intent 50개에 매핑해 expected_answer 유지
- 검증:
  - 총 50건
  - expected_answer 빈값: 0건
  - 파일 내부 정확 중복: 0건
  - 고유 intent: 50개
  - 분포: L 18건, M 21건, N 11건
- 실행 단위: 10개씩 batch45~batch49
- 구글 시트 적재 범위: `B476:D525`
- 시트 검증:
  - `챗봇검사!B476:D525` 조회 결과 50행
  - 질문/답변 빈 행: 0건
- 전체 결과:
  - 총 50건
  - 응답 찾을 수 없음: 34건
  - 낮은 유사도: 7건
  - 실행 오류: 0건
- 비고:
  - 기존 DB 문장 재사용을 줄이고 실제 Sigil 제작자 질문으로 확장한 결과, 챗봇 커버리지가 낮게 나타남
  - 2026-07-02 작업 종료 시 실제 최종 적재에 쓰이지 않은 v1/v2 day3 실행 산출물과 오늘 생성된 중복 CSV 파일은 정리함
  - 다음 질문 생성/적재 전에는 기존 시트 기입 데이터 및 기존 질문 파일과의 중복도를 먼저 확인하고, 기존 DB 원문 재사용 비중을 낮춰야 함
  - 새 질문은 시트 적재 전에 샘플을 먼저 검토받고, Sigil 기반 접근성 EPUB 제작 맥락에서 벗어나지 않는지 확인할 것

### 2026-07-02 Sigil 제작자형 배치별 상세

| 배치 | 결과 파일 | 보고서 파일 | 시트 범위 | 응답불가 | 낮은 유사도 | 오류 |
|---|---|---|---|---:|---:|---:|
| batch45 | `data/sigil_accessibility_results_50_batch45.xlsx` | `data/sigil_accessibility_report_50_batch45.xlsx` | `B476:D485` | 8 | 1 | 0 |
| batch46 | `data/sigil_accessibility_results_50_batch46.xlsx` | `data/sigil_accessibility_report_50_batch46.xlsx` | `B486:D495` | 8 | 1 | 0 |
| batch47 | `data/sigil_accessibility_results_50_batch47.xlsx` | `data/sigil_accessibility_report_50_batch47.xlsx` | `B496:D505` | 8 | 0 | 0 |
| batch48 | `data/sigil_accessibility_results_50_batch48.xlsx` | `data/sigil_accessibility_report_50_batch48.xlsx` | `B506:D515` | 5 | 1 | 0 |
| batch49 | `data/sigil_accessibility_results_50_batch49.xlsx` | `data/sigil_accessibility_report_50_batch49.xlsx` | `B516:D525` | 5 | 4 | 0 |
