begin;

-- Additive migration: existing posts, comments and events are preserved.
alter table public.posts add column image_paths text[] not null default '{}';
alter table public.posts add constraint posts_image_paths_limit check (
  cardinality(image_paths) <= 5 and array_position(image_paths, null) is null
);
create index posts_image_paths_gin on public.posts using gin (image_paths);

-- Private: never expose a permanent public URL for members' photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "BU students upload their own post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and public.is_bu_student()
  and (storage.foldername(name))[1] = public.clerk_user_id()
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "BU students read attached images or their own uploads"
on storage.objects for select to authenticated
using (
  bucket_id = 'post-images'
  and public.is_bu_student()
  and (
    (storage.foldername(name))[1] = public.clerk_user_id()
    or exists (select 1 from public.posts p where p.image_paths @> array[storage.objects.name])
  )
);
-- No client update/upsert/delete policy: saved objects are immutable.
-- Removing a photo from a post removes the reference. Storage cleanup is an
-- administrator task through the Storage API, never DELETE on storage.objects.

-- A direct REST caller must also respect attachment ownership/count/type/size.
create function public.validate_post_images()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  image_path text;
  seen text[] := '{}';
begin
  if tg_op = 'UPDATE' and new.image_paths is not distinct from old.image_paths then
    return new;
  end if;
  if cardinality(new.image_paths) > 5 or array_position(new.image_paths, null) is not null then
    raise exception 'A post can have at most 5 images';
  end if;
  foreach image_path in array new.image_paths loop
    if image_path = any(seen) then raise exception 'Duplicate image'; end if;
    seen := array_append(seen, image_path);
    if split_part(image_path, '/', 1) <> new.author_id or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'post-images' and o.name = image_path
        and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
        and (o.metadata->>'size')::bigint between 1 and 5242880
    ) then
      raise exception 'Attach only your own uploaded JPG, PNG or WebP images (max 5MB each)';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.validate_post_images() from public, anon, authenticated;
create trigger validate_post_images before insert or update of image_paths, author_id
on public.posts for each row execute function public.validate_post_images();

commit;
