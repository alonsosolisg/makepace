# Vercel website and installer delivery

Import the private `alonsosolisg/makepace` repository into Vercel. Keep the root
directory at the repository root; `vercel.json` builds only the static landing
into `dist/site`. Add `makepace.app` in the project's Domains settings and follow
the DNS records Vercel supplies. Do not deploy the local Studio backend.

Create a **public Vercel Blob store** attached to the website project. Keep the
Blob write token in Vercel/GitHub secret storage, never in the browser or Git.

1. Run the Desktop builds workflow in GitHub Actions.
2. Download the four installer artifacts. Check builds and platform smoke tests
   before public release. Current builds are unsigned development builds.
3. Upload versioned installer files to the public Blob store (use multipart
   upload for large files). Do not overwrite an existing released version.
4. Set the four URLs in `landing/releases.json` to the returned public HTTPS Blob
   URLs and set `version`. Commit that manifest to deploy the download links.
5. Test each URL without being signed into GitHub/Vercel, verify file hashes and
   test installation on the matching OS. Keep older versions available for rollback.

The dialog detects the OS, but asks the user to choose Intel vs Apple Silicon
because browser OS detection is not a reliable processor detector. Downloads are
direct from Blob; they do not pass through a Vercel Function or the local app.

`node scripts/build-site.mjs <installer-directory>` remains an alternative bundle
for hosts that serve installers as ordinary static files. Do not upload that large
combined bundle as the Vercel website; use the landing-only build and Blob URLs.

References: https://vercel.com/docs/vercel-blob and https://vercel.com/docs/limits
