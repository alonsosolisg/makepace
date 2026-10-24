# Internal research source routes

Maintained 2026-10-24. This is harness guidance, not a UI directory or a set of
verified winners. Public landing pages and documentation were checked where
noted; that does not mean authenticated access or a working connector was tested.
Recheck availability for each task. Never imply a stored key means a tool exists.

## Choose a route

1. Extract the audience, situation, language and market from workspace knowledge.
2. For organic formats, start with VideoDatabase, Imaiger and original creators.
   Search both niche vocabulary and the audience's actual situation. Use web
   queries such as `site:tiktok.com/@ "AUDIENCE PHRASE"` and
   `site:instagram.com/reel/ "SITUATION"`. Search snippets are leads, not evidence.
3. Open the original post, inspect every slide or watch the video, and collect
   dated metrics and comments. Use a connected browser or available Apify tool
   when plain web extraction cannot show the content. One failed profile is not
   a reason to stop researching the niche.
4. Use forums and comments for audience language; trends for demand/timing;
   ads for persuasion references. Keep these evidence classes separate.
5. Use owned analytics to validate the workspace's results. Never invent private
   competitor saves, retention, reach, conversions or post-attributed followers.

Try a small, relevant shortlist, not every source. Start with existing tools and
public routes. Skip unavailable paid tools and record the limitation; do not buy
plans, install connectors or change authentication as part of ordinary research.
For scraper runs inspect the current schema, set explicit result/cost bounds,
deduplicate URLs and reuse recent datasets. Never repeatedly retry a hard limit.

## Organic formats and original evidence

| Source                                                                        | Route and access                                                                                                                                                        | Useful for / evidence limit                                                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [VideoDatabase](https://videodatabase.io/)                                    | Public indexed format, concept, topic, hook and creator pages; interactive pages may need browser. Landing page checked.                                                | Short-form structures and creator leads. Library performance claims require original-post verification.                                             |
| [VideoDatabase MCP](https://videodatabase.io/mcp/install)                     | Documented beta endpoint `https://videodatabase.io/mcp`; local clients require scoped bearer token from Profile Settings. Docs checked, connector not installed/tested. | Search analyzed examples and read their Video DNA. Use only if a callable authenticated connector exists; public pages remain fallback.             |
| [Imaiger slideshows](https://imaiger.com/slideshows)                          | Public category directory checked; individual examples may require browser.                                                                                             | Carousel sequencing and visual recipes. Templates are not observed successful posts. Follow original links where available.                         |
| [TikTok](https://www.tiktok.com/)                                             | Native search, creator profiles, video/photo and sound pages. Login, region and anti-bot behavior vary; inspect actual availability.                                    | Full sequence, caption, sound, dates, visible engagement and comment language. Public metrics are snapshots.                                        |
| [Instagram](https://www.instagram.com/)                                       | Native search, profiles, `/p/` and `/reel/` originals; browser/login may be needed.                                                                                     | Carousel design, Reels, captions and visible discussion. Hidden likes and private insights remain unknown.                                          |
| [YouTube](https://www.youtube.com/)                                           | Public search, Shorts, channels and comments; browser fallback.                                                                                                         | Storytelling, hooks, spoken language and audience objections. Keep Shorts separate from long-form benchmarks.                                       |
| [YouTube Data API](https://developers.google.com/youtube/data/reference/rest) | Official docs checked; API key or OAuth, quota, actual connector required.                                                                                              | Structured search/video statistics/comment threads. This is not an owned-retention analytics API.                                                   |
| [Apify TikTok actor](https://apify.com/clockworks/tiktok-scraper)             | Actor listing checked: `clockworks/tiktok-scraper`. Account/token and usage budget; inspect current input/output first.                                                 | Profile/post discovery, visible engagement and music metadata. Comments may need a separate actor. Do not assume all media or metrics are returned. |
| [Apify Instagram actor](https://apify.com/apify/instagram-scraper)            | Actor listing checked: `apify/instagram-scraper`. Account/token and budget; current schema determines capabilities.                                                     | Public profiles, posts, carousels, Reels and comments. Validate missing fields and inspect media, not just scraped text.                            |

## Audience language, questions and demand

| Source                                                                                                                     | Route and access                                                                                                                                           | Useful for / evidence limit                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Reddit](https://www.reddit.com/)                                                                                          | Public subreddit/thread search or browser; [API documentation](https://www.reddit.com/dev/api/) checked. API use requires current access eligibility/auth. | First-person situations, objections and comment triggers. Self-selected discussions do not establish market prevalence. Anonymize sensitive examples.    |
| Original social comments                                                                                                   | Inspect relevant top AND recent comments/replies using original pages or a supported scraper.                                                              | Code why people respond: identification, disagreement, advice, requests, stories. Quote sparingly with permalink; a count alone cannot explain comments. |
| Public niche forums and Q&A                                                                                                | Discover named communities with web search; open original threads, use only accessible public pages.                                                       | Specialist vocabulary and unresolved problems. Never enter private groups or use private customer material without authorization.                        |
| [Google Trends](https://trends.google.com/trends/)                                                                         | Public page checked; interactive Explore may need browser; record geography, period and query/topic choice.                                                | Relative demand and seasonality, not absolute volume or guaranteed social reach.                                                                         |
| [Pinterest Trends](https://trends.pinterest.com/)                                                                          | Endpoint opened but no readable data returned in web extraction; browser/account and regional coverage need checking.                                      | Visual search themes and seasonality when accessible. Not verified TikTok performance.                                                                   |
| [TikTok Creator Search Insights](https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights) | Official help fetch blocked in this check. Treat as an in-app candidate, verify eligibility and access before relying on it.                               | Search-demand/content-gap investigation when available; not a generic public API.                                                                        |
| [AnswerThePublic](https://answerthepublic.com/en)                                                                          | Public landing page checked; queries/quotas may require account or plan.                                                                                   | Question phrasing and topic discovery, not actual social comments or performance proof.                                                                  |
| Workspace reviews and support exports                                                                                      | Authorized local files, interviews, product reviews and feedback supplied by the workspace owner.                                                          | Strong audience vocabulary and objections. Keep personal data private; distinguish anecdote from representative evidence.                                |

## Ads and commercial persuasion references

Keep these labelled PAID CREATIVE. An ad running for a long time does not prove
profitability. Never transfer ad metrics into an organic-format leaderboard.

| Source                                                                    | Route and access                                                                                                               | Useful for / evidence limit                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [TikTok Creative Center](https://ads.tiktok.com/business/creativecenter/) | Public shell/official guide checked; some trends/features require login. Current music URL redirects to Creative Suite Trends. | Top Ads, trends, hooks and regional sound discovery. Separate paid examples from organic trend examples.                   |
| [Meta Ad Library](https://www.facebook.com/ads/library/)                  | Public indexed ad page readable in this check; live search may need browser. Set country/category.                             | Advertiser creatives, claims and visible dates. Do not infer conversions, targeting or spend beyond fields actually shown. |
| [Google Ads Transparency Center](https://adstransparency.google.com/)     | Public shell checked; interactive browser required for meaningful search.                                                      | Advertiser creative and messaging references, not organic engagement.                                                      |
| [Foreplay](https://www.foreplay.co/)                                      | Public product page checked; Discovery/Spyder are account/plan-dependent, not tested here.                                     | Saved ad references, competitor creative and hook organization when already connected.                                     |
| [Pipiads](https://www.pipiads.com/)                                       | Public product page checked; results/export depend on account/plan, not tested here.                                           | TikTok/Meta ad discovery. Estimated/vendor metrics must remain labelled estimates.                                         |

## Sound and production assets

| Source                                                                                                          | Route and access                                                                                              | Useful for / evidence limit                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TikTok original sound pages and [Creative Center trends](https://ads.tiktok.com/creative/creativeCenter/trends) | Public/login browser as available; trends shell checked.                                                      | Observe sound ID, title, creator, mood, region and original usage. Popularity does not establish licensing or OneUp compatibility. |
| TikTok Commercial Music Library / connected OneUp music search                                                  | Use available native library/integration; check destination account, territory, placement and exact sound ID. | Eligible publishing tracks. Listening samples, scraped audio and title matches are not publishing IDs or rights proof.             |
| [Pexels](https://www.pexels.com/license/)                                                                       | Public license checked; API needs key.                                                                        | Real photos/video when the brief allows them. Save asset page, creator and license; avoid implied endorsement.                     |
| [Unsplash](https://unsplash.com/license)                                                                        | Public license page checked; distinguish free and Plus assets, API-specific terms.                            | Photo references/assets; not evidence that a format performs. Respect workspace preferences against stock aesthetics.              |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)               | Public reuse guidance checked; per-file license and attribution vary.                                         | Real places/objects and documentary assets. Check each file's license rather than treating all as public domain.                   |

## Owned performance and recording findings

Use TikTok Studio, Instagram Insights, authorized analytics exports or a connected
analytics API for private metrics. OneUp queue status is delivery evidence, not
audience performance. Inspect the actual available fields before promising data.

For every useful source record URL, creator, original vs library, organic vs paid,
access route, observation time, publication date if available, region/language,
media inspected, metrics with denominators and unavailable fields. Keep failures
in a concise access log so subsequent turns do not repeat dead ends.

Save readable research in Markdown plus `research-evidence.json` per
MAKEPACE-RESEARCH.md. Register the readable deliverable per MAKEPACE-OUTPUTS.md.
Keep this directory and access plumbing out of the UI; show the actual cited
examples and meaningful limitations in the user's research output.
