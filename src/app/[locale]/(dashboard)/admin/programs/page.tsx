'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, RefreshCw, Calendar, Edit2, FolderOpen, Users, Building2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
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
import { toast } from 'sonner'

interface ProgramStats {
  projectCount: number
  mentorCount: number
  institutionCount: number
  sessionCount: number
}

interface Program {
  id: string
  name: string
  year: number
  round: number
  description: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  stats: ProgramStats
}

const STATUS_COLORS: Record<string, string> = {
  preparing: 'bg-yellow-500',
  active: 'bg-green-500',
  completed: 'bg-blue-500',
  archived: 'bg-gray-500',
}

export default function ProgramsPage() {
  const t = useTranslations()
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    round: 1,
    description: '',
    start_date: '',
    end_date: '',
    status: 'preparing',
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchPrograms = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const response = await fetch(`/api/admin/programs?${params}`)
      const result = await response.json()

      if (result.success) {
        setPrograms(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('admin.programs.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrograms()
  }, [currentPage, statusFilter])

  const openCreateModal = () => {
    setEditingProgram(null)
    setFormData({
      name: '',
      year: new Date().getFullYear(),
      round: 1,
      description: '',
      start_date: '',
      end_date: '',
      status: 'preparing',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (program: Program) => {
    setEditingProgram(program)
    setFormData({
      name: program.name,
      year: program.year,
      round: program.round,
      description: program.description || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      status: program.status,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setIsSaving(true)
    try {
      const url = editingProgram
        ? `/api/admin/programs/${editingProgram.id}`
        : '/api/admin/programs'

      const response = await fetch(url, {
        method: editingProgram ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: formData.description || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingProgram ? t('admin.programs.updated') : t('admin.programs.created'))
        setIsModalOpen(false)
        fetchPrograms()
      } else {
        toast.error(result.error || t('admin.programs.saveFailed'))
      }
    } catch {
      toast.error(t('admin.programs.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      preparing: t('admin.programs.statusPreparing'),
      active: t('admin.programs.statusActive'),
      completed: t('admin.programs.statusCompleted'),
      archived: t('admin.programs.statusArchived'),
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.programs.title')}</h1>
          <p className="text-muted-foreground">{t('admin.programs.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPrograms}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.programs.createProgram')}
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="preparing">{t('admin.programs.statusPreparing')}</SelectItem>
            <SelectItem value="active">{t('admin.programs.statusActive')}</SelectItem>
            <SelectItem value="completed">{t('admin.programs.statusCompleted')}</SelectItem>
            <SelectItem value="archived">{t('admin.programs.statusArchived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('admin.programs.noPrograms')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {program.year}{t('admin.programs.year')} {program.round}{t('admin.programs.round')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${STATUS_COLORS[program.status]} text-white`}>
                        {getStatusLabel(program.status)}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(program)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {program.description || t('admin.programs.noDescription')}
                  </p>
                  {(program.start_date || program.end_date) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('admin.programs.period')}: {program.start_date || '?'} ~ {program.end_date || '?'}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      <span>{t('admin.programs.projects')}</span>
                      <span className="font-semibold text-foreground">{program.stats.projectCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{t('admin.programs.mentors')}</span>
                      <span className="font-semibold text-foreground">{program.stats.mentorCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{t('admin.programs.institutions')}</span>
                      <span className="font-semibold text-foreground">{program.stats.institutionCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>{t('admin.programs.sessions')}</span>
                      <span className="font-semibold text-foreground">{program.stats.sessionCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}

      {/* 생성/수정 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? t('admin.programs.editProgram') : t('admin.programs.createProgram')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.programs.programName')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.programs.namePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.programs.year')}</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2030}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2026 })}
                />
              </div>
              <div>
                <Label>{t('admin.programs.round')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.round}
                  onChange={(e) => setFormData({ ...formData, round: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div>
              <Label>{t('admin.programs.programDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.programs.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.programs.startDate')}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('admin.programs.endDate')}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            {editingProgram && (
              <div>
                <Label>{t('admin.programs.status')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparing">{t('admin.programs.statusPreparing')}</SelectItem>
                    <SelectItem value="active">{t('admin.programs.statusActive')}</SelectItem>
                    <SelectItem value="completed">{t('admin.programs.statusCompleted')}</SelectItem>
                    <SelectItem value="archived">{t('admin.programs.statusArchived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
