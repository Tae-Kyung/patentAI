'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Lightbulb, Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'
import type { ProjectType } from '@/types/database'

export default function NewProjectPage() {
  const t = useTranslations()
  const router = useRouter()
  const [name, setName] = useState('')
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!projectType) {
      return
    }
    if (!name.trim()) {
      toast.error(t('toast.projectNameRequired'))
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, project_type: projectType }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('toast.projectCreated'))
        router.push(`/projects/${result.data.id}`)
      } else {
        toast.error(result.error || t('toast.projectCreateFailed'))
      }
    } catch {
      toast.error(t('toast.projectCreateFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{t('nav.newProject')}</h1>
      </div>

      {/* Step 1: 프로젝트 유형 선택 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('project.selectType')}</h2>
        <p className="text-sm text-muted-foreground">{t('project.selectTypeDesc')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 예비창업자 카드 */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              projectType === 'pre_startup'
                ? 'border-2 border-primary ring-2 ring-primary/20'
                : 'border hover:border-primary/50'
            }`}
            onClick={() => setProjectType('pre_startup')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {projectType === 'pre_startup' && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardTitle className="text-base">{t('project.preStartup')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground">
                {t('project.preStartupDesc')}
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                  {t('project.preStartupFeature1')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                  {t('project.preStartupFeature2')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                  {t('project.preStartupFeature3')}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 창업자 카드 */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              projectType === 'startup'
                ? 'border-2 border-primary ring-2 ring-primary/20'
                : 'border hover:border-primary/50'
            }`}
            onClick={() => setProjectType('startup')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                {projectType === 'startup' && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardTitle className="text-base">{t('project.startup')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground">
                {t('project.startupDesc')}
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {t('project.startupFeature1')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {t('project.startupFeature2')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {t('project.startupFeature3')}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step 2: 프로젝트 이름 입력 (유형 선택 후 표시) */}
      {projectType && (
        <Card>
          <CardHeader>
            <CardTitle>{t('project.name')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="projectName">{t('project.name')}</Label>
              <Input
                id="projectName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('toast.projectNameRequired')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.create')
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
