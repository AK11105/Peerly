'use client'

import type { WeaveNode } from '@/lib/types'
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from "rehype-sanitize"

interface NodeCardProps {
  node: WeaveNode
  onUnlock?: (node: WeaveNode) => void
  onViewDetail?: (node: WeaveNode) => void
  compact?: boolean
}

const DIFFICULTY_COLORS = ['', '#22C55E', '#86EFAC', '#F59E0B', '#EF4444', '#9333EA']

function DifficultyDots({ level }: { level: number }) {
  const color = DIFFICULTY_COLORS[level] ?? '#22C55E'
  return (
    <div className="flex items-center gap-1" aria-label={`Difficulty: ${level} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full transition-all"
          style={{ backgroundColor: i < level ? color : 'var(--muted)' }}
        />
      ))}
    </div>
  )
}

export function NodeCard({ node, onUnlock, onViewDetail, compact = false }: NodeCardProps) {
  const handleCardClick = () => {
    if (onViewDetail) onViewDetail(node)
  }

  if (node.is_scaffold) {
    const isImport = node.node_source === 'import'
    const accentColor = isImport ? 'var(--blue-400, #60A5FA)' : 'var(--amber, #F59E0B)'
    const accentGlow = isImport ? '0 0 20px rgba(96,165,250,0.15)' : '0 0 20px rgba(245,158,11,0.15)'

    return (
      <div
        className="relative rounded-xl p-4 md:p-5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: 'var(--card)',
          border: `1px dashed ${accentColor}`,
          boxShadow: accentGlow,
        }}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
        {/* Hover glow effect */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: isImport ? '0 0 24px rgba(96,165,250,0.25)' : '0 0 24px rgba(245,158,11,0.25)',
          }}
        />

        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className={`font-semibold leading-snug text-foreground ${compact ? 'text-sm' : 'text-base'}`}>
            {node.title}
          </h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
            style={{
              background: isImport ? 'rgba(96,165,250,0.1)' : 'rgba(245,158,11,0.1)',
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {isImport ? 'Import' : 'AI Draft'}
          </span>
        </div>

        {!compact && (
          
          <div className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert">
             <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    p: ({children }) => <p className="mb-1">{children}</p>,
                    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                    a : ({ href, children }) => (
                        <a href={href}  className="text-primary underline" target="_blank">
                            {children}
                        </a>
                    ),


                    code: ({children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                    ),
                }}
             >
                {node.description}
             </ReactMarkdown>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <DifficultyDots level={node.difficulty} />
            <span className="text-xs text-muted-foreground hidden sm:inline">Needs contribution</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors hidden sm:inline">
              Details →
            </span>
            {!compact && onUnlock && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnlock(node) }}
                className="rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:scale-[1.029] hover:brightness-110 active:scale-95 tap-target"
                style={{
                  background: isImport ? 'rgba(96,165,250,0.15)' : 'rgba(245,158,11,0.15)',
                  color: accentColor,
                  border: `1px solid ${accentColor}4
                  0`,
                }}
              >
                UNLOCK
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-xl p-4 md:p-5 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid var(--primary)`,
      }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}>


      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className={`font-semibold leading-snug text-foreground group-hover:text-foreground transition-colors ${compact ? 'text-sm' : 'text-base'}`}>
          {node.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {node.flag && (
            <span
              title={node.flag === 'abuse' ? 'Flagged: potential abuse' : 'Flagged: potential spam'}
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                background: 'var(--destructive)/15',
                color: 'var(--destructive)',
                border: '1px solid var(--destructive)/30',
              }}
            >
              !
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              background: 'var(--primary)/15',
              color: 'var(--primary)',
              border: '1px solid var(--primary)/30',
            }}
          >
            ✓ Community
          </span>
        </div>
      </div>

      {!compact && (
<div className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert">
             <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    p: ({children }) => <p className="mb-1">{children}</p>,
                    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                    a : ({ href, children }) => (
                        <a href={href}  className="text-primary underline" target="_blank">
                            {children}
                        </a>
                    ),


                    code: ({children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                    ),
                }}
             >
                {node.description}
             </ReactMarkdown>
          </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <DifficultyDots level={node.difficulty} />
        <div className="flex items-center gap-3">
          {node.contributed_by && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
              @{node.contributed_by}
            </span>
          )}
          <span className="text-xs text-primary/70 group-hover:text-primary transition-colors whitespace-nowrap">
            Details →
          </span>
        </div>
      </div>


    </div>
  )
}
