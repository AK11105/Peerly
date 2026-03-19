'use client'

import { useState } from 'react'
import {
  Flame, ArrowUp, MessageSquare, Hash,
  ChevronRight, ChevronDown, Users, Zap, Plus, Search
} from 'lucide-react'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'

interface ChannelItem {
  id: string
  name: string
  initials: string
  username: string
  timestamp: string
  unread: number
  // discussion fields
  message?: string
  replies?: number
  // query fields
  question?: string
  upvotes?: number
  rep?: string
}

interface Channel {
  category: string
  items: ChannelItem[]
}

const CHANNELS: Channel[] = [
  {
    category: 'DISCUSSIONS',
    items: [
      { id: 'd1', name: 'general', initials: 'AK', username: 'alice_dev', timestamp: '2m ago', message: 'Really helpful breakdown on gradient descent — the visualisation analogy clicked for me.', replies: 4, unread: 2 },
      { id: 'd2', name: 'suggestions', initials: 'BL', username: 'bob_learn', timestamp: '14m ago', message: 'Should we add a node on Learning Rate Schedulers? Feels like a gap between GD and backprop.', replies: 7, unread: 7 },
      { id: 'd3', name: 'deep-dives', initials: 'CJ', username: 'carol_ai', timestamp: '1h ago', message: 'The CNNs node needs more depth on pooling layers. Anyone want to co-author an update?', replies: 2, unread: 0 },
    ],
  },
  {
    category: 'QUERIES',
    items: [
      { id: 'q1', name: 'help', initials: 'MR', username: 'marcus_r', timestamp: '5m ago', question: 'Is attention the same as self-attention? What is the difference?', upvotes: 12, rep: '420', unread: 1 },
      { id: 'q2', name: 'theory', initials: 'SP', username: 'sara_p', timestamp: '22m ago', question: 'Why does backprop struggle with vanishing gradients in deep nets?', upvotes: 8, rep: '310', unread: 0 },
      { id: 'q3', name: 'resources', initials: 'TW', username: 'theo_w', timestamp: '3h ago', question: 'What are good resources for understanding the maths behind CNNs?', upvotes: 3, rep: '195', unread: 0 },
    ],
  },
]

const ONLINE_MEMBERS = [
  { initials: 'AK', name: 'alice_dev', status: 'online', activity: 'Editing · Gradient Descent' },
  { initials: 'BL', name: 'bob_learn', status: 'online', activity: 'Reading · Neural Nets' },
  { initials: 'CJ', name: 'carol_ai', status: 'idle', activity: 'Away' },
  { initials: 'MR', name: 'marcus_r', status: 'online', activity: 'Contributing node' },
]

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
      {initials}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d0d] ${status === 'online' ? 'bg-primary' : 'bg-yellow-500'}`} />
  )
}

export function CommunityHub() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeChannel, setActiveChannel] = useState<string>('d1')
  const [showMembers, setShowMembers] = useState(false)
  const [msgInput, setMsgInput] = useState('')

  const toggleCategory = (cat: string) =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))

  const allItems = CHANNELS.flatMap(c => c.items)
  const activeItem = allItems.find(i => i.id === activeChannel)
  const activeCat = CHANNELS.find(c => c.items.some(i => i.id === activeChannel))

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d0d]">

      {/* ── Narrow channel-list column ── */}
      <div className="flex w-44 shrink-0 flex-col border-r border-border/40 overflow-y-auto">

        {/* Server header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 sticky top-0 bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-bold text-foreground">Community</span>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-1 rounded transition-colors ${showMembers ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Channels */}
        <div className="flex-1 py-2">
          {CHANNELS.map(cat => (
            <div key={cat.category} className="mb-1">
              <button
                onClick={() => toggleCategory(cat.category)}
                className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {collapsed[cat.category]
                  ? <ChevronRight className="h-2.5 w-2.5" />
                  : <ChevronDown className="h-2.5 w-2.5" />}
                {cat.category}
              </button>

              {!collapsed[cat.category] && (
                <div className="mt-0.5 px-2 flex flex-col gap-0.5">
                  {cat.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveChannel(item.id); setShowMembers(false) }}
                      className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                        activeChannel === item.id && !showMembers
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                    >
                      <Hash className={`h-3 w-3 shrink-0 ${activeChannel === item.id && !showMembers ? 'text-primary' : ''}`} />
                      <span className="flex-1 truncate text-xs">{item.name}</span>
                      {item.unread > 0 && (activeChannel !== item.id || showMembers) && (
                        <span className="shrink-0 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-4">
                          {item.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom: self user bar */}
        <div className="border-t border-border/40 px-2 py-2 flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">D</div>
            <StatusDot status="online" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">demo_user</p>
            <p className="text-[10px] text-primary truncate">Online</p>
          </div>
        </div>
      </div>

      {/* ── Main content panel ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {showMembers ? (
          /* Members list */
          <>
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Members</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{ONLINE_MEMBERS.length} shown</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Online — {ONLINE_MEMBERS.filter(m => m.status === 'online').length}
              </p>
              {ONLINE_MEMBERS.map(m => (
                <div key={m.name} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">{m.initials}</div>
                    <StatusDot status={m.status} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">@{m.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.activity}</p>
                  </div>
                </div>
              ))}
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Offline — 12
              </p>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 opacity-35">
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center text-xs text-muted-foreground">?</div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d0d] bg-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">member_{i + 5}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Channel messages */
          <>
            {/* Channel header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">{activeItem?.name ?? 'general'}</span>
              <div className="ml-auto flex items-center gap-2">
                {activeItem && activeItem.upvotes != null && activeItem.upvotes > 5 && (
                  <div className="flex items-center gap-1 text-[10px] text-orange-400">
                    <Flame className="h-3 w-3" />
                    <span>Hot</span>
                  </div>
                )}
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Sponsored */}
            <div className="px-3 pt-3 shrink-0">
              <SponsoredCard ad={SPONSORED_ADS[1]} variant="banner" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {activeCat?.items.map((item, idx) => {
                const isActive = item.id === activeChannel
                return (
                  <div
                    key={item.id}
                    className={`group rounded-lg px-3 py-2.5 cursor-pointer transition-all ${isActive ? 'bg-secondary/60' : 'hover:bg-secondary/30'}`}
                    onClick={() => setActiveChannel(item.id)}
                  >
                    {/* Date divider for first message */}
                    {idx === 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="text-[10px] text-muted-foreground">Today</span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <Avatar initials={item.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground">@{item.username}</span>
                          <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                          {item.rep && (
                            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                              {item.rep}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {item.message ?? item.question}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {item.replies != null && (
                            <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                              <MessageSquare className="h-3 w-3" />
                              {item.replies} replies
                            </button>
                          )}
                          {item.upvotes != null && (
                            <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                              <ArrowUp className="h-3 w-3" />
                              {item.upvotes}
                              {item.upvotes > 5 && <Flame className="h-3 w-3 text-orange-400 ml-0.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Message input */}
            <div className="shrink-0 px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 border border-border/50 px-3 py-2 focus-within:border-primary/40 transition-colors">
                <input
                  type="text"
                  placeholder={`Message #${activeItem?.name ?? 'general'}`}
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  <Zap className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}