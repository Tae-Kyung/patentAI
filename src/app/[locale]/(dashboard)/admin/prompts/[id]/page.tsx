'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'
import type { PatentaiPrompt } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

type PromptDraft = Partial<PatentaiPrompt>

export default function PromptEditPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const isNew = id === 'new'

  const [prompt, setPrompt] = useState<PromptDraft>({
    key: '',
    name: '',
    description: '',
    category: 'patent',
    system_prompt: '',
    user_prompt_template: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    max_tokens: 2000,
    credit_cost: 1,
    is_active: true,
  })
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!isNew) fetchPrompt()
  }, [id, isNew])

  const fetchPrompt = async () => {
    try {
      const res = await fetch(`/api/admin/prompts/${id}`)
      const json = await res.json()
      if (json.success) {
        setPrompt(json.data)
      } else {
        toast.error('프롬프트를 불러오지 못했습니다.')
        router.push('/admin/prompts')
      }
    } catch {
      toast.error('프롬프트를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!prompt.key || !prompt.name || !prompt.system_prompt || !prompt.user_prompt_template) {
      toast.error('키, 이름, 시스템 프롬프트, 유저 프롬프트는 필수입니다.')
      return
    }
    setIsSaving(true)
    try {
      const url = isNew ? '/api/admin/prompts' : `/api/admin/prompts/${id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(isNew ? '프롬프트가 생성되었습니다.' : '저장되었습니다.')
        if (isNew) router.push(`/admin/prompts/${json.data.id}`)
        else setPrompt(json.data)
      } else {
        toast.error(json.error || '저장에 실패했습니다.')
      }
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult('')
    try {
      const res = await fetch(`/api/admin/prompts/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: testVariables }),
      })
      const json = await res.json()
      if (json.success) {
        setTestResult(json.data.response)
        toast.success(`완료 (${json.data.latencyMs}ms)`)
      } else {
        toast.error('테스트에 실패했습니다.')
      }
    } catch {
      toast.error('테스트에 실패했습니다.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('삭제되었습니다.')
        router.push('/admin/prompts')
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const extractVariables = (template: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const vars: string[] = []
    let match
    while ((match = regex.exec(template)) !== null) {
      if (!vars.includes(match[1])) vars.push(match[1])
    }
    return vars
  }

  const templateVariables = extractVariables(
    `${prompt.system_prompt ?? ''} ${prompt.user_prompt_template ?? ''}`
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isNew ? '새 프롬프트' : (prompt.name ?? '')}
            </h1>
            {!isNew && prompt.key && (
              <code className="text-xs text-muted-foreground">{prompt.key}</code>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowTestModal(true)}>
                <Play className="mr-1.5 h-4 w-4" />
                테스트
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                삭제
              </Button>
            </>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Save className="mr-1.5 h-4 w-4" />}
            저장
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>키 (Key) *</Label>
              <Input
                value={prompt.key ?? ''}
                onChange={(e) => setPrompt({ ...prompt, key: e.target.value })}
                disabled={!isNew}
                placeholder="patent_tech_analysis"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>이름 *</Label>
              <Input
                value={prompt.name ?? ''}
                onChange={(e) => setPrompt({ ...prompt, name: e.target.value })}
                placeholder="특허 기술 분석"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Input
                value={prompt.category ?? 'patent'}
                onChange={(e) => setPrompt({ ...prompt, category: e.target.value })}
                placeholder="patent"
              />
            </div>
            <div className="space-y-1.5">
              <Label>AI 모델</Label>
              <Select
                value={prompt.model ?? 'claude-sonnet-4-20250514'}
                onValueChange={(v) => setPrompt({ ...prompt, model: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (최신)</SelectItem>
                  <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                  <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>설명</Label>
            <Textarea
              value={prompt.description ?? ''}
              onChange={(e) => setPrompt({ ...prompt, description: e.target.value })}
              placeholder="이 프롬프트의 역할 설명"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={prompt.is_active ?? true}
              onChange={(e) => setPrompt({ ...prompt, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">활성화</Label>
          </div>
        </CardContent>
      </Card>

      {/* AI 파라미터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 파라미터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Temperature ({prompt.temperature})</Label>
              <input
                type="range"
                min="0" max="2" step="0.05"
                value={prompt.temperature ?? 0.3}
                onChange={(e) => setPrompt({ ...prompt, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>정확 (0)</span><span>창의 (2)</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Tokens</Label>
              <Input
                type="number" min="100" max="64000"
                value={prompt.max_tokens ?? 2000}
                onChange={(e) => setPrompt({ ...prompt, max_tokens: parseInt(e.target.value) || 2000 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>크레딧 비용</Label>
              <Input
                type="number" min="0" max="100"
                value={prompt.credit_cost ?? 1}
                onChange={(e) => setPrompt({ ...prompt, credit_cost: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시스템 프롬프트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">시스템 프롬프트 *</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt.system_prompt ?? ''}
            onChange={(e) => setPrompt({ ...prompt, system_prompt: e.target.value })}
            placeholder="AI 역할 지시 및 규칙..."
            rows={12}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* 유저 프롬프트 템플릿 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">유저 프롬프트 템플릿 *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt.user_prompt_template ?? ''}
            onChange={(e) => setPrompt({ ...prompt, user_prompt_template: e.target.value })}
            placeholder="{{variable}} 형식으로 변수 삽입 가능..."
            rows={12}
            className="font-mono text-sm"
          />
          {templateVariables.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">감지된 변수</p>
              <div className="flex flex-wrap gap-1.5">
                {templateVariables.map((v) => (
                  <Badge key={v} variant="secondary" className="font-mono text-xs">{`{{${v}}}`}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 테스트 모달 */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>프롬프트 테스트</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templateVariables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">변수 입력</Label>
                {templateVariables.map((variable) => (
                  <div key={variable} className="flex items-center gap-2">
                    <code className="w-36 shrink-0 rounded bg-muted px-2 py-1 text-xs">{`{{${variable}}}`}</code>
                    <Input
                      value={testVariables[variable] ?? ''}
                      onChange={(e) => setTestVariables({ ...testVariables, [variable]: e.target.value })}
                      placeholder={`${variable} 값 입력`}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleTest} disabled={isTesting} size="sm">
              {isTesting ? <><LoadingSpinner size="sm" className="mr-1.5" />실행 중...</> : '테스트 실행'}
            </Button>
            {testResult && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">결과</Label>
                <div className="max-h-64 overflow-y-auto rounded-md bg-muted p-3">
                  <pre className="whitespace-pre-wrap text-xs">{testResult}</pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프롬프트를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{prompt.name}</strong> 프롬프트가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
