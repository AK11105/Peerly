'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

export type Theme = 'light' | 'dark' | 'dim' | 'system'
export type AccentColor = 'green' | 'blue' | 'cyan' | 'purple' | 'orange' | 'red'

interface PeerlyThemeProviderProps extends Omit<ThemeProviderProps, 'attribute' | 'enableSystem' | 'disableTransitionOnChange'> {
  defaultAccent?: AccentColor
}

export function ThemeProvider({ children, defaultTheme = 'system', defaultAccent = 'green', ...props }: PeerlyThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={true}
      disableTransitionOnChange
      {...props}
    >
      <AccentColorProvider accent={defaultAccent}>
        {children}
      </AccentColorProvider>
    </NextThemesProvider>
  )
}

function AccentColorProvider({ accent, children }: { accent: AccentColor; children: React.ReactNode }) {
  React.useEffect(() => {
    const root = document.documentElement
    root.removeAttribute('data-accent')
    if (accent !== 'green') {
      root.setAttribute('data-accent', accent)
    }
  }, [accent])

  return <>{children}</>
}
