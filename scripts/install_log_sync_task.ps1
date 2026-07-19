param(
  [int]$IntervalMinutes = 10,
  [string]$TaskName = "QA GitHub Log Sync"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$syncScript = Resolve-Path (Join-Path $PSScriptRoot "sync_github_logs.ps1")
$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`""

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument $taskArgs `
  -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Automatically commit and push QA project logs to GitHub." `
  -Force | Out-Null

Write-Host "Installed scheduled task '$TaskName'. It will run every $IntervalMinutes minutes."
