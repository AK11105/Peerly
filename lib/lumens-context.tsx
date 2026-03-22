'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'peerly_lumens_balance'
const DEFAULT_BALANCE = 0

interface LumensContextType {
  balance: number
  spend: (amount: number) => boolean
  earn: (amount: number) => void
  recentChange: { amount: number; type: 'spend' | 'earn' } | null
  clearRecentChange: () => void
}

const LumensContext = createContext<LumensContextType | null>(null)

function getStoredBalance(): number {
  if (typeof window === 'undefined') return DEFAULT_BALANCE
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return parseInt(stored, 10)
  } catch {}
  return DEFAULT_BALANCE
}

export function LumensProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(DEFAULT_BALANCE)
  const [recentChange, setRecentChange] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setBalance(getStoredBalance())
  }, [])

  // Persist to localStorage whenever balance changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(balance))
    }
  }, [balance])

  const spend = useCallback((amount: number) => {
    let ok = false
    setBalance((prev) => {
      if (amount > prev) return prev
      ok = true
      return prev - amount
    })
    if (ok) setRecentChange({ amount, type: 'spend' })
    return ok
  }, [])

  const earn = useCallback((amount: number) => {
    setBalance((prev) => prev + amount)
    setRecentChange({ amount, type: 'earn' })
  }, [])

  const clearRecentChange = useCallback(() => {
    setRecentChange(null)
  }, [])

  return (
    <LumensContext.Provider value={{ balance, spend, earn, recentChange, clearRecentChange }}>
      {children}
    </LumensContext.Provider>
  )
}

export function useLumens() {
  const context = useContext(LumensContext)
  if (!context) {
    throw new Error('useLumens must be used within a LumensProvider')
  }
  return context
}