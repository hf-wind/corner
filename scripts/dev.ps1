[CmdletBinding()]
param(
  [string]$SshHost = '124.222.190.43',
  [string]$SshUser = 'ubuntu',
  [string]$KeyPath = "$env:USERPROFILE/.ssh/id_ed25519",
  [string]$RemoteAppPath = '/srv/corner/app',
  [switch]$SkipSetup,
  [switch]$Init,
  [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$devRoot = Join-Path $repoRoot '.codex-dev'
$tunnelScript = Join-Path $PSScriptRoot 'dev-tunnel.ps1'
$backendRoot = Join-Path $repoRoot 'backend'
$frontendRoot = Join-Path $repoRoot 'frontend'
$backendEnv = Join-Path $backendRoot '.env.tunnel'
$stopSignal = Join-Path $devRoot 'stop.requested'
$managedProcesses = [System.Collections.Generic.List[object]]::new()
$managedPorts = @(3000, 4000, 15432, 16379)

New-Item -ItemType Directory -Path $devRoot -Force | Out-Null

$logFiles = @{
  tunnelOut = Join-Path $devRoot 'tunnel.out.log'
  tunnelErr = Join-Path $devRoot 'tunnel.err.log'
  initOut = Join-Path $devRoot 'init.out.log'
  initErr = Join-Path $devRoot 'init.err.log'
  backendOut = Join-Path $devRoot 'backend.out.log'
  backendErr = Join-Path $devRoot 'backend.err.log'
  frontendOut = Join-Path $devRoot 'frontend.out.log'
  frontendErr = Join-Path $devRoot 'frontend.err.log'
}

function Start-ManagedProcess {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [string]$StandardOutput,
    [string]$StandardError
  )

  $startParameters = @{
    FilePath = $FilePath
    ArgumentList = $ArgumentList
    WorkingDirectory = $WorkingDirectory
    RedirectStandardOutput = $StandardOutput
    RedirectStandardError = $StandardError
    WindowStyle = 'Hidden'
    PassThru = $true
  }
  $process = Start-Process @startParameters
  $managedProcesses.Add($process)
  return $process
}

function Stop-ProcessTree {
  param([int]$ProcessId)

  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessId)
  foreach ($childId in $children) {
    Stop-ProcessTree -ProcessId ([int]$childId)
  }

  if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Get-PortListeners {
  param([int[]]$Ports)

  return @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort } |
    Select-Object LocalPort, OwningProcess -Unique)
}

function Test-ProjectProcess {
  param([int]$ProcessId)

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $process) { return $false }

  $commandLine = [string]$process.CommandLine
  if ($commandLine.IndexOf($repoRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
    return $true
  }

  return $commandLine -match '(?i)ssh(?:[.]exe)?' -and
    $commandLine -match '15432:127[.]0[.]0[.]1:15432' -and
    $commandLine -match '16379:127[.]0[.]0[.]1:16379' -and
    $commandLine.IndexOf($SshHost, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Stop-ProjectPortListeners {
  param([int[]]$Ports)

  foreach ($listener in (Get-PortListeners -Ports $Ports)) {
    $ownerId = [int]$listener.OwningProcess
    if ($ownerId -ne $PID -and (Test-ProjectProcess -ProcessId $ownerId)) {
      Write-Host "Stopping project process PID $ownerId on port $($listener.LocalPort)..."
      Stop-ProcessTree -ProcessId $ownerId
    }
  }
}

function Test-LocalPort {
  param([int]$Port)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync('127.0.0.1', $Port)
    return $task.Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Get-LogTail {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    return (Get-Content -LiteralPath $Path -Tail 12 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
  }
  return ''
}

function Wait-ForPorts {
  param(
    [int[]]$Ports,
    [datetime]$Deadline,
    [object[]]$Processes
  )

  do {
    foreach ($process in $Processes) {
      if ($process.HasExited) { return $false }
    }
    $ready = @($Ports | Where-Object { -not (Test-LocalPort -Port $_) }).Count -eq 0
    if (-not $ready) { Start-Sleep -Seconds 1 }
  } while (-not $ready -and (Get-Date) -lt $Deadline)

  return $ready
}

if ($Stop) {
  Set-Content -LiteralPath $stopSignal -Value 'stop' -Encoding ascii
  Stop-ProjectPortListeners -Ports $managedPorts
  Write-Host 'Project development ports released.'
  return
}

Remove-Item -LiteralPath $stopSignal -Force -ErrorAction SilentlyContinue
foreach ($logFile in $logFiles.Values) {
  Set-Content -LiteralPath $logFile -Value '' -Encoding utf8
}

try {
  if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw "SSH private key not found: $KeyPath"
  }

  Stop-ProjectPortListeners -Ports $managedPorts
  Start-Sleep -Milliseconds 500
  $busyPorts = Get-PortListeners -Ports $managedPorts
  if ($busyPorts) {
    $details = ($busyPorts | ForEach-Object { "$($_.LocalPort) (PID $($_.OwningProcess))" }) -join ', '
    throw "Development ports are already in use: $details"
  }

  $powershellPath = (Get-Process -Id $PID).Path
  if (-not $powershellPath) { $powershellPath = 'powershell.exe' }

  $tunnelArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $tunnelScript,
    '-SshHost', $SshHost,
    '-SshUser', $SshUser,
    '-KeyPath', $KeyPath,
    '-RemoteAppPath', $RemoteAppPath
  )
  if ($SkipSetup) { $tunnelArgs += '-SkipSetup' }

  Write-Host 'Starting SSH tunnel (PostgreSQL 15432, Redis 16379)...'
  $tunnel = Start-ManagedProcess -FilePath $powershellPath -ArgumentList $tunnelArgs -WorkingDirectory $repoRoot -StandardOutput $logFiles.tunnelOut -StandardError $logFiles.tunnelErr

  $tunnelReady = Wait-ForPorts -Ports @(15432, 16379) -Deadline (Get-Date).AddMinutes(2) -Processes @($tunnel)
  if (-not $tunnelReady -or -not (Test-Path -LiteralPath $backendEnv)) {
    throw "SSH tunnel failed or timed out.$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.tunnelErr)"
  }

  $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source

  if ($Init) {
    Write-Host 'Initializing the development database...'
    $initializer = Start-ManagedProcess -FilePath $npmPath -ArgumentList @('run', 'tunnel:init') -WorkingDirectory $backendRoot -StandardOutput $logFiles.initOut -StandardError $logFiles.initErr
    $initializer.WaitForExit()
    if ($initializer.ExitCode -ne 0) {
      throw "Development database initialization failed.$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.initErr)"
    }
  }

  Write-Host 'Starting backend and frontend...'
  $backend = Start-ManagedProcess -FilePath $npmPath -ArgumentList @('run', 'start:dev:tunnel') -WorkingDirectory $backendRoot -StandardOutput $logFiles.backendOut -StandardError $logFiles.backendErr
  $frontend = Start-ManagedProcess -FilePath $npmPath -ArgumentList @('run', 'dev') -WorkingDirectory $frontendRoot -StandardOutput $logFiles.frontendOut -StandardError $logFiles.frontendErr

  $appReady = Wait-ForPorts -Ports @(3000, 4000) -Deadline (Get-Date).AddMinutes(1) -Processes @($backend, $frontend)
  if (-not $appReady) {
    throw "Backend or frontend failed to start.$([Environment]::NewLine)Backend:$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.backendErr)$([Environment]::NewLine)Frontend:$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.frontendErr)"
  }

  Write-Host ''
  Write-Host 'Development environment is ready:'
  Write-Host '  Frontend: http://localhost:3000'
  Write-Host '  Backend:  http://localhost:4000/api'
  Write-Host "  Logs:     $devRoot"
  Write-Host 'Keep this window open. Press Ctrl+C to stop services and release ports.'
  Write-Host ''

  while ($true) {
    if (Test-Path -LiteralPath $stopSignal) { break }
    if ($tunnel.HasExited) { throw "SSH tunnel exited.$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.tunnelErr)" }
    if ($backend.HasExited) { throw "Backend exited.$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.backendErr)" }
    if ($frontend.HasExited) { throw "Frontend exited.$([Environment]::NewLine)$(Get-LogTail -Path $logFiles.frontendErr)" }
    Start-Sleep -Seconds 2
  }
} finally {
  foreach ($process in @($managedProcesses | Sort-Object Id -Descending)) {
    if (-not $process.HasExited) {
      Stop-ProcessTree -ProcessId $process.Id
    }
  }
  Start-Sleep -Milliseconds 500
  Stop-ProjectPortListeners -Ports $managedPorts
  Remove-Item -LiteralPath $stopSignal -Force -ErrorAction SilentlyContinue
  Write-Host 'Development environment stopped and project ports released.'
}
