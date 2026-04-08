import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'

// KIPO 표준 섹션 레이블
const SECTION_LABELS: Record<string, string> = {
  title: '발명의 명칭',
  tech_field: '기술분야',
  background: '배경기술',
  problem: '해결하고자 하는 과제',
  solution: '과제의 해결 수단',
  effect: '발명의 효과',
  drawing_desc: '도면의 간단한 설명',
  detailed_desc: '발명을 실시하기 위한 구체적인 내용',
  abstract: '요약서',
}

const SECTION_ORDER = ['title', 'tech_field', 'background', 'problem', 'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract']

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
      supabase.from('patentai_patent_claims').select('claim_number, content').eq('project_id', id).order('claim_number'),
      supabase.from('patentai_patent_drawings').select('drawing_number, caption, image_url').eq('project_id', id).order('drawing_number'),
    ])

    const sectionMap = new Map<string, string>((sections ?? []).map((s) => [s.section_type as string, s.content ?? '']))

    // drawing_desc가 없거나 실제 도면을 언급하지 않으면 자동 보정
    if (drawings && drawings.length > 0) {
      const drawingDescContent = sectionMap.get('drawing_desc') ?? ''
      const allMentioned = drawings.every((d) => drawingDescContent.includes(String(d.drawing_number)))
      if (!allMentioned) {
        const autoDesc = drawings
          .map((d) => `도 ${d.drawing_number}은 ${d.caption ?? ''}을 나타낸다.`)
          .join('\n')
        sectionMap.set('drawing_desc', autoDesc)
      }
    }

    function esc(text: string) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    const sectionHtml = SECTION_ORDER.map((type) => {
      const content = sectionMap.get(type) ?? ''
      if (!content) return ''
      return `<section>
        <h2>【${SECTION_LABELS[type]}】</h2>
        <p>${esc(content).replace(/\n/g, '<br>')}</p>
      </section>`
    }).join('\n')

    const claimsHtml = claims && claims.length > 0
      ? `<section>
          <h2>【청구범위】</h2>
          ${claims.map((c) => `
          <div class="claim">
            <h3>【청구항 ${c.claim_number}】</h3>
            <p>${esc(c.content).replace(/\n/g, '<br>')}</p>
          </div>`).join('\n')}
        </section>`
      : ''

    const drawingsHtml = drawings && drawings.length > 0
      ? `<section>
          <h2>【도면】</h2>
          ${drawings.map((d) => d.image_url ? `
          <div class="drawing">
            <h3>【도 ${d.drawing_number}】</h3>
            <figure>
              <img src="${d.image_url}" alt="도 ${d.drawing_number}" loading="eager">
            </figure>
          </div>` : '').join('\n')}
        </section>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(project.title)} — 특허 명세서</title>
<style>
  @page { size: A4; margin: 35mm 30mm 30mm 35mm; }
  body {
    font-family: 'Batang', '바탕', 'Malgun Gothic', '맑은 고딕', serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    text-align: justify;
  }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 32px; }
  h2 { font-size: 12pt; font-weight: bold; margin-top: 20pt; margin-bottom: 10pt; }
  h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
  p { margin: 0 0 6pt 0; }
  section { margin-bottom: 8pt; }
  .claim { margin-bottom: 8pt; }
  .drawing { page-break-inside: avoid; margin-bottom: 16pt; }
  figure { text-align: center; margin: 8pt 0; }
  figure img { max-width: 100%; max-height: 280px; object-fit: contain; }
  figcaption { font-size: 10pt; margin-top: 4pt; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>특허 명세서<br><span style="font-size:13pt">${esc(project.title)}</span></h1>
${sectionHtml}
${claimsHtml}
${drawingsHtml}
<script>window.onload = () => window.print()</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
