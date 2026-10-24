# MakePace

Research what works. Make it yours. Get ahead.

MakePace is a local content workspace with a Codex creative partner, website
research, batch review, a TikTok-style feed preview, and a connected publishing
queue. Brand: **MakePace**. Domain: **makepace.app**.

## Run

Desktop: `npm ci && npm run desktop`. Electron includes the local backend and
Codex. See [desktop setup and packaging](desktop/README.md).

Requires Node 20+, npm, and the Codex CLI for AI features.

The local prototype uses the user's existing Codex login. After a successful
connection, MakePace reconnects after app-server exits and on subsequent server
starts, using backoff from 1 to 30 seconds. Missing or rejected authentication
requires sign-in. Reconnection never replays an interrupted turn.

The installed PWA still requires this local backend. A public hosted/commercial
release must use an approved Sign in with ChatGPT integration or API-backed
inference with isolated user workspaces, rather than sharing this machine's
Codex login. Product authentication and cloud execution are not implemented yet.
See https://learn.chatgpt.com/docs/app-server#auth-endpoints and
https://developers.openai.com/siwc.

```sh
npm ci
npm run dev
npm test
```

- Landing draft: http://localhost:4885/
- App: http://localhost:4885/studio
- Feed: http://localhost:4885/feed

## Install as an app

Refresh restores an inert, per-tab visual snapshot before reconnecting the live
workspace. The cache lasts up to 30 minutes and is used only for the same workspace
and viewport size. It restores the view, selected batch/post, drafts and scroll
position; the server remains authoritative. It lives in sessionStorage and is
discarded when the tab session ends. Without a matching snapshot, a centered,
animated MakePace mark is shown (static with reduced motion).

Studio offers installation on the first visit. Chromium uses its native install
prompt when available; other browsers get platform instructions. “Continue in
browser” remembers dismissal, and the sidebar can reopen installation help.
Standalone launches do not show the offer. Production installation requires
HTTPS on run.makepace.app; localhost is supported for development.

The manifest starts at /studio, with a /studio-scoped service worker served at
/studio-sw.js. Deploy that worker at the same root path on the product host.
The worker caches only the generic offline reconnect page, never private
workspace content, chat, API responses or publishing operations. The installed
app still needs its backend. PNG icons are committed generated artifacts;
regenerate with Python 3 + Pillow using scripts/generate-app-icons.py.

Connect uses your existing local Codex login. New turns use GPT-6.1 Sol;
Standard/Fast can be changed in the interface. Website/social capture needs
Chrome (cached Puppeteer Chrome is detected, or set CHROME_PATH).

## Workspace separation

App code, design studies, fonts, and tests live here. If a sibling `../gd-gtm`
contains carousel output, it is connected as the Hey Mom workspace.
Override with `MAKEPACE_WORKSPACE_ROOT=/absolute/workspace/path`.
Without campaign data the app opens new-workspace onboarding.

Hey Mom's batches, format library, renderer scripts, credentials and OneUp
records remain in gd-gtm. They are not copied into this repository.
Its OneUp adapter supplies the queue; Codex batch work runs in that workspace.
This is currently a Hey Mom adapter, not a generic multi-brand publishing backend.

Local chat history and captured research live in ignored `.studio/`.
Credentials, node_modules, generated data, and environment files are ignored.
The server binds only to localhost. Do not deploy the local app server publicly:
it is not an authenticated hosted service.

## Landing and deployment

`landing/` contains the single-screen landing. It uses the app's self-hosted
brand/font assets under `scripts/studio/public/` and original generated artwork.
The Download MakePace CTA opens an OS-aware installer chooser. The public source
of download URLs is `landing/releases.json`; unavailable installers stay disabled.
Local development also offers Open local Studio inside the chooser.

Source repository: https://github.com/alonsosolisg/makepace (private).
The Desktop builds workflow produces Windows x64, macOS ARM64/Intel and Linux x64
installers, then assembles a static website-with-installers artifact. Deploy that
artifact to the website host; no public source repository is needed. Do not deploy
the local Studio server. Signing/notarization and hosting still need configuration.
Run `node scripts/build-site.mjs` for a landing-only bundle, or supply an installer
directory to generate download URLs and SHA-256 checksums for all four artifacts.

## Identity

See `design/makepace/DECISIONS.md`: logo 09, Manrope, porcelain/turquoise.
Earlier name and palette explorations are preserved under `design/`.
