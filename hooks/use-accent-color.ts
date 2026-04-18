'use client'

import { useEffect, useState } from 'react'
import type { AccentColor } from '@/components/theme-provider'

const ACCENT_KEY = 'peerly-accent-color'

export function useAccentColor() {
  const [accent, setAccentState] = useState<AccentColor>('green')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(ACCENT_KEY) as AccentColor | null
    if (saved && ['green', 'blue', 'cyan', 'purple', 'orange', 'red'].includes(saved)) {
      setAccentState(saved)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.removeAttribute('data-accent')
    if (accent !== 'green') root.setAttribute('data-accent', accent)
  }, [accent])

  const setAccent = (color: AccentColor) => {
    setAccentState(color)
    localStorage.setItem(ACCENT_KEY, color)
  }

  return { accent, setAccent, mounted }
}
