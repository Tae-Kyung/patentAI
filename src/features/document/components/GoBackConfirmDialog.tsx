'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface GoBackConfirmDialogProps {
  open: boolean
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function GoBackConfirmDialog({ open, isLoading, onOpenChange, onConfirm }: GoBackConfirmDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('documentStage.goBackConfirmTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('documentStage.goBackConfirmDesc')}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <ArrowLeft className="mr-2 h-4 w-4" />
            )}
            {t('documentStage.goBackToEvaluation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
