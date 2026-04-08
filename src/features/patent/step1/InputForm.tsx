'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Type, X, Loader2 } from 'lucide-react'

interface InputFormProps {
  projectId: string
  onInputSaved: () => void
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt']
const MAX_TEXT_LENGTH = 5000

export function InputForm({ projectId, onInputSaved }: InputFormProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  const validateAndSetFile = (f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`지원하지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(', ')})`)
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB 이하여야 합니다.')
      return
    }
    setError(null)
    setFile(f)
  }

  const handleTextSubmit = async () => {
    if (!text.trim()) return
    setIsUploading(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: text.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '저장 실패')
      }
      onInputSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSubmit = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/patents/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '업로드 실패')
      }
      onInputSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'file')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            아이디어 텍스트
          </TabsTrigger>
          <TabsTrigger value="file" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            파일 업로드
          </TabsTrigger>
        </TabsList>

        {/* 텍스트 입력 탭 */}
        <TabsContent value="text" className="space-y-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              placeholder="발명 아이디어, 기술 개요, PRD 내용 등을 자유롭게 입력하세요.&#10;&#10;예: 기존 특허 검색 시스템의 문제점은 전문 용어 이해 없이는 검색이 어렵다는 것입니다. 본 발명은 자연어 입력만으로 관련 특허를 검색하고..."
              className="min-h-[240px] resize-none text-sm"
            />
            <span className={`absolute bottom-2 right-3 text-xs ${text.length >= MAX_TEXT_LENGTH ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
            </span>
          </div>
          <Button
            onClick={handleTextSubmit}
            disabled={!text.trim() || isUploading}
            className="w-full"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            입력 저장
          </Button>
        </TabsContent>

        {/* 파일 업로드 탭 */}
        <TabsContent value="file" className="space-y-3">
          {/* 드래그앤드롭 영역 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.md,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {ALLOWED_EXTENSIONS.map((ext) => (
                    <Badge key={ext} variant="secondary" className="text-xs">{ext}</Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400">최대 50MB</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleFileSubmit}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isUploading ? '업로드 중...' : '파일 업로드'}
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
