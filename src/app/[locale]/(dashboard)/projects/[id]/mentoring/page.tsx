'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { FileText, MessageSquare, Plus, Send, Save, ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react'
import { marked } from 'marked'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import Link from 'next/link'
import { toast } from 'sonner'
import { FeedbackSection } from './components/FeedbackSection'

interface IdeaCard {
  id: string
  problem: string | null
  solution: string | null
  target: string | null
  differentiation: string | null
  uvp: string | null
  channels: string | null
  revenue_streams: string | null
  cost_structure: string | null
  key_metrics: string | null
  is_confirmed: boolean
}

interface EvalFeedback {
  feedback: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

interface EvaluationItem {
  id: string
  investor_score: number | null
  investor_feedback: string | null
  market_score: number | null
  market_feedback: string | null
  tech_score: number | null
  tech_feedback: string | null
  total_score: number | null
  is_confirmed: boolean
}

interface DocumentItem {
  id: string
  type: string
  title: string
  content: string | null
  storage_path: string | null
  file_name: string | null
  is_confirmed: boolean
}

interface ProjectDetail {
  id: string
  name: string
  current_stage: string
  ideaCards: IdeaCard[]
  evaluations: EvaluationItem[]
  documents: DocumentItem[]
}

interface Session {
  id: string
  round_number: number
  session_type: string
  comments: unknown
  status: string
  session_date: string | null
  duration_minutes: number | null
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
}

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function MentoringWorkstationPage() {
  const t = useTranslations()
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [editingComments, setEditingComments] = useState<Record<string, string>>({})
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null)
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [feedbackStage, setFeedbackStage] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackType, setFeedbackType] = useState<string>('comment')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [expandedFeedbackStage, setExpandedFeedbackStage] = useState<string | null>(null)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)

  // Feedback edit/delete state
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null)
  const [editFeedbackComment, setEditFeedbackComment] = useState('')
  const [editFeedbackType, setEditFeedbackType] = useState<string>('comment')
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null)

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/mentor/projects/${id}`)
      const result = await response.json()
      if (result.success) {
        setProject(result.data)
      } else {
        toast.error(t('mentor.workstation.fetchFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.fetchFailed'))
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/mentor/projects/${id}/sessions`)
      const result = await response.json()
      if (result.success) {
        setSessions(result.data)
      }
    } catch {
      // silent fail for sessions
    }
  }

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch(`/api/mentor/projects/${id}/feedbacks`)
      const result = await response.json()
      if (result.success) {
        setFeedbacks(result.data)
      }
    } catch {
      // silent fail
    }
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchProject(), fetchSessions(), fetchFeedbacks()])
      setIsLoading(false)
    }
    load()
  }, [id])

  const handleCreateSession = async () => {
    setCreatingSession(true)
    try {
      const response = await fetch(`/api/mentor/projects/${id}/sessions`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.created'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.createFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.createFailed'))
    } finally {
      setCreatingSession(false)
    }
  }

  const handleSaveComments = async (sessionId: string) => {
    setSavingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: editingComments[sessionId] || '' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.saved'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.saveFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.saveFailed'))
    } finally {
      setSavingSessionId(null)
    }
  }

  const handleSubmitSession = async (sessionId: string) => {
    setSubmittingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}/submit`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.submitted'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.submitFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.submitFailed'))
    } finally {
      setSubmittingSessionId(null)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.deleted'))
        setExpandedSessionId(null)
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.deleteFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.deleteFailed'))
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handleUnsubmitSession = async (sessionId: string) => {
    setSubmittingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}/unsubmit`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.unsubmitted'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.unsubmitFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.unsubmitFailed'))
    } finally {
      setSubmittingSessionId(null)
    }
  }

  const handleSubmitFeedback = async (stage: string) => {
    if (!feedbackComment.trim()) return

    setSubmittingFeedback(true)
    try {
      const response = await fetch(`/api/mentor/projects/${id}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          feedback_type: feedbackType,
          comment: feedbackComment,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackSaved'))
        setFeedbackComment('')
        setFeedbackType('comment')
        setFeedbackStage(null)
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackFailed'))
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const handleEditFeedback = async (feedbackId: string) => {
    if (!editFeedbackComment.trim()) return
    setSavingFeedback(true)
    try {
      const response = await fetch(`/api/mentor/feedbacks/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: editFeedbackComment,
          feedback_type: editFeedbackType,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackUpdated'))
        setEditingFeedbackId(null)
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackUpdateFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackUpdateFailed'))
    } finally {
      setSavingFeedback(false)
    }
  }

  const handleDeleteFeedback = async (feedbackId: string) => {
    setDeletingFeedbackId(feedbackId)
    try {
      const response = await fetch(`/api/mentor/feedbacks/${feedbackId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.workstation.feedbackDeleted'))
        await fetchFeedbacks()
      } else {
        toast.error(result.error || t('mentor.workstation.feedbackDeleteFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.feedbackDeleteFailed'))
    } finally {
      setDeletingFeedbackId(null)
    }
  }

  const startEditFeedback = (fb: FeedbackItem) => {
    setEditingFeedbackId(fb.id)
    setEditFeedbackComment(fb.comment)
    setEditFeedbackType(fb.feedback_type)
  }

  const getFeedbacksForStage = (stage: string) =>
    feedbacks.filter((f) => f.stage === stage)

  const toggleSession = (session: Session) => {
    if (expandedSessionId === session.id) {
      setExpandedSessionId(null)
    } else {
      setExpandedSessionId(session.id)
      if (!(session.id in editingComments)) {
        const commentsText =
          typeof session.comments === 'string'
            ? session.comments
            : session.comments
              ? JSON.stringify(session.comments, null, 2)
              : ''
        setEditingComments((prev) => ({ ...prev, [session.id]: commentsText }))
      }
    }
  }

  const renderFeedbackSection = (stage: string) => (
    <FeedbackSection
      stage={stage}
      feedbacks={getFeedbacksForStage(stage)}
      isExpanded={expandedFeedbackStage === stage}
      onToggleExpand={setExpandedFeedbackStage}
      isWriting={feedbackStage === stage}
      feedbackType={feedbackType}
      feedbackComment={feedbackComment}
      submittingFeedback={submittingFeedback}
      onStartWrite={(s) => { setFeedbackStage(s); setFeedbackComment(''); setFeedbackType('comment') }}
      onCancelWrite={() => { setFeedbackStage(null); setFeedbackComment(''); setFeedbackType('comment') }}
      onTypeChange={setFeedbackType}
      onCommentChange={setFeedbackComment}
      onSubmit={handleSubmitFeedback}
      editingFeedbackId={editingFeedbackId}
      editFeedbackType={editFeedbackType}
      editFeedbackComment={editFeedbackComment}
      savingFeedback={savingFeedback}
      deletingFeedbackId={deletingFeedbackId}
      onStartEdit={startEditFeedback}
      onCancelEdit={() => setEditingFeedbackId(null)}
      onEditTypeChange={setEditFeedbackType}
      onEditCommentChange={setEditFeedbackComment}
      onEditSave={handleEditFeedback}
      onDelete={handleDeleteFeedback}
    />
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  const ideaCard = project.ideaCards?.[0] || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('mentor.workstation.title')}
          </p>
        </div>
        <Link href={`/projects/${id}/mentoring/report`}>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            {t('mentor.workstation.viewReport')}
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="artifacts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="artifacts">
            <FileText className="mr-2 h-4 w-4" />
            {t('mentor.workstation.artifacts')}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t('mentor.workstation.sessions')}
          </TabsTrigger>
        </TabsList>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="mt-6 space-y-6">
          {/* Idea Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.ideaCard')}</CardTitle>
            </CardHeader>
            <CardContent>
              {ideaCard ? (
                <div className="space-y-4 text-sm">
                  {/* 린캔버스 그리드 */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {ideaCard.problem && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.problem')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.problem}</p>
                      </div>
                    )}
                    {ideaCard.solution && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.solution')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.solution}</p>
                      </div>
                    )}
                    {ideaCard.target && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.targetMarket')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.target}</p>
                      </div>
                    )}
                    {ideaCard.uvp && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.uvp')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.uvp}</p>
                      </div>
                    )}
                    {ideaCard.differentiation && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.differentiation')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.differentiation}</p>
                      </div>
                    )}
                    {ideaCard.channels && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.channels')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.channels}</p>
                      </div>
                    )}
                    {ideaCard.revenue_streams && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.revenueStreams')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.revenue_streams}</p>
                      </div>
                    )}
                    {ideaCard.cost_structure && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.costStructure')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.cost_structure}</p>
                      </div>
                    )}
                    {ideaCard.key_metrics && (
                      <div className="rounded-lg border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {t('mentor.workstation.keyMetrics')}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{ideaCard.key_metrics}</p>
                      </div>
                    )}
                  </div>
                  <Badge variant={ideaCard.is_confirmed ? 'default' : 'secondary'}>
                    {ideaCard.is_confirmed
                      ? t('mentor.workstation.confirmed')
                      : t('mentor.workstation.draft')}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noIdeaCard')}
                </p>
              )}
              {renderFeedbackSection('idea')}
            </CardContent>
          </Card>

          {/* Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.evaluations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {project.evaluations.length > 0 ? (
                <div className="space-y-4">
                  {project.evaluations.map((evaluation) => {
                    const categories = [
                      { label: t('mentor.workstation.evalInvestor'), score: evaluation.investor_score, feedback: evaluation.investor_feedback },
                      { label: t('mentor.workstation.evalMarket'), score: evaluation.market_score, feedback: evaluation.market_feedback },
                      { label: t('mentor.workstation.evalTech'), score: evaluation.tech_score, feedback: evaluation.tech_feedback },
                    ]
                    return (
                      <div key={evaluation.id} className="space-y-3">
                        {/* 종합 점수 */}
                        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                          <span className="font-medium">{t('mentor.workstation.evalTotal')}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={evaluation.is_confirmed ? 'default' : 'secondary'}>
                              {evaluation.is_confirmed ? t('mentor.workstation.confirmed') : t('mentor.workstation.draft')}
                            </Badge>
                            {evaluation.total_score !== null && (
                              <span className="text-lg font-bold">{evaluation.total_score}<span className="text-sm text-muted-foreground">/100</span></span>
                            )}
                          </div>
                        </div>
                        {/* 항목별 */}
                        {categories.map((cat) => {
                          let parsed: EvalFeedback | null = null
                          try { parsed = cat.feedback ? JSON.parse(cat.feedback) : null } catch { /* not JSON */ }
                          return (
                            <div key={cat.label} className="rounded-lg border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{cat.label}</span>
                                {cat.score !== null && (
                                  <Badge variant="outline">{cat.score}/100</Badge>
                                )}
                              </div>
                              {parsed ? (
                                <div className="space-y-2 text-sm">
                                  <p className="text-muted-foreground">{parsed.feedback}</p>
                                  {parsed.strengths?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-green-700 dark:text-green-400">{t('mentor.workstation.evalStrengths')}</p>
                                      <ul className="ml-4 list-disc text-xs text-muted-foreground">
                                        {parsed.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                  {parsed.weaknesses?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t('mentor.workstation.evalWeaknesses')}</p>
                                      <ul className="ml-4 list-disc text-xs text-muted-foreground">
                                        {parsed.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                  {parsed.recommendations?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{t('mentor.workstation.evalRecommendations')}</p>
                                      <ul className="ml-4 list-disc text-xs text-muted-foreground">
                                        {parsed.recommendations.map((s, i) => <li key={i}>{s}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : cat.feedback ? (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cat.feedback}</p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noEvaluations')}
                </p>
              )}
              {renderFeedbackSection('evaluation')}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.documents')}</CardTitle>
            </CardHeader>
            <CardContent>
              {project.documents.length > 0 ? (
                <div className="space-y-3">
                  {project.documents.map((doc) => (
                    <div key={doc.id} className="rounded-lg border">
                      <div
                        className="flex cursor-pointer items-center justify-between p-3 hover:bg-accent/50"
                        onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {doc.title || doc.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{doc.type}</Badge>
                          <Badge variant={doc.is_confirmed ? 'default' : 'secondary'}>
                            {doc.is_confirmed ? t('mentor.workstation.confirmed') : t('mentor.workstation.draft')}
                          </Badge>
                          {doc.storage_path && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${doc.storage_path}`, '_blank')
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(doc.content || doc.storage_path) ? (
                            expandedDocId === doc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          ) : null}
                        </div>
                      </div>
                      {expandedDocId === doc.id && (
                        <div className="border-t p-4">
                          {/* 이미지 파일 (infographic, leaflet 등) */}
                          {doc.storage_path && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.storage_path) ? (
                            <div className="flex justify-center">
                              <img
                                src={doc.storage_path}
                                alt={doc.title}
                                className="max-w-full max-h-[600px] rounded-lg object-contain"
                              />
                            </div>
                          ) : doc.type === 'landing' && doc.content ? (
                            /* 랜딩페이지 HTML - iframe으로 렌더링 */
                            <iframe
                              srcDoc={doc.content}
                              className="w-full rounded-lg border"
                              style={{ height: '600px' }}
                              sandbox="allow-scripts allow-same-origin"
                              title={doc.title}
                            />
                          ) : doc.type === 'ppt' && doc.content ? (
                            /* PPT HTML - iframe으로 렌더링 */
                            <iframe
                              srcDoc={doc.content}
                              className="w-full rounded-lg border"
                              style={{ height: '600px' }}
                              sandbox="allow-scripts allow-same-origin"
                              title={doc.title}
                            />
                          ) : doc.content ? (
                            /* 마크다운 콘텐츠 (사업계획서, 피치 등) */
                            <div
                              className="markdown-preview"
                              dangerouslySetInnerHTML={{
                                __html: marked.parse(doc.content, { async: false }) as string,
                              }}
                            />
                          ) : (
                            <p className="text-sm text-center text-muted-foreground">{t('mentor.workstation.noContent')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noDocuments')}
                </p>
              )}
              {renderFeedbackSection('document')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t('mentor.sessions.title')}
            </h2>
            <Button onClick={handleCreateSession} disabled={creatingSession}>
              {creatingSession ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t('mentor.sessions.newSession')}
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('mentor.sessions.noSessions')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {t('mentor.sessions.round')} {session.round_number}
                        </CardTitle>
                        <Badge variant="outline">{session.session_type}</Badge>
                        <Badge
                          className={statusColor[session.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {session.session_date
                            ? new Date(session.session_date).toLocaleDateString()
                            : '-'}
                          {session.duration_minutes && (
                            <span className="ml-2">
                              ({session.duration_minutes}{t('mentor.sessions.minutes')})
                            </span>
                          )}
                        </span>
                        {session.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSession(session.id)
                            }}
                            disabled={deletingSessionId === session.id}
                          >
                            {deletingSessionId === session.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSessionId === session.id && (
                    <CardContent className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          {t('mentor.sessions.comments')}
                        </label>
                        <Textarea
                          value={editingComments[session.id] || ''}
                          onChange={(e) =>
                            setEditingComments((prev) => ({
                              ...prev,
                              [session.id]: e.target.value,
                            }))
                          }
                          rows={6}
                          placeholder={t('mentor.sessions.commentsPlaceholder')}
                          disabled={session.status !== 'draft'}
                        />
                      </div>
                      {session.status === 'draft' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSaveComments(session.id)}
                            disabled={savingSessionId === session.id}
                          >
                            {savingSessionId === session.id ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            {t('mentor.sessions.save')}
                          </Button>
                          <Button
                            onClick={() => handleSubmitSession(session.id)}
                            disabled={submittingSessionId === session.id}
                          >
                            {submittingSessionId === session.id ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {t('mentor.sessions.submit')}
                          </Button>
                        </div>
                      )}
                      {session.status === 'submitted' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleUnsubmitSession(session.id)}
                            disabled={submittingSessionId === session.id}
                          >
                            {submittingSessionId === session.id ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : null}
                            {t('mentor.sessions.unsubmit')}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
