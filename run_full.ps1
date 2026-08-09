$ErrorActionPreference = "Stop"

npm run generate
node scripts/run_chatbot_qa.js --delay-ms 5000 --limit 2000
npm run report
npm run sheets:upload

Write-Host "Done. See data/chatbot_results.xlsx, data/chatbot_report.xlsx, and the Google Sheet."
