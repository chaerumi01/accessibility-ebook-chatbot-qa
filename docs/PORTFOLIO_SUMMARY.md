# 접근성 전자책 챗봇 QA 자동화 프로젝트 정리

## 프로젝트 목적

접근성 전자책 제작자가 실제 업무 중 챗봇에 물어볼 수 있는 질문을 대량 생성하고, 챗봇 응답을 자동 수집한 뒤, 엑셀 보고서와 Google Sheets에 정리하는 QA 자동화 도구입니다.

수동으로 질문을 만들고 브라우저에서 답변을 복사하던 과정을 Node.js, Playwright, XLSX, Google Sheets API 기반 파이프라인으로 자동화했습니다.

## 자동화 범위

- 접근성 전자책 제작/검수 도메인 질문 생성
- 기존 DB 의도 기반 질문 변형
- 실제 사용자 상황을 반영한 자연어 질문 생성
- Playwright 기반 챗봇 자동 질의
- 응답, 소요 시간, 유사도, 응답불가 여부 저장
- Excel/CSV 결과 파일 생성
- 낮은 유사도와 응답불가 항목 중심 보고서 생성
- Google Sheets API를 통한 결과 자동 업로드
- GitHub 자동 커밋/푸시 스크립트 구성

## 주요 구현

### 질문 생성기

`scripts/generate_questions.js`, `scripts/create_*questions*.js` 계열 스크립트에서 QA 목적별 질문 세트를 생성합니다.

질문은 다음 기준으로 구성했습니다.

- EPUB 구조, OPF, manifest, spine, nav, 목차
- 이미지 대체텍스트, 표 구조, 링크, CSS, 메타데이터
- 스크린리더와 보조공학 관점의 접근성 이슈
- EPUBCheck 오류와 제작자가 실제로 만날 수 있는 검수 상황
- 기존 DB와 너무 유사하지 않도록 표현 변형 및 사용자형 질문 혼합

### 챗봇 자동 실행

`scripts/run_chatbot_qa.js`는 Playwright로 챗봇 페이지를 열고 질문을 순차적으로 입력합니다.

실행 중간에 멈춰도 기존 결과 파일에 있는 질문은 건너뛰고 이어서 실행할 수 있도록 구성했습니다.

수집 항목은 다음과 같습니다.

- 질문 번호, 카테고리, 의도
- 생성 질문과 기대 답변
- 챗봇 실제 답변
- 실행 시각과 응답 시간
- 기대 답변과 실제 답변의 유사도
- 응답불가 문구 포함 여부
- 실행 오류 메시지

### 보고서 생성

`scripts/make_report.js`는 실행 결과를 바탕으로 검토 대상 항목을 분류합니다.

- 전체 요약
- 응답불가 항목
- 낮은 유사도 항목
- intent/category별 통계
- 오류 항목

### Google Sheets 업로드

`scripts/upload_google_sheet.js`는 결과 파일을 읽어 Google Sheets의 지정 범위에 업로드합니다.

서비스 계정 인증을 사용하고, 실제 시트 ID와 인증 파일 경로는 환경변수 또는 실행 옵션으로 주입합니다.

- `GOOGLE_APPLICATION_CREDENTIALS`: 서비스 계정 JSON 경로
- `GOOGLE_SHEET_ID`: 업로드 대상 Google Sheet ID
- `GOOGLE_SHEET_NAME`: 업로드 대상 시트명

기본 업로드 방식은 append이며, 기존 내용을 지우지 않고 마지막 데이터 아래에 이어 붙입니다.

### GitHub 자동 커밋

`scripts/sync_github_logs.ps1`는 변경된 코드와 로그 문서를 자동으로 커밋하고 GitHub 원격 저장소에 푸시합니다.

`run_full.ps1`은 전체 QA 실행이 끝난 뒤 자동으로 GitHub 동기화를 실행합니다.

Windows 예약 작업을 설치하면 주기적으로 변경사항을 확인해 자동 업로드할 수 있습니다.

```powershell
npm run logs:install-task
```

## 보안 처리

GitHub 업로드 대상에서 다음 파일은 제외했습니다.

- `node_modules/`
- `data/`
- `.env`
- `*.log`
- `service_account.json`
- `*.local.json`

실행 결과 엑셀, CSV, 서비스 계정 키, 환경변수 파일은 대외비 또는 개인정보가 포함될 수 있으므로 저장소에 올리지 않습니다.

## 기술 스택

- Node.js
- Playwright
- XLSX
- Google Sheets API
- PowerShell
- Git/GitHub

## 이직 포트폴리오 관점에서 설명할 수 있는 포인트

- 반복 QA 업무를 브라우저 자동화와 데이터 파이프라인으로 전환
- 질문 생성, 실행, 결과 저장, 리포팅, 시트 업로드까지 end-to-end 자동화
- 중단 후 재실행 가능한 구조로 긴 QA 작업의 안정성 확보
- 응답불가/낮은 유사도 중심의 검토 보고서 자동 생성
- 인증 파일과 결과 데이터를 Git에서 제외하는 보안 기준 적용
- 작업 로그를 GitHub에 자동 기록해 업무 진행 이력을 보존
