'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { MessageSquare, User, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface MentorInfo {
  name: string
  email: string
  specialty: string
  role: string
}

interface Session {
  id: string
  round_number: number
  session_type: string
  comments: unknown
  session_date: string | null
  status: string
}

const sessionStatusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  acknowledged: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

function formatComments(comments: unknown): string {
  if (!comments) return ''
  if (typeof comments === 'string') return comments
  return JSON.stringify(comments, null, 2)
}

export default function MentorFeedbackPage() {
  const t = useTranslations('applicant.feedback')
  const params = useParams()
  const id = params.id as string

  const [mentors, setMentors] = useState<MentorInfo[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [sessionsRes, mentorRes] = await Promise.all([
          fetch(`/api/projects/${id}/mentor-feedback`),
          fetch(`/api/projects/${id}/mentor-info`),
        ])

        const sessionsResult = await sessionsRes.json()
        const mentorResult = await mentorRes.json()

        if (sessionsResult.success) {
          setSessions(sessionsResult.data)
        } else {
          toast.error(t('fetchFailed'))
        }

        if (mentorResult.success) {
          setMentors(mentorResult.data)
        }
      } catch {
        toast.error(t('fetchFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, t])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Mentor Info Card */}
      {mentors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('mentorInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {mentors.map((mentor, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{mentor.name}</p>
                    <p className="text-sm text-muted-foreground">{mentor.email}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{mentor.specialty}</Badge>
                      <Badge variant="secondary">{mentor.role}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Timeline */}
      <div>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('sessionsTitle')}
        </h2>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium">{t('noSessions')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('noSessionsDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 hidden w-0.5 bg-border sm:block" />

            {sessions.map((session) => (
              <div key={session.id} className="relative sm:pl-12">
                {/* Timeline dot */}
                <div className="absolute left-3.5 top-6 hidden h-3 w-3 rounded-full border-2 border-primary bg-background sm:block" />

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {t('round')} {session.round_number}
                        </CardTitle>
                        <Badge variant="outline">{session.session_type}</Badge>
                        <Badge
                          className={
                            sessionStatusColor[session.status] ||
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }
                        >
                          {t(`status.${session.status}`)}
                        </Badge>
                      </div>
                      {session.session_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(session.session_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {session.comments ? (
                      <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
                        {formatComments(session.comments)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {t('noComments')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
