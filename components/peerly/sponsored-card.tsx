'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SponsoredAdData {
  id: string
  sponsor: string
  title: string
  cta: string
  href: string
  color?: string
}

interface SponsoredCardProps {
  ad: SponsoredAdData
  variant?: 'card' | 'banner' | 'inline'
  className?: string
}

export function SponsoredCard({ ad, variant = 'card', className }: SponsoredCardProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'relative flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-gradient-to-r from-card to-card/80 px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sponsored
          </span>
          <p className="truncate text-sm text-foreground">{ad.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            asChild
          >
            <a href={ad.href} target="_blank" rel="noopener noreferrer">
              {ad.cta}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Dismiss ad"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'relative rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3',
          className
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Dismiss ad"
        >
          <X className="h-3 w-3" />
        </button>
        <span className="inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary mb-2">
          Sponsored
        </span>
        <p className="text-xs font-medium text-foreground mb-1">{ad.title}</p>
        <p className="text-[10px] text-muted-foreground mb-2">by {ad.sponsor}</p>
        <a
          href={ad.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs text-primary hover:underline"
        >
          {ad.cta}
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>
    )
  }

  // Default card variant
  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-4 shadow-sm',
        className
      )}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Dismiss ad"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Sponsored
      </span>
      <h4 className="text-sm font-semibold text-foreground mb-1">{ad.title}</h4>
      <p className="text-xs text-muted-foreground mb-3">by {ad.sponsor}</p>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        asChild
      >
        <a href={ad.href} target="_blank" rel="noopener noreferrer">
          {ad.cta}
          <ExternalLink className="ml-1.5 h-3 w-3" />
        </a>
      </Button>
    </div>
  )
}

// Hardcoded ads data
export const SPONSORED_ADS: SponsoredAdData[] = [
  {
    id: 'ad-1',
    sponsor: 'Coursera',
    title: 'Master Machine Learning with Andrew Ng',
    cta: 'Start Learning',
    href: 'https://coursera.org',
  },
  {
    id: 'ad-2',
    sponsor: 'DataCamp',
    title: 'Python for Data Science - Free Trial',
    cta: 'Try Free',
    href: 'https://datacamp.com',
  },
  {
    id: 'ad-3',
    sponsor: 'AWS',
    title: 'Build ML Models with SageMaker',
    cta: 'Get Started',
    href: 'https://aws.amazon.com/sagemaker',
  },
  {
    id: 'ad-4',
    sponsor: 'Notion',
    title: 'Organize Your Research Notes',
    cta: 'Try Notion',
    href: 'https://notion.so',
  },
]
