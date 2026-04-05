'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'

interface Approval {
  id: string
  project_id: string
  gate: string
  status: string
  message: string | null
  requested_at: string
  reviewed_at: string | null
  review_comment: string | null
  project: {
    id: string
    name: string
    current_stage: string
    current_gate: string
    user: {
      id: string
      name: string
      email: string
    }
  }
  requester: {
    id: string
    name: string
    email: string
  }
  reviewer: {
    id: string
    name: string
    email: string
  } | null
}

export default function ApprovalsPage() {
  const t = useTranslations()
  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState('pending')
  const [gateFilter, setGateFilter] = useState('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = { status: statusFilter }
    if (gateFilter !== 'all') p.gate = gateFilter
    return p
  }, [statusFilter, gateFilter])

  const {
    data: approvals,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<Approval>({
    url: '/api/admin/approvals',
    params: fetchParams,
    dataKey: 'approvals',
  })

  // 승인 처리 모달
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_revision'>('approve')
  const [comment, setComment] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprovalAction = async () => {
    if (!selectedApproval) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/projects/${selectedApproval.project_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          action: actionType,
          comment: comment || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        setSelectedApproval(null)
        setComment('')
        refetch()
      } else {
        toast.error(result.error || t('admin.approvals.processFailed'))
      }
    } catch (error) {
      toast.error(t('admin.approvals.processFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: t('admin.approvals.statusPending'), icon: Clock },
      approved: { color: 'bg-green-500', text: t('admin.approvals.statusApproved'), icon: CheckCircle },
      rejected: { color: 'bg-red-500', text: t('admin.approvals.statusRejected'), icon: XCircle },
      revision_requested: { color: 'bg-orange-500', text: t('admin.approvals.statusRevisionRequested'), icon: RefreshCw },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getGateLabel = (gate: string) => {
    const gateLabels: Record<string, string> = {
      gate_1: t('admin.approvals.gate1Label'),
      gate_2: t('admin.approvals.gate2Label'),
      gate_3: t('admin.approvals.gate3Label'),
      gate_4: t('admin.approvals.gate4Label'),
    }
    return gateLabels[gate] || gate
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.approvals.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.approvals.description')}
          </p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('admin.approvals.statusLabel')}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('admin.approvals.statusPending')}</SelectItem>
                <SelectItem value="approved">{t('admin.approvals.statusApproved')}</SelectItem>
                <SelectItem value="rejected">{t('admin.approvals.statusRejected')}</SelectItem>
                <SelectItem value="revision_requested">{t('admin.approvals.statusRevisionRequested')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('admin.approvals.gateLabel')}</span>
            <Select value={gateFilter} onValueChange={setGateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="gate_1">Gate 1</SelectItem>
                <SelectItem value="gate_2">Gate 2</SelectItem>
                <SelectItem value="gate_3">Gate 3</SelectItem>
                <SelectItem value="gate_4">Gate 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 승인 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">{t('admin.approvals.noApprovals')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('admin.approvals.noApprovalsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {approval.project.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => router.push(`/projects/${approval.project_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {t('admin.approvals.requester', { name: approval.requester?.name || approval.requester?.email })} |{' '}
                      {t('admin.approvals.requestedAt', { date: new Date(approval.requested_at).toLocaleString() })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(approval.status)}
                    <Badge variant="outline">{getGateLabel(approval.gate)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approval.message && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm">{approval.message}</p>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <span>{t('admin.approvals.projectOwner')} </span>
                    <span className="font-medium text-foreground">
                      {approval.project.user?.name || approval.project.user?.email}
                    </span>
                  </div>

                  {approval.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval)
                          setActionType('approve')
                          setComment('')
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('admin.approvals.approve')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedApproval(approval)
                          setActionType('request_revision')
                          setComment('')
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('admin.approvals.requestRevision')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedApproval(approval)
                          setActionType('reject')
                          setComment('')
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('admin.approvals.reject')}
                      </Button>
                    </div>
                  )}

                  {approval.reviewed_at && approval.reviewer && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">
                        {t('admin.approvals.reviewer', { name: approval.reviewer.name || approval.reviewer.email })}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(approval.reviewed_at).toLocaleString()}
                      </div>
                      {approval.review_comment && (
                        <div className="mt-2 text-muted-foreground">
                          {approval.review_comment}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* 승인 처리 모달 */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && t('admin.approvals.approveConfirm')}
              {actionType === 'reject' && t('admin.approvals.rejectConfirm')}
              {actionType === 'request_revision' && t('admin.approvals.revisionRequest')}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.project.name}의 {getGateLabel(selectedApproval?.gate || '')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t('admin.approvals.commentLabel')} {actionType !== 'approve' && t('admin.approvals.commentRequired')}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('admin.approvals.commentPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedApproval(null)}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApprovalAction}
              disabled={isProcessing || (actionType !== 'approve' && !comment)}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  {actionType === 'approve' && t('admin.approvals.approve')}
                  {actionType === 'reject' && t('admin.approvals.reject')}
                  {actionType === 'request_revision' && t('admin.approvals.requestRevision')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
