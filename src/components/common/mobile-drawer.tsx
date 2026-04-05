'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  side?: 'left' | 'right'
  className?: string
}

export function MobileDrawer({
  open,
  onClose,
  children,
  title,
  side = 'left',
  className,
}: MobileDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 z-50 flex w-72 flex-col bg-background shadow-lg transition-transform duration-300',
          side === 'left' ? 'left-0' : 'right-0',
          open
            ? 'translate-x-0'
            : side === 'left'
            ? '-translate-x-full'
            : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  )
}
