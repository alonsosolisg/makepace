# MakePace

Build the product here; Hey Mom is an external connected workspace, not the
product's identity. Do not move its campaign assets, credentials or schedules
into this repository.

- Name: MakePace. Domain: makepace.app.
- Manrope only, Phosphor icons, approved logo 09.
- Palette and identity source: design/makepace/DECISIONS.md.
- Use native apply_patch for handwritten source edits.
- Keep .studio, environment secrets and campaign data out of Git.
- Publishing requires explicit authorization. Never infer it from stored history.
- The local Codex app server is not safe for public hosting without authentication.
- Run npm test for backend changes. Check visual changes in a browser and show
  screenshots plus focused actual diff excerpts.
