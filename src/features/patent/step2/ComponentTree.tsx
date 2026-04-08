'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { PatentComponent } from '@/types/database'

type ComponentNode = PatentComponent & { children: ComponentNode[] }

interface ComponentTreeProps {
  projectId: string
  nodes: ComponentNode[]
  onAdd: (parentId: string | null) => void
  onUpdated: () => void
  onDeleted: () => void
  conflictRefs?: Set<string>   // prior art conflict ref_numbers
}

interface NodeRowProps {
  node: ComponentNode
  projectId: string
  depth: number
  onAdd: (parentId: string | null) => void
  onUpdated: () => void
  onDeleted: () => void
  conflictRefs: Set<string>
}

function NodeRow({ node, projectId, depth, onAdd, onUpdated, onDeleted, conflictRefs }: NodeRowProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(node.name)
  const [description, setDescription] = useState(node.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hasConflict = conflictRefs.has(node.ref_number)
  const hasChildren = node.children.length > 0

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/components/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      if (res.ok) {
        setEditing(false)
        onUpdated()
      }
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(node.name)
    setDescription(node.description ?? '')
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`"${node.name}" 구성요소를 삭제하시겠습니까?${hasChildren ? '\n하위 구성요소도 함께 삭제됩니다.' : ''}`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/components/${node.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div
        className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* expand toggle */}
        <button
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="inline-block h-4 w-4" />
          )}
        </button>

        {/* ref badge */}
        <Badge
          variant="outline"
          className="mt-0.5 flex-shrink-0 font-mono text-xs"
        >
          {node.ref_number}
        </Badge>

        {/* conflict warning */}
        {hasConflict && (
          <span title="선행기술 충돌 위험">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
          </span>
        )}

        {/* content */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1.5">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm"
                placeholder="구성요소 이름"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px] text-xs"
                placeholder="설명 (선택)"
              />
              <div className="flex gap-1">
                <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={handleSave} disabled={saving}>
                  <Check className="mr-1 h-3 w-3" /> 저장
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancel}>
                  <X className="mr-1 h-3 w-3" /> 취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{node.name}</span>
              {node.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{node.description}</p>
              )}
            </>
          )}
        </div>

        {/* actions */}
        {!editing && (
          <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="하위 구성요소 추가"
              onClick={() => onAdd(node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="편집"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              title="삭제"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              projectId={projectId}
              depth={depth + 1}
              onAdd={onAdd}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              conflictRefs={conflictRefs}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ComponentTree({
  projectId,
  nodes,
  onAdd,
  onUpdated,
  onDeleted,
  conflictRefs = new Set(),
}: ComponentTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          구성요소가 없습니다. AI 생성 또는 직접 추가해주세요.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onAdd(null)}>
          <Plus className="mr-1.5 h-4 w-4" />
          구성요소 추가
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
      {nodes.map((node) => (
        <NodeRow
          key={node.id}
          node={node}
          projectId={projectId}
          depth={0}
          onAdd={onAdd}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          conflictRefs={conflictRefs}
        />
      ))}
      <div className="pt-1">
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onAdd(null)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          최상위 구성요소 추가
        </Button>
      </div>
    </div>
  )
}
