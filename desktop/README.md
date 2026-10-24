# Desktop development

Electron hosts Studio with a private loopback backend and per-launch token.
The renderer has context isolation and no Node access. Codex runs locally with
the user's authentication. Reconnection retries the transport, never interrupted turns.

Use Node 22.18+ on the 22.x line, `npm ci`, then `npm run desktop`.
`npm run desktop:pack` creates an unpacked app; `npm run desktop:dist` builds the
current platform's installer. See [releasing](../docs/RELEASING.md).

## Windows from WSL

Run `npm run desktop:windows`. The launcher mirrors source into
`%LOCALAPPDATA%/MakePace/development`, installs Windows dependencies, compiles
TypeScript and opens native Windows Electron. Linux dependencies, credentials
and campaign data are not copied. Re-run after source changes. Windows provider
authentication and workspaces are separate from Linux development.

## Paths and configuration

Installed metadata lives in Electron `userData/studio`, content in
`userData/workspace`. Browser development uses ignored `.studio/` and
`data/workspace/` in this repository. The MakePace menu opens data directories.

| Variable                     | Purpose                                 |
| ---------------------------- | --------------------------------------- |
| `MAKEPACE_WORKSPACE_ROOT`    | Explicit external content directory     |
| `MAKEPACE_DATA_ROOT`         | Development metadata directory          |
| `MAKEPACE_DESKTOP_USER_DATA` | Override all desktop data               |
| `MAKEPACE_CODEX_PATH`        | Override provider executable            |
| `CHROME_PATH`                | Chrome/Edge executable for capture      |
| `COMMUNITY_PREVIEW_PORT`     | Development port, default 4885          |
| `MAKEPACE_AUTO_CONNECT=0`    | Disable automatic provider reconnection |

## Smoke testing

Set `MAKEPACE_DESKTOP_USER_DATA` to a temporary directory and
`MAKEPACE_DESKTOP_SMOKE` to an evidence directory, then start desktop. It captures
the actual window and exits after checking the bridge and UI readiness.
From WSL use `powershell.exe -NoProfile -ExecutionPolicy Bypass -File desktop/run-windows.ps1 -Smoke`.
Never use private client data in screenshots.

Only `dist/site` is publicly hosted. PWA support remains a development convenience
requiring the local server, not a hosted product. Initial installers are unsigned;
updates use a manual GitHub download and preserve local data.
