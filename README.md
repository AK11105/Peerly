# 🧵 Loom — From Chaos to Clarity

### **Landing Page** - https://peerlyco.vercel.app/


> **Weave your chaotic resources, informative Subreddits, YT links into a structured, community-powered knowledge map — in seconds.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase)](https://supabase.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk)](https://clerk.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20%2B%20Gemini-F55036)](https://groq.com)
[![Razorpay](https://img.shields.io/badge/Billing-Razorpay-02042B?logo=razorpay)](https://razorpay.com)

---

## 🔍 What is Loom?

Loom is a **collaborative learning platform** that "weaves" unstructured content — YT Links, Reddit threads, web articles, or any personal resource — into **structured knowledge weave**: AI-scaffolded learning paths that the community fills with real human expertise.

Think of it as **Wikipedia meets a knowledge graph** OR **NotebookLm meets community** OR **Reddit for research** OR (the list goes on), where AI builds the skeleton and humans provide the soul.

---

## 🚨 The Problem

| Pain Point | Reality |
|---|---|
| 📚 Information overload | Reddit has millions of expert insights buried in comment threads |
| 🔗 No structure | Valuable knowledge is scattered, unorganised, and unsearchable |
| 🤖 AI hallucinations | LLMs generate fluent but often unreliable explanations |
| 🧍 Solo learning | No community layer to validate, debate, or enrich content |
| 💸 No contributor incentives | Experts have no reason to share structured knowledge |

---

## ✅ The Solution

Loom introduces **Weaves** — directed knowledge graphs where:

1. **AI scaffolds** the structure (detects concepts, assigns depth & difficulty)
2. **Community fills** the content (humans replace AI drafts with real expertise)
3. **Admins curate** quality (approve, reject, or send to community vote)
4. **Everyone earns** for contributing (Lumens reward system)

```
Topic Input ──► AI Scaffold ──► Community Contributions ──► Verified Knowledge Map
                    │                      │
              Gap Detection          Admin Review / Vote
```
###**Loom keeps reorgansing newly added information so that we can learn any topic (with latest advancements) from Sratch -> Latest frontier trend in market.**  

---


## 🌟 Key Features

### 🧠 AI-Powered Scaffolding
- Auto-generates 6–8 prerequisite-ordered knowledge nodes per topic
- Uses **Groq (LLaMA 3.1/3.3)** with **Gemini 1.5 Flash** fallback
- Detects conceptual gaps after every contribution and inserts scaffold nodes automatically
- Validates node placement in the prerequisite tree using a two-pass AI formatter + validator

### 🌐 Reddit Importer (Loom Extension)
- Chrome extension: prefix any URL with `loom.` → instantly imports it as a structured weave
- Scrapes posts + comments → clusters by concept → generates source-attributed nodes
- Supports subreddit pages, individual posts, and keyword search queries
- Awards **+10 Lumens** to the importer for seeding a new weave

### 🗺️ Multiple Views
| View | Description |
|---|---|
| **Card Layout** | Depth-grouped node cards with difficulty indicators |
| **Mind Map** | Interactive ReactFlow graph with community/scaffold colour coding |
| **Node Deep Dive** | Full page with AI explainer, contributors, Reddit sources, prerequisites |

### 🏛️ Admin & Governance
- Every weave has one or more admins (set at creation)
- New node contributions go to `PENDING_ADMIN` → admin can **Approve**, **Reject**, or **Send to Community Vote**
- Community voting: 10-vote threshold, 60% majority required for approval
- Node flagging (spam/abuse), node deletion with automatic AI restructuring

### 💬 Community Hub
- Per-weave Discord-style sidebar with channels: `general`, `suggestions`, `deep-dives`, `help`, `theory`, `resources`
- Messages support Markdown, @mentions, slash commands (`/query` to escalate), link previews, and file attachments
- Sorting: **Top** (score + rep), **Hot** (trending), **New** (chronological)
- Realtime via Supabase subscriptions

### ⭐ Lumens Reward System
| Action | Lumens Earned |
|---|---|
| Fill a scaffold node | +50 LM |
| Add a new node (approved) | +25 LM |
| Add a perspective | +25 LM |
| Post a question | +5 LM |
| Post a message/reply | +2 LM |
| Receive an upvote | +1 LM |
| Import a weave | +10 LM |

Lumens are redeemable for partner rewards (Coursera, DataCamp, AWS, Notion, GitHub Pro).

### 🏆 Leaderboard
Auto-calculated **Rep Score**:
```
Rep = (scaffold fills × 100) + (other contributions × 40) + (lumens × 2)
```

### 💳 Billing (Razorpay) (demo) 
- One-time ₹99 Pro upgrade
- Payment verified server-side via HMAC signature
- Previously paid users can reactivate Pro for free

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 App                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Client UI   │  │  API Routes  │  │  Chrome Ext.  │  │
│  │  (React/TW)  │  │  (Edge/Node) │  │  (Manifest V3)│  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │         │
└─────────┼─────────────────┼───────────────────┼─────────┘
          │                 │                   │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌───────▼──────┐
    │  Supabase │    │  AI Layer   │    │   Razorpay   │
    │  Postgres │    │  Groq/Gem.  │    │   Payments   │
    │  Realtime │    │  (Scaffold, │    └──────────────┘
    │  Storage  │    │  Gap Detect,│
    │  Auth RLS │    │  Explain)   │
    └───────────┘    └─────────────┘
          │
    ┌─────▼─────┐
    │   Clerk   │
    │   Auth    │
    └───────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React, Tailwind CSS, shadcn/ui |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Auth** | Clerk |
| **AI** | Groq (LLaMA 3.1 8B / 3.3 70B), Google Gemini 1.5 Flash |
| **Mind Map** | ReactFlow (mind map), Cytoscape.js (export), Graph Viz |
| **Markdown** | react-markdown + remark-gfm + rehype-sanitize |
| **Payments** | Razorpay (one-time + HMAC verify) |
| **File Storage** | Supabase Storage (attachments bucket) |
| **Browser Ext** | Chrome Manifest V3, background service worker |
| **Analytics** | Vercel Analytics |
| **Export** | Graphviz DOT, Cytoscape JSON, Embeddable HTML, CSV |

---

## 📊 Database Schema (Key Tables)

```sql
weaves          -- Topics/learning maps (id, topic, field, source, source_url)
nodes           -- Knowledge nodes (title, description, depth, difficulty,
                --   is_scaffold, status, contributed_by, sources jsonb)
users           -- User profiles (display_name, plan, has_paid, lumens)
lumens          -- Balance ledger (username, balance)
contributions   -- Audit log (scaffold_fill, add_node, perspective, import)
weave_admins    -- Admin assignments (weave_id, username)
node_votes      -- Community voting (node_id, username, vote)
node_upvotes    -- Node upvote dedup (node_id, username)
community_messages / community_replies -- Per-weave chat
community_upvotes -- Message/reply upvote dedup
```

---

## 🔄 User Flow

```
New User
  │
  ▼
Sign Up (Clerk) → Onboarding Tour → Select Intent
  │                                  (learn / contribute / explore / class)
  ▼
Explore Page
  │
  ├─► Browse by Field  ──► Open Weave ──► Read Nodes
  │                                           │
  ├─► Create Weave ──► AI Scaffolds           ├─► Fill Scaffold (+50 LM)
  │        │                                  ├─► Add Node (→ Admin Review)
  │        └─► Add Admins                     ├─► Add Perspective (+25 LM)
  │                                           └─► Deep Dive Page
  ├─► Import (loom.reddit.com/r/...) ──► Auto-weave
  │
  └─► Community Hub ──► Discuss / Ask / Upvote
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Clerk application
- Groq API key
- Google Gemini API key
- Razorpay account (for billing)

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI
GROQ_API_KEY=
GEMINI_API_KEY=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Installation

```bash
git clone https://github.com/your-org/loom
cd loom
npm install

# Run database migrations
# Paste supabase/schema.sql into Supabase SQL Editor

npm run dev
```

### Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` folder
4. Navigate to `loom.reddit.com/r/machinelearning` — it redirects automatically

---

## 📁 Project Structure

```
loom/
├── app/
│   ├── explore/          # Browse weaves by field
│   ├── weave/[id]/       # Weave viewer (cards + mind map + community hub)
│   ├── node/[weaveId]/[nodeId]/  # Node deep dive + AI explainer
│   ├── create/           # Multi-step weave creation wizard
│   ├── admin/            # Admin panel (pending nodes, votes, history)
│   ├── leaderboard/      # Community rankings
│   ├── profile/          # User profile + lumens wallet
│   ├── pricing/          # Razorpay Pro upgrade
│   └── api/              # All API routes
│       ├── weaves/       # CRUD, generate, import, contribute, vote
│       ├── nodes/        # Explain, vote, flag
│       ├── community/    # Messages, replies, upvotes
│       ├── razorpay/     # create-order, verify
│       └── user/         # Plan, display-name, sync
├── components/
│   ├── peerly/           # Domain components (WeaveViewer, CommunityHub, etc.)
│   └── ui/               # shadcn/ui component library
├── lib/                  # Utilities (api.ts, ai.ts, types.ts, export-weave.ts)
├── hooks/                # Custom React hooks (realtime, onboarding, lumens)
├── extension/            # Chrome extension (Manifest V3)
└── supabase/             # Schema SQL + migrations
```

---

## 🎯 What Makes Loom Different

| Feature | Loom | Wikipedia | Reddit | YouTube |
|---|---|---|---|---|
| Structured prerequisite ordering | ✅ | ❌ | ❌ | ❌ |
| AI gap detection | ✅ | ❌ | ❌ | ❌ |
| Import from any URL/Reddit | ✅ | ❌ | ❌ | ❌ |
| Community contributions | ✅ | ✅ | ✅ | ❌ |
| Contributor rewards | ✅ | ❌ | Karma | ❌ |
| Real-time community chat | ✅ | ❌ | ✅ | ✅ |
| Export (DOT / JSON / HTML) | ✅ | ❌ | ❌ | ❌ |
| Admin + voting governance | ✅ | ✅ | ❌ | ❌ |

---

## 📈 Current Progress

| Module | Status |
|---|---|
| Explore Page (field browsing + search) | ✅ Complete |
| Weave Creation (AI scaffold + admin) | ✅ Complete |
| Card Layout + Mind Map View | ✅ Complete |
| Node Deep Dive + AI Explainer | ✅ Complete |
| Admin Panel (approve / reject / vote) | ✅ Complete |
| Community Hub (6 channels, realtime) | ✅ Complete |
| Lumens System + Redeem | ✅ Complete |
| Authentication (Clerk) | ✅ Complete |
| Billing (Razorpay one-time) | ✅ Complete |
| Reddit Importer + Chrome Extension | ✅ Complete |
| Leaderboard (rep heuristic) | ✅ Complete |
| Export (Graphviz / Cytoscape / HTML / CSV) | ✅ Complete |
| Onboarding Tour | ✅ Complete |
| Multi-theme + Accent Colors | ✅ Complete |

---

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Stripe integration for global billing
- [ ] AI-generated quizzes per node
- [ ] Weave embedding API for third-party sites
- [ ] Classroom mode (invite cohort, track progress)
- [ ] Verified expert badges
- [ ] Weave versioning + restore snapshots

---

## 👥 Team

Built with ❤️ for the hackathon. Contributions, feedback, and stars are welcome.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.


New designs -
https://stitch.withgoogle.com/projects/16902019438627232739



