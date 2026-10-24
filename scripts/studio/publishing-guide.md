# MakePace publishing contract

Use Publishing → Load OneUp to fetch live accounts and queue. MakePace writes
`publishing-context.json` here with this read-only context, without credentials.
Select the intended category and account in Publishing. Never assume a destination.

Prepare `publishing-plan.json` in this workspace. This is a proposed plan, not
authority to publish. The user reviews it in Publishing and confirms a native
desktop dialog before uploads or scheduling. Do not call OneUp directly or seek keys.

```json
{
  "timezone": "Europe/Tallinn",
  "items": [
    {
      "id": "post-01",
      "kind": "image",
      "caption": "The approved caption",
      "scheduledAt": "2026-12-01T14:37:00+02:00",
      "media": ["exports/post-01/01.jpg", "exports/post-01/02.jpg"],
      "aiGenerated": false,
      "ownBrand": true,
      "paidPartnership": false,
      "autoAddMusic": true
    }
  ]
}
```

- Use actual future dates, approved exports and captions. Confirm the IANA timezone
  matches the selected account's OneUp timezone; the API accepts account-local times.
- Read the live queue; do not overwrite existing posts. Follow the user's cadence,
  spacing, daily counts and platform scope. Keep proposed slots stable on retry.
- One plan targets one explicitly selected account. Prepare separately for another
  account/platform so crops, captions and disclosures are reviewed independently.
- 1–100 posts. `kind` is image or video. Images are ordered JPEG/PNG (8 MB each).
  Video is one MP4 (100 MB). Use paths relative to this workspace, no symlinks out.
- Set all three disclosure booleans explicitly according to the actual content.
- TikTok images need either `autoAddMusic: true` or a `music` object with ALL five
  strings: `music_title`, `music_author`, `music_sound_id`, `music_url`,
  `music_thumbnail`. Preserve native sound IDs as strings. Use verified sound
  metadata and account-appropriate music; never substitute an Apple listening sample.
  OneUp receives both direct fields and musicOption for compatibility.
- Instagram image music is not supported here. Videos retain their embedded audio.
- Uploading uses OneUp's uploadmedia API (not available on its Basic plan).
- Publishing → Review schedule validates files and binds their hashes to the plan.
  Editing the file or exports invalidates that review. Keys remain in desktop storage.
- Receipts stay in MakePace app data. A timeout after creation is unresolved, not
  permission to retry. Inspect OneUp; do not change IDs to bypass the submission guard.
- Queue verification confirms IDs, captions, times and media count. Native music,
  disclosure labels and successful publication still need their own verification.

Docs checked 2026-10-24:

- https://docs.oneupapp.io/docs/creating-posts/create-image-post/
- https://docs.oneupapp.io/docs/creating-posts/create-video-post/
- https://docs.oneupapp.io/docs/creating-posts/upload-media/upload-via-code/
