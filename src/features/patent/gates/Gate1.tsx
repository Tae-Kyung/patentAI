'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X, CheckCircle, RotateCcw } from 'lucide-react'

interface AnalysisData {
  tech_domain?: string
  ipc_suggestions?: string[]
  core_inventions?: string[]
}

interface Gate1Props {
  projectId: string
  analysisData: AnalysisData
  onApproved: () => void
  onBack: () => void
}

export function Gate1({ projectId, analysisData, onApproved, onBack }: Gate1Props) {
  const [ipcCodes, setIpcCodes] = useState<string[]>(analysisData.ipc_suggestions ?? [])
  const [inventions, setInventions] = useState<string[]>(analysisData.core_inventions ?? [])
  const [techDomain, setTechDomain] = useState(analysisData.tech_domain ?? '')
  const [newIpc, setNewIpc] = useState('')
  const [notes, setNotes] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addIpc = () => {
    const trimmed = newIpc.trim().toUpperCase()
    if (trimmed && !ipcCodes.includes(trimmed)) {
      setIpcCodes([...ipcCodes, trimmed])
      setNewIpc('')
    }
  }

  const removeIpc = (code: string) => setIpcCodes(ipcCodes.filter((c) => c !== code))

  const updateInvention = (index: number, value: string) => {
    const updated = [...inventions]
    updated[index] = value
    setInventions(updated)
  }

  const addInvention = () => setInventions([...inventions, ''])
  const removeInvention = (index: number) => setInventions(inventions.filter((_, i) => i !== index))

  const handleApprove = async () => {
    const validInventions = inventions.filter((inv) => inv.trim())
    if (validInventions.length === 0) {
      setError('핵심 발명 포인트를 최소 1개 이상 입력해주세요.')
      return
    }

    setIsApproving(true)
    setError(null)

    try {
      const res = await fetch(`/api/patents/${projectId}/gates/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipc_codes: ipcCodes,
          core_inventions: validInventions,
          tech_domain: techDomain.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'GATE 1 승인 실패')
      }

      onApproved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인 처리 중 오류가 발생했습니다.')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold">
          G1
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">GATE 1 — 기술 핵심 확인</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">AI 분석 결과를 검토하고 수정한 뒤 확인해주세요.</p>
        </div>
      </div>

      {/* 기술 분야 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">기술 분야</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={techDomain}
            onChange={(e) => setTechDomain(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            placeholder="발명이 속하는 기술 분야..."
          />
        </CardContent>
      </Card>

      {/* IPC 코드 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">IPC 분류 코드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ipcCodes.map((code) => (
              <Badge key={code} variant="outline" className="font-mono text-xs gap-1 pr-1">
                {code}
                <button onClick={() => removeIpc(code)} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newIpc}
              onChange={(e) => setNewIpc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIpc()}
              placeholder="예: G06F 40/56"
              className="font-mono text-sm h-8"
            />
            <Button size="sm" variant="outline" onClick={addIpc} className="h-8 px-2">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 핵심 발명 포인트 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">핵심 발명 포인트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inventions.map((inv, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="shrink-0 mt-2 text-xs text-gray-500 w-5 text-right">{i + 1}.</span>
              <Input
                value={inv}
                onChange={(e) => updateInvention(i, e.target.value)}
                className="text-sm h-8 flex-1"
                placeholder="핵심 발명 포인트..."
              />
              <button onClick={() => removeInvention(i)} className="mt-2 text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={addInvention} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> 포인트 추가
          </Button>
        </CardContent>
      </Card>

      {/* 검토 메모 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 dark:text-gray-400">검토 메모 (선택)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm resize-none"
          placeholder="특이사항이나 수정 이유를 기록하세요..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <RotateCcw className="h-4 w-4" /> 재분석
        </Button>
        <Button onClick={handleApprove} disabled={isApproving} className="flex-1 gap-2">
          {isApproving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCircle className="h-4 w-4" />}
          확인하고 STEP 2로
        </Button>
      </div>
    </div>
  )
}
