import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const ALLOWED_TYPES = ['resume', 'bank_account', 'privacy_consent', 'id_card'] as const
type DocType = (typeof ALLOWED_TYPES)[number]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// GET: 멘토 증빙 서류 목록 조회
export async function GET() {
  try {
    const user = await requireMentor()
    const supabase = createServiceClient()

    // select('*')로 조회 후 cast — privacy_consent_url은 마이그레이션 후 추가 컬럼
    const { data: profile } = await supabase
      .from('bi_mentor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const p = profile as Record<string, unknown> | null

    return successResponse({
      resume: (p?.resume_url as string) || null,
      bank_account: (p?.bank_account_url as string) || null,
      privacy_consent: (p?.privacy_consent_url as string) || null,
      id_card: (p?.id_card_url as string) || null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 멘토 증빙 서류 업로드
export async function POST(request: NextRequest) {
  try {
    const user = await requireMentor()

    // 서류가 확정된 경우 업로드 차단
    const supabaseCheck = createServiceClient()
    const { data: profileCheck } = await supabaseCheck
      .from('bi_mentor_profiles')
      .select('documents_confirmed')
      .eq('user_id', user.id)
      .single()
    const profileCheckRaw = profileCheck as Record<string, unknown> | null
    if (profileCheckRaw?.documents_confirmed) {
      return errorResponse('서류가 확정되어 더 이상 업로드할 수 없습니다.', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const docType = formData.get('type') as string | null

    if (!file || !docType) {
      return errorResponse('파일과 문서 유형이 필요합니다.', 400)
    }

    if (!ALLOWED_TYPES.includes(docType as DocType)) {
      return errorResponse('유효하지 않은 문서 유형입니다.', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('파일 크기는 10MB 이하여야 합니다.', 400)
    }

    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]
    if (!allowedMimes.includes(file.type)) {
      return errorResponse('PDF, JPG, PNG, WEBP 파일만 업로드 가능합니다.', 400)
    }

    const supabase = createServiceClient()

    // 파일 업로드
    const ext = file.name.split('.').pop() || 'pdf'
    const fileName = `${docType}_${user.id}_${Date.now()}.${ext}`
    const filePath = `mentor-documents/${user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Document upload error:', uploadError)
      return errorResponse('파일 업로드에 실패했습니다.', 500)
    }

    // 공개 URL 생성
    const { data: publicUrl } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    const url = publicUrl.publicUrl

    // 프로필 업데이트
    const columnMap: Record<string, string> = {
      resume: 'resume_url',
      bank_account: 'bank_account_url',
      privacy_consent: 'privacy_consent_url',
      id_card: 'id_card_url',
    }

    const { error: updateError } = await supabase
      .from('bi_mentor_profiles')
      .update({
        [columnMap[docType]]: url,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return errorResponse('프로필 업데이트에 실패했습니다.', 500)
    }

    return successResponse({ url, type: docType })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 멘토 증빙 서류 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireMentor()
    const { searchParams } = new URL(request.url)
    const docType = searchParams.get('type')

    if (!docType || !ALLOWED_TYPES.includes(docType as DocType)) {
      return errorResponse('유효하지 않은 문서 유형입니다.', 400)
    }

    const supabase = createServiceClient()

    // 서류가 확정된 경우 삭제 차단
    const { data: profileForDelete } = await supabase
      .from('bi_mentor_profiles')
      .select('documents_confirmed')
      .eq('user_id', user.id)
      .single()
    const profileForDeleteRaw = profileForDelete as Record<string, unknown> | null
    if (profileForDeleteRaw?.documents_confirmed) {
      return errorResponse('서류가 확정되어 더 이상 삭제할 수 없습니다.', 403)
    }

    const columnMap: Record<string, string> = {
      resume: 'resume_url',
      bank_account: 'bank_account_url',
      privacy_consent: 'privacy_consent_url',
      id_card: 'id_card_url',
    }

    const { error } = await supabase
      .from('bi_mentor_profiles')
      .update({
        [columnMap[docType]]: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) {
      return errorResponse('서류 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '서류가 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
