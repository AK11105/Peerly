'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, Layers, Plus, Trophy, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'explore', href: '/explore', label: 'Explore', icon: Library },
  { key: 'my-weaves', href: '/my-weaves', label: 'My Weaves', icon: Layers },
  { key: 'create', href: '/create', label: 'Create', icon: Plus, primary: true },
  { key: 'leaderboard', href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { key: 'more', href: '/more', label: 'More', icon: Menu, isMenu: true },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/create' && pathname.startsWith(item.href + '/'))

          // More menu button - placeholder for future menu
          if (item.isMenu) {
            return (
              <button
                key={item.key}
                className="flex flex-1 flex-col items-center justify-center py-3 text-muted-foreground"
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          if (item.primary) {
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative -top-5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:brightness-110 transition-all">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-3 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
