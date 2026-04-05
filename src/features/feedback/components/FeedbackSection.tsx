'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare, Send, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Feedback {
  id: string
  stage: string
  gate: string | null
  comment: string
  feedback_type: string
  created_at: string
  user_id: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface FeedbackSectionProps {
  projectId: string
  currentGate: string
  currentUserId?: string
  userRole?: string
}

export function FeedbackSection({
  projectId,
  currentGate,
  currentUserId,
  userRole,
}: FeedbackSectionProps) {
  const t = useTranslations()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newType, setNewType] = useState<string>('comment')
  const [newStage, setNewStage] = useState<string>('idea')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMentorOrAdmin = userRole === 'mentor' || userRole === 'admin'

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks`)
      const result = await response.json()

      if (result.success) {
        setFeedbacks(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [projectId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          comment: newComment,
          feedback_type: newType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('feedbackSection.registered'))
        setNewComment('')
        setShowForm(false)
        fetchFeedbacks()
      } else {
        toast.error(result.error || t('feedbackSection.registerFailed'))
      }
    } catch (error) {
      toast.error(t('feedbackSection.registerFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks/${feedbackId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('feedbackSection.deleted'))
        fetchFeedbacks()
      } else {
        toast.error(result.error || t('feedbackSection.deleteFailed'))
      }
    } catch (error) {
      toast.error(t('feedbackSection.deleteFailed'))
    }
  }

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      comment: { color: 'bg-blue-500', label: t('feedbackSection.typeComment') },
      revision_request: { color: 'bg-orange-500', label: t('feedbackSection.typeRevisionRequest') },
      approval: { color: 'bg-green-500', label: t('feedbackSection.typeApproval') },
      rejection: { color: 'bg-red-500', label: t('feedbackSection.typeRejection') },
    }
    return configs[type] || configs.comment
  }

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      idea: t('project.idea'),
      evaluation: t('project.evaluation'),
      document: t('project.document'),
      deploy: t('project.deploy'),
      done: t('project.done'),
    }
    return labels[stage] || stage
  }

  // 스테이지별로 피드백 그룹핑
  const groupedFeedbacks = feedbacks.reduce((acc, feedback) => {
    if (!acc[feedback.stage]) {
      acc[feedback.stage] = []
    }
    acc[feedback.stage].push(feedback)
    return acc
  }, {} as Record<string, Feedback[]>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('feedbackSection.mentorFeedback')}
          </CardTitle>
          {isMentorOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? t('common.cancel') : t('feedback.writeFeedback')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 피드백 작성 폼 (멘토/관리자용) */}
        {showForm && isMentorOrAdmin && (
          <div className="mb-6 space-y-4 rounded-lg border p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">{t('feedbackSection.stage')}</label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">{t('project.idea')}</SelectItem>
                    <SelectItem value="evaluation">{t('project.evaluation')}</SelectItem>
                    <SelectItem value="document">{t('project.document')}</SelectItem>
                    <SelectItem value="deploy">{t('project.deploy')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{t('feedbackSection.type')}</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comment">{t('feedbackSection.typeComment')}</SelectItem>
                    <SelectItem value="suggestion">{t('feedbackSection.typeSuggestion')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('feedbackSection.content')}</label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('feedbackSection.contentPlaceholder')}
                rows={4}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.registering')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('feedbackSection.register')}
                </>
              )}
            </Button>
          </div>
        )}

        {/* 피드백 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('feedback.noFeedback')}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeedbacks)
              .sort(([a], [b]) => {
                const order = ['idea', 'evaluation', 'document', 'deploy', 'done']
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([stage, stageFeedbacks]) => (
                <div key={stage}>
                  <h4 className="mb-3 font-medium text-muted-foreground">
                    {getStageLabel(stage)}
                  </h4>
                  <div className="space-y-3">
                    {stageFeedbacks.map((feedback) => {
                      const typeConfig = getTypeConfig(feedback.feedback_type)
                      const isAuthor = feedback.author?.id === currentUserId

                      return (
                        <div
                          key={feedback.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {feedback.author?.name || feedback.author?.email || t('common.unknown')}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {feedback.author?.role === 'admin' ? t('feedbackSection.roleAdmin') : t('feedbackSection.roleMentor')}
                              </Badge>
                              <Badge className={`${typeConfig.color} text-white text-xs`}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            {isAuthor && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(feedback.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm">
                            {feedback.comment}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(feedback.created_at).toLocaleString()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
