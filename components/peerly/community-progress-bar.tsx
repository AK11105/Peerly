'use client'

import { useEffect, useState } from 'react'
import type { WeaveNode } from '@/lib/types'

interface CommunityProgressBarProps {
  nodes: WeaveNode[]
}

function getProgressColor(pct: number): string {
  if (pct <= 25) return '#EF4444'
  if (pct <= 50) return '#F97316'
  if (pct <= 75) return '#EAB308'
  return '#22C55E'
}

export function CommunityProgressBar({ nodes }: CommunityProgressBarProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0)

  const contributed = nodes.filter((n) => !n.is_scaffold).length
  const total = nodes.length
  const pct = total === 0 ? 0 : Math.round((contributed / total) * 100)
  const color = getProgressColor(pct)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(pct), 80)
    return () => clearTimeout(timer)
  }, [pct])

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Community Progress
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {contributed} of {total} nodes contributed
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animatedWidth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
