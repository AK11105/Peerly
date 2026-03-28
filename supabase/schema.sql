-- Peerly — Full Supabase Schema (synced with supabase-schema.sql)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

-- ── Weaves ────────────────────────────────────────────────
create table if not exists weaves (
  id          text primary key,
  topic       text not null,
  field       text,
  nodes       jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now()
);

-- ── Users (lightweight profile, no auth required for MVP) ─
create table if not exists users (
  username    text primary key,
  created_at  timestamptz default now()
);

-- ── Weave admins ──────────────────────────────────────────
create table if not exists weave_admins (
  weave_id    text references weaves(id) on delete cascade,
  username    text references users(username) on delete cascade,
  primary key (weave_id, username)
);

-- ── Contributions (one row per node contributed) ──────────
create table if not exists contributions (
  id           uuid primary key default gen_random_uuid(),
  weave_id     text references weaves(id) on delete cascade,
  node_id      text not null,
  username     text references users(username) on delete cascade,
  type         text not null check (type in ('scaffold_fill', 'add_node', 'perspective')),
  lumens_earned int not null default 0,
  created_at   timestamptz default now()
);

-- ── Lumens wallet ─────────────────────────────────────────
create table if not exists lumens (
  username    text primary key references users(username) on delete cascade,
  balance     int not null default 0,
  updated_at  timestamptz default now()
);

-- ── User weave bookmarks (replaces localStorage my-weaves) ─
create table if not exists user_weaves (
  username    text references users(username) on delete cascade,
  weave_id    text references weaves(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (username, weave_id)
);

-- ── Community ─────────────────────────────────────────────
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
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid references community_messages(id) on delete cascade,
  username    text references users(username) on delete cascade,
  text        text not null,
  upvotes     int not null default 0,
  created_at  timestamptz default now()
);

-- Prevents double-voting; target_type = 'message' | 'reply'
create table if not exists community_upvotes (
  username    text references users(username) on delete cascade,
  target_id   uuid not null,
  target_type text not null check (target_type in ('message', 'reply')),
  primary key (username, target_id)
);

-- ── Enable Realtime ───────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['weaves','lumens','contributions','community_messages','community_replies','community_upvotes']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END;
$$;

-- ── Row Level Security (open for MVP) ─────────────────────
alter table weaves            enable row level security;
alter table users             enable row level security;
alter table weave_admins      enable row level security;
alter table contributions     enable row level security;
alter table lumens            enable row level security;
alter table user_weaves       enable row level security;
alter table community_messages enable row level security;
alter table community_replies  enable row level security;
alter table community_upvotes  enable row level security;

drop policy if exists "public read" on weaves;
create policy "public read" on weaves for select using (true);
drop policy if exists "public insert" on weaves;
create policy "public insert" on weaves for insert with check (true);
drop policy if exists "public update" on weaves;
create policy "public update" on weaves for update using (true);
drop policy if exists "public delete" on weaves;
create policy "public delete" on weaves for delete using (true);

drop policy if exists "public read" on users;
create policy "public read" on users for select using (true);
drop policy if exists "public insert" on users;
create policy "public insert" on users for insert with check (true);

drop policy if exists "public read" on weave_admins;
create policy "public read" on weave_admins for select using (true);
drop policy if exists "public insert" on weave_admins;
create policy "public insert" on weave_admins for insert with check (true);
drop policy if exists "public delete" on weave_admins;
create policy "public delete" on weave_admins for delete using (true);

drop policy if exists "public read" on contributions;
create policy "public read" on contributions for select using (true);
drop policy if exists "public insert" on contributions;
create policy "public insert" on contributions for insert with check (true);

drop policy if exists "public read" on lumens;
create policy "public read" on lumens for select using (true);
drop policy if exists "public insert" on lumens;
create policy "public insert" on lumens for insert with check (true);
drop policy if exists "public update" on lumens;
create policy "public update" on lumens for update using (true);

drop policy if exists "public read" on user_weaves;
create policy "public read" on user_weaves for select using (true);
drop policy if exists "public insert" on user_weaves;
create policy "public insert" on user_weaves for insert with check (true);
drop policy if exists "public delete" on user_weaves;
create policy "public delete" on user_weaves for delete using (true);

drop policy if exists "public read" on community_messages;
create policy "public read" on community_messages for select using (true);
drop policy if exists "public insert" on community_messages;
create policy "public insert" on community_messages for insert with check (true);
drop policy if exists "public update" on community_messages;
create policy "public update" on community_messages for update using (true);
drop policy if exists "public delete" on community_messages;
create policy "public delete" on community_messages for delete using (true);

drop policy if exists "public read" on community_replies;
create policy "public read" on community_replies for select using (true);
drop policy if exists "public insert" on community_replies;
create policy "public insert" on community_replies for insert with check (true);
drop policy if exists "public delete" on community_replies;
create policy "public delete" on community_replies for delete using (true);

drop policy if exists "public read" on community_upvotes;
create policy "public read" on community_upvotes for select using (true);
drop policy if exists "public insert" on community_upvotes;
create policy "public insert" on community_upvotes for insert with check (true);
drop policy if exists "public delete" on community_upvotes;
create policy "public delete" on community_upvotes for delete using (true);

-- ── Helper functions ──────────────────────────────────────
create or replace function ensure_user(p_username text)
returns void language plpgsql as $$
begin
  insert into users (username) values (p_username) on conflict do nothing;
  insert into lumens (username, balance) values (p_username, 0) on conflict do nothing;
end;
$$;

create or replace function earn_lumens(p_username text, p_amount int)
returns int language plpgsql as $$
declare v_balance int;
begin
  perform ensure_user(p_username);
  update lumens set balance = balance + p_amount, updated_at = now()
    where username = p_username
    returning balance into v_balance;
  return v_balance;
end;
$$;

create or replace function spend_lumens(p_username text, p_amount int)
returns int language plpgsql as $$
declare v_balance int;
begin
  select balance into v_balance from lumens where username = p_username;
  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_lumens';
  end if;
  update lumens set balance = balance - p_amount, updated_at = now()
    where username = p_username
    returning balance into v_balance;
  return v_balance;
end;
$$;

create or replace function toggle_message_upvote(p_username text, p_message_id uuid)
returns int language plpgsql as $$
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
returns int language plpgsql as $$
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

-- ── Leaderboard view ──────────────────────────────────────
create or replace view leaderboard_view as
select
  u.username,
  coalesce(l.balance, 0)                                   as lumens,
  coalesce(c.total_contributions, 0)                       as contributions,
  coalesce(c.scaffold_fills, 0)                            as scaffolds,
  coalesce(c.total_contributions, 0) * 50
    + coalesce(l.balance, 0) / 10                          as rep
from users u
left join lumens l on l.username = u.username
left join (
  select
    username,
    count(*)                                               as total_contributions,
    count(*) filter (where type = 'scaffold_fill')         as scaffold_fills
  from contributions
  group by username
) c on c.username = u.username
order by rep desc;
