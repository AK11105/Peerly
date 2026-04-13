'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import type { Theme } from '@/components/theme-provider'

export function useThemeState() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return {
    theme: (theme as Theme) || 'system',
    setTheme,
    resolvedTheme: (resolvedTheme as Theme) || 'dark',
    mounted,
  }
}
