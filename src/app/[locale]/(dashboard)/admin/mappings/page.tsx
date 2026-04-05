'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Link2, Plus, Search, Check, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Mapping {
  id: string
  status: string
  created_at: string
  project: { id: string; name: string; current_stage: string } | null
  institution: { id: string; name: string; region: string } | null
  program: { id: string; name: string; year: number; round: number } | null
}

interface SelectOption {
  id: string
  name: string
}

interface ProjectOption {
  id: string
  name: string
  current_stage: string
  owner_name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  completed: 'bg-blue-500',
  rejected: 'bg-red-500',
}

export default function MappingsPage() {
  const t = useTranslations()
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null)
  const [institutions, setInstitutions] = useState<SelectOption[]>([])
  const [programs, setPrograms] = useState<SelectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [projectQuery, setProjectQuery] = useState('')
  const [projectResults, setProjectResults] = useState<ProjectOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchMappings = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '10' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const response = await fetch(`/api/admin/mappings?${params}`)
      const result = await response.json()
      if (result.success) {
        setMappings(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('admin.mappings.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchMappings() }, [currentPage, statusFilter])

  const fetchSelectOptions = async () => {
    try {
      const [instRes, progRes] = await Promise.all([
        fetch('/api/admin/institutions?limit=100'),
        fetch('/api/admin/programs?limit=100'),
      ])
      const [instData, progData] = await Promise.all([instRes.json(), progRes.json()])
      if (instData.success) setInstitutions(instData.data.items.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })))
      if (progData.success) setPrograms(progData.data.items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
    } catch {
      // ignore
    }
  }

  const searchProjects = useCallback(async (query: string) => {
    setIsSearching(true)
    try {
      const params = new URLSearchParams({ q: query, limit: '20' })
      const response = await fetch(`/api/admin/projects?${params}`)
      const result = await response.json()
      if (result.success) setProjectResults(result.data)
    } catch {
      // silent
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleProjectQueryChange = (value: string) => {
    setProjectQuery(value)
    setShowProjectDropdown(true)
    if (selectedProjectId && value !== selectedProjectName) {
      setSelectedProjectId('')
      setSelectedProjectName('')
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => searchProjects(value), 300)
  }

  const selectProject = (project: ProjectOption) => {
    setSelectedProjectId(project.id)
    setSelectedProjectName(project.name)
    setProjectQuery(project.name)
    setShowProjectDropdown(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openCreateModal = async () => {
    await fetchSelectOptions()
    setEditingMapping(null)
    setSelectedProjectId('')
    setSelectedProjectName('')
    setProjectQuery('')
    setProjectResults([])
    setSelectedInstitutionId('')
    setSelectedProgramId('')
    searchProjects('')
    setIsModalOpen(true)
  }

  const openEditModal = async (mapping: Mapping) => {
    await fetchSelectOptions()
    setEditingMapping(mapping)
    setSelectedProjectId(mapping.project?.id || '')
    setSelectedProjectName(mapping.project?.name || '')
    setProjectQuery(mapping.project?.name || '')
    setSelectedInstitutionId(mapping.institution?.id || '')
    setSelectedProgramId(mapping.program?.id || '')
    setIsModalOpen(true)
  }

  const handleDeleteMapping = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/mappings/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('admin.mappings.deleteSuccess'))
        fetchMappings()
      } else {
        toast.error(result.error || t('admin.mappings.deleteFailed'))
      }
    } catch {
      toast.error(t('admin.mappings.deleteFailed'))
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleSaveMapping = async () => {
    if (!selectedProjectId || !selectedInstitutionId || !selectedProgramId) return
    setIsSaving(true)
    try {
      if (editingMapping) {
        const updateBody: Record<string, string> = {}
        if (selectedInstitutionId !== editingMapping.institution?.id) updateBody.institution_id = selectedInstitutionId
        if (selectedProgramId !== editingMapping.program?.id) updateBody.program_id = selectedProgramId
        if (Object.keys(updateBody).length === 0) { setIsModalOpen(false); return }

        const response = await fetch(`/api/admin/mappings/${editingMapping.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('admin.mappings.updateSuccess'))
          setIsModalOpen(false)
          fetchMappings()
        } else {
          toast.error(result.error || t('admin.mappings.updateFailed'))
        }
      } else {
        const response = await fetch('/api/admin/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: selectedProjectId, institution_id: selectedInstitutionId, program_id: selectedProgramId }),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('admin.mappings.mapped'))
          setIsModalOpen(false)
          fetchMappings()
        } else {
          toast.error(result.error || t('admin.mappings.mappingFailed'))
        }
      }
    } catch {
      toast.error(t('admin.mappings.mappingFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/mappings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (result.success) fetchMappings()
    } catch {
      toast.error(t('admin.mappings.mappingFailed'))
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('admin.mappings.statusPending'),
      approved: t('admin.mappings.statusApproved'),
      completed: t('admin.mappings.statusCompleted'),
      rejected: t('admin.mappings.statusRejected'),
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.mappings.title')}</h1>
          <p className="text-muted-foreground">{t('admin.mappings.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMappings}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.mappings.createMapping')}
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">{t('admin.mappings.statusPending')}</SelectItem>
            <SelectItem value="approved">{t('admin.mappings.statusApproved')}</SelectItem>
            <SelectItem value="completed">{t('admin.mappings.statusCompleted')}</SelectItem>
            <SelectItem value="rejected">{t('admin.mappings.statusRejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : mappings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('admin.mappings.noMappings')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.mappings.project')}</TableHead>
                  <TableHead>{t('admin.mappings.institution')}</TableHead>
                  <TableHead>{t('admin.mappings.program')}</TableHead>
                  <TableHead>{t('admin.mappings.status')}</TableHead>
                  <TableHead>{t('admin.mappings.statusChange')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">
                      {mapping.project?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{mapping.institution?.name || '-'}</p>
                        {mapping.institution?.region && (
                          <p className="text-xs text-muted-foreground">{mapping.institution.region}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{mapping.program?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[mapping.status]} text-white`}>
                        {getStatusLabel(mapping.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={mapping.status} onValueChange={(v) => handleStatusChange(mapping.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('admin.mappings.statusPending')}</SelectItem>
                          <SelectItem value="approved">{t('admin.mappings.statusApproved')}</SelectItem>
                          <SelectItem value="completed">{t('admin.mappings.statusCompleted')}</SelectItem>
                          <SelectItem value="rejected">{t('admin.mappings.statusRejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(mapping)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(mapping.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </div>
      )}

      {/* 매핑 생성/수정 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMapping ? t('admin.mappings.editMapping') : t('admin.mappings.createMapping')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div ref={dropdownRef} className="relative">
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.project')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  className="w-full rounded-md border pl-9 pr-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  placeholder={t('admin.mappings.searchProject')}
                  value={projectQuery}
                  onChange={(e) => handleProjectQueryChange(e.target.value)}
                  onFocus={() => !editingMapping && setShowProjectDropdown(true)}
                  disabled={!!editingMapping}
                />
                {isSearching && <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
              {selectedProjectId && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">{selectedProjectName}</p>
              )}
              {showProjectDropdown && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                  {projectResults.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {isSearching ? t('common.loading') : t('admin.mappings.noProjectsFound')}
                    </p>
                  ) : (
                    projectResults.map((project) => (
                      <button
                        key={project.id}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${selectedProjectId === project.id ? 'bg-accent' : ''}`}
                        onClick={() => selectProject(project)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{project.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{project.owner_name} · {project.current_stage}</p>
                        </div>
                        {selectedProjectId === project.id && <Check className="ml-2 h-4 w-4 shrink-0 text-green-600" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.institution')}</label>
              <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                <SelectTrigger><SelectValue placeholder={t('admin.mappings.selectInstitution')} /></SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.program')}</label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger><SelectValue placeholder={t('admin.mappings.selectProgram')} /></SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveMapping} disabled={isSaving || !selectedProjectId || !selectedInstitutionId || !selectedProgramId}>
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.mappings.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('admin.mappings.deleteConfirmMessage')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteMapping(deleteConfirmId)}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
