import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'

// KIPO 표준 섹션 레이블 (쿠콘 명세서 기준)
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

// 이미지 크기 (15cm × 10cm in EMU)
const IMG_CX = 5400000
const IMG_CY = 3600000

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 단락 XML 생성 (본문 스타일: 바탕 12pt, 양쪽정렬, 줄간격 1.5)
function bodyParagraph(text: string): string {
  return `<w:p>
    <w:pPr>
      <w:jc w:val="both"/>
      <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
      <w:rPr>
        <w:rFonts w:ascii="Batang" w:cs="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/>
        <w:sz w:val="24"/><w:szCs w:val="24"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Batang" w:cs="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/>
        <w:sz w:val="24"/><w:szCs w:val="24"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`
}

// 헤딩 1 단락 XML 생성 (【섹션명】 형식)
function heading1Paragraph(label: string): string {
  return `<w:p>
    <w:pPr>
      <w:pStyle w:val="1"/>
      <w:spacing w:before="400" w:after="200"/>
    </w:pPr>
    <w:r>
      <w:t>【${escapeXml(label)}】</w:t>
    </w:r>
  </w:p>`
}

// 이미지 단락 XML (캡션 없음)
function imageParagraph(rId: string, drawingNumber: number): string {
  return `<w:p>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="200"/></w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${IMG_CX}" cy="${IMG_CY}"/>
          <wp:docPr id="${drawingNumber}" name="도 ${drawingNumber}"/>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${drawingNumber}" name="도 ${drawingNumber}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${IMG_CX}" cy="${IMG_CY}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`
}

interface ImageData {
  drawingNumber: number
  caption: string
  buffer: Buffer
  ext: string
  rId: string
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Batang" w:cs="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/>
        <w:sz w:val="24"/><w:szCs w:val="24"/>
        <w:lang w:eastAsia="ko-KR"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:jc w:val="both"/>
        <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:jc w:val="both"/>
      <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Batang" w:cs="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:jc w:val="left"/>
      <w:spacing w:before="400" w:after="200"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Batang" w:cs="Batang" w:eastAsia="Batang" w:hAnsi="Batang"/>
      <w:b/><w:sz w:val="24"/><w:szCs w:val="24"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>
</w:styles>`
}

async function createDocx(
  title: string,
  sectionMap: Map<string, string>,
  claims: { claim_number: number; content: string }[],
  images: ImageData[],
): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // 이미지 파일 추가
  for (const img of images) {
    zip.file(`word/media/image${img.drawingNumber}.${img.ext}`, img.buffer)
  }

  // 본문 XML 빌드
  const bodyParts: string[] = []

  // 섹션 (청구범위·도면 제외)
  for (const type of SECTION_ORDER) {
    const content = sectionMap.get(type) ?? ''
    if (!content) continue
    bodyParts.push(heading1Paragraph(SECTION_LABELS[type]))
    // 줄바꿈 단위로 단락 분리
    for (const line of content.split('\n')) {
      bodyParts.push(bodyParagraph(line))
    }
  }

  // 청구범위 — 각 청구항이 개별 헤딩
  if (claims.length > 0) {
    bodyParts.push(heading1Paragraph('청구범위'))
    for (const claim of claims) {
      bodyParts.push(heading1Paragraph(`청구항 ${claim.claim_number}`))
      for (const line of claim.content.split('\n')) {
        bodyParts.push(bodyParagraph(line))
      }
    }
  }

  // 도면 — 각 도면이 개별 헤딩 + 이미지
  if (images.length > 0) {
    bodyParts.push(heading1Paragraph('도면'))
    for (const img of images) {
      bodyParts.push(heading1Paragraph(`도 ${img.drawingNumber}`))
      bodyParts.push(imageParagraph(img.rId, img.drawingNumber))
    }
  }

  // 이미지 관계
  const imageRels = images
    .map((img) => `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${img.drawingNumber}.${img.ext}"/>`)
    .join('\n  ')

  const hasExt = (ext: string) => images.some((img) => img.ext === ext)

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasExt('png') ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  ${hasExt('jpg') ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ''}
  ${hasExt('webp') ? '<Default Extension="webp" ContentType="image/webp"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

  zip.file('word/styles.xml', buildStylesXml())

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${imageRels}
</Relationships>`)

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="1"/>
        <w:spacing w:before="0" w:after="400"/>
      </w:pPr>
      <w:r><w:t>${escapeXml(title)}</w:t></w:r>
    </w:p>
    ${bodyParts.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1985" w:right="1701" w:bottom="1701" w:left="1985" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`)

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return buffer
}

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

    // 이미지 다운로드
    const images: ImageData[] = []
    for (const drawing of drawings ?? []) {
      if (!drawing.image_url) continue
      try {
        const res = await fetch(drawing.image_url)
        if (!res.ok) continue
        const mimeType = res.headers.get('content-type') ?? 'image/png'
        const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
        images.push({
          drawingNumber: drawing.drawing_number,
          caption: drawing.caption ?? '',
          buffer: Buffer.from(await res.arrayBuffer()),
          ext,
          rId: `rIdImg${drawing.drawing_number}`,
        })
      } catch { /* 이미지 다운로드 실패 시 스킵 */ }
    }

    const docxBuffer = await createDocx(project.title, sectionMap, claims ?? [], images)

    const filename = `patent_${project.title}_${Date.now()}.docx`
    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
