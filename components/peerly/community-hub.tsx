'use client'

import { Flame, ArrowUp, MessageSquare } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'

const DISCUSSIONS = [
  {
    id: 'd1',
    initials: 'AK',
    username: 'alice_dev',
    timestamp: '2m ago',
    message:
      'Really helpful breakdown on gradient descent — the visualisation analogy clicked for me.',
    replies: 4,
  },
  {
    id: 'd2',
    initials: 'BL',
    username: 'bob_learn',
    timestamp: '14m ago',
    message:
      'Should we add a node on Learning Rate Schedulers? Feels like a gap between GD and backprop.',
    replies: 7,
  },
  {
    id: 'd3',
    initials: 'CJ',
    username: 'carol_ai',
    timestamp: '1h ago',
    message:
      'The CNNs node needs more depth on pooling layers. Anyone want to co-author an update?',
    replies: 2,
  },
]

const QUERIES = [
  {
    id: 'q1',
    initials: 'MR',
    username: 'marcus_r',
    timestamp: '5m ago',
    question: 'Is attention the same as self-attention? What is the difference?',
    upvotes: 12,
    rep: '420',
  },
  {
    id: 'q2',
    initials: 'SP',
    username: 'sara_p',
    timestamp: '22m ago',
    question: 'Why does backprop struggle with vanishing gradients in deep nets?',
    upvotes: 8,
    rep: '310',
  },
  {
    id: 'q3',
    initials: 'TW',
    username: 'theo_w',
    timestamp: '3h ago',
    question: 'What are good resources for understanding the maths behind CNNs?',
    upvotes: 3,
    rep: '195',
  },
]

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
      {initials}
    </div>
  )
}

export function CommunityHub() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Live
        </span>
        <span className="text-sm font-semibold text-foreground">Community Hub</span>
      </div>

      <Tabs defaultValue="discussions">
        <TabsList className="mb-4 w-full bg-secondary">
          <TabsTrigger value="discussions" className="flex-1 text-xs">
            Discussions
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex-1 text-xs">
            Queries
          </TabsTrigger>
        </TabsList>

        {/* Sponsored banner */}
        <SponsoredCard ad={SPONSORED_ADS[1]} variant="banner" className="mb-4" />

        {/* Discussions */}
        <TabsContent value="discussions" className="mt-0 flex flex-col gap-3">
          {DISCUSSIONS.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <Avatar initials={d.initials} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">@{d.username}</p>
                  <p className="text-xs text-muted-foreground">{d.timestamp}</p>
                </div>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                {d.message}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">{d.replies} replies</span>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Queries */}
        <TabsContent value="queries" className="mt-0 flex flex-col gap-3">
          {QUERIES.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={q.initials} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">@{q.username}</p>
                    <p className="text-xs text-muted-foreground">{q.timestamp}</p>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
                >
                  {q.rep}
                </span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-foreground">{q.question}</p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Upvote"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>{q.upvotes}</span>
                </button>
                {q.upvotes > 5 && (
                  <Flame
                    className="h-3.5 w-3.5"
                    style={{ color: '#F97316' }}
                    aria-label="Trending"
                  />
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}