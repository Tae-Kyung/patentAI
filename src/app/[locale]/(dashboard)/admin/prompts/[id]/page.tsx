'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Save, History, Play, Trash2 } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { ConfirmModal } from '@/components/common/confirm-modal'
import { toast } from 'sonner'
import type { Prompt, PromptVersion } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PromptEditPage({ params }: PageProps) {
  const { id } = use(params)
  const t = useTranslations()
  const router = useRouter()

  const isNew = id === 'new'

  const [prompt, setPrompt] = useState<Partial<Prompt>>({
    key: '',
    name: '',
    description: '',
    category: 'ideation',
    system_prompt: '',
    user_prompt_template: '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 2000,
    credit_cost: 1,
    is_active: true,
  })
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!isNew) {
      fetchPrompt()
      fetchVersions()
    }
  }, [id, isNew])

  const fetchPrompt = async () => {
    try {
      const response = await fetch(`/api/admin/prompts/${id}`)
      const result = await response.json()

      if (result.success) {
        setPrompt(result.data)
      } else {
        toast.error(t('admin.prompts.fetchFailed'))
        router.push('/admin/prompts')
      }
    } catch (error) {
      toast.error(t('admin.prompts.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/admin/prompts/${id}/versions`)
      const result = await response.json()

      if (result.success) {
        setVersions(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = isNew ? '/api/admin/prompts' : `/api/admin/prompts/${id}`
      const method = isNew ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prompt,
          change_note: changeNote,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(isNew ? t('admin.prompts.createSuccess') : t('admin.prompts.saveSuccess'))
        if (isNew) {
          router.push(`/admin/prompts/${result.data.id}`)
        } else {
          setPrompt(result.data)
          setChangeNote('')
          fetchVersions()
        }
      } else {
        toast.error(result.error || t('admin.prompts.saveFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRollback = async (version: number) => {
    try {
      const response = await fetch(`/api/admin/prompts/${id}/rollback/${version}`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.prompts.rollbackSuccess', { version }))
        setPrompt(result.data)
        fetchVersions()
        setShowVersions(false)
      } else {
        toast.error(t('admin.prompts.rollbackFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.rollbackFailed'))
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult('')
    try {
      const response = await fetch(`/api/admin/prompts/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: testVariables }),
      })

      const result = await response.json()

      if (result.success) {
        setTestResult(result.data.response)
        toast.success(t('admin.prompts.testSuccess', { latency: result.data.latencyMs }))
      } else {
        toast.error(t('admin.prompts.testFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.testFailed'))
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.prompts.deleteSuccess'))
        router.push('/admin/prompts')
      } else {
        toast.error(t('admin.prompts.deleteFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.deleteFailed'))
    }
  }

  // 템플릿에서 변수 추출
  const extractVariables = (template: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }
    return variables
  }

  const templateVariables = extractVariables(
    `${prompt.system_prompt || ''} ${prompt.user_prompt_template || ''}`
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isNew ? t('admin.prompts.newPrompt') : prompt.name}
          </h1>
          {!isNew && (
            <Badge variant="outline">v{prompt.version}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Dialog open={showVersions} onOpenChange={setShowVersions}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <History className="mr-2 h-4 w-4" />
                    {t('admin.prompts.versionHistory')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('admin.prompts.versionHistory')}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between rounded border p-3"
                      >
                        <div>
                          <div className="font-medium">{t('admin.prompts.version', { version: version.version })}</div>
                          <div className="text-sm text-muted-foreground">
                            {version.change_note || t('admin.prompts.noChangeNote')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(version.version)}
                        >
                          {t('admin.prompts.rollback')}
                        </Button>
                      </div>
                    ))}
                    {versions.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">
                        {t('admin.prompts.noVersions')}
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    {t('admin.prompts.test')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{t('admin.prompts.promptTest')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {templateVariables.length > 0 && (
                      <div className="space-y-2">
                        <Label>{t('admin.prompts.variableInput')}</Label>
                        {templateVariables.map((variable) => (
                          <div key={variable} className="flex items-center gap-2">
                            <Label className="w-32">{`{{${variable}}}`}</Label>
                            <Input
                              value={testVariables[variable] || ''}
                              onChange={(e) =>
                                setTestVariables({
                                  ...testVariables,
                                  [variable]: e.target.value,
                                })
                              }
                              placeholder={t('admin.prompts.variablePlaceholder', { variable })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <Button onClick={handleTest} disabled={isTesting}>
                      {isTesting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {t('admin.prompts.testing')}
                        </>
                      ) : (
                        t('admin.prompts.runTest')
                      )}
                    </Button>
                    {testResult && (
                      <div className="space-y-2">
                        <Label>{t('admin.prompts.result')}</Label>
                        <div className="max-h-64 overflow-y-auto rounded bg-muted p-4">
                          <pre className="whitespace-pre-wrap text-sm">
                            {testResult}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('common.save')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.prompts.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">{t('admin.prompts.keyId')}</Label>
              <Input
                id="key"
                value={prompt.key || ''}
                onChange={(e) => setPrompt({ ...prompt, key: e.target.value })}
                disabled={!isNew}
                placeholder={t('admin.prompts.keyPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('admin.prompts.nameLabel')}</Label>
              <Input
                id="name"
                value={prompt.name || ''}
                onChange={(e) => setPrompt({ ...prompt, name: e.target.value })}
                placeholder={t('admin.prompts.namePlaceholder')}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">{t('admin.prompts.categoryLabel')}</Label>
              <Select
                value={prompt.category}
                onValueChange={(value) =>
                  setPrompt({ ...prompt, category: value as Prompt['category'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ideation">{t('admin.prompts.categoryIdeation')}</SelectItem>
                  <SelectItem value="evaluation">{t('admin.prompts.categoryEvaluation')}</SelectItem>
                  <SelectItem value="document">{t('admin.prompts.categoryDocument')}</SelectItem>
                  <SelectItem value="marketing">{t('admin.prompts.categoryMarketing')}</SelectItem>
                  <SelectItem value="startup">{t('admin.prompts.categoryStartup')}</SelectItem>
                  <SelectItem value="mentoring">{t('admin.prompts.categoryMentoring')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">{t('admin.prompts.aiModel')}</Label>
              <Select
                value={prompt.model}
                onValueChange={(value) => setPrompt({ ...prompt, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('admin.prompts.descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={prompt.description || ''}
              onChange={(e) => setPrompt({ ...prompt, description: e.target.value })}
              placeholder={t('admin.prompts.descriptionPlaceholder')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.prompts.aiSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature ({prompt.temperature})</Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={prompt.temperature || 0.7}
                onChange={(e) =>
                  setPrompt({ ...prompt, temperature: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                min="100"
                max="8000"
                value={prompt.max_tokens || 2000}
                onChange={(e) =>
                  setPrompt({ ...prompt, max_tokens: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit_cost">{t('admin.prompts.creditCost')}</Label>
              <Input
                id="credit_cost"
                type="number"
                min="0"
                max="100"
                value={prompt.credit_cost ?? 1}
                onChange={(e) =>
                  setPrompt({ ...prompt, credit_cost: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">{t('admin.prompts.creditCostDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 프롬프트 내용 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.prompts.systemPrompt')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt.system_prompt || ''}
            onChange={(e) => setPrompt({ ...prompt, system_prompt: e.target.value })}
            placeholder={t('admin.prompts.systemPromptPlaceholder')}
            rows={10}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.prompts.userPromptTemplate')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt.user_prompt_template || ''}
            onChange={(e) =>
              setPrompt({ ...prompt, user_prompt_template: e.target.value })
            }
            placeholder={t('admin.prompts.userPromptPlaceholder')}
            rows={10}
            className="font-mono text-sm"
          />
          {templateVariables.length > 0 && (
            <div>
              <Label>{t('admin.prompts.detectedVariables')}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {templateVariables.map((variable) => (
                  <Badge key={variable} variant="secondary">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 변경 노트 */}
      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.prompts.changeNote')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder={t('admin.prompts.changeNotePlaceholder')}
            />
          </CardContent>
        </Card>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('admin.prompts.deletePrompt')}
        description={t('admin.prompts.deletePromptDesc')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
