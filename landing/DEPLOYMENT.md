# Vercel website and installer delivery

Import the private `alonsosolisg/makepace` repository into Vercel. Keep the root
directory at the repository root; `vercel.json` builds only the static landing
into `dist/site`. Add `makepace.app` in the project's Domains settings and follow
the DNS records Vercel supplies. Do not deploy the local Studio backend.

Use Cloudflare R2 Standard storage for installers. Vercel hosts only the landing.
Do not use Vercel Blob for these installers: the initial release already exceeds
its 1 GB free storage allowance and 10 GB transfer covers very few downloads.

## Free-tier safeguards

The user requires capped usage, not just billing alerts. The private bucket and
read-only gateway are deployed. Never describe R2 as having an automatic
zero-dollar account spending cap. Cloudflare budget alerts do not stop usage.

- Keep R2 public access disabled (both r2.dev and direct bucket custom domains).
  Downloads must go through a read-only Worker, with no public bypass.
- Verify the account is on Workers Free before enabling downloads. Its hard
  100,000 requests/day limit bounds reads to at most 3.1 million in 31 days when
  the gateway performs at most one R2 read per request. Use fail-closed routing.
  A paid Workers plan invalidates this bound and must block deployment until
  an independent hard request quota exists.
- The gateway may only GET/HEAD allowlisted installer objects, never list or
  write objects. No retry loop or extra R2 metadata read per download.
- `infra/downloads/publish.mjs` checks account storage metrics (including uploaded
  and published payload/metadata), adds the complete release size conservatively,
  and refuses projected storage above 8,000,000,000 bytes. It refuses other
  account buckets, missing metrics, duplicate release keys, and overlapping local
  publishers. This initial-release uploader does not support replacing releases.
- The uploader queries ALL observed R2 operations for the billing period and
  refuses publishing at 100,000 operations, leaving substantial Class A margin.
  Analytics is delayed and sampled, so this is a conservative release guard,
  not an exact billing meter or a hard account-wide cap. Uploads are serialized,
  with no application-level retries. No automatic release deletion occurs.
- R2 allowances are shared across the account. Other apps, dashboard uploads,
  S3 clients, and API credentials can bypass our controls. Inspect these before
  claiming account-wide protection; do not automatically upgrade any plan.
- Before future releases, review billing-period storage history and outstanding
  multipart uploads, not just the delayed metrics. This first release used a
  newly activated account with zero objects and no pre-existing buckets.
- Recheck the official allowances before each release. These values were checked
  on 2026-10-24, not dynamically synced. Pricing changes require review.

Published R2 Standard allowances: 10 GB-month storage, 1 million Class A and
10 million Class B operations per month; internet egress is free. Storage is a
monthly average of daily peaks, not just the current inventory. Existing usage
earlier in the billing period must also be checked.

## Commands and deployed resources

- Bucket: `makepace-installers`, Standard, direct public access disabled.
- Gateway: `https://makepace-downloads.alonsosniper.workers.dev`.
- Config/code: `infra/downloads/`; its dependencies are separate from the desktop.
- Preflight: `node infra/downloads/publish.mjs`.
- Initial upload: `node infra/downloads/publish.mjs --upload` (refuses existing keys).
- Gateway: `cd infra/downloads && npm ci && npm run check && npm run deploy`.
- Tests: `npm test` at repository root.

The gateway allows only the four versioned filenames, streams responses, supports
single byte ranges, and never writes or lists R2. Invalid paths/methods/ranges
are rejected before storage access. The `workers.dev` endpoint has no fallback
origin: when the Free daily quota is exhausted, downloads stop until reset.
Keep the account on Workers Free; changing its plan invalidates this ceiling.

## Release flow

1. Run the Desktop builds workflow in GitHub Actions.
2. Download the four installer artifacts. Check builds and platform smoke tests
   before public release. Current builds are unsigned development builds.
3. Verify and enforce the safeguards above, then upload versioned installer files
   to the private R2 bucket. Do not overwrite an existing released version.
4. Set the four URLs in `landing/releases.json` to the guarded HTTPS download
   gateway URLs and set `version`. Commit that manifest to deploy the links.
5. Test each URL without being signed into GitHub/Vercel, verify file hashes and
   test installation on the matching OS. Keep older versions available for rollback.

The dialog detects the OS, but asks the user to choose Intel vs Apple Silicon
because browser OS detection is not a reliable processor detector. Downloads are
served by the download gateway; they do not pass through Vercel or the local app.

`node scripts/build-site.mjs <installer-directory>` remains an alternative bundle
for hosts that serve installers as ordinary static files. Do not upload that large
combined bundle as the Vercel website; use the landing-only build and gateway URLs.

References:
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/billing/manage/budget-alerts/
