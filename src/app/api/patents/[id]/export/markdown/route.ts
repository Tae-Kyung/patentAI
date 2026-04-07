import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'

const SECTION_LABELS: Record<string, string> = {
  title: '발명의 명칭',
  tech_field: '기술 분야',
  background: '배경 기술',
  problem: '해결 과제',
  solution: '과제 해결 수단',
  effect: '발명의 효과',
  drawing_desc: '도면 간단 설명',
  detailed_desc: '발명의 상세한 설명',
  abstract: '요약서',
}

const SECTION_ORDER = Object.keys(SECTION_LABELS)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const [{ data: sections }, { data: claims }, { data: drawings }] = await Promise.all([
      supabase.from('patentai_patent_sections').select('section_type, content').eq('project_id', id),
      supabase.from('patentai_patent_claims').select('claim_number, claim_type, content').eq('project_id', id).order('claim_number'),
      supabase.from('patentai_patent_drawings').select('drawing_number, caption, image_url').eq('project_id', id).order('drawing_number'),
    ])

    const sectionMap = new Map<string, string>((sections ?? []).map((s) => [s.section_type as string, s.content ?? '']))

    const parts: string[] = []

    // 헤더
    parts.push(`# 특허 명세서\n\n> 프로젝트: ${project.title}\n> 생성일: ${new Date().toLocaleDateString('ko-KR')}\n`)

    // 섹션
    for (const type of SECTION_ORDER) {
      const content = sectionMap.get(type) ?? ''
      if (content) {
        parts.push(`## ${SECTION_LABELS[type]}\n\n${content}`)
      }
    }

    // 청구범위
    if (claims && claims.length > 0) {
      const claimText = claims
        .map((c) => `**청구항 ${c.claim_number}.** ${c.content}`)
        .join('\n\n')
      parts.push(`## 청구범위\n\n${claimText}`)
    }

    // 도면
    if (drawings && drawings.length > 0) {
      const drawingList = drawings
        .map((d) => d.image_url
          ? `![FIG.${d.drawing_number} — ${d.caption}](${d.image_url})\n\n**FIG.${d.drawing_number}** ${d.caption ?? ''}`
          : `**FIG.${d.drawing_number}** ${d.caption ?? ''}`)
        .join('\n\n')
      parts.push(`## 도면\n\n${drawingList}`)
    }

    const markdown = parts.join('\n\n---\n\n')
    const filename = `patent_${id}_${Date.now()}.md`

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
