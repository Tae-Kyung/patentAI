'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link2, RefreshCw, Plus, Pencil, Trash2, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface Match {
  id: string
  project_id: string
  mentor_id: string
  mentor_role: 'primary' | 'secondary'
  status: 'assigned' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  unit_price: number
  project: { id: string; name: string }
  mentor: { id: string; name: string; email: string }
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface SelectOption {
  id: string
  name: string
}

interface MentorOption {
  id: string
  name: string
  email: string
}

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  review: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const STATUSES = ['assigned', 'in_progress', 'review', 'completed', 'cancelled'] as const

export default function InstitutionMatchesPage() {
  const t = useTranslations()

  // Create/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [projects, setProjects] = useState<SelectOption[]>([])
  const [mentors, setMentors] = useState<MentorOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedMentorId, setSelectedMentorId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'primary' | 'secondary'>('primary')
  const [selectedUnitPrice, setSelectedUnitPrice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'project' | 'mentor' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (sortField) {
      p.sort = sortField
      p.sort_dir = sortDirection
    }
    if (statusFilter && statusFilter !== 'all') {
      p.status = statusFilter
    }
    return p
  }, [sortField, sortDirection, statusFilter])

  const {
    data: matches,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<Match>({
    url: '/api/institution/matches',
    params: fetchParams,
    dataKey: 'items',
  })

  const fetchSelectOptions = async () => {
    try {
      const [projectsRes, mentorsRes] = await Promise.all([
        fetch('/api/institution/projects'),
        fetch('/api/institution/mentors'),
      ])
      const [projectsData, mentorsData] = await Promise.all([
        projectsRes.json(),
        mentorsRes.json(),
      ])

      if (projectsData.success) {
        setProjects(
          projectsData.data.items.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        )
      }
      if (mentorsData.success) {
        setMentors(
          mentorsData.data.items
            .filter((m: { mentor_id: string; mentor?: { id: string; name: string | null; email: string } }) => m.mentor)
            .map((m: { mentor_id: string; mentor: { id: string; name: string | null; email: string } }) => ({
              id: m.mentor_id,
              name: m.mentor?.name || m.mentor?.email || '-',
              email: m.mentor?.email || '',
            }))
        )
      }
    } catch {
      // ignore
    }
  }

  const openCreateModal = async () => {
    await fetchSelectOptions()
    setEditingMatch(null)
    setSelectedProjectId('')
    setSelectedMentorId('')
    setSelectedRole('primary')
    setSelectedUnitPrice('200,000')
    setIsModalOpen(true)
  }

  const openEditModal = async (match: Match) => {
    await fetchSelectOptions()
    setEditingMatch(match)
    setSelectedProjectId(match.project_id)
    setSelectedMentorId(match.mentor_id)
    setSelectedRole(match.mentor_role)
    setSelectedUnitPrice(match.unit_price.toLocaleString())
    setIsModalOpen(true)
  }

  const handleSaveMatch = async () => {
    if (!selectedProjectId || !selectedMentorId) return

    setIsSaving(true)
    try {
      const unitPriceNum = parseInt(selectedUnitPrice.replace(/[^0-9]/g, ''), 10) || 0

      if (editingMatch) {
        // Update
        const response = await fetch(`/api/institution/matches/${editingMatch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mentor_id: selectedMentorId !== editingMatch.mentor_id ? selectedMentorId : undefined,
            mentor_role: selectedRole !== editingMatch.mentor_role ? selectedRole : undefined,
            unit_price: unitPriceNum !== editingMatch.unit_price ? unitPriceNum : undefined,
          }),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('institution.matches.updateSuccess'))
          setIsModalOpen(false)
          refetch()
        } else {
          toast.error(result.error || t('institution.matches.updateFailed'))
        }
      } else {
        // Create
        const response = await fetch('/api/institution/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: selectedProjectId,
            mentor_id: selectedMentorId,
            mentor_role: selectedRole,
          }),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('institution.matches.createSuccess'))
          setIsModalOpen(false)
          refetch()
        } else {
          toast.error(result.error || t('institution.matches.createFailed'))
        }
      }
    } catch {
      toast.error(editingMatch ? t('institution.matches.updateFailed') : t('institution.matches.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMatch = async (id: string) => {
    try {
      const response = await fetch(`/api/institution/matches/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.matches.deleteSuccess'))
        refetch()
      } else {
        toast.error(result.error || t('institution.matches.deleteFailed'))
      }
    } catch {
      toast.error(t('institution.matches.deleteFailed'))
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/institution/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.matches.statusUpdated'))
        refetch()
      } else {
        toast.error(result.error || t('institution.matches.statusUpdateFailed'))
      }
    } catch {
      toast.error(t('institution.matches.statusUpdateFailed'))
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: t('institution.matches.statusAssigned'),
      in_progress: t('institution.matches.statusInProgress'),
      review: t('institution.matches.statusReview'),
      completed: t('institution.matches.statusCompleted'),
      cancelled: t('institution.matches.statusCancelled'),
    }
    return labels[status] || status
  }

  const toggleSort = (field: 'project' | 'mentor') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedMatches = matches

  const SortIcon = ({ field }: { field: 'project' | 'mentor' }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      primary: t('institution.matches.rolePrimary'),
      secondary: t('institution.matches.roleSecondary'),
    }
    return labels[role] || role
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.matches.title')}</h1>
          <p className="text-muted-foreground">{t('institution.matches.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('institution.matches.createMatch')}
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground shrink-0">{t('institution.matches.filterByStatus')}</span>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Match list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('institution.matches.noMatches')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4 md:items-center">
            <button className="col-span-3 flex items-center hover:text-foreground transition-colors text-left" onClick={() => toggleSort('project')}>
              {t('institution.matches.project')}<SortIcon field="project" />
            </button>
            <button className="col-span-2 flex items-center hover:text-foreground transition-colors text-left" onClick={() => toggleSort('mentor')}>
              {t('institution.matches.mentor')}<SortIcon field="mentor" />
            </button>
            <div className="col-span-1">{t('institution.matches.role')}</div>
            <div className="col-span-2">{t('institution.matches.unitPrice')}</div>
            <div className="col-span-2">{t('institution.matches.status')}</div>
            <div className="col-span-2">{t('institution.matches.actions')}</div>
          </div>

          {/* Match Rows */}
          {sortedMatches.map((match) => (
            <Card key={match.id}>
              <CardContent className="flex flex-col gap-3 px-4 py-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
                {/* Project */}
                <div className="col-span-3 min-w-0">
                  <p className="truncate text-sm font-medium">{match.project?.name || '-'}</p>
                </div>

                {/* Mentor */}
                <div className="col-span-2 min-w-0">
                  <p className="truncate text-sm">{match.mentor?.name || '-'}</p>
                  <p className="truncate text-xs text-muted-foreground md:block hidden">{match.mentor?.email || ''}</p>
                </div>

                {/* Role */}
                <div className="col-span-1">
                  <Badge
                    variant="outline"
                    className={
                      match.mentor_role === 'primary'
                        ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                        : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }
                  >
                    {getRoleLabel(match.mentor_role)}
                  </Badge>
                </div>

                {/* Unit Price */}
                <div className="col-span-2">
                  <span className="text-sm font-medium">{formatKRW(match.unit_price)}</span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Select
                    value={match.status}
                    onValueChange={(v) => handleStatusChange(match.id, v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {getStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditModal(match)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(match.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(pagination?.totalPages ?? 1) > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination?.totalPages ?? 1}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Create/Edit match modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMatch ? t('institution.matches.editMatch') : t('institution.matches.createMatch')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('institution.matches.project')}</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!!editingMatch}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('institution.matches.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('institution.matches.mentor')}</Label>
              <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('institution.matches.selectMentor')} />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.name} ({mentor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('institution.matches.role')}</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as 'primary' | 'secondary')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">
                    {t('institution.matches.rolePrimary')}
                  </SelectItem>
                  <SelectItem value="secondary">
                    {t('institution.matches.roleSecondary')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('institution.matches.unitPrice')}</Label>
              <div className="relative">
                <Input
                  value={selectedUnitPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setSelectedUnitPrice(raw ? parseInt(raw).toLocaleString() : '')
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {t('institution.matches.unitPriceCurrency')}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveMatch}
              disabled={isSaving || !selectedProjectId || !selectedMentorId}
            >
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('institution.matches.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('institution.matches.deleteConfirmMessage')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteMatch(deleteConfirmId)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
