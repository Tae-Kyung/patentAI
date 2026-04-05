'use client'

import { useTranslations } from 'next-intl'
import { Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SectionReviseDialogProps {
  open: boolean
  title: string
  sections: string[]
  reviseSection: string
  reviseInstruction: string
  isRevising: boolean
  reviseStreamContent: string
  onClose: () => void
  onSectionChange: (section: string) => void
  onInstructionChange: (instruction: string) => void
  onRevise: () => void
}

export function SectionReviseDialog({
  open,
  title,
  sections,
  reviseSection,
  reviseInstruction,
  isRevising,
  reviseStreamContent,
  onClose,
  onSectionChange,
  onInstructionChange,
  onRevise,
}: SectionReviseDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={open} onOpenChange={() => !isRevising && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('documentStage.sectionReviseDialogTitle', { title })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section">{t('documentStage.sectionLabel')}</Label>
            <div className="mt-1.5">
              {sections.length > 0 ? (
                <select
                  id="section"
                  value={reviseSection}
                  onChange={(e) => onSectionChange(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={isRevising}
                >
                  <option value="">{t('documentStage.selectSection')}</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id="section"
                  value={reviseSection}
                  onChange={(e) => onSectionChange(e.target.value)}
                  placeholder={t('documentStage.sectionInputPlaceholder')}
                  disabled={isRevising}
                />
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="instruction">{t('documentStage.instructionLabel')}</Label>
            <Textarea
              id="instruction"
              value={reviseInstruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              placeholder={t('documentStage.instructionPlaceholder')}
              rows={4}
              disabled={isRevising}
              className="mt-1.5"
            />
          </div>
          {isRevising && reviseStreamContent && (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-sm font-medium">{t('documentStage.revising')}</p>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs">
                {reviseStreamContent}
              </pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRevising}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onRevise}
            disabled={isRevising || !reviseSection.trim() || !reviseInstruction.trim()}
          >
            {isRevising ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('documentStage.revising')}
              </>
            ) : (
              <>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('documentStage.sectionRevise')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
