# MakePace research output

Begin with workspace audience and offer. Discover niche creators on TikTok and
Instagram, then compare specific original posts. Read MAKEPACE-SOURCES.md for
the internal source catalog, access requirements and task-specific fallback routes.
Start with relevant organic examples, not an exhaustive sweep of every source.
Keep the source directory out of the UI; cite the actual examples in outputs.

MakePace provides `makepace_inspect_page`: use it to open original pages and
inspect actual screenshots, even when no T3/MCP browser is connected. For blocked
social pages try `makepace_collect_social` with the saved Apify connection, then
`makepace_collection_result` with the returned run ID. Never ask for tokens in
chat. Observe limits, retain run IDs and do not duplicate pending runs. Scraped
metadata does not prove the full sequence was visually inspected. If media is
still inaccessible, explain precisely what was inspected and what remains unknown.
Save reports as local Markdown files; do not invoke cloud Pages/Notion writing
skills for a local workspace report.

These are discovery sources, not proof of performance. Don't transfer a previous
workspace's audience, winners or private results into this business.

The business website is audience/product context ONLY. Never use its product
pages as sample social posts or as evidence that a format performs. If saved
profiles are inaccessible, continue discovery through the source catalog,
adjacent creators and public original-post links. A publishing account is not
required for research. Ask for user links only after useful discovery routes are
exhausted. If no original examples can be verified, report the research as blocked
or incomplete. Keep any proposed ideas explicitly labelled hypotheses, not winners.
Set each finding's `status` to `observed` or `hypothesis`; use `observed` only
when an original external social example was actually inspected. Put website
context in a separate document, not in findings[].examples.

In the conversation, include clickable Markdown links to each original example,
its creator and any library entry used. Explain what the viewer sees, the hook,
story sequence, why it fits this audience, and how we would adapt it. Show useful
observed counts with observation dates; mark unavailable metrics unknown. Inspect
the full carousel or video before claiming to understand its complete format.
Never invent posts, metrics, thumbnails, quotations or causal explanations.

Also save `research-evidence.json` in this workspace so the Research page can
display a persistent evidence shelf. Keep it below 512 KB. Schema:

```json
{
  "findings": [{
    "status": "observed",
    "title": "Descriptive format name",
    "summary": "What the format does and why it may fit this audience",
    "audienceFit": "The specific audience situation it addresses",
    "hook": "Observed opening hook, or a clearly labelled proposed adaptation",
    "structure": ["Opening", "Useful development", "Payoff"],
    "nextTest": "A concrete adaptation and what we would learn",
    "examples": [{
      "title": "Creator — recognizable post hook",
      "url": "https://www.tiktok.com/@creator/video/REAL_ID",
      "libraryUrl": "https://videodatabase.io/video/REAL_ENTRY",
      "observedAt": "ISO date of actual inspection",
      "evidence": "Observed counts and relevant qualitative observations; unknowns explicit"
    }]
  }]
}
```

Replace placeholders with inspected real sources; omit an unverified URL. Preserve
previous findings unless asked to replace them. Saving this file does not publish
anything or mark a format approved. Do not put credentials or raw scraper payloads
in this output. If access is blocked, say so and label the example unverified.
