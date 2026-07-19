param(
  [string]$RemoteUrl = "",
  [string]$Message = "",
  [string]$GitUserName = "",
  [string]$GitUserEmail = "",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  & git @args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Test-GitRepository {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & git rev-parse --is-inside-work-tree 1> $null 2> $null
  $isRepository = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $previousErrorActionPreference
  return $isRepository
}

function Get-GitConfigValue {
  param([string]$Name)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $value = (& git config --get $Name 2> $null)
  $found = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $previousErrorActionPreference
  if ($found) {
    return ($value -join "`n").Trim()
  }
  return ""
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-GitRepository)) {
  Invoke-Git init -b main
}

if ([string]::IsNullOrWhiteSpace((Get-GitConfigValue "user.name"))) {
  if ([string]::IsNullOrWhiteSpace($GitUserName)) {
    $GitUserName = "QA Log Automation"
  }
  Invoke-Git config user.name $GitUserName
}

if ([string]::IsNullOrWhiteSpace((Get-GitConfigValue "user.email"))) {
  if ([string]::IsNullOrWhiteSpace($GitUserEmail)) {
    $GitUserEmail = "qa-log-automation@example.local"
  }
  Invoke-Git config user.email $GitUserEmail
}

$remoteExists = $false
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& git remote get-url origin 1> $null 2> $null
$ErrorActionPreference = $previousErrorActionPreference
if ($LASTEXITCODE -eq 0) {
  $remoteExists = $true
}

if (-not $remoteExists -and -not [string]::IsNullOrWhiteSpace($RemoteUrl)) {
  Invoke-Git remote add origin $RemoteUrl
  $remoteExists = $true
}

$status = (& git status --porcelain)
if ([string]::IsNullOrWhiteSpace(($status -join "`n"))) {
  Write-Host "No changes to upload."
  if ($remoteExists -and -not $SkipPush) {
    Invoke-Git push -u origin HEAD
  }
  exit 0
}

Invoke-Git add -A

if ([string]::IsNullOrWhiteSpace($Message)) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
  $Message = "Update QA logs - $stamp"
}

Invoke-Git commit -m $Message

if (-not $remoteExists) {
  Write-Host "Committed locally. Add a GitHub remote with -RemoteUrl or git remote add origin <url> to enable upload."
  exit 0
}

if (-not $SkipPush) {
  Invoke-Git push -u origin HEAD
}
