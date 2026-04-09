'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export interface CurrentUser {
  id: string
  displayName: string
}

const CurrentUserContext = createContext<CurrentUser | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('display_name')
      .eq('username', user.id)
      .single()
      .then(({ data }) => setDisplayName(data?.display_name ?? null))
  }, [user?.id])

  const value: CurrentUser | null = user?.id
    ? { id: user.id, displayName: displayName ?? user.username ?? user.firstName ?? user.id }
    : null

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(CurrentUserContext)
}
