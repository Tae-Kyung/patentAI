'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

// Step components
import { InputForm } from '@/features/patent/step1/InputForm'
import { AnalysisResult } from '@/features/patent/step1/AnalysisResult'
import { ComponentPanel } from '@/features/patent/step2/ComponentPanel'
import { ClaimsEditor } from '@/features/patent/step3/ClaimsEditor'
import { SectionEditor } from '@/features/patent/step4/SectionEditor'
import { DrawingViewer } from '@/features/patent/step5/DrawingViewer'
import { ExportView } from '@/features/patent/step6/ExportView'

// Gate components
import { Gate1 } from '@/features/patent/gates/Gate1'
import { Gate2 } from '@/features/patent/gates/Gate2'
import { Gate3 } from '@/features/patent/gates/Gate3'
import { Gate4 } from '@/features/patent/gates/Gate4'
import { Gate5 } from '@/features/patent/gates/Gate5'

import type { PatentProject, PatentComponent } from '@/types/database'

type ComponentNode = PatentComponent & { children: ComponentNode[] }

type ViewMode =
  | 'step1_input'
  | 'step1_analysis'
  | 'gate1'
  | 'step2'
  | 'gate2'
  | 'step3'
  | 'gate3'
  | 'step4'
  | 'gate4'
  | 'step5'
  | 'gate5'
  | 'step6'

const STEP_LABELS = [
  { step: 1, label: 'STEP 1\n입력·분석', views: ['step1_input', 'step1_analysis', 'gate1'] },
  { step: 2, label: 'STEP 2\n구조화', views: ['step2', 'gate2'] },
  { step: 3, label: 'STEP 3\n청구범위', views: ['step3', 'gate3'] },
  { step: 4, label: 'STEP 4\n명세서', views: ['step4', 'gate4'] },
  { step: 5, label: 'STEP 5\n도면', views: ['step5', 'gate5'] },
  { step: 6, label: 'STEP 6\n출력', views: ['step6'] },
]

function statusToView(status: string): ViewMode {
  switch (status) {
    case 'draft': return 'step1_input'
    case 'step1_done': return 'step2'
    case 'step2_done': return 'step3'
    case 'step3_done': return 'step4'
    case 'step4_done': return 'step5'
    case 'step5_done': return 'step6'
    case 'completed': return 'step6'
    default: return 'step1_input'
  }
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default function PatentWorkPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<PatentProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('step1_input')
  const [analysisData, setAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [componentNodes, setComponentNodes] = useState<ComponentNode[]>([])
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // 프로젝트 로드
  useEffect(() => {
    fetch(`/api/patents/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const p = json.data
        if (p) {
          setProject(p)
          const hasAnalysis = p.tech_domain || (p.core_inventions && p.core_inventions.length > 0)
          if (hasAnalysis) {
            setAnalysisData({
              tech_domain: p.tech_domain,
              ipc_suggestions: p.ipc_codes,
              core_inventions: p.core_inventions,
            })
            // draft 상태라도 분석 결과가 있으면 분석 결과 화면으로
            if (p.status === 'draft') {
              setView('step1_analysis')
            } else {
              setView(statusToView(p.status))
            }
          } else {
            setView(statusToView(p.status))
          }
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // 구성요소 트리 로드
  async function loadComponents() {
    const res = await fetch(`/api/patents/${id}/components`)
    if (res.ok) {
      const json = await res.json()
      setComponentNodes(json.data ?? [])
    }
  }

  async function refreshProject() {
    const res = await fetch(`/api/patents/${id}`)
    if (res.ok) {
      const json = await res.json()
      setProject(json.data)
    }
  }

  function parseTitle(title: string): string {
    try {
      const parsed = JSON.parse(title) as { ko?: string; en?: string }
      return parsed.ko ?? title
    } catch {
      return title
    }
  }

  function startEditTitle() {
    if (!project) return
    setTitleInput(parseTitle(project.title))
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  async function saveTitle() {
    if (!project || !titleInput.trim() || titleInput === project.title) {
      setEditingTitle(false)
      return
    }
    setSavingTitle(true)
    try {
      const res = await fetch(`/api/patents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        setProject(json.data)
      }
    } finally {
      setSavingTitle(false)
      setEditingTitle(false)
    }
  }

  function cancelEditTitle() {
    setEditingTitle(false)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.back()}>돌아가기</Button>
      </div>
    )
  }

  const activeStep = STEP_LABELS.find((s) => s.views.includes(view))?.step ?? 1

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-0.5 flex-shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                ref={titleInputRef}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') cancelEditTitle()
                }}
                className="h-8 text-base font-bold"
                disabled={savingTitle}
                maxLength={500}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveTitle} disabled={savingTitle}>
                {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelEditTitle} disabled={savingTitle}>
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white">{parseTitle(project.title)}</h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity"
                onClick={startEditTitle}
              >
                <Pencil className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{project.status}</Badge>
            {project.tech_domain && (
              <span className="text-xs text-gray-500">{project.tech_domain}</span>
            )}
          </div>
        </div>
      </div>

      {/* step nav */}
      <div className="flex overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        {STEP_LABELS.map((s, i) => {
          const isActive = s.step === activeStep
          const isDone = s.step < activeStep
          return (
            <button
              key={s.step}
              onClick={() => {
                if (s.step === 1) {
                  setView(analysisData ? 'step1_analysis' : 'step1_input')
                } else {
                  if (s.views[0]) setView(s.views[0] as ViewMode)
                  if (s.step === 2) loadComponents()
                }
              }}
              className={`flex-1 border-r border-gray-200 px-3 py-2.5 text-center text-xs font-medium last:border-r-0 transition-colors whitespace-pre-line dark:border-gray-700 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDone
                  ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* main content */}
      <div className="min-h-[500px]">
        {view === 'step1_input' && (
          <InputForm
            projectId={id}
            onInputSaved={() => setView('step1_analysis')}
          />
        )}

        {view === 'step1_analysis' && (
          <AnalysisResult
            projectId={id}
            initialData={analysisData as Parameters<typeof AnalysisResult>[0]['initialData']}
            onAnalysisDone={(data) => {
              setAnalysisData(data as Record<string, unknown>)
              setView('gate1')
            }}
          />
        )}

        {view === 'gate1' && (
          <Gate1
            projectId={id}
            analysisData={analysisData ?? {}}
            onApproved={async () => {
              await refreshProject()
              await loadComponents()
              setView('step2')
            }}
            onBack={() => setView('step1_analysis')}
          />
        )}

        {view === 'step2' && (
          <ComponentPanel projectId={id} />
        )}

        {view === 'gate2' && (
          <Gate2
            projectId={id}
            componentNodes={componentNodes}
            onComponentsChanged={loadComponents}
            onApproved={async () => {
              await refreshProject()
              setView('step3')
            }}
            onBack={() => {
              loadComponents()
              setView('step2')
            }}
          />
        )}

        {view === 'step3' && (
          <ClaimsEditor projectId={id} />
        )}

        {view === 'gate3' && (
          <Gate3
            projectId={id}
            onApproved={async () => {
              await refreshProject()
              setView('step4')
            }}
            onBack={() => setView('step3')}
          />
        )}

        {view === 'step4' && (
          <SectionEditor projectId={id} />
        )}

        {view === 'gate4' && (
          <Gate4
            projectId={id}
            onApproved={async () => {
              await refreshProject()
              setView('step5')
            }}
            onBack={() => setView('step4')}
          />
        )}

        {view === 'step5' && (
          <DrawingViewer projectId={id} />
        )}

        {view === 'gate5' && (
          <Gate5
            projectId={id}
            onApproved={async () => {
              await refreshProject()
              setView('step6')
            }}
            onBack={() => setView('step5')}
          />
        )}

        {view === 'step6' && (
          <ExportView
            projectId={id}
            onCompleted={refreshProject}
          />
        )}
      </div>

      {/* bottom gate buttons */}
      <div className="flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        {view === 'step1_analysis' && (
          <Button variant="outline" size="sm" onClick={() => setView('gate1')}>
            GATE 1 검토 →
          </Button>
        )}
        {view === 'step2' && (
          <Button variant="outline" size="sm" onClick={() => { loadComponents(); setView('gate2') }}>
            GATE 2 검토 →
          </Button>
        )}
        {view === 'step3' && (
          <Button variant="outline" size="sm" onClick={() => setView('gate3')}>
            GATE 3 검토 →
          </Button>
        )}
        {view === 'step4' && (
          <Button variant="outline" size="sm" onClick={() => setView('gate4')}>
            GATE 4 검토 →
          </Button>
        )}
        {view === 'step5' && (
          <Button variant="outline" size="sm" onClick={() => setView('gate5')}>
            GATE 5 검토 →
          </Button>
        )}
        <span />
      </div>
    </div>
  )
}
