#Requires -Version 5.1
<#
    Calendar Tron kiosk supervisor.

    Launches the Electron kiosk, then polls origin/main and redeploys whenever it
    moves. Must run in the logged-in desktop session (Windows services live in
    session 0 and cannot draw GUI windows), so schedule it with
    "Run only when user is logged on" or from the Startup folder.

    See docs/kiosk-setup.md.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot    = Split-Path -Parent $PSScriptRoot
$Branch      = 'main'
$PollSeconds = 120

$ElectronExe = Join-Path $RepoRoot 'node_modules\electron\dist\electron.exe'
$StateFile   = Join-Path $RepoRoot '.kiosk-deployed'
$LogFile     = Join-Path $RepoRoot 'kiosk.log'

$script:Kiosk = $null

function Write-Log {
    param([string]$Message)
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Write-Host $line
    try { Add-Content -LiteralPath $LogFile -Value $line } catch { }
}

function Invoke-Step {
    param([string]$Label, [string]$Exe, [string[]]$Arguments)
    Write-Log "  $Label"
    $p = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $RepoRoot `
                       -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "$Label failed (exit $($p.ExitCode))" }
}

function Get-GitOutput {
    param([string[]]$Arguments)
    $out = & git -C $RepoRoot @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed: $out" }
    return ($out | Out-String).Trim()
}

function Get-DeployedSha {
    if (Test-Path -LiteralPath $StateFile) {
        return (Get-Content -LiteralPath $StateFile -Raw).Trim()
    }
    return ''
}

function Stop-Kiosk {
    if ($script:Kiosk -and -not $script:Kiosk.HasExited) {
        Write-Log "  stopping kiosk (pid $($script:Kiosk.Id))"
        Stop-Process -Id $script:Kiosk.Id -Force -ErrorAction SilentlyContinue
        $script:Kiosk.WaitForExit(10000) | Out-Null
    }
    $script:Kiosk = $null
}

function Start-Kiosk {
    Stop-Kiosk
    Write-Log '  starting kiosk'
    $script:Kiosk = Start-Process -FilePath $ElectronExe -ArgumentList '.' `
                                  -WorkingDirectory $RepoRoot -PassThru
}

function Invoke-Deploy {
    param([string]$TargetSha)

    # npm ci is slow, so only reinstall when the lockfile actually moved.
    $lockBefore = Get-GitOutput @('rev-parse', 'HEAD:package-lock.json')

    Invoke-Step 'git reset --hard' 'git' @('-C', $RepoRoot, 'reset', '--hard', $TargetSha)

    $lockAfter = Get-GitOutput @('rev-parse', 'HEAD:package-lock.json')
    if ($lockBefore -ne $lockAfter) {
        Invoke-Step 'npm ci' 'npm.cmd' @('ci')
    }

    Invoke-Step 'npm run build' 'npm.cmd' @('run', 'build')

    $indexHtml = Join-Path $RepoRoot 'dist\index.html'
    if (-not (Test-Path -LiteralPath $indexHtml)) {
        throw 'build produced no dist/index.html'
    }

    # Only swap the running app once we know the new build exists.
    Start-Kiosk
    Set-Content -LiteralPath $StateFile -Value $TargetSha -NoNewline
}

# ---------------------------------------------------------------- startup ----

Write-Log '=== kiosk supervisor starting ==='
Write-Log "repo: $RepoRoot"

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.env'))) {
    Write-Log 'WARNING: no .env found - the build will ship without Supabase config'
}

if (-not (Test-Path -LiteralPath $ElectronExe)) {
    Invoke-Step 'npm ci (first run)' 'npm.cmd' @('ci')
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'dist\index.html'))) {
    Invoke-Step 'npm run build (first run)' 'npm.cmd' @('run', 'build')
}

Start-Kiosk

# ------------------------------------------------------------- watch loop ----

while ($true) {
    Start-Sleep -Seconds $PollSeconds

    try {
        & git -C $RepoRoot fetch --quiet origin $Branch 2>&1 | Out-Null
        $remote = Get-GitOutput @('rev-parse', "origin/$Branch")

        # Compare against the last SHA we successfully deployed, not HEAD, so a
        # failed build is retried on the next poll instead of being stranded.
        if ($remote -ne (Get-DeployedSha)) {
            Write-Log "new commit $($remote.Substring(0, 7)) - deploying"
            Invoke-Deploy -TargetSha $remote
            Write-Log 'deploy complete'
        }
    }
    catch {
        # Leave whatever is on screen running and try again next poll.
        Write-Log "deploy error: $_"
    }

    if ($script:Kiosk -and $script:Kiosk.HasExited) {
        Write-Log 'kiosk exited on its own - restarting'
        try { Start-Kiosk } catch { Write-Log "restart failed: $_" }
    }
}
