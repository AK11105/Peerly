'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  showCloseButton?: boolean
}

export function BottomSheet({ open, onClose, title, children, showCloseButton = true }: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border shadow-2xl transition-transform duration-300 ease-out safe-area-bottom"
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
