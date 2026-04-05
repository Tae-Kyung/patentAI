'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare, Send, Plus, ChevronDown, ChevronUp, Pencil, Trash2, ThumbsUp, Reply } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface ReplyItem {
  id: string
  comment: string
  created_at: string
  author: { id: string; name: string | null; email: string } | null
  is_mine: boolean
}

interface FeedbackItem {
  id: string
  stage: string
  feedback_type: string
  comment: string
  is_resolved: boolean
  created_at: string
  author: { id: string; name: string | null; email: string } | null
  is_mine: boolean
  like_count: number
  is_liked: boolean
  feedback_source?: string
  replies?: ReplyItem[]
}

interface MentorFeedbackPanelProps {
  projectId: string
  stage: string
  mentorRole?: string
  readOnly?: boolean
}

const FEEDBACK_TYPES = ['comment', 'approval', 'revision_request', 'rejection'] as const

export function MentorFeedbackPanel({ projectId, stage, mentorRole, readOnly = false }: MentorFeedbackPanelProps) {
  const t = useTranslations()

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const [comment, setComment] = useState('')
  const [feedbackType, setFeedbackType] = useState<string>('comment')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editFeedbackType, setEditFeedbackType] = useState<string>('comment')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Like state
  const [likingId, setLikingId] = useState<string | null>(null)

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyComment, setReplyComment] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = readOnly
        ? `/api/projects/${projectId}/feedbacks`
        : `/api/mentor/projects/${projectId}/feedbacks`
      const response = await fetch(url)
      const result = await response.json()
      if (result.success) {
        const filtered = readOnly
          ? result.data.filter((f: FeedbackItem & { feedback_source?: string }) => f.stage === stage && f.feedback_source === 'mentoring')
          : result.data.filter((f: FeedbackItem) => f.stage === stage)
        setFeedbacks(filtered)
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false)
    }
  }, [projectId, stage, readOnly])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const handleSubmit = async () => {
    if (!comment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/mentor/projects/${projectId}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, feedback_type: feedbackType, comment }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackSaved'))
        setComment('')
        setFeedbackType('comment')
        setIsWriting(false)
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (fb: FeedbackItem) => {
    setEditingId(fb.id)
    setEditComment(fb.comment)
    setEditFeedbackType(fb.feedback_type)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditComment('')
    setEditFeedbackType('comment')
  }

  const handleSaveEdit = async () => {
    if (!editComment.trim() || !editingId) return

    setIsSavingEdit(true)
    try {
      const response = await fetch(`/api/mentor/feedbacks/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: editComment,
          feedback_type: editFeedbackType,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackUpdated'))
        cancelEdit()
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackUpdateFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackUpdateFailed'))
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/mentor/feedbacks/${deleteConfirmId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackDeleted'))
        setDeleteConfirmId(null)
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackDeleteFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackDeleteFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitReply = async (feedbackId: string) => {
    if (!replyComment.trim()) return

    setIsSubmittingReply(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks/${feedbackId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: replyComment }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.replySaved'))
        setReplyingTo(null)
        setReplyComment('')
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.replyFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.replyFailed'))
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks/${replyId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.replyDeleted'))
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.replyDeleteFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.replyDeleteFailed'))
    }
  }

  const handleLike = async (feedbackId: string) => {
    setLikingId(feedbackId)
    // Optimistic update
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? {
              ...f,
              is_liked: !f.is_liked,
              like_count: f.is_liked ? f.like_count - 1 : f.like_count + 1,
            }
          : f
      )
    )
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks/${feedbackId}/like`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!result.success) {
        // Revert on failure
        await fetchFeedbacks()
        toast.error(t('mentor.workstation.likeFailed'))
      }
    } catch {
      await fetchFeedbacks()
      toast.error(t('mentor.workstation.likeFailed'))
    } finally {
      setLikingId(null)
    }
  }

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      comment: t('mentor.workstation.fbComment'),
      approval: t('mentor.workstation.fbApproval'),
      rejection: t('mentor.workstation.fbRejection'),
      revision_request: t('mentor.workstation.fbRevision'),
    }
    return labels[type] || type
  }

  const typeBadgeClass = (type: string) => {
    const classes: Record<string, string> = {
      comment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      approval: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejection: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      revision_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    }
    return classes[type] || ''
  }

  const roleLabel = mentorRole
    ? (mentorRole === 'primary' ? t('mentor.workstation.rolePrimary') : t('mentor.workstation.roleSecondary'))
    : null

  const renderFeedbackForm = (
    currentComment: string,
    setCurrentComment: (v: string) => void,
    currentType: string,
    setCurrentType: (v: string) => void,
    onSave: () => void,
    onCancel: () => void,
    isSaving: boolean,
    saveLabel: string,
  ) => (
    <div className="space-y-3 rounded-lg border border-blue-200 p-3 dark:border-blue-800">
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_TYPES.map((type) => (
          <button
            key={type}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentType === type
                ? typeBadgeClass(type)
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setCurrentType(type)}
          >
            {typeLabel(type)}
          </button>
        ))}
      </div>
      <Textarea
        value={currentComment}
        onChange={(e) => setCurrentComment(e.target.value)}
        placeholder={t('mentor.workstation.feedbackPlaceholder')}
        rows={4}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !currentComment.trim()}
        >
          {isSaving ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Send className="mr-2 h-3 w-3" />
          )}
          {saveLabel}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader
          className="cursor-pointer pb-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              {t('mentor.workstation.mentorFeedback')}
              {roleLabel && (
                <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                  {roleLabel}
                </Badge>
              )}
              {feedbacks.length > 0 && (
                <Badge variant="secondary">{feedbacks.length}</Badge>
              )}
            </CardTitle>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-3 pt-0">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <>
                {/* 피드백 목록 */}
                {feedbacks.map((fb) => (
                  <div key={fb.id}>
                    {editingId === fb.id ? (
                      renderFeedbackForm(
                        editComment,
                        setEditComment,
                        editFeedbackType,
                        setEditFeedbackType,
                        handleSaveEdit,
                        cancelEdit,
                        isSavingEdit,
                        t('common.save'),
                      )
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {fb.author?.name || fb.author?.email || '-'}
                            </span>
                            <span>{new Date(fb.created_at).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(fb.feedback_type)}`}>
                              {typeLabel(fb.feedback_type)}
                            </span>
                            {!readOnly && fb.is_mine && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => startEdit(fb)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteConfirmId(fb.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{fb.comment}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                              fb.is_liked
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            onClick={() => handleLike(fb.id)}
                            disabled={likingId === fb.id}
                          >
                            <ThumbsUp className={`h-3 w-3 ${fb.is_liked ? 'fill-current' : ''}`} />
                            {fb.like_count > 0 && <span>{fb.like_count}</span>}
                          </button>
                          {replyingTo !== fb.id && (
                            <button
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              onClick={() => { setReplyingTo(fb.id); setReplyComment('') }}
                            >
                              <Reply className="h-3 w-3" />
                              {t('mentor.workstation.reply')}
                            </button>
                          )}
                        </div>

                        {/* 답글 목록 */}
                        {fb.replies && fb.replies.length > 0 && (
                          <div className="mt-2 space-y-2 border-l-2 border-blue-200 pl-3 dark:border-blue-800">
                            {fb.replies.map((reply) => (
                              <div key={reply.id} className="rounded-md bg-muted/20 p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {reply.author?.name || reply.author?.email || '-'}
                                    </span>
                                    <span>{new Date(reply.created_at).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  {reply.is_mine && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleDeleteReply(reply.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm">{reply.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 답글 작성 폼 */}
                        {replyingTo === fb.id && (
                          <div className="mt-2 space-y-2 border-l-2 border-blue-200 pl-3 dark:border-blue-800">
                            <Textarea
                              value={replyComment}
                              onChange={(e) => setReplyComment(e.target.value)}
                              placeholder={t('mentor.workstation.replyPlaceholder')}
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setReplyingTo(null); setReplyComment('') }}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(fb.id)}
                                disabled={isSubmittingReply || !replyComment.trim()}
                              >
                                {isSubmittingReply ? (
                                  <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                  <Send className="mr-2 h-3 w-3" />
                                )}
                                {t('mentor.workstation.reply')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* 새 피드백 작성 (멘토만) */}
                {!readOnly && (
                  isWriting ? (
                    renderFeedbackForm(
                      comment,
                      setComment,
                      feedbackType,
                      setFeedbackType,
                      handleSubmit,
                      () => {
                        setIsWriting(false)
                        setComment('')
                        setFeedbackType('comment')
                      },
                      isSubmitting,
                      t('mentor.workstation.submitFeedback'),
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                      onClick={() => setIsWriting(true)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      {t('mentor.workstation.writeFeedback')}
                    </Button>
                  )
                )}

                {/* 읽기 전용: 피드백 없을 때 안내 */}
                {readOnly && feedbacks.length === 0 && (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    {t('mentor.workstation.noFeedbackYet')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('mentor.workstation.feedbackDeleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('mentor.workstation.feedbackDeleteMessage')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <LoadingSpinner size="sm" className="mr-2" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
