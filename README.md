Muchina Family — Static Website

This static site uses Supabase to publish announcements and ideas, comment on ideas, and upload and display family videos, photos, and music. Posts and comments appear immediately and are publicly readable. No server or build step is required.

## Set up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the project's SQL Editor, run `supabase/setup.sql` for announcements, ideas, videos, and photos. To enable music uploads on an existing project, also run `supabase/music-setup.sql`. To enable comments on ideas, run `supabase/idea-comments-setup.sql`. These migrations are safe to rerun.
3. In **Project Settings → API**, copy the Project URL and the **anon/publishable** key (the public client key).
4. Edit `js/supabase-config.js`, replacing the two empty strings with those values. This file is intentionally public. Never put a `service_role` key, database password, or other secret in this repository.
5. In **Storage → Buckets**, check that the `family-videos` bucket exists and is public. The setup SQL creates it with a 50 MB file limit and MP4, WebM, and QuickTime video MIME types. It also creates a public `family-photos` bucket for JPG, PNG, and WebP files up to 10 MB each. The music migration creates a public `family-music` bucket for MP3, M4A, OGG, and WAV files up to 20 MB each.
6. Deploy the site files to GitHub Pages (or any static web host). For local testing, serve the repository over HTTP; opening HTML as `file://` may prevent the Supabase CDN or browser requests from working.

## Using the site

Visitors can publish announcements and ideas and comment on any idea. Posts and comments publish immediately. On the Entertainment page, visitors can upload up to 10 photos at a time (JPG, PNG, or WebP; maximum 10 MB per photo), plus music files in MP3, M4A, OGG, or WAV format up to 20 MB. Videos accept MP4, WebM, or MOV/QuickTime files up to 50 MB. Uploads publish immediately without review and appear in their media galleries/players. Only upload music you created or have permission to publish.

## Public posting, abuse, and costs

The provided RLS and Storage policies intentionally let unauthenticated visitors read and submit content. This means anyone who can reach the site can publish content and consume the project's database and storage bandwidth; client-side validation is not an abuse-prevention boundary. Monitor Supabase usage and moderate/remove unwanted content from the Supabase dashboard. For a private family site, add authentication and restrict the insert/upload policies before sharing it publicly. Supabase quotas, egress, storage, and pricing can change; review the limits and billing for your project and disable public writes or uploads if abuse is suspected.

## Files

- `index.html` — Home and latest announcements
- `announcements.html` — Announcement form and feed
- `ideas.html` — Idea form and feed
- `entertainment.html` — Video, photo, and music upload forms and media galleries/players
- `js/supabase-config.js` — Public project URL and anon/publishable key
- `supabase/setup.sql` — Table, bucket, and row/storage policies
- `supabase/music-setup.sql` — Idempotent migration for music upload bucket and policies
- `supabase/idea-comments-setup.sql` — Idempotent migration for public comments on ideas
