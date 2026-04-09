## Bugs, Bad Decisions & Inconsistencies

### 🔴 Critical Bugs (Will Break)

1. isPro always returns true but routes still gate on it
lib/check-plan.ts hardcodes return true, yet /api/weaves/[weaveId]/nodes, /api/weaves/generate, /api/weaves/[weaveId]/contribute, and 
/api/weaves/[weaveId]/nodes/[nodeId]/contribute all call isPro() and return 403 if it's false. Since it's always true now, the 403 you saw was
from a previous version of this file — but the real bug is the opposite: billing is completely bypassed. When you eventually flip isPro back to
a real check, every free user will suddenly get 403s everywhere with no UI explanation.

2. weaveId used but never declared in /api/nodes/explain/route.ts
ts
if (weaveId && nodeId) {  // ← weaveId is never destructured from req.json()
  await supabase.from('nodes').update({ explainer }).eq('id', nodeId).eq('weave_id', weaveId)
}

weaveId is undefined always, so the explainer is never cached to the DB. Every call regenerates it, wasting AI tokens.

3. Duplicate function declaration in /api/weaves/[weaveId]/nodes/route.ts
runGapDetection is declared twice — once with 4 params (weaveId, topic, newTitle, newDesc) and once with 3 params 
(weaveId, newTitle, newDescription). The second declaration shadows the first. TypeScript/bundler may silently pick one, causing unpredictable
behavior.

4. Import deduplication only checks source_url, not query
In /api/weaves/import/route.ts, the dedup check is:
ts
if (url) {
  const { data: existing } = await supabase.from('weaves').select(...).eq('source_url', url)...
}

When importing via query (Reddit search), url is undefined so the check is skipped entirely — duplicate weaves are always created for query-
based imports. This is the exact bug you described.

5. use-realtime-weave.ts has a duplicate import
ts
import type { Weave, WeaveNode } from '@/lib/types'
import type { Weave } from '@/lib/types'  // ← duplicate, will cause TS error


6. Realtime subscription only listens to nodes table, not weaves
useRealtimeWeave filters on nodes table changes. If the weave itself is deleted or its topic is updated, the UI never reflects it. The weave 
page would show stale data.

7. contribute-modal.tsx — link validation runs inside handleSubmit but returns early without setIsLoading(false)
ts
setIsLoading(true)
try {
  if (link.trim()) {
    try { ... }
    catch { setLinkError('...'); return }  // ← returns without setIsLoading(false)
  }

If the link is invalid, the button stays in "Saving…" state forever.

8. my-weaves/page.tsx — delete button has no confirmation and no error feedback
ts
const handleDelete = async (id: string) => {
  const res = await fetch(`/api/weaves/${id}`, { method: 'DELETE' })
  if (!res.ok) return  // ← silently fails, user has no idea
}

Also, the delete button is labeled "Remove from My Weaves" in the title but actually permanently deletes the weave for everyone (it calls 
DELETE /api/weaves/[id] which drops the DB row). This is a destructive action with no confirmation dialog.

9. lumens-context.tsx — earn() doesn't actually call the backend
ts
const earn = useCallback(async (amount: number) => {
  if (!username) return
  await refetchBalance(balance + amount)  // just polls DB, doesn't POST to earn
  setRecentChange(...)
}, ...)

The frontend calls earn(50) after contributing, but the actual earn_lumens RPC is called server-side. The client-side earn() just polls for 
the updated balance. This is fine in theory, but if the server-side earn fails silently (which it does in some routes — earnErr is only logged
), the UI will show the old balance and the user sees no feedback.

10. upvote routes have a race condition
Both messages/[messageId]/upvote and replies/[replyId]/upvote do a read-then-write:
ts
const { data: msg } = await supabase.from('community_messages').select('upvotes')...
// ... then:
await supabase.from('community_messages').update({ upvotes: msg.upvotes + 1 })

This is not atomic. Concurrent upvotes will cause lost updates. Should use a DB function or upvotes = upvotes + 1 directly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 🟠 Bad Design Decisions

11. user/plan POST endpoint has no auth guard beyond "is logged in"
Any authenticated user can POST { plan: "pro" } to /api/user/plan and upgrade themselves for free. There's no check that they've actually 
paid. The Razorpay verify route correctly sets plan: 'pro', but this endpoint is a backdoor.

12. weaves.nodes JSONB column is never used
The schema has nodes jsonb not null default '[]' on the weaves table, but all node data lives in the separate nodes table. The JSONB column is
dead weight and the upvote_node_explanation function still operates on it — it's a leftover from an old architecture that was never cleaned 
up.

13. my-weaves page fetches creator from weave_admins separately, but lib/api.ts attachNodes() already does this
my-weaves/page.tsx calls fetchWeave(id) (which calls attachNodes which already fetches weave_admins) and then also queries weave_admins again 
separately. Double query per weave.

14. create/page.tsx — admins added in step 3 are never actually saved
The admins state array is collected in the UI but handleGenerateWeave only calls generateWeave(topic, [], selectedField, includeScaffolds) — 
the admins list is never passed to the API. The generate route only adds the creator as admin.

15. source_url not fetched in fetchWeave / fetchAllWeaves
lib/api.ts selects id,topic,field,created_at — source, source_url are missing. The WeaveViewer tries to render weave.source_url but it's 
always undefined from these fetches. The "Imported from" link never shows.

16. contribute-modal.tsx calls earn(50) client-side AND the server also calls earn_lumens
Double-earning: the server does supabase.rpc('earn_lumens', { p_amount: 50 }) and the client calls earn(50) which polls for the new balance. 
This is fine since earn() just reads, but it's confusing and fragile — if someone calls earn() before the server write completes, the retry 
loop in refetchBalance kicks in, adding latency.

17. nodes table id is uuid but contributions.node_id is text
Schema mismatch — nodes.id is uuid, but contributions.node_id is text not null (later altered to nullable). No FK constraint between them, so 
orphaned contribution records are possible.

18. RLS policies are all using (true) — effectively no security
Every table has public read/insert/update/delete with using (true). Anyone with the anon key can read all data, delete any weave, modify any 
user's plan, etc. The service role key is used server-side which bypasses RLS anyway, but the anon key (exposed in NEXT_PUBLIC_SUPABASE_URL) 
gives full access to the DB from the browser.

19. useCurrentUser hook makes a Supabase query on every render cycle
The hook has no caching — every component that calls useCurrentUser() fires a separate SELECT to Supabase. On the weave page, AddNodePanel, 
ContributeModal, and AddPerspectiveModal all call it independently.

20. import route — no auth check for who can import, no rate limiting
/api/weaves/import only checks if (!userId) but has no plan check, no rate limit, and no cost. Importing fetches up to 10 Reddit posts with 
full comment threads + 2 AI calls (callAIStrong + insertGapScaffolds). A single user could spam this endpoint and rack up significant AI 
costs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


### 🟡 Inconsistencies

21. add-node route returns { status: 'pending', node } with HTTP 202, but add-perspective and contribute-to-scaffold return HTTP 200
The client checkResponse in lib/api.ts only checks !res.ok, so 202 passes through fine — but the inconsistency means callers can't reliably 
distinguish "created" from "accepted for review."

22. contributed_by is sometimes a display name, sometimes 'anonymous', sometimes a Clerk userId
The add-node panel sends contributed_by: currentUser?.displayName ?? 'anonymous'. The contribute route stores whatever is passed. The 
node-detail-drawer renders @{node.contributed_by} — so some nodes show @anonymous, some show a display name, some show a raw Clerk ID.

23. node_source type in WeaveNode is 'ai' | 'import' | 'community' but the DB default is 'ai' and the import route sets 'import' — 'community'
is never set anywhere

24. Stage labels are defined in two places with different mappings
weave-viewer.tsx has STAGE_LABELS = { 1: 'Foundation', 2: 'Core', ... } (1-indexed), while node-detail-drawer.tsx has 
STAGE_LABELS = { 0: 'Foundation', 1: 'Core Concepts', ... } (0-indexed). The drawer shows "Foundation" for depth 0, the viewer shows "Stage 0 
— undefined" for depth 0 nodes.

25. profile/page.tsx redeem dialog uses alert() for both success and failure
Inconsistent with the rest of the app which uses sonner toasts everywhere.