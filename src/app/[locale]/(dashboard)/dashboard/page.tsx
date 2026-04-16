'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface PatentProject {
  id: string
  title: string
  status: string
  updated_at: string
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  step1_done: '분석 완료',
  step2_done: '구조화 완료',
  step3_done: '청구범위 완료',
  step4_done: '명세서 완료',
  step5_done: '도면 완료',
  completed: '최종 출력 완료',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  step1_done: 'outline',
  step2_done: 'outline',
  step3_done: 'outline',
  step4_done: 'outline',
  step5_done: 'outline',
  completed: 'default',
}

function parseTitle(title: string): string {
  try {
    const parsed = JSON.parse(title) as { ko?: string; en?: string }
    return parsed.ko ?? title
  } catch {
    return title
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}. ${m}. ${day}.`
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<PatentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function fetchProjects() {
    try {
      const res = await fetch('/api/patents')
      if (!res.ok) throw new Error('프로젝트 목록을 불러오지 못했습니다.')
      const data = await res.json()
      setProjects(data.data?.items ?? data.data ?? data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  function openCreateDialog() {
    setNewTitle('')
    setShowCreateDialog(true)
  }

  async function handleCreateProject() {
    if (creating) return
    const title = newTitle.trim() || '새 특허 프로젝트'
    setShowCreateDialog(false)
    setCreating(true)
    try {
      const res = await fetch('/api/patents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('프로젝트 생성에 실패했습니다.')
      const data = await res.json()
      const id = data.data?.id ?? data.id
      router.push(`/dashboard/patents/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setCreating(false)
    }
  }

  async function handleDeleteProject(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/patents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('프로젝트 삭제에 실패했습니다.')
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">특허 프로젝트</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI 기반 특허 명세서 자동 생성 플랫폼
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={creating}>
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          새 프로젝트 만들기
        </Button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-600" />
        </div>
      ) : projects.length === 0 ? (
        /* 빈 상태 */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mb-1 text-lg font-semibold text-gray-700 dark:text-gray-300">
              특허 프로젝트가 없습니다
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              첫 번째 특허 프로젝트를 만들어 시작하세요.
            </p>
            <Button onClick={openCreateDialog} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              새 프로젝트 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* 프로젝트 목록 */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link href={`/dashboard/patents/${project.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md dark:hover:shadow-gray-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                        {parseTitle(project.title)}
                      </CardTitle>
                      <Badge
                        variant={STATUS_VARIANT[project.status] ?? 'secondary'}
                        className="shrink-0 text-xs"
                      >
                        {STATUS_LABEL[project.status] ?? project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      최근 수정: {formatDate(project.updated_at)}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* 삭제 버튼 */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 dark:text-gray-500 dark:hover:text-red-400"
                      disabled={deletingId === project.id}
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>프로젝트를 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-medium text-gray-900 dark:text-white">
                          &ldquo;{parseTitle(project.title)}&rdquo;
                        </span>{' '}
                        프로젝트와 관련된 모든 데이터(청구항, 명세서, 도면 등)가 영구적으로
                        삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 특허 프로젝트</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="프로젝트 이름을 입력하세요"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject() }}
              maxLength={500}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>취소</Button>
            <Button onClick={handleCreateProject} disabled={creating}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
