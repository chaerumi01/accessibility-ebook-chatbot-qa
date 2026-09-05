# 접근성 전자책 챗봇 QA 자동화

접근성 전자책 챗봇의 반복적인 품질검사를 자동화하기 위해 구현한 QA 자동화 프로젝트입니다.

제작자 관점의 질문을 생성하고, Playwright를 통해 챗봇에 순차적으로 질의한 뒤 응답 결과를 수집·정리하여 Excel/CSV 및 Google Sheets로 적재할 수 있도록 구성했습니다.

## 프로젝트 배경

챗봇 품질검사에서는 다수의 질문을 반복적으로 입력하고 응답 결과를 수집해야 합니다.

수작업으로 대량의 질문을 테스트할 경우 반복 입력과 결과 정리에 많은 시간이 필요하고, 작업이 중단되었을 때 이미 완료한 질문을 다시 처리해야 하는 문제가 발생할 수 있습니다.

이를 개선하기 위해 다음 과정을 자동화했습니다.

```text
[QA 질문 생성]
       │
       ▼
[Playwright 자동 질의]
 ├─ 질문 순차 입력
 ├─ 챗봇 응답 대기
 └─ 응답 결과 추출
       │
       ▼
[결과 저장]
 ├─ Excel / CSV
 └─ 기존 완료 질문 확인
       │
       ▼
[QA 결과 분석]
 ├─ 응답불가 항목 분리
 ├─ 낮은 유사도 항목 분리
 └─ intent별 통계 생성
       │
       ▼
[Google Sheets 적재]
       │
       ▼
[사람의 품질 검토]
```

## 핵심 구현

### 1. Playwright 기반 대량 챗봇 자동 질의

반복적으로 수행하던 질문 입력과 응답 수집을 Playwright로 자동화했습니다.

- 질문 순차 입력
- 챗봇 응답 대기 및 결과 추출
- 요청 간 대기시간 적용
- 실행 건수 및 시작 위치 지정
- 브라우저 표시 여부 선택

대량 테스트뿐 아니라 소량 샘플을 먼저 실행하여 동작을 확인할 수 있도록 구성했습니다.

### 2. 중단 후 재실행 가능한 구조

대량 QA 수행 중 작업이 중단될 수 있다는 점을 고려하여 기존 결과 파일에 이미 기록된 질문을 확인하도록 구성했습니다.

재실행 시 완료된 질문은 건너뛰고 미처리 질문부터 이어서 실행할 수 있어 동일 작업의 불필요한 반복을 줄였습니다.

```text
질문 2,000건 실행
      │
      ├─ 기존 완료 질문 → Skip
      │
      └─ 미처리 질문 → 자동 질의
```

### 3. 검토 대상 자동 분리

수집된 결과를 단순 저장하는 데서 끝내지 않고 사람이 우선적으로 확인해야 할 항목을 구분할 수 있도록 보고서를 생성합니다.

- 응답불가 항목
- 낮은 유사도 항목
- intent별 결과 통계

자동 결과를 최종 품질 판정으로 사용하기보다 검토가 필요한 후보를 좁히고, 최종 판단은 사람이 수행하는 방식으로 구성했습니다.

### 4. Google Sheets API 결과 적재

수집·정리한 QA 결과를 Google Sheets API를 통해 운영 시트에 적재할 수 있도록 구성했습니다.

기존 시트 구조를 유지하면서 결과를 추가할 수 있으며, 실제 쓰기 전에 dry-run으로 적재 예정 데이터를 확인할 수 있도록 했습니다.

인증정보와 시트 식별자는 코드에 직접 저장하지 않고 환경변수로 분리했습니다.

## 기술 스택

- **Node.js / JavaScript** — QA 자동화 로직 구현
- **Playwright** — 챗봇 자동 질의 및 응답 수집
- **Google Sheets API** — QA 결과 운영 시트 적재
- **Excel / CSV** — 질문 및 응답 결과 저장
- **Git / GitHub** — 소스 코드 버전 관리

## 실행 순서

### 1. 질문 데이터 생성

```powershell
npm run generate
```

### 2. 소량 샘플 테스트

```powershell
npm run run:sample
```

### 3. 전체 QA 실행

```powershell
node scripts/run_chatbot_qa.js --delay-ms 5000 --limit 2000
```

### 4. QA 보고서 생성

```powershell
npm run report
```

### 5. Google Sheets 업로드

Google 서비스 계정과 대상 시트 정보를 환경변수로 설정한 뒤 실행합니다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
$env:GOOGLE_SHEET_ID="<google-sheet-id>"

npm run sheets:upload
```

실제 시트에 쓰기 전에 다음 명령으로 적재 예정 데이터를 확인할 수 있습니다.

```powershell
npm run sheets:dry-run
```

## 주요 실행 옵션

```powershell
node scripts/run_chatbot_qa.js --limit 100 --delay-ms 5000 --headful
```

- `--limit`: 실행할 질문 수
- `--offset`: 시작 위치
- `--delay-ms`: 질문 간 대기 시간
- `--headful`: 브라우저 화면 표시
- `--question-file`: 질문 파일 경로
- `--result-file`: 결과 파일 경로

중간에 실행이 중단되더라도 기존 결과를 확인하여 완료된 질문을 건너뛰고 이어서 실행할 수 있습니다.

## 실행 시 생성되는 데이터

실제 업무 데이터는 공개 저장소에 포함하지 않습니다.

```text
data/
├── questions_2000.xlsx
├── chatbot_results.xlsx
└── chatbot_report.xlsx
```

- `questions_2000.xlsx`: QA 질문 데이터
- `chatbot_results.xlsx`: 챗봇 응답 수집 결과
- `chatbot_report.xlsx`: 응답불가, 낮은 유사도 및 통계 보고서

## 보안 및 공개 범위

실제 업무 데이터와 인증정보는 공개 저장소에서 제외했습니다.

- `data/` — 실제 질문·응답 및 보고서
- `service_account.json` — Google 서비스 계정 인증정보
- `.env` — 환경변수
- `*.local.json`
- `*.log`

환경변수의 형식만 확인할 수 있도록 `.env.example`을 별도로 제공합니다.

실제 서비스 운영에 사용되는 데이터와 인증정보는 코드 및 Git 저장소와 분리하여 관리합니다.

## 프로젝트에서 해결한 문제

이 프로젝트에서는 반복적인 챗봇 QA 업무를 단순히 빠르게 수행하는 것보다, 대량 테스트를 안정적으로 반복할 수 있는 구조를 만드는 데 중점을 두었습니다.

특히 다음 문제를 개선했습니다.

- 반복적인 질문 입력 및 응답 수집 자동화
- 대량 실행 중 중단 발생 시 완료 질문 재처리 방지
- 응답불가 및 낮은 유사도 항목의 검토 대상 분리
- 수집 결과의 구조화 및 Google Sheets 연동
- 실제 업무 데이터와 인증정보의 공개 코드 분리

이를 통해 반복적인 챗봇 품질검사를 **질문 생성 → 자동 질의 → 결과 수집 → 검토 대상 분리 → 운영 데이터 적재**로 이어지는 재실행 가능한 QA 자동화 흐름으로 구성했습니다.

## 관련 프로젝트

수집된 QA 데이터를 검증·정제하고 PostgreSQL에 적재하여 SQL 기반 품질 KPI를 분석하는 과정은 별도의 데이터 파이프라인 프로젝트로 구성했습니다.

### Chatbot QA Data Pipeline

- Python / Pandas 기반 데이터 검증·정제
- PostgreSQL 데이터 적재 및 무결성 관리
- SQL 기반 DB Coverage / Answer Accuracy 등 품질 KPI 분석

[Chatbot QA Data Pipeline 저장소](https://github.com/chaerumi01/chatbot-qa-data-pipeline)
