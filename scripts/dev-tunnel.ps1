[CmdletBinding()]
param(
  [string]$SshHost = '124.222.190.43',
  [string]$SshUser = 'ubuntu',
  [string]$KeyPath = "$env:USERPROFILE/.ssh/id_ed25519",
  [string]$RemoteAppPath = '/srv/corner/app',
  [switch]$SkipSetup,
  [switch]$WriteConfigOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $repoRoot 'backend/.env.tunnel'
$sshTarget = "$SshUser@$SshHost"
$sshArgs = @(
  '-i', $KeyPath,
  '-o', 'BatchMode=yes',
  '-o', 'ExitOnForwardFailure=yes',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ConnectTimeout=10',
  '-o', 'ConnectionAttempts=1'
)

function Write-TunnelLog {
  param([string]$Message)
  [Console]::Error.WriteLine("[$([DateTime]::Now.ToString('HH:mm:ss'))] $Message")
}

function Read-DotEnvValues {
  param([string]$Path)

  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }

  foreach ($line in (Get-Content -LiteralPath $Path)) {
    if ($line -notmatch '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { continue }
    $value = $Matches[2]
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $result[$Matches[1]] = $value
  }
  return $result
}

function ConvertTo-DotEnvLine {
  param([string]$Name, [string]$Value)

  $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
  return "$Name=`"$escaped`""
}

function ConvertFrom-DotEnvLines {
  param([string[]]$Lines)

  $result = @{}
  foreach ($line in $Lines) {
    if ($line -notmatch '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { continue }
    $value = $Matches[2]
    if ($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $result[$Matches[1]] = $value
  }
  return $result
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH private key not found: $KeyPath"
}

if (-not $SkipSetup) {
  Write-TunnelLog 'Running remote development data setup and reading configuration...'
  $remoteEnv = & ssh @sshArgs $SshTarget "cd '$RemoteAppPath' && bash ./scripts/setup-dev-data.sh && cat /srv/corner/dev-data/.env"
  $readExit = $LASTEXITCODE
  Write-TunnelLog "Remote setup and config read finished (exit=$readExit, lines=$($remoteEnv.Count))."
  if ($readExit -ne 0 -or -not $remoteEnv) {
    throw 'Remote development data setup or config read failed.'
  }
} else {
  Write-TunnelLog 'Reading remote development data configuration...'
  $remoteEnv = & ssh @sshArgs $SshTarget "cat /srv/corner/dev-data/.env"
  $readExit = $LASTEXITCODE
  Write-TunnelLog "Read remote configuration (exit=$readExit, lines=$($remoteEnv.Count))."
  if ($readExit -ne 0 -or -not $remoteEnv) {
    throw 'Unable to read the remote development data configuration.'
  }
}

$values = ConvertFrom-DotEnvLines $remoteEnv

foreach ($required in @('DEV_POSTGRES_DB', 'DEV_POSTGRES_USER', 'DEV_POSTGRES_PASSWORD', 'DEV_REDIS_PASSWORD', 'DEV_JWT_SECRET')) {
  if (-not $values[$required]) { throw "Missing remote setting: $required" }
}

Write-TunnelLog 'Using local SMTP configuration from backend/.env.tunnel...'
$smtpValues = @{}
$existingTunnelEnv = Read-DotEnvValues $backendEnv
foreach ($name in @('EMAIL_SMTP_HOST', 'EMAIL_SMTP_PORT', 'EMAIL_SMTP_SECURE', 'EMAIL_SMTP_USER', 'EMAIL_SMTP_PASS', 'EMAIL_FROM_NAME', 'EMAIL_FROM_ADDRESS')) {
  if ($existingTunnelEnv[$name]) {
    $smtpValues[$name] = $existingTunnelEnv[$name]
  }
}
if (-not $smtpValues.EMAIL_SMTP_PASS) {
  Write-TunnelLog 'WARNING: No SMTP configuration found in backend/.env.tunnel. Email features may not work.'
}
Write-TunnelLog "Loaded local SMTP configuration (keys=$($smtpValues.Count); values hidden)."

$rootEnv = Read-DotEnvValues (Join-Path $repoRoot '.env')
$exampleEnv = Read-DotEnvValues (Join-Path $repoRoot '.env.example')
$existingTunnelEnv = Read-DotEnvValues $backendEnv
$adminValues = @{}
foreach ($name in @('SEED_ADMIN_USERNAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD')) {
  $adminValues[$name] = if ($existingTunnelEnv[$name]) {
    $existingTunnelEnv[$name]
  } elseif ($rootEnv[$name]) {
    $rootEnv[$name]
  } elseif ($name -eq 'SEED_ADMIN_PASSWORD' -and $values.DEV_SEED_ADMIN_PASSWORD) {
    $values.DEV_SEED_ADMIN_PASSWORD
  } else {
    $exampleEnv[$name]
  }
  if (-not $adminValues[$name]) {
    throw "Missing local administrator setting: $name. Configure it in backend/.env.tunnel or the root .env before starting the development tunnel."
  }
}

$lines = @(
  $(ConvertTo-DotEnvLine 'DATABASE_URL' "postgresql://$($values.DEV_POSTGRES_USER):$($values.DEV_POSTGRES_PASSWORD)@127.0.0.1:15432/$($values.DEV_POSTGRES_DB)"),
  'REDIS_HOST=127.0.0.1',
  'REDIS_PORT=16379',
  $(ConvertTo-DotEnvLine 'REDIS_PASS' $values.DEV_REDIS_PASSWORD),
  $(ConvertTo-DotEnvLine 'JWT_SECRET' $values.DEV_JWT_SECRET),
  'JWT_EXPIRES_IN=7d',
  $(ConvertTo-DotEnvLine 'SEED_ADMIN_USERNAME' $adminValues.SEED_ADMIN_USERNAME),
  $(ConvertTo-DotEnvLine 'SEED_ADMIN_EMAIL' $adminValues.SEED_ADMIN_EMAIL),
  $(ConvertTo-DotEnvLine 'SEED_ADMIN_PASSWORD' $adminValues.SEED_ADMIN_PASSWORD),
  $(ConvertTo-DotEnvLine 'SEED_ALLOWED_DATABASE' $values.DEV_POSTGRES_DB),
  'SEED_ALLOW_REMOTE_DATABASE=false',
  'NODE_ENV=development',
  'PORT=4000'
)
$smtpNames = @(
  'EMAIL_SMTP_HOST',
  'EMAIL_SMTP_PORT',
  'EMAIL_SMTP_SECURE',
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
  'EMAIL_FROM_NAME',
  'EMAIL_FROM_ADDRESS'
)
foreach ($name in $smtpNames) {
  if ($smtpValues.ContainsKey($name)) {
    $lines += ConvertTo-DotEnvLine $name $smtpValues[$name]
  }
}
[System.IO.File]::WriteAllLines($backendEnv, $lines, [System.Text.UTF8Encoding]::new($false))
Write-TunnelLog "Wrote $($lines.Count) configuration lines to backend/.env.tunnel."

Write-Host 'Tunnel and SMTP configuration written to backend/.env.tunnel (credentials are not printed).'
if ($WriteConfigOnly) {
  Write-TunnelLog 'Configuration-only mode completed; SSH tunnel was not started.'
  exit 0
}
Write-Host 'Keep this terminal open. In another terminal run:'
Write-Host '  cd backend'
Write-Host '  npm run tunnel:init   # first use only'
Write-Host '  npm run start:dev:tunnel'
Write-Host 'Then run the frontend with: cd frontend; npm run dev'

Write-TunnelLog 'Starting SSH tunnel (PostgreSQL 15432, Redis 16379)...'
& ssh @sshArgs '-N' '-L' '15432:127.0.0.1:15432' '-L' '16379:127.0.0.1:16379' $SshTarget
exit $LASTEXITCODE
