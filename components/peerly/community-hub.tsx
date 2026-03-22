'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Flame, ArrowUp, MessageSquare, Hash,
  ChevronRight, ChevronDown, Users, Zap, Plus, Search, Send, X, CornerDownRight, Trash2, Paperclip
} from 'lucide-react'
import { SponsoredCard, SPONSORED_ADS } from './sponsored-card'
import { toast } from 'sonner'
import { useLumens } from '@/lib/lumens-context'

// ── Types ──────────────────────────────────────────────────────────────────

interface LinkPreview {
  url: string
  title: string
  description: string
  image?: string
  domain: string
}

interface Reply {
  id: string
  initials: string
  username: string
  timestamp: string
  createdAt: number      // ms since epoch — for reliable sort
  text: string
  upvotes: number
  isOwn?: boolean
  images?: string[]
  linkPreview?: LinkPreview
}

interface Message {
  id: string
  initials: string
  username: string
  timestamp: string
  createdAt: number      // ms since epoch — for reliable sort
  unread: boolean
  text: string
  replies: Reply[]
  upvotes: number
  rep?: string
  isOwn?: boolean
  pendingSend?: boolean
  isQuestion?: boolean
  images?: string[]
  linkPreview?: LinkPreview
}

// Each channel has a unique id, display name, category, and its own message list
interface Channel {
  id: string            // unique: 'general', 'suggestions', etc.
  name: string          // display name
  category: 'DISCUSSIONS' | 'QUERIES'
  isQuery: boolean
  messages: Message[]
}

// ── Known users (for @mention autocomplete) ───────────────────────────────

const KNOWN_USERS = [
  { username: 'alice_dev',   initials: 'AK', rep: 'Expert' },
  { username: 'bob_learn',   initials: 'BL', rep: 'Member' },
  { username: 'carol_ai',    initials: 'CJ', rep: 'Top Contributor' },
  { username: 'marcus_r',    initials: 'MR', rep: 'Member' },
  { username: 'sara_p',      initials: 'SP', rep: 'Member' },
  { username: 'demo_user',   initials: 'D',  rep: 'You' },
]

// ── Mention helpers ────────────────────────────────────────────────────────

/** Returns the @-query being typed at cursor position, or null */
function getMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor)
  const match = before.match(/@(\w*)$/)
  return match ? match[1] : null
}

/** Replace the partial @query before cursor with the chosen username */
function insertMention(value: string, cursor: number, username: string): { text: string; cursor: number } {
  const before = value.slice(0, cursor)
  const after = value.slice(cursor)
  const replaced = before.replace(/@\w*$/, `@${username} `)
  return { text: replaced + after, cursor: replaced.length }
}

/** Render text with @mentions highlighted */
function renderWithMentions(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-primary font-semibold cursor-pointer hover:underline">{part}</span>
      : <span key={i}>{part}</span>
  )
}

// ── Seed data ──────────────────────────────────────────────────────────────

// Seed factory — called fresh per weave so each gets its own copy
function makeSeedChannels(): Channel[] {
  const now = Date.now()
  const t = (minsAgo: number) => now - minsAgo * 60_000
  return [
    {
      id: 'general', name: 'general', category: 'DISCUSSIONS', isQuery: false,
      messages: [
        {
          id: 'gen-1', initials: 'AK', username: 'alice_dev',
          timestamp: '2m ago', createdAt: t(2), unread: true,
          text: 'Really helpful breakdown on gradient descent — the visualisation analogy clicked for me.',
          replies: [
            { id: 'gen-1-r1', initials: 'BL', username: 'bob_learn', timestamp: '1m ago', createdAt: t(1), text: 'Agreed! The ball rolling down a slope metaphor is great.', upvotes: 2 },
          ],
          upvotes: 3,
        },
        {
          id: 'gen-2', initials: 'BL', username: 'bob_learn',
          timestamp: '14m ago', createdAt: t(14), unread: false,
          text: 'Anyone else notice the weave for "Calculus" is missing a node on partial derivatives?',
          replies: [], upvotes: 1,
        },
      ],
    },
    {
      id: 'suggestions', name: 'suggestions', category: 'DISCUSSIONS', isQuery: false,
      messages: [
        {
          id: 'sug-1', initials: 'BL', username: 'bob_learn',
          timestamp: '14m ago', createdAt: t(14), unread: true,
          text: 'Should we add a node on Learning Rate Schedulers? Feels like a gap between GD and backprop.',
          replies: [
            { id: 'sug-1-r1', initials: 'CJ', username: 'carol_ai', timestamp: '10m ago', createdAt: t(10), text: 'Seconded. Cosine annealing and step decay are both worth covering.', upvotes: 3 },
            { id: 'sug-1-r2', initials: 'AK', username: 'alice_dev', timestamp: '8m ago', createdAt: t(8), text: 'I can scaffold that node if an admin approves it.', upvotes: 1 },
          ],
          upvotes: 5,
        },
        {
          id: 'sug-2', initials: 'CJ', username: 'carol_ai',
          timestamp: '45m ago', createdAt: t(45), unread: false,
          text: 'Dark mode toggle for node detail pages would be nice.',
          replies: [], upvotes: 2,
        },
      ],
    },
    {
      id: 'deep-dives', name: 'deep-dives', category: 'DISCUSSIONS', isQuery: false,
      messages: [
        {
          id: 'dd-1', initials: 'CJ', username: 'carol_ai',
          timestamp: '1h ago', createdAt: t(60), unread: true,
          text: 'The CNNs node needs more depth on pooling layers. Anyone want to co-author an update?',
          replies: [
            { id: 'dd-1-r1', initials: 'MR', username: 'marcus_r', timestamp: '55m ago', createdAt: t(55), text: 'I wrote my thesis on this — happy to contribute. DM me.', upvotes: 4 },
            { id: 'dd-1-r2', initials: 'SP', username: 'sara_p', timestamp: '50m ago', createdAt: t(50), text: 'Global average pooling vs max pooling would be a great comparison.', upvotes: 2 },
          ],
          upvotes: 7,
        },
      ],
    },
    {
      id: 'help', name: 'help', category: 'QUERIES', isQuery: true,
      messages: [
        {
          id: 'help-1', initials: 'MR', username: 'marcus_r',
          timestamp: '5m ago', createdAt: t(5), unread: true, isQuestion: true,
          text: 'Is attention the same as self-attention? What is the difference?',
          replies: [
            { id: 'help-1-r1', initials: 'AK', username: 'alice_dev', timestamp: '3m ago', createdAt: t(3), text: 'Self-attention is a special case where Q, K, V all come from the same sequence. Attention is more general — Q can come from a different sequence (cross-attention).', upvotes: 6 },
          ],
          upvotes: 12, rep: '420',
        },
        {
          id: 'help-2', initials: 'TW', username: 'theo_w',
          timestamp: '2h ago', createdAt: t(120), unread: false, isQuestion: true,
          text: 'How do I contribute to a scaffold node that already has a description?',
          replies: [], upvotes: 4, rep: '120',
        },
      ],
    },
    {
      id: 'theory', name: 'theory', category: 'QUERIES', isQuery: true,
      messages: [
        {
          id: 'theory-1', initials: 'SP', username: 'sara_p',
          timestamp: '22m ago', createdAt: t(22), unread: false, isQuestion: true,
          text: 'Why does backprop struggle with vanishing gradients in deep nets?',
          replies: [
            { id: 'theory-1-r1', initials: 'CJ', username: 'carol_ai', timestamp: '18m ago', createdAt: t(18), text: 'Sigmoid saturates near 0/1, its derivative is near 0 there. Multiply many of those across layers and the gradient vanishes.', upvotes: 5 },
            { id: 'theory-1-r2', initials: 'BL', username: 'bob_learn', timestamp: '15m ago', createdAt: t(15), text: 'ReLU was a big fix for this — derivative is exactly 1 for positive inputs, no saturation.', upvotes: 3 },
          ],
          upvotes: 8, rep: '310',
        },
      ],
    },
    {
      id: 'resources', name: 'resources', category: 'QUERIES', isQuery: true,
      messages: [
        {
          id: 'res-1', initials: 'TW', username: 'theo_w',
          timestamp: '3h ago', createdAt: t(180), unread: false, isQuestion: true,
          text: 'What are good resources for understanding the maths behind CNNs?',
          replies: [
            { id: 'res-1-r1', initials: 'MR', username: 'marcus_r', timestamp: '2h ago', createdAt: t(120), text: 'cs231n lecture notes (Stanford) are the gold standard. Chapter 9 of Deep Learning by Goodfellow is also excellent.', upvotes: 7 },
            { id: 'res-1-r2', initials: 'SP', username: 'sara_p', timestamp: '90m ago', createdAt: t(90), text: '3Blue1Brown has a great visual series on convolutions.', upvotes: 4 },
          ],
          upvotes: 3, rep: '195',
        },
      ],
    },
  ]
}

const ONLINE_MEMBERS = [
  { initials: 'AK', name: 'alice_dev', status: 'online', activity: 'Editing · Gradient Descent' },
  { initials: 'BL', name: 'bob_learn', status: 'online', activity: 'Reading · Neural Nets' },
  { initials: 'CJ', name: 'carol_ai', status: 'idle', activity: 'Away' },
  { initials: 'MR', name: 'marcus_r', status: 'online', activity: 'Contributing node' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

/** Read File objects to base64 data-URL strings */
async function readFilesAsBase64(files: FileList | File[]): Promise<string[]> {
  return Promise.all(Array.from(files).map(file =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  ))
}

/** Extract domain from URL */
function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Detect first URL in a string */
function detectUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : null
}

/** Fetch Open Graph preview via jsonlink.io (free, no key, works for YouTube/Twitter/news) */
async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const endpoint = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json() as {
      title?: string; description?: string; images?: string[]; url?: string
    }
    const title       = (data.title ?? extractDomain(url)).slice(0, 100)
    const description = (data.description ?? '').slice(0, 200)
    const image       = data.images?.[0]
    return { url, title, description, image, domain: extractDomain(url) }
  } catch {
    return null
  }
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d0d] ${
      status === 'online' ? 'bg-primary' : 'bg-yellow-500'
    }`} />
  )
}

// ── localStorage helpers ───────────────────────────────────────────────────

// Keys are namespaced per weave so each community is isolated
function lsKeys(weaveId: string) {
  const ns = `peerly_community_${weaveId}`
  return {
    channels:    `${ns}_channels`,
    voted:       `${ns}_voted`,
    replyVoted:  `${ns}_reply_voted`,
    active:      `${ns}_active_channel`,
  }
}

function loadChannels(weaveId: string): Channel[] {
  if (typeof window === 'undefined') return makeSeedChannels()
  try {
    const raw = localStorage.getItem(lsKeys(weaveId).channels)
    if (!raw) return makeSeedChannels()
    const parsed = JSON.parse(raw) as Channel[]
    // Back-fill createdAt for any stored messages that predate the field
    return parsed.map(ch => ({
      ...ch,
      messages: ch.messages.map(m => ({
        ...m,
        createdAt: m.createdAt ?? Date.now(),
        replies: m.replies.map(r => ({ ...r, createdAt: r.createdAt ?? Date.now() })),
      })),
    }))
  } catch { return makeSeedChannels() }
}

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveChannels(weaveId: string, channels: Channel[]) {
  try { localStorage.setItem(lsKeys(weaveId).channels, JSON.stringify(channels)) } catch {}
}

function saveSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])) } catch {}
}

// ── Main component ─────────────────────────────────────────────────────────

interface CommunityHubProps {
  weaveId?: string       // e.g. weave slug or id — defaults to 'global'
  weaveName?: string     // display name shown in the header
}

export function CommunityHub({ weaveId = 'global', weaveName }: CommunityHubProps) {
  const { earn } = useLumens()

  // keys is stable per weaveId — memoised so effects deps don't fire on every render
  const keys = useMemo(() => lsKeys(weaveId), [weaveId])

  const [channels, setChannels] = useState<Channel[]>(() => loadChannels(weaveId))
  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'general'
    return localStorage.getItem(keys.active) ?? 'general'
  })
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({})
  const [showMembers, setShowMembers] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sortMode, setSortMode] = useState<'top' | 'new' | 'hot'>('top')
  const [votedIds, setVotedIds] = useState<Set<string>>(() => loadSet(keys.voted))
  const [replyVotedIds, setReplyVotedIds] = useState<Set<string>>(() => loadSet(keys.replyVoted))
  // expanded reply threads: set of message ids
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  // which message we're replying to (null = new top-level post)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [newPostChannelId, setNewPostChannelId] = useState<string>('general')
  const [newPostType, setNewPostType] = useState<'message' | 'question'>('message')
  // confirmDelete: { kind: 'message', msgId } | { kind: 'reply', msgId, replyId } | null
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: 'message'; msgId: string }
    | { kind: 'reply'; msgId: string; replyId: string }
    | null
  >(null)

  // ── Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // ── Mention autocomplete state ─────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)   // null = closed
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionAnchor, setMentionAnchor] = useState<'main' | 'reply' | 'modal'>('main')
  const mentionResults = mentionQuery !== null
    ? KNOWN_USERS.filter(u =>
        u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) &&
        u.username !== 'demo_user'
      )
    : []

  // ── Media state ───────────────────────────────────────────────────────────
  // pending attachments per input surface
  const [mainImages,  setMainImages]  = useState<string[]>([])
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [modalImages, setModalImages] = useState<string[]>([])
  // link preview per surface (null = no URL found, undefined = loading)
  const [mainPreview,  setMainPreview]  = useState<LinkPreview | null | undefined>(null)
  const [replyPreview, setReplyPreview] = useState<LinkPreview | null | undefined>(null)
  const [modalPreview, setModalPreview] = useState<LinkPreview | null | undefined>(null)

  const mainFileRef  = useRef<HTMLInputElement>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)
  const modalFileRef = useRef<HTMLInputElement>(null)

  const msgEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)
  const newPostTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeChannel = channels.find(c => c.id === activeChannelId)!

  const discussionChannels = channels.filter(c => c.category === 'DISCUSSIONS')
  const queryChannels = channels.filter(c => c.category === 'QUERIES')

  // ── Scoring & sorting ────────────────────────────────────────────────────

  function ageMinutes(m: Message): number {
    // Use real createdAt if available, otherwise fall back to parsed timestamp string
    if (m.createdAt) return (Date.now() - m.createdAt) / 60_000
    const match = m.timestamp.match(/^(\d+)(m|h|d)/)
    if (!match) return 0
    return Number(match[1]) * (match[2] === 'h' ? 60 : match[2] === 'd' ? 1440 : 1)
  }

  function scoreMessage(m: Message): number {
    if (m.pendingSend) return -Infinity
    const rep    = parseFloat(m.rep ?? '0') || 0
    const decay  = ageMinutes(m) / 60          // hours old
    return m.upvotes * 2 + rep * 0.01 + m.replies.length * 1.5 - decay
  }

  function hotScore(m: Message): number {
    if (m.pendingSend) return -Infinity
    return m.upvotes * 3 + m.replies.length - ageMinutes(m) * 0.05
  }

  const baseMessages = searchQuery.trim()
    ? activeChannel.messages.filter(m =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeChannel.messages

  const displayedMessages = [...baseMessages].sort((a, b) => {
    // Pending (own unsent) posts always pin to bottom regardless of mode
    if (a.pendingSend && !b.pendingSend) return 1
    if (!a.pendingSend && b.pendingSend) return -1
    if (sortMode === 'new') {
      // newest first: higher createdAt = smaller index
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    }
    if (sortMode === 'hot') return hotScore(b) - hotScore(a)
    return scoreMessage(b) - scoreMessage(a)   // 'top' default
  })

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannelId, channels])

  // Mark channel read on open
  useEffect(() => {
    setChannels(prev => prev.map(ch =>
      ch.id === activeChannelId
        ? { ...ch, messages: ch.messages.map(m => ({ ...m, unread: false })) }
        : ch
    ))
    setExpandedReplies(new Set())
    setReplyingTo(null)
    setMsgInput('')
  }, [activeChannelId])

  // Simulate an inbound message every 25-35s in a random channel
  useEffect(() => {
    const GHOST: { channelId: string; text: string; initials: string; username: string; isQuestion?: boolean }[] = [
      { channelId: 'general', initials: 'EL', username: 'elena_ml', text: 'Just filled the Backpropagation scaffold — check it out!' },
      { channelId: 'suggestions', initials: 'JD', username: 'jan_dev', text: 'Would love a "related weaves" sidebar on each node.' },
      { channelId: 'theory', initials: 'PR', username: 'priya_cs', text: 'What is the difference between batch and layer normalization?', isQuestion: true },
      { channelId: 'help', initials: 'RK', username: 'ravi_k', text: 'Can scaffold nodes have multiple contributors?', isQuestion: true },
    ]
    const id = setInterval(() => {
      const g = GHOST[Math.floor(Math.random() * GHOST.length)]
      const newMsg: Message = {
        id: genId(),
        initials: g.initials,
        username: g.username,
        timestamp: 'just now',
        createdAt: Date.now(),
        unread: g.channelId !== activeChannelId,
        text: g.text,
        replies: [],
        upvotes: 0,
        isQuestion: g.isQuestion,
      }
      setChannels(prev => prev.map(ch =>
        ch.id === g.channelId ? { ...ch, messages: [...ch.messages, newMsg] } : ch
      ))
    }, 25000 + Math.random() * 10000)
    return () => clearInterval(id)
  }, [activeChannelId])

  // ── Persistence ──────────────────────────────────────────────────────────

  // Persist channels whenever they change (debounced 300ms)
  useEffect(() => {
    const t = setTimeout(() => saveChannels(weaveId, channels), 300)
    return () => clearTimeout(t)
  }, [channels, weaveId])

  useEffect(() => { saveSet(keys.voted, votedIds) }, [votedIds, keys.voted])
  useEffect(() => { saveSet(keys.replyVoted, replyVotedIds) }, [replyVotedIds, keys.replyVoted])
  useEffect(() => {
    try { localStorage.setItem(keys.active, activeChannelId) } catch {}
  }, [activeChannelId, keys.active])



  // When weaveId prop changes (user opens a different weave), reload all state
  useEffect(() => {
    const k = lsKeys(weaveId)
    setChannels(loadChannels(weaveId))
    setActiveChannelId(
      (typeof window !== 'undefined' ? localStorage.getItem(k.active) : null) ?? 'general'
    )
    setVotedIds(loadSet(k.voted))
    setReplyVotedIds(loadSet(k.replyVoted))
    setExpandedReplies(new Set())
    setReplyingTo(null)
    setMsgInput('')
    setSearchQuery('')
    setShowSearch(false)
    setSortMode('top')
  }, [weaveId])

  const switchChannel = useCallback((id: string) => {
    setActiveChannelId(id)
    setShowMembers(false)
    setShowSearch(false)
    setSearchQuery('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const toggleReplies = useCallback((msgId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      next.has(msgId) ? next.delete(msgId) : next.add(msgId)
      return next
    })
  }, [])

  const startReply = useCallback((msgId: string, username: string) => {
    setReplyingTo(msgId)
    setExpandedReplies(prev => new Set(prev).add(msgId)) // keep thread open
    setMsgInput(`@${username} `)
    inputRef.current?.focus()
  }, [])

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
    setMsgInput('')
  }, [])

  const handleUpvote = useCallback((msgId: string) => {
    const alreadyVoted = votedIds.has(msgId)
    setVotedIds(prev => {
      const s = new Set(prev)
      alreadyVoted ? s.delete(msgId) : s.add(msgId)
      return s
    })
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id === msgId
            ? { ...m, upvotes: alreadyVoted ? Math.max(0, m.upvotes - 1) : m.upvotes + 1 }
            : m
        ),
      }
    ))
    if (!alreadyVoted) earn(1)
  }, [votedIds, activeChannelId, earn])

  // replyId is globally unique so we can use it as the vote key directly
  const handleReplyUpvote = useCallback((msgId: string, replyId: string) => {
    const alreadyVoted = replyVotedIds.has(replyId)
    setReplyVotedIds(prev => {
      const s = new Set(prev)
      alreadyVoted ? s.delete(replyId) : s.add(replyId)
      return s
    })
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id !== msgId ? m : {
            ...m,
            replies: m.replies.map(r =>
              r.id !== replyId ? r : {
                ...r,
                upvotes: alreadyVoted ? Math.max(0, r.upvotes - 1) : r.upvotes + 1,
              }
            ),
          }
        ),
      }
    ))
    if (!alreadyVoted) earn(1)
  }, [replyVotedIds, activeChannelId, earn])

  const handleDeleteMessage = useCallback((msgId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.filter(m => m.id !== msgId),
      }
    ))
    setConfirmDelete(null)
    toast('Post deleted.', { style: { borderLeft: '3px solid #EF4444' } })
  }, [activeChannelId])

  const handleDeleteReply = useCallback((msgId: string, replyId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id !== activeChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m =>
          m.id !== msgId ? m : { ...m, replies: m.replies.filter(r => r.id !== replyId) }
        ),
      }
    ))
    setConfirmDelete(null)
    toast('Reply deleted.', { style: { borderLeft: '3px solid #EF4444' } })
  }, [activeChannelId])

  const handleSend = useCallback(async () => {
    const text = msgInput.trim()
    const surface = replyingTo ? 'reply' : 'main'
    const images  = surface === 'reply' ? replyImages : mainImages
    const preview = surface === 'reply' ? replyPreview : mainPreview
    if (!text && images.length === 0) return
    if (!activeChannel) return

    setSending(true)
    setMsgInput('')
    clearMedia(surface)

    if (replyingTo) {
      const reply: Reply = {
        id: genId(),
        initials: 'D',
        username: 'demo_user',
        timestamp: 'just now',
        createdAt: Date.now(),
        text,
        upvotes: 0,
        isOwn: true,
        images: images.length > 0 ? images : undefined,
        linkPreview: preview ?? undefined,
      }
      setChannels(prev => prev.map(ch =>
        ch.id !== activeChannelId ? ch : {
          ...ch,
          messages: ch.messages.map(m =>
            m.id === replyingTo ? { ...m, replies: [...m.replies, reply] } : m
          ),
        }
      ))
      setReplyingTo(null)
      await new Promise(r => setTimeout(r, 400))
      setSending(false)
      earn(2)
      toast.success('Reply posted!', { style: { borderLeft: '3px solid #22C55E' } })
    } else {
      const newMsg: Message = {
        id: genId(),
        initials: 'D',
        username: 'demo_user',
        timestamp: 'just now',
        createdAt: Date.now(),
        unread: false,
        text,
        replies: [],
        upvotes: 0,
        isOwn: true,
        pendingSend: true,
        isQuestion: activeChannel.isQuery,
        images: images.length > 0 ? images : undefined,
        linkPreview: preview ?? undefined,
      }
      setChannels(prev => prev.map(ch =>
        ch.id !== activeChannelId ? ch : { ...ch, messages: [...ch.messages, newMsg] }
      ))
      await new Promise(r => setTimeout(r, 600))
      setChannels(prev => prev.map(ch =>
        ch.id !== activeChannelId ? ch : {
          ...ch,
          messages: ch.messages.map(m =>
            m.id === newMsg.id ? { ...m, pendingSend: false } : m
          ),
        }
      ))
      setSending(false)
      earn(activeChannel.isQuery ? 5 : 2)
      toast.success(activeChannel.isQuery ? 'Question posted! +5 LM' : 'Message sent!', {
        style: { borderLeft: '3px solid #22C55E' },
      })
    }
  }, [msgInput, replyingTo, activeChannel, activeChannelId, earn, mainImages, replyImages, mainPreview, replyPreview])

  const handleNewPost = useCallback(async () => {
    const text = newPostText.trim()
    if (!text && modalImages.length === 0) return
    const targetChannel = channels.find(c => c.id === newPostChannelId)
    if (!targetChannel) return
    setSending(true)
    const isQ = newPostType === 'question' || targetChannel.isQuery
    const newMsg: Message = {
      id: genId(),
      initials: 'D',
      username: 'demo_user',
      timestamp: 'just now',
      createdAt: Date.now(),
      unread: false,
      text,
      replies: [],
      upvotes: 0,
      isOwn: true,
      pendingSend: true,
      isQuestion: isQ,
      images: modalImages.length > 0 ? modalImages : undefined,
      linkPreview: modalPreview ?? undefined,
    }
    setChannels(prev => prev.map(ch =>
      ch.id !== newPostChannelId ? ch : { ...ch, messages: [...ch.messages, newMsg] }
    ))
    // Switch to the channel the post went to
    setActiveChannelId(newPostChannelId)
    await new Promise(r => setTimeout(r, 500))
    setChannels(prev => prev.map(ch =>
      ch.id !== newPostChannelId ? ch : {
        ...ch,
        messages: ch.messages.map(m => m.id === newMsg.id ? { ...m, pendingSend: false } : m),
      }
    ))
    setSending(false)
    setShowNewPost(false)
    setNewPostText('')
    clearMedia('modal')
    earn(isQ ? 5 : 2)
    toast.success(`Posted to #${targetChannel.name}!`, { style: { borderLeft: '3px solid #22C55E' } })
  }, [newPostText, newPostType, newPostChannelId, channels, earn, modalImages, modalPreview])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(mentionResults[mentionIndex].username)
        return
      }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { cancelReply() }
  }

  /** Called on every keystroke in any mention-aware input */
  function handleMentionInput(
    value: string,
    setter: (v: string) => void,
    anchor: 'main' | 'reply' | 'modal',
    inputEl: HTMLInputElement | HTMLTextAreaElement | null,
  ) {
    setter(value)
    const cursor = inputEl?.selectionStart ?? value.length
    const q = getMentionQuery(value, cursor)
    if (q !== null) {
      setMentionQuery(q)
      setMentionIndex(0)
      setMentionAnchor(anchor)
    } else {
      setMentionQuery(null)
    }
  }

  /** Insert chosen username into the right input */
  function pickMention(username: string) {
    const ref =
      mentionAnchor === 'main'  ? inputRef.current :
      mentionAnchor === 'reply' ? replyInputRef.current :
                                  newPostTextareaRef.current
    const current =
      mentionAnchor === 'main'  ? msgInput :
      mentionAnchor === 'reply' ? msgInput :   // reply reuses msgInput
                                  newPostText
    const setter =
      mentionAnchor === 'modal' ? setNewPostText : setMsgInput

    const cursor = ref?.selectionStart ?? current.length
    const { text, cursor: newCursor } = insertMention(current, cursor, username)
    setter(text)
    setMentionQuery(null)
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      if (ref) { ref.focus(); ref.setSelectionRange(newCursor, newCursor) }
    })
  }

  // ── Media handlers ────────────────────────────────────────────────────────

  async function handleImagePick(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    if (!files || files.length === 0) return
    const imgs = await readFilesAsBase64(files)
    setter(prev => [...prev, ...imgs].slice(0, 4)) // max 4 images
  }

  function removeImage(
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  // Debounced link preview fetch — one per surface
  const previewTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  function triggerLinkPreview(
    text: string,
    setter: React.Dispatch<React.SetStateAction<LinkPreview | null | undefined>>,
    key: string,
  ) {
    clearTimeout(previewTimers.current[key])
    const url = detectUrl(text)
    if (!url) { setter(null); return }
    setter(undefined) // loading
    previewTimers.current[key] = setTimeout(async () => {
      const preview = await fetchLinkPreview(url)
      setter(preview)
    }, 600)
  }

  // Wrap handleMentionInput to also trigger link preview
  function handleMediaMentionInput(
    value: string,
    setter: (v: string) => void,
    anchor: 'main' | 'reply' | 'modal',
    inputEl: HTMLInputElement | HTMLTextAreaElement | null,
    previewSetter: React.Dispatch<React.SetStateAction<LinkPreview | null | undefined>>,
    previewKey: string,
  ) {
    handleMentionInput(value, setter, anchor, inputEl)
    triggerLinkPreview(value, previewSetter, previewKey)
  }

  // Reset all media for a surface
  function clearMedia(surface: 'main' | 'reply' | 'modal') {
    if (surface === 'main')  { setMainImages([]);  setMainPreview(null)  }
    if (surface === 'reply') { setReplyImages([]); setReplyPreview(null) }
    if (surface === 'modal') { setModalImages([]); setModalPreview(null) }
  }

  // ── Media sub-components ─────────────────────────────────────────────────

  function ImagePreviewStrip({
    images, onRemove
  }: {
    images: string[]
    onRemove: (i: number) => void
  }) {
    if (images.length === 0) return null
    return (
      <div className="flex gap-1.5 flex-wrap px-1 pt-1">
        {images.map((src, i) => (
          <div key={i} className="relative group h-14 w-14 rounded-md overflow-hidden border border-border shrink-0">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              onMouseDown={e => { e.preventDefault(); onRemove(i) }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  function LinkPreviewCard({ preview }: { preview: LinkPreview | null | undefined }) {
    if (preview === null) return null
    if (preview === undefined) return (
      <div className="mx-1 mt-1 rounded-md border border-border/50 bg-secondary/30 px-3 py-2 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
        <span className="text-[10px] text-muted-foreground">Loading preview…</span>
      </div>
    )
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-1 mt-1.5 flex gap-2.5 rounded-md border border-border/60 bg-secondary/30 hover:bg-secondary/60 overflow-hidden transition-colors no-underline"
        onMouseDown={e => e.stopPropagation()}
      >
        {preview.image && (
          <img
            src={preview.image}
            alt=""
            className="h-16 w-16 shrink-0 object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="min-w-0 py-2 pr-2 flex-1">
          <p className="text-[10px] font-bold text-primary truncate">{preview.domain}</p>
          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1 mt-0.5">{preview.title}</p>
          {preview.description && (
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{preview.description}</p>
          )}
        </div>
      </a>
    )
  }

  // ── Mention dropdown ──────────────────────────────────────────────────────

  function MentionDropdown({ anchor }: { anchor: 'main' | 'reply' | 'modal' }) {
    if (mentionQuery === null || mentionAnchor !== anchor || mentionResults.length === 0) return null
    return (
      <div className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
        <div className="px-2 py-1 border-b border-border/40">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mention a user</span>
        </div>
        {mentionResults.map((u, i) => (
          <button
            key={u.username}
            onMouseDown={e => { e.preventDefault(); pickMention(u.username) }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              i === mentionIndex ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary/50'
            }`}
          >
            <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
              {u.initials}
            </div>
            <span className="text-xs font-semibold">@{u.username}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{u.rep}</span>
          </button>
        ))}
      </div>
    )
  }

  // ── Sidebar channel row ───────────────────────────────────────────────────

  function ChannelRow({ ch }: { ch: Channel }) {
    const unreadCount = ch.messages.filter(m => m.unread).length
    const isActive = ch.id === activeChannelId && !showMembers
    return (
      <button
        onClick={() => switchChannel(ch.id)}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors ${
          isActive
            ? 'bg-primary/15 text-foreground'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        }`}
      >
        <Hash className={`h-3 w-3 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <span className={`flex-1 truncate text-xs ${isActive ? 'font-semibold' : ''}`}>{ch.name}</span>
        {unreadCount > 0 && !isActive && (
          <span className="shrink-0 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground leading-4 min-w-[16px] text-center">
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  // ── Message card ──────────────────────────────────────────────────────────

  function MessageCard({ msg }: { msg: Message }) {
    const hasVoted = votedIds.has(msg.id)
    const isExpanded = expandedReplies.has(msg.id)
    const isHot = msg.upvotes > 5
    const replyCount = msg.replies.length

    return (
      <div className={`rounded-lg px-3 py-2.5 transition-all ${
        msg.pendingSend ? 'opacity-60' : ''
      } ${msg.isOwn ? 'border-l-2 border-l-primary/40 bg-secondary/20' : 'hover:bg-secondary/20'}`}>

        {/* Top row: avatar + username + timestamp + rep */}
        <div className="flex items-start gap-2.5">
          <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {msg.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-bold text-foreground">@{msg.username}</span>
              <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
              {msg.pendingSend && <span className="text-[9px] text-muted-foreground italic">sending…</span>}
              {msg.rep && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                  {msg.rep}
                </span>
              )}
            </div>

            {/* Message text */}
            {msg.text && <p className="text-xs leading-relaxed text-muted-foreground">{renderWithMentions(msg.text)}</p>}

            {/* Attached images */}
            {msg.images && msg.images.length > 0 && (
              <div className={`mt-2 grid gap-1 ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {msg.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="rounded-md object-cover w-full max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxSrc(src)}
                  />
                ))}
              </div>
            )}

            {/* Link preview */}
            {msg.linkPreview && <LinkPreviewCard preview={msg.linkPreview} />}

            {/* Action row */}
            <div className="flex items-center gap-3 mt-1.5">
              {/* Replies toggle */}
              <button
                onClick={() => toggleReplies(msg.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                title={replyCount > 0 ? `${isExpanded ? 'Hide' : 'Show'} ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : 'Reply'}
              >
                <MessageSquare className="h-3 w-3" />
                {replyCount > 0 ? (
                  <span>{replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
                ) : (
                  <span>Reply</span>
                )}
              </button>

              {/* Upvote */}
              <button
                onClick={() => handleUpvote(msg.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  hasVoted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
                title={hasVoted ? 'Remove vote' : 'Upvote'}
              >
                <ArrowUp className={`h-3 w-3 ${hasVoted ? 'fill-primary' : ''}`} />
                {msg.upvotes > 0 && <span>{msg.upvotes}</span>}
                {isHot && <Flame className="h-3 w-3 text-orange-400 ml-0.5" />}
              </button>

              {/* Delete — own posts only */}
              {msg.isOwn && (
                <button
                  onClick={() => setConfirmDelete({ kind: 'message', msgId: msg.id })}
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded reply thread */}
        {isExpanded && (
          <div className="mt-2.5 ml-9 border-l-2 border-border/40 pl-3 space-y-2.5">
            {/* Existing replies — sorted by upvotes */}
            {msg.replies.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">No replies yet — be the first!</p>
            )}
            {[...msg.replies].sort((a, b) => b.upvotes - a.upvotes).map(r => {
              const replyVoted = replyVotedIds.has(r.id)
              return (
                <div key={r.id} className={`flex gap-2 ${r.isOwn ? 'opacity-90' : ''}`}>
                  <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                    {r.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-foreground">@{r.username}</span>
                      <span className="text-[10px] text-muted-foreground">{r.timestamp}</span>
                    </div>
                    {r.text && <p className="text-[11px] leading-relaxed text-muted-foreground">{renderWithMentions(r.text)}</p>}

                    {/* Reply images */}
                    {r.images && r.images.length > 0 && (
                      <div className={`mt-1.5 grid gap-1 ${r.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {r.images.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="rounded-md object-cover w-full max-h-36 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxSrc(src)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Reply link preview */}
                    {r.linkPreview && <LinkPreviewCard preview={r.linkPreview} />}

                    {/* Reply actions: upvote + delete-own */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleReplyUpvote(msg.id, r.id)}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${
                          replyVoted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        }`}
                        title={replyVoted ? 'Remove vote' : 'Upvote this reply'}
                      >
                        <ArrowUp className={`h-2.5 w-2.5 ${replyVoted ? 'fill-primary' : ''}`} />
                        {r.upvotes > 0 && <span>{r.upvotes}</span>}
                      </button>
                      {r.isOwn && (
                        <button
                          onClick={() => setConfirmDelete({ kind: 'reply', msgId: msg.id, replyId: r.id })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete reply"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Reply input inline */}
            {replyingTo === msg.id ? (
              <div className="flex gap-2 items-start">
                <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">D</div>
                <div className="flex-1 space-y-1">
                  {/* Hidden file input */}
                  <input
                    ref={replyFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handleImagePick(e.target.files, setReplyImages)}
                  />
                  <ImagePreviewStrip images={replyImages} onRemove={i => removeImage(i, setReplyImages)} />
                  <LinkPreviewCard preview={replyPreview} />
                  <div className="relative flex items-center gap-1.5 rounded-md bg-secondary/50 border border-primary/30 px-2 py-1.5">
                    <MentionDropdown anchor="reply" />
                    <button
                      onMouseDown={e => { e.preventDefault(); replyFileRef.current?.click() }}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Attach image"
                    >
                      <Paperclip className="h-3 w-3" />
                    </button>
                    <input
                      autoFocus
                      ref={replyInputRef}
                      type="text"
                      value={msgInput}
                      onChange={e => handleMediaMentionInput(e.target.value, setMsgInput, 'reply', e.target, setReplyPreview, 'reply')}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a reply… (@ or paste link)"
                      disabled={sending}
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {(msgInput.trim() || replyImages.length > 0) && (
                      <button onClick={handleSend} disabled={sending} className="text-primary hover:text-primary/80 shrink-0">
                        <Send className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startReply(msg.id, msg.username)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                <CornerDownRight className="h-3 w-3" />
                <span>Add a reply</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d0d] relative">

      {/* ── Sidebar ── */}
      <div className="flex w-44 shrink-0 flex-col border-r border-border/40 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 sticky top-0 bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {weaveName ?? 'Community'}
              </p>
              {weaveName && (
                <p className="text-[9px] text-muted-foreground leading-none">community hub</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-1 rounded transition-colors ${showMembers ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="Members"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Channel list */}
        <div className="flex-1 py-2">
          {/* DISCUSSIONS */}
          <div className="mb-1">
            <button
              onClick={() => setCollapsedCats(p => ({ ...p, DISCUSSIONS: !p.DISCUSSIONS }))}
              className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsedCats.DISCUSSIONS ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              DISCUSSIONS
            </button>
            {!collapsedCats.DISCUSSIONS && (
              <div className="mt-0.5 px-2 flex flex-col gap-0.5">
                {discussionChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
              </div>
            )}
          </div>

          {/* QUERIES */}
          <div className="mb-1 mt-2">
            <button
              onClick={() => setCollapsedCats(p => ({ ...p, QUERIES: !p.QUERIES }))}
              className="flex w-full items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsedCats.QUERIES ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              QUERIES
            </button>
            {!collapsedCats.QUERIES && (
              <div className="mt-0.5 px-2 flex flex-col gap-0.5">
                {queryChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
              </div>
            )}
          </div>
        </div>

        {/* Self */}
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

      {/* ── Main panel ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {showMembers ? (
          <>
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Members</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{ONLINE_MEMBERS.length} online</span>
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
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Offline — 12</p>
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
          <>
            {/* Channel header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-[#111] shrink-0">
              <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">{activeChannel.name}</span>
              <span className="text-[10px] text-muted-foreground ml-1">
                {activeChannel.isQuery ? '· Q&A' : '· Discussion'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {/* Sort toggle */}
                <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
                  {(['top', 'hot', 'new'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${
                        sortMode === mode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={mode === 'top' ? 'Top (score + rep)' : mode === 'hot' ? 'Hot (trending now)' : 'New (recent first)'}
                    >
                      {mode === 'hot' ? '🔥' : mode === 'top' ? '↑' : '🕐'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setShowSearch(p => !p); if (showSearch) setSearchQuery('') }}
                  className={`transition-colors ${showSearch ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Search"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setNewPostChannelId(activeChannelId)
                    setNewPostType(activeChannel.isQuery ? 'question' : 'message')
                    setShowNewPost(true)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="New post"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Inline search */}
            {showSearch && (
              <div className="px-3 py-2 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/50 px-2 py-1.5">
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search in this channel…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                    {displayedMessages.length} result{displayedMessages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Sponsored */}
            <div className="px-3 pt-3 shrink-0">
              <SponsoredCard ad={SPONSORED_ADS[1]} variant="banner" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {/* Date divider */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] text-muted-foreground">Today</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              {displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  {searchQuery ? (
                    <p className="text-xs text-muted-foreground">No results for "{searchQuery}"</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">No posts yet in #{activeChannel.name}</p>
                      <button
                        onClick={() => setShowNewPost(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Be the first to post
                      </button>
                    </>
                  )}
                </div>
              ) : (
                displayedMessages.map(msg => <MessageCard key={msg.id} msg={msg} />)
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Bottom input — only for new top-level posts when not replying */}
            {replyingTo === null && (
              <div className="shrink-0 px-3 pb-3 pt-1">
                {/* Hidden file input */}
                <input
                  ref={mainFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleImagePick(e.target.files, setMainImages)}
                />
                {/* Image preview strip */}
                <ImagePreviewStrip images={mainImages} onRemove={i => removeImage(i, setMainImages)} />
                {/* Link preview */}
                <LinkPreviewCard preview={mainPreview} />
                <div className="relative flex items-center gap-2 rounded-lg bg-secondary/50 border border-border/50 px-2 py-2 focus-within:border-primary/40 transition-colors mt-1">
                  <MentionDropdown anchor="main" />
                  {/* Attach button */}
                  <button
                    onMouseDown={e => { e.preventDefault(); mainFileRef.current?.click() }}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Attach image"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={activeChannel.isQuery ? 'Ask a question… (@ or paste link)' : `Message #${activeChannel.name} (@ or paste link)`}
                    value={msgInput}
                    onChange={e => handleMediaMentionInput(e.target.value, setMsgInput, 'main', e.target, setMainPreview, 'main')}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-60"
                  />
                  {(msgInput.trim() || mainImages.length > 0) ? (
                    <button onClick={handleSend} disabled={sending} className="shrink-0 text-primary hover:text-primary/80 disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1 ml-1">Enter to send · 📎 attach image · @ to mention · paste a URL to preview</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── New post modal ── */}
      {showNewPost && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowNewPost(false) }}
        >
          <div className="w-80 rounded-xl border border-border bg-card p-5 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">New Post</h3>
              <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Channel picker — two columns: Discussions | Queries */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Post to</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setNewPostChannelId(ch.id)
                    // auto-flip type to match channel kind
                    setNewPostType(ch.isQuery ? 'question' : 'message')
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all border ${
                    newPostChannelId === ch.id
                      ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                      : 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <Hash className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                  {ch.isQuery && (
                    <span className="ml-auto text-[9px] opacity-60">Q&A</span>
                  )}
                </button>
              ))}
            </div>

            {/* Type toggle — only shown for discussion channels */}
            {!channels.find(c => c.id === newPostChannelId)?.isQuery && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Type</p>
                <div className="flex gap-2 mb-4">
                  {(['message', 'question'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewPostType(t)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        newPostType === t
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground border-border hover:border-primary/30'
                      }`}
                    >
                      {t === 'question' ? '? Question' : '# Message'}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Hidden file input for modal */}
            <input
              ref={modalFileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleImagePick(e.target.files, setModalImages)}
            />

            <div className="relative">
              <MentionDropdown anchor="modal" />
              <textarea
                ref={newPostTextareaRef}
                autoFocus
                rows={3}
                placeholder={
                  channels.find(c => c.id === newPostChannelId)?.isQuery || newPostType === 'question'
                    ? 'What do you want to know? (@ or paste link)'
                    : 'Share something… (@ or paste link)'
                }
                value={newPostText}
                onChange={e => handleMediaMentionInput(e.target.value, setNewPostText, 'modal', e.target, setModalPreview, 'modal')}
                onKeyDown={e => {
                  if (mentionQuery !== null && mentionResults.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionResults[mentionIndex].username); return }
                    if (e.key === 'Escape')    { setMentionQuery(null); return }
                  }
                  if (e.key === 'Escape') setShowNewPost(false)
                }}
                className="w-full resize-none bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Modal image preview + link preview */}
            <ImagePreviewStrip images={modalImages} onRemove={i => removeImage(i, setModalImages)} />
            <LinkPreviewCard preview={modalPreview} />

            <div className="flex items-center gap-2 mt-3">
              {/* Attach button */}
              <button
                onClick={() => modalFileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground border border-border hover:text-primary hover:border-primary/40 transition-colors shrink-0"
                title="Attach images"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {modalImages.length > 0 && <span className="text-primary font-semibold">{modalImages.length}</span>}
              </button>
              <button
                onClick={() => { setShowNewPost(false); setNewPostText(''); clearMedia('modal') }}
                className="flex-1 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewPost}
                disabled={(!newPostText.trim() && modalImages.length === 0) || sending}
                className="flex-1 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? 'Posting…' : `Post to #${channels.find(c => c.id === newPostChannelId)?.name ?? ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightboxSrc && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[90%] max-w-[90%] rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div className="w-64 rounded-xl border border-border bg-card p-5 shadow-2xl mx-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete {confirmDelete.kind}?</p>
                <p className="text-[10px] text-muted-foreground">This can't be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-md text-xs text-muted-foreground border border-border hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.kind === 'message') {
                    handleDeleteMessage(confirmDelete.msgId)
                  } else {
                    handleDeleteReply(confirmDelete.msgId, confirmDelete.replyId)
                  }
                }}
                className="flex-1 py-2 rounded-md text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}