[CmdletBinding()]
param(
  [string]$SshHost = '124.222.190.43',
  [string]$SshUser = 'ubuntu',
  [string]$KeyPath = "$env:USERPROFILE/.ssh/id_ed25519",
  [string]$RemoteAppPath = '/srv/corner/app',
  [switch]$SkipSetup
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $repoRoot 'backend/.env.tunnel'
$sshTarget = "$SshUser@$SshHost"
$sshArgs = @('-i', $KeyPath, '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30')

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH private key not found: $KeyPath"
}

if (-not $SkipSetup) {
  & ssh @sshArgs $sshTarget "cd '$RemoteAppPath' && bash ./scripts/setup-dev-data.sh"
  if ($LASTEXITCODE -ne 0) { throw 'Remote development data setup failed.' }
}

$remoteEnv = & ssh @sshArgs $sshTarget "cat /srv/corner/dev-data/.env"
if ($LASTEXITCODE -ne 0 -or -not $remoteEnv) {
  throw 'Unable to read the remote development data configuration.'
}

$values = @{}
foreach ($line in $remoteEnv) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}

foreach ($required in @('DEV_POSTGRES_DB', 'DEV_POSTGRES_USER', 'DEV_POSTGRES_PASSWORD', 'DEV_REDIS_PASSWORD', 'DEV_JWT_SECRET', 'DEV_SEED_ADMIN_PASSWORD')) {
  if (-not $values[$required]) { throw "Missing remote setting: $required" }
}

$lines = @(
  "DATABASE_URL=postgresql://$($values.DEV_POSTGRES_USER):$($values.DEV_POSTGRES_PASSWORD)@127.0.0.1:15432/$($values.DEV_POSTGRES_DB)",
  'REDIS_HOST=127.0.0.1',
  'REDIS_PORT=16379',
  "REDIS_PASS=$($values.DEV_REDIS_PASSWORD)",
  "JWT_SECRET=$($values.DEV_JWT_SECRET)",
  'JWT_EXPIRES_IN=7d',
  'SEED_ADMIN_USERNAME=dev-admin',
  'SEED_ADMIN_EMAIL=dev@corner.local',
  "SEED_ADMIN_PASSWORD=$($values.DEV_SEED_ADMIN_PASSWORD)",
  'NODE_ENV=development',
  'PORT=4000'
)
[System.IO.File]::WriteAllLines($backendEnv, $lines, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Tunnel configuration written to backend/.env.tunnel (credentials are not printed).'
Write-Host 'Keep this terminal open. In another terminal run:'
Write-Host '  cd backend'
Write-Host '  npm run tunnel:init   # first use only'
Write-Host '  npm run start:dev:tunnel'
Write-Host 'Then run the frontend with: cd frontend; npm run dev'

& ssh @sshArgs '-N' '-L' '15432:127.0.0.1:15432' '-L' '16379:127.0.0.1:16379' $sshTarget
exit $LASTEXITCODE
