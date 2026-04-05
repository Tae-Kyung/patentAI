'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, RefreshCw, User2, Search, ChevronDown, ChevronRight, FolderKanban, CalendarCheck, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'

interface MentorProjectActivity {
  id: string
  name: string
  mentorRole: string
  matchStatus: string
  totalSessions: number
  completedSessions: number
  reportStatus: string | null
}

interface MentorActivity {
  projects: MentorProjectActivity[]
  totalProjects: number
  totalSessions: number
  completedSessions: number
  reportsSubmitted: number
  reportsTotal: number
}

interface MentorItem {
  id: string
  mentor_id: string
  status: 'active' | 'inactive'
  mentor: {
    id: string
    name: string
    email: string
  }
  profile: {
    specialty: string | string[] | null
    is_approved: boolean
    is_active: boolean
    documents_complete: boolean
    documents_confirmed: boolean
  } | null
  activity: MentorActivity
}

export default function InstitutionMentorsPage() {
  const t = useTranslations()

  const [docsFilter, setDocsFilter] = useState<'all' | 'incomplete' | 'confirmed'>('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (docsFilter !== 'all') p.docs_filter = docsFilter
    return p
  }, [docsFilter])

  const {
    data: mentors,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<MentorItem>({
    url: '/api/institution/mentors',
    params: fetchParams,
  })

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [searchResults, setSearchResults] = useState<{ id: string; name: string | null; email: string; role: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<{ id: string; name: string | null; email: string } | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Status change loading
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  // Remove loading
  const [removingId, setRemovingId] = useState<string | null>(null)
  // Expand toggle
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const searchMentors = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: '10' })
      const response = await fetch(`/api/users/search?${params}`)
      const result = await response.json()
      if (result.success) {
        setSearchResults(
          (result.data as { id: string; name: string | null; email: string; role: string }[])
            .filter((u) => u.role === 'mentor')
        )
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    setInviteQuery(value)
    setSelectedMentor(null)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => searchMentors(value), 300)
  }

  const handleSelectMentor = (mentor: { id: string; name: string | null; email: string }) => {
    setSelectedMentor(mentor)
    setInviteQuery(mentor.name ? `${mentor.name} (${mentor.email})` : mentor.email)
    setSearchResults([])
  }

  const handleInvite = async () => {
    if (!selectedMentor && !inviteQuery.trim()) return

    setIsInviting(true)
    try {
      const body = selectedMentor
        ? { mentor_id: selectedMentor.id }
        : { email: inviteQuery.trim() }

      const response = await fetch('/api/institution/mentors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.inviteSuccess'))
        setIsInviteOpen(false)
        setInviteQuery('')
        setSelectedMentor(null)
        setSearchResults([])
        refetch()
      } else {
        toast.error(result.error || t('institution.mentors.inviteFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.inviteFailed'))
    } finally {
      setIsInviting(false)
    }
  }

  const handleStatusChange = async (mentorId: string, newStatus: 'active' | 'inactive') => {
    setUpdatingId(mentorId)
    try {
      const response = await fetch(`/api/institution/mentors/${mentorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.statusUpdated'))
        refetch()
      } else {
        toast.error(result.error || t('institution.mentors.statusUpdateFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.statusUpdateFailed'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemove = async (mentorId: string) => {
    setRemovingId(mentorId)
    try {
      const response = await fetch(`/api/institution/mentors/${mentorId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.removeSuccess'))
        refetch()
      } else {
        toast.error(result.error || t('institution.mentors.removeFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.removeFailed'))
    } finally {
      setRemovingId(null)
    }
  }

  const getSpecialtyArray = (specialty: string | string[] | null): string[] => {
    if (!specialty) return []
    if (Array.isArray(specialty)) return specialty
    return [specialty]
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reportBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-muted-foreground">-</span>
    const config: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    }
    const labels: Record<string, string> = {
      draft: t('institution.mentors.reportDraft'),
      submitted: t('institution.mentors.reportSubmitted'),
      confirmed: t('institution.mentors.reportConfirmed'),
      rejected: t('institution.mentors.reportRejected'),
    }
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config[status] || ''}`}>{labels[status] || status}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.mentors.title')}</h1>
          <p className="text-muted-foreground">{t('institution.mentors.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('institution.mentors.inviteMentor')}
          </Button>
        </div>
      </div>

      {/* Docs Filter */}
      <Card>
        <CardContent className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground shrink-0">{t('institution.mentors.docsFilter')}</span>
          <Select value={docsFilter} onValueChange={(v) => { setDocsFilter(v as 'all' | 'incomplete' | 'confirmed'); setCurrentPage(1) }}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="incomplete">{t('institution.mentors.docsFilterIncomplete')}</SelectItem>
              <SelectItem value="confirmed">{t('institution.mentors.docsFilterConfirmed')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Mentor List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : mentors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('institution.mentors.noMentors')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {mentors.map((item) => {
              const specialties = getSpecialtyArray(item.profile?.specialty ?? null)
              const isExpanded = expandedIds.has(item.mentor_id)
              const act = item.activity

              return (
                <Card key={item.id}>
                  <CardContent className="p-0">
                    {/* 멘토 헤더 */}
                    <div className="flex items-center justify-between px-6 py-4">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(item.mentor_id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.mentor_id) }}
                      >
                        <div className="flex items-center gap-2">
                          {act.totalProjects > 0 ? (
                            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : <div className="w-4" />}
                          <div className="min-w-0">
                            <p className="font-medium">{item.mentor?.name || item.mentor?.email}</p>
                            <p className="text-sm text-muted-foreground">{item.mentor?.email}</p>
                          </div>
                        </div>
                        {specialties.length > 0 && (
                          <div className="mt-1 ml-6 flex flex-wrap gap-1">
                            {specialties.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {/* 활동 요약 */}
                        <div className="mt-2 ml-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3.5 w-3.5" />
                            {t('institution.mentors.activityProjects', { count: act.totalProjects })}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {t('institution.mentors.activitySessions', { completed: act.completedSessions, total: act.totalSessions })}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {t('institution.mentors.activityReports', { submitted: act.reportsSubmitted, total: act.reportsTotal })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.profile?.documents_confirmed ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                            {t('institution.mentors.docsConfirmed')}
                          </Badge>
                        ) : (!item.profile || !item.profile.documents_complete) ? (
                          <Badge variant="outline" className="border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400 text-xs">
                            {t('institution.mentors.docsIncomplete')}
                          </Badge>
                        ) : null}
                        {item.status === 'active' ? (
                          <Badge className="bg-green-500 text-white">{t('institution.mentors.active')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('institution.mentors.inactive')}</Badge>
                        )}
                        <Select
                          value={item.status}
                          onValueChange={(v) => handleStatusChange(item.mentor_id, v as 'active' | 'inactive')}
                          disabled={updatingId === item.mentor_id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t('institution.mentors.active')}</SelectItem>
                            <SelectItem value="inactive">{t('institution.mentors.inactive')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemove(item.mentor_id)}
                          disabled={removingId === item.mentor_id}
                        >
                          {removingId === item.mentor_id ? <LoadingSpinner size="sm" /> : t('institution.mentors.remove')}
                        </Button>
                      </div>
                    </div>

                    {/* 프로젝트별 활동 상세 (펼침) */}
                    {isExpanded && act.projects.length > 0 && (
                      <div className="border-t bg-muted/30 px-6 py-3">
                        <div className="hidden rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-2">
                          <div className="col-span-4">{t('institution.mentors.colProject')}</div>
                          <div className="col-span-2">{t('institution.mentors.colRole')}</div>
                          <div className="col-span-2">{t('institution.mentors.colStatus')}</div>
                          <div className="col-span-2">{t('institution.mentors.colSessions')}</div>
                          <div className="col-span-2">{t('institution.mentors.colReport')}</div>
                        </div>
                        <div className="space-y-1 mt-1">
                          {act.projects.map((proj) => (
                            <div key={proj.id} className="rounded-lg bg-background px-3 py-2 text-sm md:grid md:grid-cols-12 md:gap-2 md:items-center">
                              <div className="col-span-4 font-medium truncate">{proj.name}</div>
                              <div className="col-span-2">
                                <Badge variant="outline" className="text-xs">
                                  {proj.mentorRole === 'primary' ? t('institution.mentors.rolePrimary') : t('institution.mentors.roleSecondary')}
                                </Badge>
                              </div>
                              <div className="col-span-2">
                                <Badge variant="secondary" className="text-xs">{proj.matchStatus}</Badge>
                              </div>
                              <div className="col-span-2 text-muted-foreground">
                                {proj.completedSessions}/{proj.totalSessions}
                              </div>
                              <div className="col-span-2">
                                {reportBadge(proj.reportStatus)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && act.projects.length === 0 && (
                      <div className="border-t bg-muted/30 px-6 py-4">
                        <p className="text-sm text-center text-muted-foreground">{t('institution.mentors.noActivity')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Invite Mentor Modal */}
      <Dialog open={isInviteOpen} onOpenChange={(open) => {
        setIsInviteOpen(open)
        if (!open) {
          setInviteQuery('')
          setSelectedMentor(null)
          setSearchResults([])
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('institution.mentors.inviteMentor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('institution.mentors.searchLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={inviteQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t('institution.mentors.searchPlaceholder')}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (selectedMentor || inviteQuery.trim())) handleInvite()
                  }}
                />
              </div>
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && !selectedMentor && (
                <div className="mt-1 rounded-md border bg-popover shadow-md">
                  {searchResults.map((mentor) => (
                    <button
                      key={mentor.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => handleSelectMentor(mentor)}
                    >
                      <User2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{mentor.name || '-'}</p>
                        <p className="truncate text-xs text-muted-foreground">{mentor.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {t('institution.mentors.mentorRole')}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && (
                <div className="mt-1 flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              {inviteQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && !selectedMentor && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('institution.mentors.noSearchResults')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isInviting || (!selectedMentor && !inviteQuery.trim())}
            >
              {isInviting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('institution.mentors.sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
