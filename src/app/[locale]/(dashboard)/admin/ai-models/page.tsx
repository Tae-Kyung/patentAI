'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bot, Save, RefreshCw, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface ModelOption {
  id: string
  name: string
  tier: string
}

interface AvailableModels {
  claude: ModelOption[]
  gemini: ModelOption[]
  geminiImage: ModelOption[]
  openai: ModelOption[]
}

interface AISetting {
  key: string
  value: string
  label: string
  description: string | null
  updated_at: string
  updated_by: string | null
}

const TIER_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  recommended: { label: 'Recommended', variant: 'default' },
  premium: { label: 'Premium', variant: 'secondary' },
  latest: { label: 'Latest', variant: 'secondary' },
  fast: { label: 'Fast', variant: 'outline' },
  legacy: { label: 'Legacy', variant: 'destructive' },
}

const MODEL_KEY_CONFIG = [
  {
    key: 'claude.default',
    provider: 'claude' as const,
    icon: '🟣',
    providerName: 'Anthropic Claude',
  },
  {
    key: 'gemini.default',
    provider: 'gemini' as const,
    icon: '🔵',
    providerName: 'Google Gemini (Text)',
  },
  {
    key: 'gemini.image',
    provider: 'geminiImage' as const,
    icon: '🎨',
    providerName: 'Google Gemini (Image)',
  },
  {
    key: 'openai.default',
    provider: 'openai' as const,
    icon: '🟢',
    providerName: 'OpenAI',
  },
]

export default function AIModelsPage() {
  const t = useTranslations('admin.aiModels')
  const [settings, setSettings] = useState<AISetting[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/ai-models')
      const json = await res.json()
      if (json.success) {
        setSettings(json.data.settings)
        setAvailableModels(json.data.availableModels)
        const current: Record<string, string> = {}
        for (const s of json.data.settings) {
          current[s.key] = s.value
        }
        setDraft(current)
      } else {
        toast.error(t('fetchFailed'))
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const hasChanges = settings.some((s) => draft[s.key] !== s.value)

  const handleSave = async () => {
    const changed = settings
      .filter((s) => draft[s.key] !== s.value)
      .map((s) => ({ key: s.key, value: draft[s.key] }))

    if (changed.length === 0) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changed }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(t('saveSuccess'))
        await fetchSettings()
      } else {
        toast.error(json.error || t('saveFailed'))
      }
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    const current: Record<string, string> = {}
    for (const s of settings) {
      current[s.key] = s.value
    }
    setDraft(current)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('reset')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t('save')}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {t('infoMessage')}
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid gap-6">
        {MODEL_KEY_CONFIG.map((config) => {
          const setting = settings.find((s) => s.key === config.key)
          const models = availableModels?.[config.provider] ?? []
          const currentValue = draft[config.key] ?? ''

          return (
            <Card key={config.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{config.icon}</span>
                  {config.providerName}
                </CardTitle>
                <CardDescription>{setting?.description ?? ''}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('modelSelect')}</Label>
                  <Select
                    value={currentValue}
                    onValueChange={(val) => setDraft((prev) => ({ ...prev, [config.key]: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectModel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => {
                        const badge = TIER_BADGES[model.tier]
                        return (
                          <SelectItem key={model.id} value={model.id}>
                            <span className="flex items-center gap-2">
                              {model.name}
                              {badge && (
                                <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                                  {badge.label}
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current vs Draft indicator */}
                {setting && draft[config.key] !== setting.value && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('pendingChange', {
                      from: models.find((m) => m.id === setting.value)?.name ?? setting.value,
                      to: models.find((m) => m.id === draft[config.key])?.name ?? draft[config.key],
                    })}
                  </p>
                )}

                {setting?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    {t('lastUpdated')}: {new Date(setting.updated_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
