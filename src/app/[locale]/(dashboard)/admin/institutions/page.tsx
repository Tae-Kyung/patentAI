'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, RefreshCw, Building2, Edit2, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

interface Institution {
  id: string
  name: string
  region: string
  type: string
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  is_approved: boolean
  max_mentors: number
  max_projects: number
  created_at: string
}

export default function InstitutionsPage() {
  const t = useTranslations()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [regionFilter, setRegionFilter] = useState('all')
  const [approvedFilter, setApprovedFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    type: 'center' as string,
    address: '',
    contact_email: '',
    contact_phone: '',
    max_mentors: 50,
    max_projects: 200,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchInstitutions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '10' })
      if (regionFilter !== 'all') params.set('region', regionFilter)
      if (approvedFilter !== 'all') params.set('approved', approvedFilter)

      const response = await fetch(`/api/admin/institutions?${params}`)
      const result = await response.json()
      if (result.success) {
        setInstitutions(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('admin.institutions.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchInstitutions() }, [currentPage, regionFilter, approvedFilter])

  const openCreateModal = () => {
    setEditingInstitution(null)
    setFormData({ name: '', region: '', type: 'center', address: '', contact_email: '', contact_phone: '', max_mentors: 50, max_projects: 200 })
    setIsModalOpen(true)
  }

  const openEditModal = (inst: Institution) => {
    setEditingInstitution(inst)
    setFormData({
      name: inst.name, region: inst.region, type: inst.type,
      address: inst.address || '', contact_email: inst.contact_email || '',
      contact_phone: inst.contact_phone || '', max_mentors: inst.max_mentors, max_projects: inst.max_projects,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.region) return
    setIsSaving(true)
    try {
      const url = editingInstitution ? `/api/admin/institutions/${editingInstitution.id}` : '/api/admin/institutions'
      const response = await fetch(url, {
        method: editingInstitution ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          address: formData.address || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(editingInstitution ? t('admin.institutions.updated') : t('admin.institutions.created'))
        setIsModalOpen(false)
        fetchInstitutions()
      } else {
        toast.error(result.error || t('admin.institutions.saveFailed'))
      }
    } catch {
      toast.error(t('admin.institutions.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/institutions/${id}/approve`, { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('admin.institutions.approved_success'))
        fetchInstitutions()
      } else {
        toast.error(result.error || t('admin.institutions.approveFailed'))
      }
    } catch {
      toast.error(t('admin.institutions.approveFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/institutions/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('admin.institutions.deleted'))
        setDeleteConfirmId(null)
        fetchInstitutions()
      } else {
        toast.error(result.error || t('admin.institutions.deleteFailed'))
      }
    } catch {
      toast.error(t('admin.institutions.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const typeLabels: Record<string, string> = {
    center: t('admin.institutions.typeCenter'),
    university: t('admin.institutions.typeUniversity'),
    other: t('admin.institutions.typeOther'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.institutions.title')}</h1>
          <p className="text-muted-foreground">{t('admin.institutions.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInstitutions}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.institutions.createInstitution')}
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t('admin.institutions.region')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={approvedFilter} onValueChange={(v) => { setApprovedFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="true">{t('admin.institutions.approved')}</SelectItem>
            <SelectItem value="false">{t('admin.institutions.pendingApproval')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : institutions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('admin.institutions.noInstitutions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.institutions.institutionName')}</TableHead>
                  <TableHead>{t('admin.institutions.region')}</TableHead>
                  <TableHead>{t('admin.institutions.type')}</TableHead>
                  <TableHead>{t('admin.institutions.contactEmail')}</TableHead>
                  <TableHead>{t('admin.institutions.contactPhone')}</TableHead>
                  <TableHead>{t('admin.institutions.approved')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>{inst.region}</TableCell>
                    <TableCell>{typeLabels[inst.type] || inst.type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inst.contact_email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inst.contact_phone || '-'}</TableCell>
                    <TableCell>
                      {inst.is_approved ? (
                        <Badge className="bg-green-500 text-white">{t('admin.institutions.approved')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.institutions.pendingApproval')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!inst.is_approved && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-500 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => handleApprove(inst.id)}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('admin.institutions.approve')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(inst)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(inst.id)}>
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

      {/* 삭제 확인 모달 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.institutions.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('admin.institutions.deleteConfirmMessage')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} disabled={!!deletingId}>
              {deletingId ? <LoadingSpinner size="sm" className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t('admin.institutions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 생성/수정 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInstitution ? t('admin.institutions.editInstitution') : t('admin.institutions.createInstitution')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.institutions.institutionName')}</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('admin.institutions.namePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.institutions.region')}</Label>
                <Select value={formData.region} onValueChange={(v) => setFormData({ ...formData, region: v })}>
                  <SelectTrigger><SelectValue placeholder={t('admin.institutions.regionPlaceholder')} /></SelectTrigger>
                  <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('admin.institutions.type')}</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">{t('admin.institutions.typeCenter')}</SelectItem>
                    <SelectItem value="university">{t('admin.institutions.typeUniversity')}</SelectItem>
                    <SelectItem value="other">{t('admin.institutions.typeOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('admin.institutions.address')}</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('admin.institutions.addressPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.institutions.contactEmail')}</Label>
                <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
              </div>
              <div>
                <Label>{t('admin.institutions.contactPhone')}</Label>
                <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.institutions.maxMentors')}</Label>
                <Input type="number" min={1} value={formData.max_mentors} onChange={(e) => setFormData({ ...formData, max_mentors: parseInt(e.target.value) || 50 })} />
              </div>
              <div>
                <Label>{t('admin.institutions.maxProjects')}</Label>
                <Input type="number" min={1} value={formData.max_projects} onChange={(e) => setFormData({ ...formData, max_projects: parseInt(e.target.value) || 200 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim() || !formData.region}>
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
