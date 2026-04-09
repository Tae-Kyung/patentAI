import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { extractTextFromPdf } from '@/lib/utils/pdf-extract'
import { extractTextFromDocx } from '@/lib/utils/docx-extract'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  txt: 'text/plain',
}
const ALLOWED_EXTENSIONS = Object.keys(EXT_TO_MIME)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // 프로젝트 소유자 확인
    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return errorResponse('파일이 없습니다.', 400)
    if (file.size > MAX_FILE_SIZE) return errorResponse('파일 크기는 50MB 이하여야 합니다.', 400)

    // 확장자 기반 MIME 타입 결정 (브라우저가 octet-stream으로 보내는 경우 대비)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = EXT_TO_MIME[ext]
    if (!mimeType) {
      return errorResponse('지원하지 않는 파일 형식입니다. (PDF, DOCX, MD, TXT)', 400)
    }

    // Supabase Storage 업로드 (service role - RLS 우회)
    const storagePath = `${user.id}/${id}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await serviceSupabase.storage
      .from('patent-files')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        return errorResponse('스토리지 버킷(patent-files)이 설정되지 않았습니다.', 500)
      }
      throw uploadError
    }

    const { data: urlData } = serviceSupabase.storage.from('patent-files').getPublicUrl(storagePath)

    // 텍스트 추출
    let extractedText = ''
    try {
      if (mimeType === 'application/pdf') {
        const result = await extractTextFromPdf(new File([fileBuffer], file.name, { type: mimeType }))
        extractedText = result.text
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await extractTextFromDocx(fileBuffer)
      } else {
        // MD / TXT
        extractedText = new TextDecoder().decode(fileBuffer)
      }
    } catch (extractError) {
      console.error('Text extraction failed:', extractError)
      // 추출 실패 시 빈 텍스트로 계속 진행 (OCR 폴백은 별도 라우트)
    }

    // bi_patent_inputs INSERT
    const { data: input, error: insertError } = await supabase
      .from('patentai_patent_inputs')
      .insert({
        project_id: id,
        type: 'file',
        content: extractedText || null,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
      })
      .select()
      .single()

    if (insertError) return errorResponse('입력 저장 실패', 500)

    return successResponse({
      input,
      extracted: extractedText.length > 0,
      needsOcr: extractedText.length === 0 && mimeType === 'application/pdf',
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
