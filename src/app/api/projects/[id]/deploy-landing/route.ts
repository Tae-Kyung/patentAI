import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 랜딩페이지 배포
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 프로젝트 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // Gate 3 통과 확인
    if (!project.gate_3_passed_at) {
      return errorResponse('문서 단계(Gate 3)를 먼저 완료해주세요.', 400)
    }

    // 랜딩페이지 문서 찾기
    const { data: landingDoc } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('project_id', id)
      .eq('type', 'landing')
      .single()

    if (!landingDoc || !landingDoc.content) {
      return errorResponse('랜딩페이지가 생성되지 않았습니다.', 400)
    }

    // Supabase Storage에 HTML 파일 업로드
    const fileName = `landing-${id}.html`
    const filePath = `public/${fileName}`

    // 코드 펜스 제거 (AI가 ```html ... ``` 로 감싼 경우)
    let cleanContent = landingDoc.content.trim()
    const fenceMatch = cleanContent.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?\s*```$/)
    if (fenceMatch) {
      cleanContent = fenceMatch[1].trim()
    }

    // HTML 컨텐츠에 메타데이터 추가
    const htmlContent = cleanContent.replace(
      '</head>',
      `<meta name="project-id" content="${id}">
      <meta name="deployed-at" content="${new Date().toISOString()}">
      </head>`
    )

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('landing-pages')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      // 버킷이 없으면 생성 시도 (첫 배포 시)
      if (uploadError.message.includes('Bucket not found')) {
        return errorResponse(
          '스토리지 버킷이 설정되지 않았습니다. 관리자에게 문의하세요.',
          500
        )
      }
      throw uploadError
    }

    // 공개 URL 생성
    const { data: publicUrl } = supabase.storage
      .from('landing-pages')
      .getPublicUrl(filePath)

    // 문서에 배포 URL 저장
    const { error: updateError } = await supabase
      .from('bi_documents')
      .update({
        storage_path: publicUrl.publicUrl,
      })
      .eq('id', landingDoc.id)

    if (updateError) {
      console.error('Failed to update document with landing URL:', updateError)
    }

    return successResponse({
      message: '랜딩페이지가 배포되었습니다.',
      url: publicUrl.publicUrl,
      deployedAt: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: 배포 상태 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 랜딩페이지 문서에서 배포 URL 조회
    const { data: landingDoc, error } = await supabase
      .from('bi_documents')
      .select('storage_path, created_at')
      .eq('project_id', id)
      .eq('type', 'landing')
      .single()

    if (error || !landingDoc) {
      return successResponse({
        isDeployed: false,
        url: null,
        deployedAt: null,
      })
    }

    return successResponse({
      isDeployed: !!landingDoc.storage_path,
      url: landingDoc.storage_path,
      deployedAt: landingDoc.storage_path ? landingDoc.created_at : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
