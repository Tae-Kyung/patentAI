'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { PatentDrawingType } from '@/types/database'

const DRAWING_TYPE_LABELS: Record<PatentDrawingType, string> = {
  system_architecture: '시스템 구조도',
  flowchart: '흐름도',
  ui_wireframe: 'UI 와이어프레임',
  data_flow: '데이터 흐름도',
  other: '기타',
}

const DRAWING_TYPE_COLORS: Record<PatentDrawingType, string> = {
  system_architecture: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  flowchart: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ui_wireframe: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  data_flow: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

export interface DrawingPlanItem {
  figure_number: number
  title: string
  description: string
  drawing_type: PatentDrawingType
}

interface DrawingPlanProps {
  items: DrawingPlanItem[]
  onChange: (items: DrawingPlanItem[]) => void
  readOnly?: boolean
}

export function DrawingPlan({ items, onChange, readOnly = false }: DrawingPlanProps) {
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<PatentDrawingType>('system_architecture')

  function handleAdd() {
    if (!newTitle.trim()) return
    const nextFigure = items.length > 0 ? Math.max(...items.map((i) => i.figure_number)) + 1 : 1
    onChange([
      ...items,
      {
        figure_number: nextFigure,
        title: newTitle.trim(),
        description: '',
        drawing_type: newType,
      },
    ])
    setNewTitle('')
  }

  function handleRemove(index: number) {
    const updated = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, figure_number: i + 1 }))
    onChange(updated)
  }

  function handleTypeChange(index: number, type: PatentDrawingType) {
    onChange(items.map((item, i) => (i === index ? { ...item, drawing_type: type } : item)))
  }

  function handleTitleChange(index: number, title: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, title } : item)))
  }

  function handleDescChange(index: number, description: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, description } : item)))
  }

  if (items.length === 0 && readOnly) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">도면 계획이 없습니다.</p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
        >
          {/* figure number */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {item.figure_number}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {readOnly ? (
                <>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DRAWING_TYPE_COLORS[item.drawing_type]}`}>
                    {DRAWING_TYPE_LABELS[item.drawing_type]}
                  </span>
                </>
              ) : (
                <>
                  <Input
                    value={item.title}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    className="h-7 flex-1 text-sm"
                    placeholder="도면 제목"
                  />
                  <Select
                    value={item.drawing_type}
                    onValueChange={(v) => handleTypeChange(index, v as PatentDrawingType)}
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DRAWING_TYPE_LABELS) as PatentDrawingType[]).map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {DRAWING_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
            )}
          </div>

          {!readOnly && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0 text-red-500 hover:text-red-600"
              onClick={() => handleRemove(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-8 flex-1 text-sm"
            placeholder="새 도면 제목 입력..."
          />
          <Select value={newType} onValueChange={(v) => setNewType(v as PatentDrawingType)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DRAWING_TYPE_LABELS) as PatentDrawingType[]).map((type) => (
                <SelectItem key={type} value={type} className="text-xs">
                  {DRAWING_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8" onClick={handleAdd} disabled={!newTitle.trim()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            추가
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.keys(DRAWING_TYPE_LABELS) as PatentDrawingType[]).map((type) => {
            const count = items.filter((i) => i.drawing_type === type).length
            if (count === 0) return null
            return (
              <Badge key={type} variant="secondary" className="text-xs">
                {DRAWING_TYPE_LABELS[type]} {count}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
