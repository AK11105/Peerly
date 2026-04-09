# Bugs Fixed

## #2 — Explainer never cached to DB
**File:** `app/api/nodes/explain/route.ts`  
`weaveId` was used in the cache-write but never destructured from `req.json()`, so it was always `undefined` and the `update` was silently skipped. Every call regenerated the explainer, wasting AI tokens.  
**Fix:** Added `weaveId` to the destructured fields from `req.json()`.

---

## #3 — Duplicate `runGapDetection` declaration
**File:** `app/api/weaves/[weaveId]/nodes/route.ts`  
The function was declared twice — once with 3 params `(weaveId, newTitle, newDescription)` and once with 4 params `(weaveId, topic, newTitle, newDesc)`. The second shadowed the first, but the first was syntactically broken (unclosed try block). The call site passed 4 args.  
**Fix:** Removed the broken first declaration entirely, kept the correct 4-param version. Also extracted `titleExists` as a standalone helper.

---

## #4 — Query-based import always creates duplicate weaves
**File:** `app/api/weaves/import/route.ts`  
The deduplication check only ran `if (url)` — when importing via Reddit search query (`query` param, no `url`), the check was skipped entirely, so importing the same subreddit/query twice always created two separate weaves.  
**Fix:** Added an `else if (query)` branch that checks for an existing weave with `source = 'import'` and `topic = query`.

---

## #5 — Duplicate import in `use-realtime-weave.ts`
**File:** `hooks/use-realtime-weave.ts`  
`import type { Weave }` was imported twice — once as part of `{ Weave, WeaveNode }` and once standalone. TypeScript compile error.  
**Fix:** Removed the duplicate import line.

---

## #7 — `contribute-modal` stuck in loading state on invalid link
**File:** `components/peerly/contribute-modal.tsx`  
Link validation ran *after* `setIsLoading(true)` and returned early on failure without calling `setIsLoading(false)`, leaving the submit button permanently stuck in "Saving…".  
**Fix:** Moved link validation before `setIsLoading(true)` so early returns don't affect loading state.

---

## #8 — Delete weave: no confirmation, silent failure, misleading label
**File:** `app/my-weaves/page.tsx`  
The delete button permanently deleted the weave for all users with no confirmation dialog. On failure, `if (!res.ok) return` silently swallowed the error. The tooltip said "Remove from My Weaves" implying a soft remove.  
**Fix:** Added `window.confirm()` before the fetch. Added `toast.error()` on failure. Changed tooltip to "Delete Weave permanently".

---

## #10 — Non-atomic upvote counters (race condition)
**Files:** `app/api/community/messages/[messageId]/upvote/route.ts`, `app/api/community/replies/[replyId]/upvote/route.ts`, `supabase/schema.sql`  
Both routes did a read-then-write: fetch current count, add/subtract 1, write back. Concurrent upvotes would cause lost updates.  
**Fix:** Added 4 atomic DB functions (`increment_message_upvotes`, `decrement_message_upvotes`, `increment_reply_upvotes`, `decrement_reply_upvotes`) that do `upvotes = upvotes + 1` in a single statement. Routes now call these instead of manual read-then-write.

---

## #13 — Double `weave_admins` query in my-weaves
**File:** `app/my-weaves/page.tsx`  
`fetchWeave()` internally calls `attachNodes()` which already queries `weave_admins` and returns `createdBy`. The page then queried `weave_admins` again separately for each weave — 2× the DB calls.  
**Fix:** Removed the redundant query; use `weave.createdBy` returned by `fetchWeave` directly.

---

## #14 — Admins list silently dropped on weave creation
**Files:** `app/create/page.tsx`, `app/api/weaves/[weaveId]/admins/route.ts` (new)  
Step 3 of the create flow collects additional admin usernames, but `handleGenerateWeave` never passed them anywhere — the array was collected and discarded.  
**Fix:** After weave creation, POST each admin to a new `/api/weaves/[weaveId]/admins` endpoint that upserts them into `weave_admins` (with an admin-only auth check).

---

## #15 — `source` and `source_url` missing from weave fetches
**File:** `lib/api.ts`  
Both `fetchWeave` and `fetchAllWeaves` selected `id,topic,field,created_at` — omitting `source` and `source_url`. The "Imported from" link in `WeaveViewer` always got `undefined` and never rendered.  
**Fix:** Added `source,source_url` to both select strings.

---

## #19 — `useCurrentUser` fires a Supabase query per component
**Files:** `hooks/use-current-user.tsx`, `app/layout.tsx`  
The hook made a `SELECT` to Supabase on every mount. Components like `AddNodePanel`, `ContributeModal`, `AddPerspectiveModal`, `Navbar`, and `CommunityHub` all called it independently — multiple redundant DB queries per page load.  
**Fix:** Converted to a React context (`CurrentUserProvider`) that fetches once and shares the result. All `useCurrentUser()` calls now read from context. Provider added to root layout wrapping the app.

---

## #22 — `contributed_by` stored as raw client-sent value
**Files:** `app/api/weaves/[weaveId]/nodes/route.ts`, `app/api/weaves/[weaveId]/contribute/route.ts`  
The `contributed_by` field was taken directly from the request body — whatever the client sent. This meant it could be a display name, `'anonymous'`, or a raw Clerk user ID depending on the client state. The drawer rendered `@{contributed_by}` so some nodes showed `@user_2abc123...`.  
**Fix:** Server now looks up `users.display_name` for the authenticated `userId` and uses that. Client-sent value is only used as a fallback if no DB record exists yet.

---

## #24 — Stage labels inconsistent between viewer and drawer
**Files:** `lib/constants.ts` (new), `components/peerly/weave-viewer.tsx`, `components/peerly/node-detail-drawer.tsx`  
`WeaveViewer` had `STAGE_LABELS` keyed 1–5 ("Foundation" at 1), while `NodeDetailDrawer` had it keyed 0–5 ("Foundation" at 0). Depth-0 nodes showed "Stage 0 — undefined" in the viewer.  
**Fix:** Extracted a single `STAGE_LABELS` constant (0-indexed) into `lib/constants.ts`. Both components import and use it. Viewer now shows the label directly instead of "Stage {depth} — {label}".

---

## #25 — `alert()` used in profile redeem flow
**File:** `app/profile/page.tsx`  
Success and failure in the redeem dialog used `alert()` — inconsistent with the rest of the app which uses `sonner` toasts everywhere.  
**Fix:** Replaced both `alert()` calls with `toast.success()` and `toast.error()`.

---

## #26 — Custom field disappears while typing in weave creation
**File:** `app/create/page.tsx`  
Three related bugs in the field selection step:
1. `hasField` was computed as `!!selectedField` (dynamic), so typing anything in the custom field input immediately set `hasField = true`, collapsed `totalSteps` to 2, and the step 2 card condition `step === 2 && !selectedField` became false — the card vanished mid-typing.
2. The custom field input called `setSelectedField(e.target.value)` on every keystroke, triggering bug 1.
3. The Continue button was `disabled={!selectedField.trim()}` — since we stopped setting `selectedField` during typing, it stayed disabled with a custom field typed.

**Fix:**
- `hasField` now only depends on `preselectedField` (the URL `?field=` param) — stable, never changes during typing.
- Custom field input no longer calls `setSelectedField` on change; it only commits on Enter or Continue click.
- Continue button checks `!selectedField.trim() && !newField.trim()` and commits `newField → selectedField` on click.
- The "Change field" badge dropdown now prepends the custom field at the top if it's not in the predefined list.
