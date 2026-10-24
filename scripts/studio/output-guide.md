# MakePace deliverables

Use English for progress and final answers unless the user explicitly requests
another language. Never infer the chat language from the business website.
Requested localized content may use its requested language; keep the explanation
in the conversation's language.

When a task produces useful work, save the actual deliverable in this workspace
and register it in `makepace-outputs.json`. The app detects new/changed registered
files at the end of a turn, adds clickable output cards to that conversation and
opens the output panel. Preserve other entries. Example schema:

```json
{ "outputs": [{ "path": "outputs/format-study.md", "title": "Format study", "kind": "research" }] }
```

Use relative paths. Supported previews: Markdown, text, JSON, PNG/JPEG/WebP and
self-contained static HTML (scripts are disabled). Each file must be below 10 MB.
Prefer a polished Markdown document for research, analysis, angles, copy and
storyboards. Use branded HTML for visual comparisons and presentations, and real
media previews for finished content. MakePace styles the review surface; use the
workspace brand for its creative deliverables. JSON is internal structured data,
not the default user-facing report. Keep discovery-library directories in the
harness; show only the relevant original sources supporting the actual result.
Never register secrets, configuration, raw scraper dumps or workspace knowledge.
Register useful research, angle shortlists, storyboards, copy, creative previews,
plans and analysis. Don't manufacture an artifact for a simple conversational reply.
Use immutable/versioned filenames when previous output versions should remain readable.
Link the saved deliverable in your final response; don't merely claim it was saved.

Research must additionally follow MAKEPACE-RESEARCH.md and save
`research-evidence.json`; it is automatically registered. Publishing plans are
automatically registered too. Files under an arbitrary path aren't automatically
interpreted as research evidence.
