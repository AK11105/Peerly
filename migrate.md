# Migration Guide — `weaves.nodes` JSONB → `nodes` table

This is a **live-data migration** for an existing Supabase project.  
Run each step in order in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query).  
Every step is idempotent — safe to re-run if interrupted.

---

## Step 1 — Create `nodes` table

```sql
CREATE TABLE IF NOT EXISTS nodes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  weave_id       uuid        NOT NULL REFERENCES weaves(id) ON DELETE CASCADE,
  title          text        NOT NULL CHECK (char_length(trim(title)) >= 1),
  description    text        NOT NULL DEFAULT '',
  depth          int         NOT NULL DEFAULT 0,
  difficulty     int         NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  is_scaffold    bool        NOT NULL DEFAULT false,
  contributed_by text,
  status         text        NOT NULL DEFAULT 'approved'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nodes_weave_id_idx ON nodes(weave_id);
CREATE INDEX IF NOT EXISTS nodes_status_idx   ON nodes(status);
```

---

## Step 2 — Create `notifications` table

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  weave_id   uuid        REFERENCES weaves(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  node_id    uuid        REFERENCES nodes(id)  ON DELETE CASCADE,
  username   text,
  read       bool        NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_weave_id_idx ON notifications(weave_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx     ON notifications(read);
```

---

## Step 3 — Migrate existing JSONB data (idempotent)

This uses `INSERT ... ON CONFLICT DO NOTHING` so re-running never duplicates rows.

```sql
INSERT INTO nodes (
  id, weave_id, title, description,
  depth, difficulty, is_scaffold, contributed_by, status
)
SELECT
  (node->>'id')::uuid,
  w.id,
  COALESCE(NULLIF(trim(node->>'title'), ''), 'Untitled'),
  COALESCE(node->>'description', ''),
  COALESCE((node->>'depth')::int, 0),
  GREATEST(1, LEAST(5, COALESCE(ROUND((node->>'difficulty')::numeric)::int, 1))),
  COALESCE((node->>'is_scaffold')::bool, false),
  NULLIF(node->>'contributed_by', ''),
  'approved'
FROM weaves w,
     jsonb_array_elements(w.nodes) AS node
WHERE w.nodes IS NOT NULL
  AND jsonb_array_length(w.nodes) > 0
ON CONFLICT (id) DO NOTHING;
```

**Verify the count matches:**
```sql
-- Should be equal
SELECT COUNT(*) FROM nodes;
SELECT SUM(jsonb_array_length(nodes)) FROM weaves WHERE nodes IS NOT NULL;
```

---

## Step 4 — Enable RLS

```sql
ALTER TABLE nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Nodes: public read, service role writes (all API routes use service role key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nodes' AND policyname = 'nodes_public_read') THEN
    CREATE POLICY "nodes_public_read" ON nodes FOR SELECT USING (true);
  END IF;
END $$;

-- Notifications: service role only (no anon access needed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_service_only') THEN
    CREATE POLICY "notifications_service_only" ON notifications FOR ALL USING (false);
  END IF;
END $$;
```

> All write operations in API routes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS — no additional write policies needed.

---

## Step 5 — Enable Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## Step 5b — Add `explainer` column to `nodes`

```sql
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS explainer text;
```

---

## Step 6 — Update `ensure_user` RPC (if not already idempotent)

Verify this function exists and uses `ON CONFLICT DO NOTHING`:

```sql
CREATE OR REPLACE FUNCTION ensure_user(p_username text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO users (username) VALUES (p_username) ON CONFLICT (username) DO NOTHING;
  INSERT INTO lumens (username, balance) VALUES (p_username, 0) ON CONFLICT (username) DO NOTHING;
END;
$$;
```

---

## Step 7 — Drop `weaves.nodes` column (ONLY after code is deployed)

> ⚠️ Do this **after** deploying the updated application code that reads from the `nodes` table.  
> Keep the column during the transition window so rollback is possible.

```sql
-- First confirm zero reads still hitting the old column by checking your logs.
-- Then:
ALTER TABLE weaves DROP COLUMN IF EXISTS nodes;
```

---

## Step 8 — Update seed script

In `scripts/seed.mjs`, after inserting each weave, replace the inline `nodes` array with separate inserts into the `nodes` table. The seed script already has the data structured correctly — just change the insert target.

```js
// Old
await supabase.from('weaves').insert({ id: weaveId, topic: w.topic, field: w.field, nodes })

// New
await supabase.from('weaves').insert({ id: weaveId, topic: w.topic, field: w.field })
for (const node of nodes) {
  await supabase.from('nodes').insert({ ...node, weave_id: weaveId, status: 'approved' })
}
```

Also update the wipe block at the top of `seed()`:
```js
await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
await supabase.from('nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
// weaves delete stays, nodes cascade via FK
```

---

## Rollback

If anything goes wrong before Step 7:

```sql
-- The weaves.nodes column still has all data intact.
-- Just redeploy the previous code version — nothing is lost.
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS nodes;
```

After Step 7 there is no automatic rollback — restore from a Supabase backup (Dashboard → Database → Backups).

---

## Idempotency summary

| Step | Safe to re-run? | Why |
|------|----------------|-----|
| 1 | ✅ | `CREATE TABLE IF NOT EXISTS` |
| 2 | ✅ | `CREATE TABLE IF NOT EXISTS` |
| 3 | ✅ | `ON CONFLICT (id) DO NOTHING` |
| 4 | ✅ | `CREATE POLICY IF NOT EXISTS` |
| 5 | ✅ | `ADD TABLE` is a no-op if already added |
| 6 | ✅ | `CREATE OR REPLACE FUNCTION` |
| 7 | ⚠️ | Destructive — run once, after deploy |
