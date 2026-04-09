'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Star, LogOut, User, HelpCircle } from 'lucide-react'
import { SignInButton, SignUpButton, useClerk, useUser } from '@clerk/nextjs'
import { useLumens } from '@/lib/lumens-context'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useOnboarding } from '@/hooks/use-onboarding'
import { RedeemDialog } from './redeem-dialog'
import { OnboardingTour } from './onboarding-tour'

interface NavbarProps {
  showWeaveTitle?: string
}

export function Navbar({ showWeaveTitle }: NavbarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()
  const currentUser = useCurrentUser()
  const { shouldShowTour, isLoading, markTourAsSeen } = useOnboarding()
  const { balance, recentChange, clearRecentChange } = useLumens()
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [floatAnim, setFloatAnim] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  const displayName = currentUser?.displayName ?? user?.firstName ?? ''
  const initial = user ? (displayName[0]?.toUpperCase() ?? 'U') : null
  const isAuthenticated = !!user

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/my-weaves', label: 'My Weaves' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/admin', label: 'Admin' },
  ]

  useEffect(() => {
    if (recentChange) {
      setFloatAnim(recentChange)
      const timer = setTimeout(() => { setFloatAnim(null); clearRecentChange() }, 1500)
      return () => clearTimeout(timer)
    }
  }, [recentChange, clearRecentChange])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync user to Supabase on mount
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/sync-user', { method: 'POST' }).catch(() => {})
  }, [user?.id])

  // Auto-open tour only for users who haven't seen it yet and only on /explore page
  useEffect(() => {
    if (!isLoading && shouldShowTour && pathname === '/explore') {
      const timer = setTimeout(() => setTourOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [shouldShowTour, isLoading, pathname])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Logo + Weave Title */}
          <div className="flex items-center gap-3">
            <Link href="/explore" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-7 w-14 items-center justify-center rounded-full bg-primary/20">
                <span className="text-xs font-bold text-light-foreground">LO_OM </span>
              </div>
              {/* <span className="text-sm font-semibold tracking-wide text-foreground">Loom</span> */}
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
              <Link key={href} href={href}
                className={`text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{label}</Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Debug: Reset Tour (dev only) */}
           {/* <button onClick={resetTour}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-card/80 transition-colors"
              title="Reset onboarding tour (dev only)"
            >
              <Bug className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Tour</span>
            </button> */}

            {/* Tour/Help Button */}
            <button onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-card/80 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Tour</span>
            </button>

            {/* LM Balance */}
            <button onClick={() => setRedeemOpen(true)}
              className="relative flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary/50 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-semibold text-foreground">{balance.toLocaleString()} LM</span>
              {floatAnim && (
                <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold animate-float-up ${floatAnim.type === 'spend' ? 'text-red-400' : 'text-primary'}`}>
                  {floatAnim.type === 'spend' ? '-' : '+'}{floatAnim.amount}
                </span>
              )}
            </button>

            {/* Avatar / Auth button */}
            <div ref={avatarRef} className="relative">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setAvatarOpen(v => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    {initial}
                  </button>
                  {avatarOpen && (
                    <div className="absolute right-0 top-10 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                      <Link href="/profile" onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background transition-colors"
                      >
                        <User className="h-3.5 w-3.5" /> Profile
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut({ redirectUrl: '/sign-in' })
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-background transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAvatarOpen(v => !v)}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-card/80 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Sign In
                  </button>
                  {avatarOpen && (
                    <div className="absolute right-0 top-10 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-foreground">Welcome to Peerly</p>
                        <p className="text-[10px] text-muted-foreground">Sign in to start exploring</p>
                      </div>
                      <SignInButton mode="modal" signUpForceRedirectUrl="/explore">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background transition-colors">
                          Sign In
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal" signInForceRedirectUrl="/explore">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-background transition-colors">
                          Sign Up
                        </button>
                      </SignUpButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <RedeemDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      <OnboardingTour open={tourOpen} onOpenChange={setTourOpen} onComplete={markTourAsSeen} />
    </>
  )
}
