import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface CurrentUser {
  id: string
  displayName: string
}

export function useCurrentUser(): CurrentUser | null {
  const { user } = useUser()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('display_name')
      .eq('username', user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? null)
      })
  }, [user?.id])

  if (!user?.id) return null
  return {
    id: user.id,
    displayName: displayName ?? user.username ?? user.firstName ?? user.id,
  }
}
