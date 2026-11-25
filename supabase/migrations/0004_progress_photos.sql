-- Gym Log: progress photos (phase 5 of docs/coach-plan.md)
--
-- Run once, after 0001 to 0003.
--   1. a check-in holds up to three photos: front, side and back
--   2. the progress bucket takes photos only, and small ones
--
-- The files live in the private bucket `progress` at '<client id>/<file name>' (0001 already lets a client
-- write only in their own folder, and lets them and their coach read). A check-in names its files without
-- the folder, so it can only ever point into its owner's own folder.

begin;

-- 1. Photos on a check-in --------------------------------------------------------------------------
-- {"front": "2026-11-24-<uuid>.webp", "side": ..., "back": ...}: any of the three, each a file name the app
-- made (the check-in's date, a uuid, webp or jpg). Nothing else fits, so no path can climb out of the folder.
create function private.valid_photos(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (
    jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) e
       where e.key not in ('front', 'side', 'back')
          or jsonb_typeof(e.value) <> 'string'
          or (e.value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'))
$$;
revoke all on function private.valid_photos(jsonb) from public, anon;
grant execute on function private.valid_photos(jsonb) to authenticated;  -- the check runs as the writer

-- photo_path (one photo, never used) gives way to photos (three poses)
alter table public.body_checkins drop column photo_path;
alter table public.body_checkins add column photos jsonb constraint body_checkins_photos check (private.valid_photos(photos));

-- 2. The bucket ------------------------------------------------------------------------------------
-- The app sends 1080-pixel WebP (or JPEG where the phone can't make WebP), well under 2 MB.
update storage.buckets
   set file_size_limit = 2097152, allowed_mime_types = array['image/webp', 'image/jpeg']
 where id = 'progress';

commit;
