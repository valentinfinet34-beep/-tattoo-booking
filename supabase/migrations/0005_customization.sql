alter table public.artists add column if not exists cover_image_url text;
alter table public.artists add column if not exists accent_color text not null default 'red';

insert into storage.buckets (id, name, public)
values ('cover-images', 'cover-images', true)
on conflict (id) do nothing;

create policy "Public can view cover images"
  on storage.objects for select
  using (bucket_id = 'cover-images');

create policy "Artists can upload own cover image"
  on storage.objects for insert
  with check (
    bucket_id = 'cover-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Artists can update own cover image"
  on storage.objects for update
  using (
    bucket_id = 'cover-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
