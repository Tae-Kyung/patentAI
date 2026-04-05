'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'
import { DollarSign, RefreshCw, CheckCircle, Download, FileText, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Check, Settings, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface MentorDocument {
  mentor_id: string
  name: string | null
  email: string
  resume_url: string | null
  bank_account_url: string | null
  privacy_consent_url: string | null
  id_card_url: string | null
  documents_complete: boolean
  documents_confirmed: boolean
}

interface Mentor {
  id: string
  name: string
  email: string
}

interface Payout {
  id: string
  mentor_id: string
  amount: number
  total_sessions: number
  total_hours: number
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled'
  approved_at: string | null
  mentor: Mentor
}

type StatusFilter = 'all' | 'pending' | 'approved'

const STATUS_BADGE_CLASSES: Record<Payout['status'], string> = {
  pending: 'bg-yellow-500 text-white',
  approved: 'bg-green-500 text-white',
  processing: 'bg-green-500 text-white',
  paid: 'bg-green-500 text-white',
  cancelled: 'bg-red-500 text-white',
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InstitutionPayoutsPage() {
  const t = useTranslations()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [statusFilter])

  const {
    data: payouts,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<Payout>({
    url: '/api/institution/payouts',
    params: fetchParams,
    dataKey: 'items',
  })
  const [isApproving, setIsApproving] = useState(false)
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [showMentorDocs, setShowMentorDocs] = useState(false)
  const [mentorDocs, setMentorDocs] = useState<MentorDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  // Unit price state
  const [unitPrice, setUnitPrice] = useState<number>(200000)
  const [unitPriceInput, setUnitPriceInput] = useState('')
  const [isLoadingPrice, setIsLoadingPrice] = useState(true)
  const [isSavingPrice, setIsSavingPrice] = useState(false)

  const fetchUnitPrice = useCallback(async () => {
    setIsLoadingPrice(true)
    try {
      const response = await fetch('/api/institution/unit-price')
      const result = await response.json()
      if (result.success) {
        setUnitPrice(result.data.session_unit_price)
        setUnitPriceInput(result.data.session_unit_price.toLocaleString())
      }
    } catch {
      // use default
    } finally {
      setIsLoadingPrice(false)
    }
  }, [])

  useEffect(() => {
    fetchUnitPrice()
  }, [fetchUnitPrice])

  const handleSaveUnitPrice = async () => {
    const numericValue = parseInt(unitPriceInput.replace(/[^0-9]/g, ''), 10)
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error(t('institution.payouts.invalidPrice'))
      return
    }

    setIsSavingPrice(true)
    try {
      const response = await fetch('/api/institution/unit-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_unit_price: numericValue }),
      })
      const result = await response.json()
      if (result.success) {
        setUnitPrice(numericValue)
        setUnitPriceInput(numericValue.toLocaleString())
        toast.success(t('institution.payouts.priceSaved'))
      } else {
        toast.error(result.error || t('institution.payouts.priceSaveFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.priceSaveFailed'))
    } finally {
      setIsSavingPrice(false)
    }
  }

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter, currentPage])

  const handleApprove = async (payoutId: string) => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/institution/payouts/${payoutId}/approve`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.payouts.approveSuccess'))
        refetch()
      } else {
        toast.error(result.error || t('institution.payouts.approveFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.approveFailed'))
    } finally {
      setIsApproving(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    setIsBulkApproving(true)
    try {
      const response = await fetch('/api/institution/payouts/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_ids: Array.from(selectedIds) }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.payouts.bulkApproveSuccess'))
        setSelectedIds(new Set())
        refetch()
      } else {
        toast.error(result.error || t('institution.payouts.bulkApproveFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.bulkApproveFailed'))
    } finally {
      setIsBulkApproving(false)
    }
  }

  const handleExportCSV = () => {
    window.open('/api/institution/payouts/export', '_blank')
  }

  const fetchMentorDocs = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const response = await fetch('/api/institution/mentors/documents')
      const result = await response.json()
      if (result.success) {
        setMentorDocs(result.data)
      }
    } catch {
      toast.error(t('institution.payouts.docsFetchFailed'))
    } finally {
      setIsLoadingDocs(false)
    }
  }, [t])

  const [confirmingDocId, setConfirmingDocId] = useState<string | null>(null)

  const handleConfirmDocs = async (mentorId: string, confirmed: boolean) => {
    setConfirmingDocId(mentorId)
    try {
      const response = await fetch('/api/institution/mentors/documents/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: mentorId, confirmed }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(confirmed ? t('institution.payouts.docConfirmed') : t('institution.payouts.docUnconfirmed'))
        setMentorDocs((prev) => prev.map((d) => d.mentor_id === mentorId ? { ...d, documents_confirmed: confirmed } : d))
      } else {
        toast.error(result.error || t('institution.payouts.docConfirmFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.docConfirmFailed'))
    } finally {
      setConfirmingDocId(null)
    }
  }

  useEffect(() => {
    if (showMentorDocs && mentorDocs.length === 0) {
      fetchMentorDocs()
    }
  }, [showMentorDocs, fetchMentorDocs])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const pendingPayouts = payouts.filter((p) => p.status === 'pending')

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingPayouts.length && pendingPayouts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingPayouts.map((p) => p.id)))
    }
  }

  const getStatusLabel = (status: Payout['status']): string => {
    return t(`institution.payouts.status.${status}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.payouts.title')}</h1>
          <p className="text-muted-foreground">
            {t('institution.payouts.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t('institution.payouts.exportCSV')}
          </Button>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Unit Price Setting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            {t('institution.payouts.unitPriceTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label className="text-sm text-muted-foreground">
                {t('institution.payouts.unitPriceLabel')}
              </Label>
              {isLoadingPrice ? (
                <div className="flex items-center h-10">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={unitPriceInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setUnitPriceInput(raw ? parseInt(raw).toLocaleString() : '')
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUnitPrice() }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {t('institution.payouts.unitPriceCurrency')}
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSaveUnitPrice}
              disabled={isSavingPrice || isLoadingPrice}
              size="sm"
            >
              {isSavingPrice ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('common.save')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('institution.payouts.unitPriceDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.payouts.statusFilter')}
            </span>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="pending">{t('institution.payouts.status.pending')}</SelectItem>
                <SelectItem value="approved">{t('institution.payouts.status.approved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
            >
              {isBulkApproving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {t('institution.payouts.bulkApprove', { count: selectedIds.size })}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payouts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">{t('institution.payouts.noPayouts')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.payouts.noPayoutsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Table Header */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4 md:items-center">
            <div className="col-span-1">
              {pendingPayouts.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingPayouts.length && pendingPayouts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
              )}
            </div>
            <div className="col-span-2">{t('institution.payouts.mentorName')}</div>
            <div className="col-span-2">{t('institution.payouts.amount')}</div>
            <div className="col-span-1">{t('institution.payouts.sessions')}</div>
            <div className="col-span-1">{t('institution.payouts.hours')}</div>
            <div className="col-span-1">{t('institution.payouts.statusLabel')}</div>
            <div className="col-span-2">{t('institution.payouts.approvedAt')}</div>
            <div className="col-span-2">{t('institution.payouts.actions')}</div>
          </div>

          {/* Payout Rows */}
          {payouts.map((payout) => (
            <Card key={payout.id}>
              <CardContent className="flex flex-col gap-3 px-4 py-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
                {/* Checkbox */}
                <div className="col-span-1">
                  {payout.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(payout.id)}
                      onChange={() => toggleSelect(payout.id)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  )}
                </div>

                {/* Mentor Name */}
                <div className="col-span-2 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {payout.mentor.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground md:hidden">
                    {payout.mentor.email}
                  </p>
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <span className="text-sm font-semibold">
                    {formatKRW(payout.amount)}
                  </span>
                </div>

                {/* Sessions */}
                <div className="col-span-1">
                  <span className="text-sm">{payout.total_sessions}</span>
                  <span className="text-xs text-muted-foreground md:hidden ml-1">
                    {t('institution.payouts.sessions')}
                  </span>
                </div>

                {/* Hours */}
                <div className="col-span-1">
                  <span className="text-sm">{payout.total_hours}</span>
                  <span className="text-xs text-muted-foreground md:hidden ml-1">
                    {t('institution.payouts.hours')}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <Badge className={STATUS_BADGE_CLASSES[payout.status]}>
                    {getStatusLabel(payout.status)}
                  </Badge>
                </div>

                {/* Approved At */}
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(payout.approved_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2">
                  {payout.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(payout.id)}
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('institution.payouts.approve')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* 멘토 증빙서류 섹션 */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowMentorDocs(!showMentorDocs)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {t('institution.payouts.mentorDocuments')}
            </CardTitle>
            {showMentorDocs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showMentorDocs && (
          <CardContent>
            {isLoadingDocs ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : mentorDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('institution.payouts.noMentorDocs')}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('institution.payouts.mentorDocsDesc')}
                </p>
                {/* Table header */}
                <div className="hidden rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-7 md:gap-4">
                  <div className="col-span-2">{t('institution.payouts.mentorName')}</div>
                  <div>{t('institution.payouts.docResume')}</div>
                  <div>{t('institution.payouts.docBankAccount')}</div>
                  <div>{t('institution.payouts.docPrivacyConsent')}</div>
                  <div>{t('institution.payouts.docIdCard')}</div>
                  <div>{t('institution.payouts.docStatus')}</div>
                </div>
                {mentorDocs.map((doc) => (
                  <div
                    key={doc.mentor_id}
                    className="flex flex-col gap-2 rounded-lg border p-3 md:grid md:grid-cols-7 md:items-center md:gap-4"
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {doc.name || '-'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.email}
                      </p>
                    </div>
                    <div>
                      {doc.resume_url ? (
                        <a href={doc.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.bank_account_url ? (
                        <a href={doc.bank_account_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.privacy_consent_url ? (
                        <a href={doc.privacy_consent_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.id_card_url ? (
                        <a href={doc.id_card_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {doc.documents_complete ? (
                        doc.documents_confirmed ? (
                          <>
                            <Badge className="bg-green-500 text-white text-xs">
                              <Check className="mr-1 h-3 w-3" />
                              {t('institution.payouts.docConfirmedBadge')}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground"
                              disabled={confirmingDocId === doc.mentor_id}
                              onClick={() => handleConfirmDocs(doc.mentor_id, false)}
                            >
                              {confirmingDocId === doc.mentor_id ? <LoadingSpinner size="sm" /> : t('institution.payouts.docUnconfirmBtn')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                              <Check className="mr-1 h-3 w-3" />
                              {t('institution.payouts.docComplete')}
                            </Badge>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={confirmingDocId === doc.mentor_id}
                              onClick={() => handleConfirmDocs(doc.mentor_id, true)}
                            >
                              {confirmingDocId === doc.mentor_id ? <LoadingSpinner size="sm" /> : t('institution.payouts.docConfirmBtn')}
                            </Button>
                          </>
                        )
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-300 text-xs">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {t('institution.payouts.docIncomplete')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
