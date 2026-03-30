# Clerk Billing Setup

## 1. Enable Billing in Clerk Dashboard

1. https://dashboard.clerk.com → your app → **Configure → Billing**
2. Toggle **Enable Billing** on, set **Payer type** to **User**

---

## 2. Create the Pro Plan

**Billing → Plans → Create plan**

- Name: `Pro`, Slug: `pro`, Price: `$9 / month`
- Add features (shown in PricingTable): Create weaves, Contribute nodes, Earn Lumens, etc.

---

## 3. Webhook Setup

### Local (ngrok)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Copy the https URL, e.g. https://abc123.ngrok-free.app
```

In Clerk Dashboard → **Webhooks → Add endpoint**:
- URL: `https://abc123.ngrok-free.app/api/webhooks/clerk`
- Events: `subscriptionItem.active`, `subscriptionItem.canceled`, `subscriptionItem.ended`, `user.deleted`
- Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in `.env.local`

> Each time ngrok restarts it gives a new URL — update the webhook endpoint in Clerk Dashboard.
> To get a stable URL, use a [free static ngrok domain](https://dashboard.ngrok.com/domains).

### Production (after deploy)

In Clerk Dashboard → **Webhooks → Add endpoint** (or edit the existing one):
- URL: `https://yourdomain.com/api/webhooks/clerk`
- Same events as above
- Copy the new **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in your hosting env vars

---

## 4. Environment Variables

### `.env.local` (local)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...   # from ngrok webhook endpoint
```

### Production env vars (Vercel / hosting)
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...   # or keep pk_test_ for test mode
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...   # from production webhook endpoint
```

---

## 5. Verify Locally

1. `npm run dev` + `ngrok http 3000`
2. Go to `http://localhost:3000/pricing` — PricingTable renders your plans
3. Subscribe → Clerk test checkout (no real money with `pk_test_` keys)
4. Redirected to `/pricing?success=1` → check Supabase `users.plan = 'pro'`

## 6. Deploy Checklist (Real Payments)

### Clerk Dashboard

- [ ] **Switch to Production instance** — Clerk Dashboard → top-left instance switcher → create/select Production instance
- [ ] **Enable Billing** on the Production instance (Configure → Billing), same as dev
- [ ] **Re-create the Pro plan** on the Production instance (plans don't copy across instances)
- [ ] **Connect Stripe** — Clerk Dashboard (Production) → Billing → Connect Stripe → complete Stripe onboarding with a real business account
- [ ] **Add production webhook endpoint**: Webhooks → Add endpoint
  - URL: `https://yourdomain.com/api/webhooks/clerk`
  - Events: `subscriptionItem.active`, `subscriptionItem.canceled`, `subscriptionItem.ended`, `user.deleted`
  - Copy the new **Signing Secret**

### Environment Variables (Vercel / hosting)

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Production Clerk keys (from the Production instance — NOT the dev instance)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# From the production webhook endpoint above
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase — same values are fine unless you have a separate prod DB
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> `pk_live_` / `sk_live_` keys come from the **Production** Clerk instance, not the dev one. Using dev keys in production means no real charges go through.

### Stripe (via Clerk) — India caveat

Clerk Billing is a wrapper around Stripe — it requires you to connect your own Stripe account. **Stripe is invite-only in India** (not publicly available), so this is a real blocker.

Options:

1. **Stripe Atlas** — incorporate a US LLC (~$500 one-time), get a US Stripe account. Most common path for Indian indie devs taking international payments.
2. **Request early access** — https://stripe.com/en-in — fill the waitlist form, some get approved directly.
3. **Lemon Squeezy** — merchant of record, works in India, no Stripe needed. But Clerk Billing won't work with it — you'd need to replace `PricingTable` / webhook logic with their SDK.
4. **Paddle** — same idea as Lemon Squeezy, merchant of record, India-friendly.

> If you go with option 3 or 4, the webhook handler at `app/api/webhooks/clerk/route.ts` and the `PricingTable` component on `/pricing` would need to be replaced with the respective provider's SDK. The Supabase plan-sync logic stays the same.

Once you have a working Stripe account (via any path above):

- [ ] Connect it in Clerk Dashboard (Production) → Billing → Connect Stripe
- [ ] Stripe account fully activated (bank account linked) — Stripe holds payouts otherwise
- [ ] Test with a real card post-deploy (Stripe test cards don't work in live mode)

### After Deploy

- [ ] Visit `/pricing` — PricingTable should show the live plan with real Stripe checkout
- [ ] Subscribe with a real card → confirm `users.plan = 'pro'` in Supabase
- [ ] Cancel from Clerk's user portal → confirm `users.plan = 'free'` in Supabase
- [ ] Check Clerk Dashboard → Webhooks → recent deliveries to confirm events are arriving
