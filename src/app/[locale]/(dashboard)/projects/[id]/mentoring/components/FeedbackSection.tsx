'use client'

import { useTranslations } from 'next-intl'
import { MessageSquare, Plus, Send, Save, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/loading-spinner'

interface FeedbackItem {
  id: string
  stage: string
  feedback_type: string
  comment: string
  is_resolved: boolean
  created_at: string
  author: { id: string; name: string | null; email: string } | null
  is_mine: boolean
}

const FEEDBACK_TYPES = ['comment', 'approval', 'revision_request', 'rejection'] as const

interface FeedbackSectionProps {
  stage: string
  feedbacks: FeedbackItem[]
  isExpanded: boolean
  onToggleExpand: (stage: string | null) => void
  // Write state
  isWriting: boolean
  feedbackType: string
  feedbackComment: string
  submittingFeedback: boolean
  onStartWrite: (stage: string) => void
  onCancelWrite: () => void
  onTypeChange: (type: string) => void
  onCommentChange: (comment: string) => void
  onSubmit: (stage: string) => void
  // Edit state
  editingFeedbackId: string | null
  editFeedbackType: string
  editFeedbackComment: string
  savingFeedback: boolean
  deletingFeedbackId: string | null
  onStartEdit: (fb: FeedbackItem) => void
  onCancelEdit: () => void
  onEditTypeChange: (type: string) => void
  onEditCommentChange: (comment: string) => void
  onEditSave: (id: string) => void
  onDelete: (id: string) => void
}

export function FeedbackSection({
  stage,
  feedbacks,
  isExpanded,
  onToggleExpand,
  isWriting,
  feedbackType,
  feedbackComment,
  submittingFeedback,
  onStartWrite,
  onCancelWrite,
  onTypeChange,
  onCommentChange,
  onSubmit,
  editingFeedbackId,
  editFeedbackType,
  editFeedbackComment,
  savingFeedback,
  deletingFeedbackId,
  onStartEdit,
  onCancelEdit,
  onEditTypeChange,
  onEditCommentChange,
  onEditSave,
  onDelete,
}: FeedbackSectionProps) {
  const t = useTranslations()

  const feedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      comment: t('mentor.workstation.fbComment'),
      approval: t('mentor.workstation.fbApproval'),
      rejection: t('mentor.workstation.fbRejection'),
      revision_request: t('mentor.workstation.fbRevision'),
    }
    return labels[type] || type
  }

  const feedbackTypeBadgeClass = (type: string) => {
    const classes: Record<string, string> = {
      comment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      approval: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejection: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      revision_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }
    return classes[type] || ''
  }

  const renderTypeSelector = (selectedType: string, onChange: (type: string) => void) => (
    <div className="flex gap-2">
      {FEEDBACK_TYPES.map((type) => (
        <button
          key={type}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedType === type
              ? feedbackTypeBadgeClass(type)
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => onChange(type)}
        >
          {feedbackTypeLabel(type)}
        </button>
      ))}
    </div>
  )

  return (
    <div className="border-t pt-4">
      <button
        className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
        onClick={() => onToggleExpand(isExpanded ? null : stage)}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('mentor.workstation.mentorFeedback')}
          {feedbacks.length > 0 && (
            <Badge variant="secondary" className="ml-1">{feedbacks.length}</Badge>
          )}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="rounded-lg border bg-muted/30 p-3">
              {editingFeedbackId === fb.id ? (
                <div className="space-y-3">
                  {renderTypeSelector(editFeedbackType, onEditTypeChange)}
                  <Textarea
                    value={editFeedbackComment}
                    onChange={(e) => onEditCommentChange(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onEditSave(fb.id)}
                      disabled={savingFeedback || !editFeedbackComment.trim()}
                    >
                      {savingFeedback ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="mr-2 h-3 w-3" />}
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {fb.author?.name || fb.author?.email || '-'}
                      </span>
                      <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${feedbackTypeBadgeClass(fb.feedback_type)}`}>
                        {feedbackTypeLabel(fb.feedback_type)}
                      </span>
                      {fb.is_mine && (
                        <>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onStartEdit(fb)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => onDelete(fb.id)}
                            disabled={deletingFeedbackId === fb.id}
                          >
                            {deletingFeedbackId === fb.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{fb.comment}</p>
                </>
              )}
            </div>
          ))}

          {isWriting ? (
            <div className="space-y-3 rounded-lg border p-3">
              {renderTypeSelector(feedbackType, onTypeChange)}
              <Textarea
                value={feedbackComment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={t('mentor.workstation.feedbackPlaceholder')}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancelWrite}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSubmit(stage)}
                  disabled={submittingFeedback || !feedbackComment.trim()}
                >
                  {submittingFeedback ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Send className="mr-2 h-3 w-3" />
                  )}
                  {t('mentor.workstation.submitFeedback')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStartWrite(stage)}
            >
              <Plus className="mr-2 h-3 w-3" />
              {t('mentor.workstation.writeFeedback')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
