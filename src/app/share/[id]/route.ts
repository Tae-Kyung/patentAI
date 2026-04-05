import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET: 공유 랜딩페이지 HTML 서빙 (인증 불필요)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createServiceClient()

  // 프로젝트 존재 여부 확인
  const { data: project, error: projectError } = await supabase
    .from('bi_projects')
    .select('id, name, gate_3_passed_at')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return new NextResponse(notFoundHtml('프로젝트를 찾을 수 없습니다.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 랜딩페이지 문서 조회
  const { data: landingDoc } = await supabase
    .from('bi_documents')
    .select('content, is_confirmed')
    .eq('project_id', id)
    .eq('type', 'landing')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!landingDoc?.content) {
    return new NextResponse(notFoundHtml('랜딩페이지가 아직 생성되지 않았습니다.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 코드 펜스 제거 (AI가 ```html ... ``` 로 감싼 경우)
  let html = landingDoc.content.trim()
  const fenceMatch = html.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?\s*```$/)
  if (fenceMatch) {
    html = fenceMatch[1].trim()
  }

  // 랜딩페이지 HTML 직접 반환
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function notFoundHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>페이지를 찾을 수 없습니다</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center p-8">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">404</h1>
    <p class="text-gray-600 mb-6">${message}</p>
    <a href="/" class="text-blue-600 hover:underline">홈으로 돌아가기</a>
  </div>
</body>
</html>`
}
