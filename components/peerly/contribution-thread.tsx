'use client'

import { useState, useRef } from 'react'
import { GripVertical, Pencil, Check, X as XIcon } from 'lucide-react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

export interface Contribution {
  id: string
  author: string
  text: string
  link?: string
  attachments?: string[]
  links?: string[]
  order: number
  upvotes?: number
}

interface ContributionThreadProps {
  contributions: Contribution[]
  onChange: (updated: Contribution[]) => void
  currentUser?: string
}

const THREAD_COLORS = [
  { border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.05)' },
  { border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.05)' },
  { border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.05)' },
  { border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.05)' },
  { border: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.05)' },
]

function color(idx: number) {
  return THREAD_COLORS[idx % THREAD_COLORS.length]
}

export function ContributionThread({
  contributions,
  onChange,
  currentUser,
}: ContributionThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editLink, setEditLink] = useState('')
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  const sorted = [...contributions].sort((a, b) => a.order - b.order)

  // ── Drag-to-reorder ──────────────────────────────────────
  const handleDragStart = (idx: number) => { dragIndex.current = idx }
  const handleDragEnter = (idx: number) => { dragOverIndex.current = idx }
  const handleDragEnd = () => {
    const from = dragIndex.current
    const to = dragOverIndex.current
    if (from === null || to === null || from === to) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((c, i) => ({ ...c, order: i }))
    onChange(updated)
    dragIndex.current = null
    dragOverIndex.current = null
  }

  // ── Inline edit ──────────────────────────────────────────
  const startEdit = (c: Contribution) => {
    setEditingId(c.id)
    setEditText(c.text)
    setEditLink(c.link ?? '')
  }

  const saveEdit = (id: string) => {
    if (!editText.trim()) { toast.error('Explanation cannot be empty.'); return }
    if (editLink.trim()) {
      try { new URL(editLink) } catch { toast.error('Enter a valid URL.'); return }
    }
    onChange(
      sorted.map(c =>
        c.id === id ? { ...c, text: editText.trim(), link: editLink.trim() || undefined } : c
      )
    )
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  if (sorted.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sorted.map((c, idx) => {
        const col = color(idx)
        const isEditing = editingId === c.id
        const isOwn = c.author === currentUser

        return (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Dotted connector */}
            {idx > 0 && (
              <div style={{
                width: 1,
                height: 16,
                marginLeft: 20,
                borderLeft: '1.5px dashed rgba(255,255,255,0.15)',
              }} />
            )}

            {/* Card */}
            <div
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: 10,
                padding: '12px 12px 10px',
                cursor: 'grab',
                transition: 'opacity 0.15s',
              }}
            >
              {/* Top row: grip + author + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <GripVertical
                  style={{ width: 14, height: 14, color: 'var(--color-text-secondary)', opacity: 0.5, flexShrink: 0 }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: col.border,
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  flexShrink: 0,
                }}>
                  {c.author[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>
                  @{c.author}
                </span>
                {/* LM badge for first */}
                {idx === 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 11, color: '#22C55E',
                    background: 'rgba(34,197,94,0.12)',
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    <Star style={{ width: 10, height: 10, fill: '#22C55E' }} />
                    +50 LM
                  </span>
                )}
                {idx > 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 11, color: '#A78BFA',
                    background: 'rgba(139,92,246,0.12)',
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    <Star style={{ width: 10, height: 10, fill: '#A78BFA' }} />
                    +25 LM
                  </span>
                )}
                {/* Edit button — own contributions only */}
                {isOwn && !isEditing && (
                  <button
                    onClick={() => startEdit(c)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '2px 4px', borderRadius: 4,
                      color: 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center',
                    }}
                    title="Edit"
                  >
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>

              {/* Body */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 6, padding: '8px 10px',
                      fontSize: 13, color: 'var(--color-text-primary)',
                      resize: 'none', outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Link (optional)"
                    value={editLink}
                    onChange={e => setEditLink(e.target.value)}
                    style={{
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 6, padding: '6px 10px',
                      fontSize: 12, color: 'var(--color-text-primary)', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'none',
                        border: '0.5px solid var(--color-border-secondary)',
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 12, color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <XIcon style={{ width: 11, height: 11 }} /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: '#22C55E',
                        border: 'none',
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 12, color: '#000', fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Check style={{ width: 11, height: 11 }} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{
                    fontSize: 13, color: 'var(--color-text-primary)',
                    lineHeight: 1.65, margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {c.text}
                  </p>
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#22C55E',
                        marginTop: 6, textDecoration: 'none',
                      }}
                    >
                      🔗 {c.link}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}