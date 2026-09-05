# Kiosk setup (DreamQuest)

The kiosk runs the **production build**: Electron serves `dist/` from a ~60-line
static file server inside its own main process and points the window at
`http://localhost:5173`. No Vite, no HMR, no second Node process — just the one
minified bundle.

`scripts/kiosk.ps1` supervises it. Once it is running, it:

- launches the kiosk window, and **relaunches it within ~5 seconds if it dies**
  — crash, stray `Ctrl+Shift+Q`, anything;
- polls `origin/main` every two minutes and, when the branch moves, resets to it,
  reinstalls dependencies if `package-lock.json` changed, rebuilds, and restarts
  the window;
- takes ownership of port 5173, killing whatever else is holding it.

Electron additionally reloads its own renderer if that process crashes or hangs,
so a wedged page recovers without waiting for the poll.

Nothing else is required for a merge to `main` to reach the screen.

## Why it serves over http instead of loading dist/ off disk

Two reasons, both of which will bite you if you "simplify" this later:

1. **Chromium blocks `<script type="module">` over `file://`.** The module sits
   at an opaque origin, so the fetch fails CORS and never executes — with or
   without `crossorigin`. Vite always emits a module script, so
   `win.loadFile('dist/index.html')` gives you a white screen. (Classic scripts
   do work over `file://`, which is why an IIFE build is the other way out.)

2. **`localStorage` and IndexedDB are partitioned by origin.** The iCloud photo
   cache and the per-day calendar photos live only in the browser storage of
   `http://localhost:5173` — the Vite dev server's origin. There is no server
   copy of the per-day photos. Serving the production build on that exact same
   scheme/host/port means all of it survives the switch. Moving to `file://`, a
   custom `app://` scheme, or even `127.0.0.1:5173` silently orphans the lot.

If you ever need to change the port, export the photos first.

## Why not GitHub Actions

A self-hosted runner installed as a Windows service runs in **session 0**, which
has no desktop. It can build fine, but it cannot launch or restart a GUI app on
the monitor. The supervisor script sidesteps this by running in the logged-in
session, and needs no runner registration, PAT, or inbound network access.

## One-time setup

### 1. Config

```powershell
cd C:\path\to\calendar-tron
copy .env.example .env
notepad .env          # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Vite inlines these at build time, so a missing value bakes `undefined` into the
bundle and the app white-screens on `createClient`. `.env` is gitignored and the
supervisor uses `git reset --hard`, which leaves untracked files alone — so it
survives every deploy.

### 2. Make sure git can fetch unattended

The supervisor never prompts. If the repo is private, cache the credential once:

```powershell
git config --global credential.helper manager
git -C C:\path\to\calendar-tron fetch origin main    # authenticate once
```

Re-run that `fetch` and confirm it completes without a prompt before moving on.

### 3. Verify it runs by hand

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\kiosk.ps1
```

You do **not** need to stop a kiosk you already started by hand. The supervisor
owns port 5173: if anything else is listening on it — a manually launched kiosk,
a stray `npm run dev`, an orphaned Electron child — it waits 10s, then kills the
owning process and takes over.

The kiosk should come up fullscreen. **`Ctrl+Shift+Q` quits it** — the window
otherwise ignores close requests on purpose. `Ctrl+C` in the terminal stops the
supervisor.

Progress is written to `kiosk.log` in the repo root (rotated at 5 MB).

On the first poll after a fresh install there is no `.kiosk-deployed` yet, so the
supervisor does a full deploy — reset, build, relaunch — even if the repo is
already up to date. That is expected, and it happens once.

### 4. Start it at logon

Task Scheduler → **Create Task** (not "Create Basic Task"):

- **General** → *Run only when user is logged on* ← required; do not pick "Run
  whether user is logged on or not", that is the session 0 trap above.
- **Triggers** → New → *At log on*, your user.
- **Actions** → New → Start a program:
  - Program: `powershell.exe`
  - Arguments: `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\path\to\calendar-tron\scripts\kiosk.ps1"`
- **Settings** → uncheck *Stop the task if it runs longer than*; check
  *If the task fails, restart every 1 minute*.

Then set the machine to log in automatically (`netplwiz` → uncheck "Users must
enter a user name and password") so it recovers from a power cut on its own.

The two-minute-shortcut alternative: drop a shortcut to that same command into
`shell:startup`. You lose the automatic restart-on-failure.

## Day to day

Push to `main`. Within two minutes the DreamQuest resets to that commit,
reinstalls dependencies only if `package-lock.json` changed, rebuilds, and
relaunches the window.

If a build fails, the running app is left alone and the deploy is retried on the
next poll — the last successfully deployed SHA is tracked in `.kiosk-deployed`,
not in `HEAD`, so a broken commit can't strand the kiosk on a half-deploy.

Adjust `$PollSeconds` at the top of the script to taste.

> **`git reset --hard` discards local commits and edits in the kiosk's working
> tree.** Anything you changed directly on the DreamQuest is gone on the next
> deploy. Commit and push it from there first if you want to keep it.

## Working on the machine itself

To point the Electron window at a dev server instead of the built bundle:

```powershell
$env:KIOSK_DEV_URL = 'http://localhost:5173'
npm run dev          # in one terminal
npm run electron     # in another
```

With `KIOSK_DEV_URL` set, Electron skips its own static server and drops out of
kiosk mode so you get a normal window. Stop the supervisor task first, or it
will fight you for the screen and the port.

`npm run kiosk` builds and launches in one step.
