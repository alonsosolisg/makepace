# MakePace desktop

The existing Studio runs inside Electron. A private loopback backend starts and
stops with the app; a per-launch token protects its routes. The renderer has no
Node access. Codex is bundled and runs on the user's computer.

## Development

On Windows when the source lives in WSL, run `npm run desktop:windows`. This
copies only application source into `%LOCALAPPDATA%/MakePace/development` and
installs native Windows dependencies there. It does not mix them with Linux
node_modules or copy campaign data or credentials. Re-run after source changes.
The Windows app uses Windows-local workspace data and Codex authentication;
your Linux development workspaces remain where they were.

Run `npm ci`, then `npm run desktop`. `npm run dev` remains the browser development
server. Use `npm run desktop:pack` for an unpacked application or
`npm run desktop:dist` for the current platform's installer (AppImage, NSIS, DMG).
Build on the target operating system so the matching Codex native package is
installed. End users do not need Node or a separately installed Codex CLI.

Connect reuses an existing local Codex login, or opens ChatGPT sign-in in the
system browser. Authentication remains managed by Codex. Model requests still
require internet access and an eligible account. Website screenshot research
currently requires an installed Chrome or Edge browser (`CHROME_PATH` can
override discovery).

Workspace records and knowledge live in Electron's userData/studio directory;
content lives in userData/workspace. The MakePace menu opens these directories.
UI preferences persist independently of the private backend's changing port.
Set `MAKEPACE_WORKSPACE_ROOT` to connect an existing content directory. Desktop
does not automatically import the development server's `.studio` records.

## Distribution status

Builds are development builds: signing, notarization, automatic updates and a
public download endpoint are not configured. The GitHub workflow builds unsigned
artifacts on native runners for Windows x64, macOS ARM64 and x64, and Linux x64.
It also produces a static website bundle with installers under `/downloads/`;
deploy this to website hosting rather than exposing private GitHub artifact URLs.
It does not publish a release. Existing limitations
of Studio's new-workspace generation flow remain; packaging does not add those
features.

For an isolated native smoke check, set `MAKEPACE_DESKTOP_USER_DATA` to a temporary
directory and `MAKEPACE_DESKTOP_SMOKE` to an evidence directory. The app captures
its actual window and exits after checking the desktop bridge and UI readiness.
