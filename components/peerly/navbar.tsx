'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Star } from 'lucide-react'
import { useLumens } from '@/lib/lumens-context'
import { RedeemDialog } from './redeem-dialog'

interface NavbarProps {
  showWeaveTitle?: string
}

export function Navbar({ showWeaveTitle }: NavbarProps) {
  const pathname = usePathname()
  const { balance, recentChange, clearRecentChange } = useLumens()
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [floatAnim, setFloatAnim] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/my-weaves', label: 'My Weaves' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/admin', label: 'Admin' },
  ]

  // Handle float animation when balance changes
  useEffect(() => {
    if (recentChange) {
      setFloatAnim(recentChange)
      const timer = setTimeout(() => {
        setFloatAnim(null)
        clearRecentChange()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [recentChange, clearRecentChange])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Logo + Weave Title */}
          <div className="flex items-center gap-3">
            <Link href="/explore" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">P</span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Peerly
              </span>
            </Link>
            {showWeaveTitle && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground">{showWeaveTitle}</span>
              </>
            )}
          </div>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* LM Balance - Clickable to open Redeem */}
            <button
              onClick={() => setRedeemOpen(true)}
              className="relative flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary/50 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {balance.toLocaleString()} LM
              </span>
              {/* Float animation */}
              {floatAnim && (
                <span
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold animate-float-up ${
                    floatAnim.type === 'spend' ? 'text-red-400' : 'text-primary'
                  }`}
                >
                  {floatAnim.type === 'spend' ? '-' : '+'}{floatAnim.amount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <Link href="/profile">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity">
                D
              </div>
            </Link>
          </div>
        </div>
      </header>

      <RedeemDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
    </>
  )
}
