-- Peerly — Full Supabase Schema
-- Safe to re-run at any time (fully idempotent).
-- Dashboard → SQL Editor → paste → Run

-- ── Tables ────────────────────────────────────────────────

create table if not exists weaves (
  id          text primary key,
  topic       text not null,
  field       text,
  nodes       jsonb not null default '[]'::jsonb,
  source      text not null default 'ai',
  source_url  text,
  created_at  timestamptz default now()
);

-- idempotent column additions for existing deployments
alter table weaves add column if not exists source text not null default 'ai';
alter table weaves add column if not exists source_url text;

create table if not exists users (
  username     text primary key,
  display_name text,
  plan         text not null default 'free',
  created_at   timestamptz default now()
);

create table if not exists weave_admins (
  weave_id    text references weaves(id) on delete cascade,
  username    text references users(username) on delete cascade,
  primary key (weave_id, username)
);

create table if not exists contributions (
  id            uuid primary key default gen_random_uuid(),
  weave_id      text references weaves(id) on delete cascade,
  node_id       text not null,
  username      text references users(username) on delete cascade,
  type          text not null check (type in ('scaffold_fill', 'add_node', 'perspective')),
  lumens_earned int not null default 0,
  created_at    timestamptz default now()
);

create table if not exists lumens (
  username   text primary key references users(username) on delete cascade,
  balance    int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists user_weaves (
  username   text references users(username) on delete cascade,
  weave_id   text references weaves(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (username, weave_id)
);

create table if not exists community_messages (
  id          uuid primary key default gen_random_uuid(),
  weave_id    text references weaves(id) on delete cascade,
  channel     text not null,
  username    text references users(username) on delete cascade,
  text        text not null,
  is_question boolean not null default false,
  upvotes     int not null default 0,
  created_at  timestamptz default now()
);

create table if not exists community_replies (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid references community_messages(id) on delete cascade,
  username   text references users(username) on delete cascade,
  text       text not null,
  upvotes    int not null default 0,
  created_at timestamptz default now()
);

create table if not exists community_upvotes (
  username    text references users(username) on delete cascade,
  target_id   uuid not null,
  target_type text not null check (target_type in ('message', 'reply')),
  primary key (username, target_id)
);

-- ── Column migrations (idempotent) ────────────────────────
-- Add columns that may be missing on older deployments.
-- ADD COLUMN IF NOT EXISTS is a no-op when the column already exists.

alter table users add column if not exists display_name text;
alter table users add column if not exists plan text not null default 'free';
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists stripe_subscription_id text;
alter table users add column if not exists has_paid boolean not null default false;
alter table users add column if not exists has_seen_tour boolean not null default false;

-- Ensure plan has the correct default and NOT NULL even if column pre-existed as nullable.
alter table users alter column plan set default 'free';
update users set plan = 'free' where plan is null;
alter table users alter column plan set not null;

-- ── Realtime ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['weaves','lumens','contributions','community_messages','community_replies','community_upvotes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end;
$$;

-- ── Row Level Security ────────────────────────────────────
-- enable is idempotent (no-op if already enabled)
alter table weaves             enable row level security;
alter table users              enable row level security;
alter table weave_admins       enable row level security;
alter table contributions      enable row level security;
alter table lumens             enable row level security;
alter table user_weaves        enable row level security;
alter table community_messages enable row level security;
alter table community_replies  enable row level security;
alter table community_upvotes  enable row level security;

-- drop + recreate is the only safe idempotent pattern for policies
drop policy if exists "public read"   on weaves;
drop policy if exists "public insert" on weaves;
drop policy if exists "public update" on weaves;
drop policy if exists "public delete" on weaves;
create policy "public read"   on weaves for select using (true);
create policy "public insert" on weaves for insert with check (true);
create policy "public update" on weaves for update using (true);
create policy "public delete" on weaves for delete using (true);

drop policy if exists "public read"   on users;
drop policy if exists "public insert" on users;
drop policy if exists "public update" on users;
create policy "public read"   on users for select using (true);
create policy "public insert" on users for insert with check (true);
create policy "public update" on users for update using (true);

drop policy if exists "public read"   on weave_admins;
drop policy if exists "public insert" on weave_admins;
drop policy if exists "public delete" on weave_admins;
create policy "public read"   on weave_admins for select using (true);
create policy "public insert" on weave_admins for insert with check (true);
create policy "public delete" on weave_admins for delete using (true);

drop policy if exists "public read"   on contributions;
drop policy if exists "public insert" on contributions;
create policy "public read"   on contributions for select using (true);
create policy "public insert" on contributions for insert with check (true);

drop policy if exists "public read"   on lumens;
drop policy if exists "public insert" on lumens;
drop policy if exists "public update" on lumens;
create policy "public read"   on lumens for select using (true);
create policy "public insert" on lumens for insert with check (true);
create policy "public update" on lumens for update using (true);

drop policy if exists "public read"   on user_weaves;
drop policy if exists "public insert" on user_weaves;
drop policy if exists "public delete" on user_weaves;
create policy "public read"   on user_weaves for select using (true);
create policy "public insert" on user_weaves for insert with check (true);
create policy "public delete" on user_weaves for delete using (true);

drop policy if exists "public read"   on community_messages;
drop policy if exists "public insert" on community_messages;
drop policy if exists "public update" on community_messages;
drop policy if exists "public delete" on community_messages;
create policy "public read"   on community_messages for select using (true);
create policy "public insert" on community_messages for insert with check (true);
create policy "public update" on community_messages for update using (true);
create policy "public delete" on community_messages for delete using (true);

drop policy if exists "public read"   on community_replies;
drop policy if exists "public insert" on community_replies;
drop policy if exists "public delete" on community_replies;
create policy "public read"   on community_replies for select using (true);
create policy "public insert" on community_replies for insert with check (true);
create policy "public delete" on community_replies for delete using (true);

drop policy if exists "public read"   on community_upvotes;
drop policy if exists "public insert" on community_upvotes;
drop policy if exists "public delete" on community_upvotes;
create policy "public read"   on community_upvotes for select using (true);
create policy "public insert" on community_upvotes for insert with check (true);
create policy "public delete" on community_upvotes for delete using (true);

-- ── Functions ─────────────────────────────────────────────
-- All use SECURITY DEFINER so they run as the owner (postgres)
-- regardless of the calling role, bypassing RLS on writes.
-- DROP the old single-arg overload that caused "not unique" errors.

drop function if exists ensure_user(text);

create or replace function ensure_user(p_username text, p_display_name text default null)
returns void language plpgsql security definer as $$
begin
  insert into users (username, display_name, has_seen_tour)
    values (p_username, p_display_name, false)
    on conflict (username) do update
      set display_name = coalesce(excluded.display_name, users.display_name);
  -- plan is managed via /api/user/plan — never touched here
  insert into lumens (username, balance)
    values (p_username, 0)
    on conflict do nothing;
end;
$$;

create or replace function earn_lumens(p_username text, p_amount int)
returns int language plpgsql security definer as $$
declare v_balance int;
begin
  perform ensure_user(p_username);
  update lumens
    set balance = balance + p_amount, updated_at = now()
    where username = p_username
    returning balance into v_balance;
  return v_balance;
end;
$$;

create or replace function spend_lumens(p_username text, p_amount int)
returns int language plpgsql security definer as $$
declare v_balance int;
begin
  select balance into v_balance from lumens where username = p_username;
  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_lumens';
  end if;
  update lumens
    set balance = balance - p_amount, updated_at = now()
    where username = p_username
    returning balance into v_balance;
  return v_balance;
end;
$$;

-- Deprecated — no longer called by app routes (inline table ops used instead).
-- Kept for backwards compatibility only.
create or replace function toggle_message_upvote(p_username text, p_message_id uuid)
returns int language plpgsql security definer as $$
declare v_upvotes int;
begin
  perform ensure_user(p_username);
  if exists (
    select 1 from community_upvotes
    where username = p_username and target_id = p_message_id and target_type = 'message'
  ) then
    delete from community_upvotes
      where username = p_username and target_id = p_message_id and target_type = 'message';
    update community_messages set upvotes = greatest(0, upvotes - 1)
      where id = p_message_id returning upvotes into v_upvotes;
  else
    insert into community_upvotes (username, target_id, target_type)
      values (p_username, p_message_id, 'message');
    update community_messages set upvotes = upvotes + 1
      where id = p_message_id returning upvotes into v_upvotes;
    perform earn_lumens(p_username, 1);
  end if;
  return v_upvotes;
end;
$$;

create or replace function toggle_reply_upvote(p_username text, p_reply_id uuid)
returns int language plpgsql security definer as $$
declare v_upvotes int;
begin
  perform ensure_user(p_username);
  if exists (
    select 1 from community_upvotes
    where username = p_username and target_id = p_reply_id and target_type = 'reply'
  ) then
    delete from community_upvotes
      where username = p_username and target_id = p_reply_id and target_type = 'reply';
    update community_replies set upvotes = greatest(0, upvotes - 1)
      where id = p_reply_id returning upvotes into v_upvotes;
  else
    insert into community_upvotes (username, target_id, target_type)
      values (p_username, p_reply_id, 'reply');
    update community_replies set upvotes = upvotes + 1
      where id = p_reply_id returning upvotes into v_upvotes;
    perform earn_lumens(p_username, 1);
  end if;
  return v_upvotes;
end;
$$;

-- ── Node explanation upvote (atomic, dedup-safe) ─────────
-- Returns the new upvote count for the block, NULL if not found.
-- Toggles: adds vote if not present, removes if already voted.
create or replace function upvote_node_explanation(
  p_weave_id   text,
  p_node_id    text,
  p_voter_key  text,
  p_block_index int
)
returns int language plpgsql security definer as $$
declare
  v_nodes   jsonb;
  v_node    jsonb;
  v_voters  jsonb;
  v_upvotes jsonb;
  v_new_count int;
  v_idx     int;
  v_already boolean;
begin
  select nodes into v_nodes from weaves where id = p_weave_id for update;
  if not found then return null; end if;

  select i into v_idx
  from generate_series(0, jsonb_array_length(v_nodes) - 1) i
  where v_nodes->i->>'id' = p_node_id
  limit 1;
  if v_idx is null then return null; end if;

  v_node    := v_nodes->v_idx;
  v_voters  := coalesce(v_node->'contribution_voters', '[]'::jsonb);
  v_upvotes := coalesce(v_node->'contribution_upvotes', '{}'::jsonb);
  v_already := v_voters @> to_jsonb(p_voter_key);
  v_new_count := coalesce((v_upvotes->>p_block_index::text)::int, 0);

  if v_already then
    -- Remove vote
    v_voters    := (select jsonb_agg(val) from jsonb_array_elements(v_voters) val where val <> to_jsonb(p_voter_key));
    v_voters    := coalesce(v_voters, '[]'::jsonb);
    v_new_count := greatest(0, v_new_count - 1);
  else
    -- Add vote
    v_voters    := v_voters || to_jsonb(p_voter_key);
    v_new_count := v_new_count + 1;
  end if;

  v_upvotes := jsonb_set(v_upvotes, array[p_block_index::text], to_jsonb(v_new_count));
  v_node    := v_node
    || jsonb_build_object('contribution_upvotes', v_upvotes)
    || jsonb_build_object('contribution_voters', v_voters);
  v_nodes   := jsonb_set(v_nodes, array[v_idx::text], v_node);

  update weaves set nodes = v_nodes where id = p_weave_id;
  return v_new_count;
end;
$$;

-- ── Leaderboard view ──────────────────────────────────────
-- Must drop before recreating — CREATE OR REPLACE fails if column list changes.
drop view if exists leaderboard_view;
create view leaderboard_view as
select
  u.username,
  coalesce(u.display_name, u.username)           as display_name,
  coalesce(l.balance, 0)                         as lumens,
  coalesce(c.total_contributions, 0)             as contributions,
  coalesce(c.scaffold_fills, 0)                  as scaffolds,
  coalesce(c.scaffold_fills, 0) * 100
    + (coalesce(c.total_contributions, 0) - coalesce(c.scaffold_fills, 0)) * 40
    + coalesce(l.balance, 0) * 2                as rep
from users u
left join lumens l on l.username = u.username
left join (
  select
    username,
    count(*)                                     as total_contributions,
    count(*) filter (where type = 'scaffold_fill') as scaffold_fills
  from contributions
  group by username
) c on c.username = u.username
order by rep desc, lumens desc, username asc;

-- ── Node upvotes (replaces JSONB contribution_upvotes/voters) ────────────────
alter table nodes add column if not exists upvotes int not null default 0;

create table if not exists node_upvotes (
  node_id  uuid references nodes(id) on delete cascade,
  username text references users(username) on delete cascade,
  primary key (node_id, username)
);

alter table node_upvotes enable row level security;
drop policy if exists "public read"   on node_upvotes;
drop policy if exists "public insert" on node_upvotes;
drop policy if exists "public delete" on node_upvotes;
create policy "public read"   on node_upvotes for select using (true);
create policy "public insert" on node_upvotes for insert with check (true);
create policy "public delete" on node_upvotes for delete using (true);

create or replace function increment_node_upvotes(p_node_id uuid)
returns int language plpgsql security definer as $$
declare v_count int;
begin
  update nodes set upvotes = upvotes + 1 where id = p_node_id returning upvotes into v_count;
  return v_count;
end;
$$;

create or replace function decrement_node_upvotes(p_node_id uuid)
returns int language plpgsql security definer as $$
declare v_count int;
begin
  update nodes set upvotes = greatest(0, upvotes - 1) where id = p_node_id returning upvotes into v_count;
  return v_count;
end;
$$;

-- ── Node sources (Reddit posts that contributed to each imported node) ────────
alter table nodes add column if not exists sources jsonb;
alter table nodes add column if not exists node_source text not null default 'ai';

-- Allow node_id to be null in contributions (import type has no single node)
alter table contributions alter column node_id drop not null;

-- Allow 'import' as a valid contribution type
alter table contributions drop constraint if exists contributions_type_check;
alter table contributions add constraint contributions_type_check
  check (type in ('scaffold_fill', 'add_node', 'perspective', 'import'));

-- ── Atomic community upvote counters (fixes race condition in upvote routes) ──
create or replace function increment_message_upvotes(p_message_id uuid)
returns void language plpgsql security definer as $$
begin
  update community_messages set upvotes = upvotes + 1 where id = p_message_id;
end;
$$;

create or replace function decrement_message_upvotes(p_message_id uuid)
returns void language plpgsql security definer as $$
begin
  update community_messages set upvotes = greatest(0, upvotes - 1) where id = p_message_id;
end;
$$;

create or replace function increment_reply_upvotes(p_reply_id uuid)
returns void language plpgsql security definer as $$
begin
  update community_replies set upvotes = upvotes + 1 where id = p_reply_id;
end;
$$;

create or replace function decrement_reply_upvotes(p_reply_id uuid)
returns void language plpgsql security definer as $$
begin
  update community_replies set upvotes = greatest(0, upvotes - 1) where id = p_reply_id;
end;
$$;
