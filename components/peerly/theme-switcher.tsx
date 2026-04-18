'use client'

import { Moon, Sun, Palette, Monitor } from 'lucide-react'
import { useThemeState } from '@/hooks/use-theme'
import { useAccentColor } from '@/hooks/use-accent-color'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ACCENT_COLORS: { value: string; label: string; class: string }[] = [
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
]

interface ThemeSwitcherProps {
  variant?: 'button' | 'icon'
}

export function ThemeSwitcher({ variant = 'button' }: ThemeSwitcherProps) {
  const { theme, setTheme, mounted } = useThemeState()
  const { accent, setAccent } = useAccentColor()

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Sun className="h-4 w-4" />
        <span className="hidden sm:inline">Theme</span>
      </Button>
    )
  }

  const ThemeIcon = theme === 'dark' || theme === 'dim' ? Moon : Sun

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ThemeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="h-4 w-4 mr-2" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="h-4 w-4 mr-2" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dim')}>
            <Moon className="h-4 w-4 mr-2" /> Dim
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="h-4 w-4 mr-2" /> System
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
          {ACCENT_COLORS.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => setAccent(color.value as any)}
              className="flex items-center gap-2"
            >
              <span className={`h-4 w-4 rounded-full ${color.class}`} />
              {color.label}
              {accent === color.value && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ThemeIcon />
          <span className="hidden sm:inline capitalize">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4 mr-2" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4 mr-2" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dim')}>
          <Moon className="h-4 w-4 mr-2" /> Dim
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4 mr-2" /> System
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        {ACCENT_COLORS.map((color) => (
          <DropdownMenuItem
            key={color.value}
            onClick={() => setAccent(color.value as any)}
            className="flex items-center gap-2"
          >
            <span className={`h-4 w-4 rounded-full ${color.class}`} />
            {color.label}
            {accent === color.value && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
