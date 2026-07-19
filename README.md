# 접근성 전자책 챗봇 QA 자동화

국립장애인도서관 접근성 전자책 챗봇에 제작자 관점 질문을 자동 질의하고 결과를 엑셀/CSV로 저장하는 도구입니다.

## 프로젝트 개요

이 프로젝트는 접근성 전자책 제작자가 실제로 할 법한 질문을 자동 생성하고, 챗봇에 순차적으로 질의한 뒤, 결과를 보고서와 Google Sheets로 정리하는 QA 자동화 파이프라인입니다.

주요 자동화 범위는 다음과 같습니다.

- 접근성 전자책 제작/검수 질문 생성
- Playwright 기반 챗봇 자동 질의
- 응답 결과 Excel/CSV 저장
- 응답불가 및 낮은 유사도 항목 보고서 생성
- Google Sheets API 자동 업로드
- GitHub 작업 로그 자동 커밋/푸시

상세 프로젝트 정리는 [docs/PORTFOLIO_SUMMARY.md](docs/PORTFOLIO_SUMMARY.md)에 따로 정리했습니다.

## 보안 기준

실행 결과와 인증 정보에는 대외비 내용이 포함될 수 있으므로 GitHub 업로드 대상에서 제외합니다.

- `data/`: 질문/결과/보고서 Excel, CSV
- `service_account.json`: Google 서비스 계정 키
- `.env`: 환경변수
- `*.local.json`, `*.log`

필요한 환경변수 예시는 `.env.example`을 참고합니다.

## 실행 순서

1. 질문 2000개 생성

```powershell
npm run generate
```

2. 소량 샘플 실행

```powershell
npm run run:sample
```

3. 전체 실행

```powershell
node scripts/run_chatbot_qa.js --delay-ms 5000 --limit 2000
```

4. 보고서 생성

```powershell
npm run report
```

5. 구글 시트 업로드

서비스 계정 JSON을 준비하고 해당 서비스 계정 이메일을 구글 시트에 편집자로 공유한 뒤 실행합니다.
업로드는 기존 시트 양식을 유지하고 `B:D` 범위에 `유형 | 질문 | 챗봇답변`을 입력합니다.
기본값은 기존 내용을 지우지 않고 `B:D`에서 값이 있는 마지막 행 아래에 추가하는 방식입니다.
`유형`은 질문 내용을 보고 `표`, `메타데이터`, `접근성`, `오류` 같은 사람이 읽는 분류명으로 자동 입력합니다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
$env:GOOGLE_SHEET_ID="<google-sheet-id>"
npm run sheets:upload
```

6. GitHub 로그 업로드

최초 1회만 GitHub 저장소 URL을 넣어 원격 저장소를 연결합니다.

```powershell
.\scripts\sync_github_logs.ps1 -RemoteUrl "https://github.com/<owner>/<repo>.git" -Message "Initial QA log upload"
```

이후에는 아래 명령으로 현재 변경사항을 커밋하고 GitHub에 업로드합니다.

```powershell
npm run logs:push
```

`run_full.ps1`로 전체 QA를 실행하면 마지막에 자동으로 로그 업로드를 시도합니다. GitHub 원격 저장소가 아직 연결되지 않은 경우에는 로컬 커밋까지만 만들고 업로드는 건너뜁니다.

주기적으로 자동 업로드하려면 Windows 예약 작업을 설치합니다.

```powershell
npm run logs:install-task
```

기본값은 10분마다 변경사항을 확인해 커밋/푸시합니다. 먼저 GitHub 원격 저장소를 연결해야 실제 업로드까지 진행됩니다.

시트에 쓰기 전에 `B:D`에 들어갈 값을 미리 확인하려면 다음처럼 실행합니다.

```powershell
npm run sheets:dry-run
```

원본 파일의 특정 열을 `유형`으로 그대로 쓰려면 다음처럼 실행합니다.

```powershell
node scripts/upload_google_sheet.js --type-field intent
```

특정 위치부터 덮어써야 할 때만 다음처럼 실행합니다.

```powershell
node scripts/upload_google_sheet.js --mode overwrite --start-cell B2
```

## 주요 파일

- `data/questions_2000.xlsx`: 생성된 질문 2000개와 원본 intent/기대답변
- `data/chatbot_results.xlsx`: 챗봇 실제 응답 결과
- `data/chatbot_report.xlsx`: 요약, 응답불가, 낮은 유사도, intent별 통계

## 실행 옵션

```powershell
node scripts/run_chatbot_qa.js --limit 100 --delay-ms 5000 --headful
```

- `--limit`: 실행할 질문 수
- `--offset`: 시작 위치
- `--delay-ms`: 질문 간 대기 시간
- `--headful`: 브라우저 화면 표시
- `--question-file`: 질문 파일 경로
- `--result-file`: 결과 파일 경로

중간에 멈춰도 기존 결과 파일의 질문은 건너뛰고 이어서 실행합니다.
