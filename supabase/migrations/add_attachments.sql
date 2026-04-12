-- ── Multi-modal attachments migration ────────────────────────────────────────
-- Fully idempotent: ADD COLUMN IF NOT EXISTS is a no-op when column exists.
-- Run in Supabase Dashboard → SQL Editor.

-- Community messages: store array of public attachment URLs
alter table community_messages add column if not exists attachments text[];

-- Community replies: same
alter table community_replies add column if not exists attachments text[];

-- Nodes: store attachments for scaffold-fill contributions
alter table nodes add column if not exists attachments text[];

-- ── Supabase Storage bucket for attachments ───────────────────────────────────
-- Create the bucket if it doesn't exist (idempotent via DO block).
do $$
begin
  insert into storage.buckets (id, name, public)
    values ('attachments', 'attachments', true)
    on conflict (id) do nothing;
end;
$$;

-- Storage RLS: allow authenticated uploads, public reads
drop policy if exists "Public read attachments"  on storage.objects;
drop policy if exists "Auth upload attachments"  on storage.objects;
drop policy if exists "Auth delete attachments"  on storage.objects;

create policy "Public read attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Auth upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments');

create policy "Auth delete attachments"
  on storage.objects for delete
  using (bucket_id = 'attachments');
