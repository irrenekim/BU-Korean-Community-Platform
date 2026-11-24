# Post photos

Adds up to five photos to posts in Academics, Sports and Housing. Existing filters,
comments, follower notifications and sports events are kept.

## Limits and behavior

- JPG, PNG and WebP input only. HEIC, GIF, SVG and videos are not supported.
- Resize in the browser, preserving aspect ratio, to a maximum long edge of 1920px.
- Re-encode as WebP at quality 0.85, then 0.70/0.55 if needed to fit 5 MiB
  (5,242,880 bytes). Browsers without WebP encoding fall back to PNG.
- The **uploaded result**, not the original phone photo, must be at most 5 MiB.
  To bound browser processing, sources are limited to 30 MiB and 60 megapixels.
- Re-encoding flattens animation and discards original metadata, including EXIF.
- Preview selected photos, remove selections, and add/remove photos when editing.
- Saving uploads the photos first and then writes their paths with the post.
  A failed save keeps the form and reuses known successful uploads on retry.
- Database constraints/trigger enforce at most five distinct, existing photos
  belonging to the post author. The bucket also enforces file size and MIME types.
  Resizing/encoding is a browser optimization, not a server dimension validator.

## Required setup (once per database)

1. Apply `supabase/migrations/20261123000000_post_images.sql` in the Supabase
   project's SQL Editor. Paste the **whole file**, including `begin` and `commit`.
   Do not rerun `schema.sql`. The migration adds a column and a private bucket;
   it does not delete posts, comments, events or any existing rows.
2. Confirm Storage contains a **private** `post-images` bucket, with size limit
   5,242,880 bytes and allowed MIME types `image/jpeg,image/png,image/webp`.
3. Existing Clerk/Supabase integration and the session token's `email` claim
   must be configured, just as for creating posts. No service-role key is needed.
4. Deploy the application after the migration. Ensure the deployment has
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` configured.
   Never commit `.env.local` or real secret values.
5. Users can select photos in Create a post / Edit your post. Opening a photo
   uses a signed URL valid for one hour; URLs refresh while the feed stays open.

This migration is versioned and should be applied once. If the bucket or column
already exists, stop and inspect your database rather than deleting existing data.
Store credentials only in your development/deployment environment settings.

## Privacy and storage lifecycle

The private bucket allows authenticated BU students to read photos attached to
posts they can read. Authors may also read their own pending uploads. Clients
cannot overwrite or delete stored objects. A signed URL is a temporary bearer
link: someone it is shared with can use it until expiry.

Removing a photo detaches it from the post immediately. It does not physically
delete the Storage object. Cancelled/failed submissions can also leave unused
objects. An administrator should periodically remove old, unreferenced files
through the Supabase Storage API/dashboard, after checking `posts.image_paths`.
Never delete Storage metadata directly with SQL. No automatic garbage collector
is included. This favors preserving photos during retries over automatic deletion.

## Review and verification

Baseline main: f4325ba3157a5171260e28b7b7b568866c61f130.
No dependency changes. ESLint and webpack production build passed (build-only
placeholder environment values). PGlite with mocked Storage schema verified
migration syntax, row preservation, ownership/count/size/type checks and read RLS.
Mock browser APIs verified resizing dimensions, output limit and error handling.
Real Supabase Storage uploads, Clerk sessions and browser rendering still require
an integration check in the deployed preview.

Suggested preview checks:
- Upload a large phone JPG; verify output long edge <=1920px and size <=5 MiB.
- Add five photos; reject a sixth without losing the original five selections.
- Reject HEIC/SVG, retry an upload failure, and edit/remove photos.
- A different user can view attached photos but cannot edit the post or attach
  the first author's photo paths to their own post.
