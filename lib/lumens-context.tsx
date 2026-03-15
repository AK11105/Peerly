'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface LumensContextType {
  balance: number
  spend: (amount: number) => boolean
  earn: (amount: number) => void
  recentChange: { amount: number; type: 'spend' | 'earn' } | null
  clearRecentChange: () => void
}

const LumensContext = createContext<LumensContextType | null>(null)

export function LumensProvider({ children, initialBalance = 1240 }: { children: ReactNode; initialBalance?: number }) {
  const [balance, setBalance] = useState(initialBalance)
  const [recentChange, setRecentChange] = useState<{ amount: number; type: 'spend' | 'earn' } | null>(null)

  const spend = useCallback((amount: number) => {
    if (amount > balance) return false
    setBalance((prev) => prev - amount)
    setRecentChange({ amount, type: 'spend' })
    return true
  }, [balance])

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
