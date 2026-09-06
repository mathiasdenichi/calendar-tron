#Requires -Version 5.1
<#
    Calendar Tron kiosk supervisor.

    Launches the Electron kiosk, restarts it if it dies, and polls origin/main -
    rebuilding and relaunching whenever the branch moves.

    Must run in the logged-in desktop session: Windows services live in session 0,
    which has no desktop and cannot draw GUI windows. Schedule it with
    "Run only when user is logged on".

    See docs/kiosk-setup.md.
#>

Set-StrictMode -Version Latest

# Deliberately NOT 'Stop'. git and npm both write progress to stderr on success,
# and under 'Stop' PowerShell turns that into a terminating NativeCommandError -
# which would make every single deploy "fail" and silently never ship anything.
# Exit codes are checked explicitly instead, in Invoke-Native.
$ErrorActionPreference = 'Continue'

$RepoRoot    = Split-Path -Parent $PSScriptRoot
$Branch      = 'main'
$PollSeconds = 120
$Port        = 5173

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

# Runs a native command, captures merged output, and reports the real exit code.
function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    $output = & $Exe @Arguments 2>&1 | ForEach-Object { $_.ToString() }
    return [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output   = ($output -join [Environment]::NewLine)
    }
}

function Invoke-Step {
    param([string]$Label, [string]$Exe, [string[]]$Arguments)
    Write-Log "  $Label"
    $r = Invoke-Native -Exe $Exe -Arguments $Arguments
    if ($r.ExitCode -ne 0) {
        Write-Log "  ---- $Label output ----"
        foreach ($l in ($r.Output -split "`n")) { Write-Log "  | $l" }
        throw "$Label failed (exit $($r.ExitCode))"
    }
}

function Get-GitOutput {
    param([string[]]$Arguments)
    $r = Invoke-Native -Exe 'git' -Arguments $Arguments
    if ($r.ExitCode -ne 0) { throw "git $($Arguments -join ' ') failed: $($r.Output)" }
    return $r.Output.Trim()
}

function Get-DeployedSha {
    if (Test-Path -LiteralPath $StateFile) {
        return (Get-Content -LiteralPath $StateFile -Raw).Trim()
    }
    return ''
}

# Tests by connecting rather than binding, so it sees a listener on either
# loopback stack - Node may bind localhost to ::1 rather than 127.0.0.1.
function Test-PortFree {
    param([int]$TcpPort)
    $client = $null
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect('localhost', $TcpPort, $null, $null)
        $answered = $async.AsyncWaitHandle.WaitOne(300)
        if ($answered -and $client.Connected) { return $false }
        return $true
    } catch {
        return $true
    } finally {
        if ($client) { $client.Close() }
    }
}

# Last resort when something we don't own is squatting on the port - a kiosk
# started by hand before the supervisor, a stray `npm run dev`, or an orphaned
# Electron child. Without this the replacement window dies on EADDRINUSE.
function Stop-PortOwner {
    param([int]$TcpPort)
    try {
        $conns = @(Get-NetTCPConnection -LocalPort $TcpPort -State Listen -ErrorAction SilentlyContinue)
        foreach ($c in $conns) {
            Write-Log "  killing pid $($c.OwningProcess) squatting on port $TcpPort"
            Invoke-Native -Exe 'taskkill' -Arguments @('/F', '/T', '/PID', "$($c.OwningProcess)") | Out-Null
        }
    } catch {
        Write-Log "  could not inspect port $TcpPort : $_"
    }
}

<#
    Reads kiosk.config.json. Not cached: this process survives many deploys, and
    a pushed change to the config must take effect on the next read.
#>
function Get-KioskConfig {
    $publicUrl   = ''
    $manageServe = $false

    try {
        $configPath = Join-Path $RepoRoot 'kiosk.config.json'
        if (Test-Path -LiteralPath $configPath) {
            $raw = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
            # Check membership first - StrictMode throws on missing properties.
            $names = $raw.PSObject.Properties.Name
            if (($names -contains 'publicUrl') -and $raw.publicUrl) {
                $publicUrl = [string]$raw.publicUrl
            }
            if ($names -contains 'manageTailscaleServe') {
                $manageServe = [bool]$raw.manageTailscaleServe
            }
        }
    }
    catch {
        Write-Log "  could not read kiosk.config.json: $_"
    }

    return [pscustomobject]@{ PublicUrl = $publicUrl; ManageServe = $manageServe }
}

<#
    Makes sure `tailscale serve` is proxying our port, so remote access survives
    a reboot, a serve reset, or a fresh machine without anyone running it by hand.
    Idempotent, and never fatal.
#>
function Set-TailscaleServe {
    if (-not (Get-KioskConfig).ManageServe) { return }

    $exe = Resolve-TailscaleExe
    if (-not $exe) {
        Write-Log '  tailscale CLI not found - skipping serve setup'
        return
    }

    if (Test-ServeProxying) {
        Write-Log "  tailscale serve already proxying $Port"
        return
    }

    Write-Log "  configuring tailscale serve -> http://localhost:$Port"

    # Tailscale 1.60 replaced 'serve --bg https / <target>' with a single
    # <target> argument. The old form does not degrade - it exits 1 with "the
    # CLI for serve and funnel has changed" and configures nothing.
    #
    # Spell the target as localhost rather than the bare-port shorthand: bare
    # '5173' means 127.0.0.1, but kiosk-server binds the hostname localhost and
    # on an IPv6-first machine listens on ::1 only, which 127.0.0.1 would miss.
    $r = Invoke-NativeTimed -Exe $exe -Arguments @('serve', '--bg', "http://localhost:$Port")
    if ($r.ExitCode -ne 0) {
        Write-Log "  WARNING: tailscale serve failed (exit $($r.ExitCode))"
        foreach ($l in ($r.Output -split "`n")) { Write-Log "  | $l" }
        if ($r.TimedOut -or ($r.Output -match 'not enabled on your tailnet')) {
            Write-Log '  Serve is disabled for this tailnet - an admin must enable it once,'
            Write-Log '  via the login.tailscale.com URL above. It sticks after that.'
        }
        Write-Log '  also check that HTTPS Certificates are enabled in the admin console'
        return
    }
    Write-Log '  tailscale serve configured'
}

<#
    Like Invoke-Native, but cannot hang the supervisor.

    'tailscale serve' blocks indefinitely when Serve is not yet enabled on the
    tailnet: it prints an enablement URL and waits for a human to click it.
    Set-TailscaleServe runs before Start-Kiosk, so an unbounded wait means the
    display never comes up at all. Remote access is optional; the screen is not.
#>
function Invoke-NativeTimed {
    param([string]$Exe, [string[]]$Arguments, [int]$TimeoutSeconds = 20)

    $outFile = [System.IO.Path]::GetTempFileName()
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
        $p = Start-Process -FilePath $Exe -ArgumentList $Arguments -NoNewWindow -PassThru `
                           -RedirectStandardOutput $outFile -RedirectStandardError $errFile

        # Read .Handle while the process is still alive. Start-Process -PassThru
        # hands back a Process that has not cached its OS handle, and once the
        # process exits the handle is gone and .ExitCode reads back empty - so
        # every success would compare -ne 0 and be logged as a failure. Touching
        # .Handle here retains it and makes .ExitCode readable afterwards.
        $null = $p.Handle

        if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
            # /T because the CLI may have spawned helpers while waiting.
            & taskkill '/F' '/T' '/PID' "$($p.Id)" 2>&1 | Out-Null
            $partial = (Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue)
            return [pscustomobject]@{
                ExitCode = -1
                Output   = (("timed out after $TimeoutSeconds s", $partial) -join [Environment]::NewLine).Trim()
                TimedOut = $true
            }
        }

        $text = (Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue),
                (Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue)
        return [pscustomobject]@{
            ExitCode = $p.ExitCode
            Output   = ($text -join [Environment]::NewLine).Trim()
            TimedOut = $false
        }
    }
    finally {
        Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

<#
    True only when `tailscale serve` is really proxying our port. A configured
    publicUrl states where the kiosk ought to be reachable, which is not
    evidence that it is - so the banner checks this on both paths.
#>
function Test-ServeProxying {
    $exe = Resolve-TailscaleExe
    if (-not $exe) { return $false }
    $serve = (& $exe serve status 2>$null) -join "`n"
    return ($LASTEXITCODE -eq 0 -and $serve -match [regex]::Escape(":$Port"))
}

function Resolve-TailscaleExe {
    $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
    if (Test-Path -LiteralPath $fallback) { return $fallback }
    return $null
}

<#
    Where this kiosk can be reached. Never throws: a missing or logged-out
    Tailscale must not be able to fail a deploy.
#>
function Get-KioskUrls {
    $urls = [ordered]@{ 'local' = "http://localhost:$Port" }

    # Same source of truth as the in-app menu, so the two cannot disagree.
    $configured = (Get-KioskConfig).PublicUrl
    if ($configured) {
        $urls['remote'] = $configured.TrimEnd('/')
        # Warn here too. Setting publicUrl used to skip this check entirely, so
        # the banner printed a clean URL for a proxy that was never configured.
        if (-not (Test-ServeProxying)) {
            $urls['remote'] += '   (WARNING: tailscale serve not proxying ' + $Port + ')'
        }
        return $urls
    }

    try {
        $exe = Resolve-TailscaleExe
        if (-not $exe) { return $urls }

        # Join first: a native command yields one array element per line, and
        # PS 5.1's ConvertFrom-Json would try to parse each line on its own.
        $raw = (& $exe status --json 2>$null) -join "`n"
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) { return $urls }

        $dns = ($raw | ConvertFrom-Json).Self.DNSName
        if (-not $dns) { return $urls }

        $urls['remote'] = 'https://' + $dns.TrimEnd('.')

        # Reachable only if `tailscale serve` is actually proxying this port.
        if (-not (Test-ServeProxying)) {
            $urls['remote'] += '   (WARNING: tailscale serve not proxying ' + $Port + ')'
        }
    }
    catch {
        # leave the local URL as the only answer
    }

    return $urls
}

function Write-KioskUrls {
    $urls = Get-KioskUrls
    Write-Log '  ----------------------------------------------------------'
    foreach ($name in $urls.Keys) {
        Write-Log ('   {0,-7} {1}' -f $name, $urls[$name])
    }
    Write-Log '  ----------------------------------------------------------'
}

function Stop-Kiosk {
    if ($script:Kiosk -and -not $script:Kiosk.HasExited) {
        Write-Log "  stopping kiosk (pid $($script:Kiosk.Id))"
        # /T kills the whole tree. Electron's GPU and renderer children can
        # outlive a bare Stop-Process, and an orphan holding port 5173 makes the
        # replacement exit instantly with EADDRINUSE.
        Invoke-Native -Exe 'taskkill' -Arguments @('/F', '/T', '/PID', "$($script:Kiosk.Id)") | Out-Null
        $script:Kiosk.WaitForExit(15000) | Out-Null
    }
    $script:Kiosk = $null

    # Don't hand the port to the next process until the old one has let go.
    for ($i = 0; $i -lt 20; $i++) {
        if (Test-PortFree -TcpPort $Port) { return }
        Start-Sleep -Milliseconds 500
    }

    Write-Log "  port $Port still busy after 10s"
    Stop-PortOwner -TcpPort $Port

    for ($i = 0; $i -lt 10; $i++) {
        if (Test-PortFree -TcpPort $Port) { return }
        Start-Sleep -Milliseconds 500
    }
    Write-Log "  WARNING: port $Port is still held - the kiosk will fail to start"
}

function Start-Kiosk {
    Stop-Kiosk

    # A half-finished npm ci can remove electron.exe. Restore it rather than
    # retrying a launch that cannot possibly succeed.
    if (-not (Test-Path -LiteralPath $ElectronExe)) {
        Write-Log '  electron.exe missing - repairing node_modules'
        Invoke-Step 'npm install' 'npm.cmd' @('install')
    }

    Write-Log '  starting kiosk'
    $script:Kiosk = Start-Process -FilePath $ElectronExe -ArgumentList '.' `
                                  -WorkingDirectory $RepoRoot -PassThru
}

function Invoke-Deploy {
    param([string]$TargetSha)

    # npm ci is slow, so only reinstall when the lockfile actually moved.
    $lockBefore = Get-GitOutput @('rev-parse', 'HEAD:package-lock.json')

    Invoke-Step 'git reset --hard' 'git' @('reset', '--hard', $TargetSha)

    $lockAfter = Get-GitOutput @('rev-parse', 'HEAD:package-lock.json')
    if ($lockBefore -ne $lockAfter) {
        # npm ci deletes node_modules before installing, so a failure here leaves
        # the tree empty - no vite to build with and no electron.exe to launch.
        # npm install repairs in place rather than leaving the kiosk stranded.
        try {
            Invoke-Step 'npm ci' 'npm.cmd' @('ci')
        }
        catch {
            Write-Log "  npm ci failed: $_"
            Write-Log '  falling back to npm install to repair node_modules'
            Invoke-Step 'npm install' 'npm.cmd' @('install')
        }
    }

    Invoke-Step 'npm run build' 'npm.cmd' @('run', 'build')

    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'dist\index.html'))) {
        throw 'build produced no dist/index.html'
    }

    # Only swap the running app once we know the new build exists.
    Start-Kiosk
    Set-Content -LiteralPath $StateFile -Value $TargetSha -NoNewline
}

# ---------------------------------------------------------------- startup ----

if ((Test-Path -LiteralPath $LogFile) -and ((Get-Item -LiteralPath $LogFile).Length -gt 5MB)) {
    Move-Item -LiteralPath $LogFile -Destination "$LogFile.old" -Force
}

Set-Location -LiteralPath $RepoRoot

Write-Log '=== kiosk supervisor starting ==='
Write-Log "repo: $RepoRoot"

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.env'))) {
    Write-Log 'WARNING: no .env found - the build will ship without Supabase config'
}

try {
    if (-not (Test-Path -LiteralPath $ElectronExe)) {
        Invoke-Step 'npm ci (first run)' 'npm.cmd' @('ci')
    }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'dist\index.html'))) {
        Invoke-Step 'npm run build (first run)' 'npm.cmd' @('run', 'build')
    }
    Set-TailscaleServe
    Start-Kiosk
    Write-KioskUrls
}
catch {
    Write-Log "startup failed: $_"
}

# ------------------------------------------------------------- watch loop ----

$LivenessSeconds = 5
$lastPoll = [datetime]::MinValue

while ($true) {
    Start-Sleep -Seconds $LivenessSeconds

    # Checked far more often than the git poll - a black screen should come back
    # in seconds, not on the next deploy tick.
    if (($null -eq $script:Kiosk) -or $script:Kiosk.HasExited) {
        Write-Log 'kiosk not running - starting'
        try { Start-Kiosk } catch { Write-Log "restart failed: $_" }
    }

    if (((Get-Date) - $lastPoll).TotalSeconds -lt $PollSeconds) { continue }
    $lastPoll = Get-Date

    try {
        $f = Invoke-Native -Exe 'git' -Arguments @('fetch', '--quiet', 'origin', $Branch)
        if ($f.ExitCode -ne 0) { throw "git fetch failed: $($f.Output)" }

        $remote = Get-GitOutput @('rev-parse', "origin/$Branch")

        # Compare against the last SHA we successfully deployed, not HEAD, so a
        # failed build is retried next poll instead of being stranded.
        if ($remote -ne (Get-DeployedSha)) {
            Write-Log "new commit $($remote.Substring(0, 7)) - deploying"
            Invoke-Deploy -TargetSha $remote
            Write-Log 'deploy complete'
            Set-TailscaleServe
            Write-KioskUrls
        }
    }
    catch {
        # Leave whatever is on screen running and try again next poll.
        Write-Log "deploy error: $_"
    }
}
