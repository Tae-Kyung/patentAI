# CLAUDE.md - PatentAI 개발 컨벤션

## 프로젝트 개요
- **이름**: PatentAI — AI 기반 특허 명세서 자동 생성 플랫폼
- **목적**: 아이디어/PRD/논문을 입력받아 KIPO 표준 특허 명세서를 단계별로 자동 생성
- **문서**: `docs/PATENT/PRD.md` (v1.1), `docs/TASK_PATENT.md`
- **베이스코드**: CASA (C:\DATA\workspace\casa) 기반 클론

## 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI (텍스트)**: Claude Sonnet (Anthropic API) — 분석·청구항·명세서 본문
- **AI (이미지)**: Gemini 2.0 Flash (Google) — 특허 도면 생성
- **AI (OCR 폴백)**: OpenAI GPT-4o Vision — 스캔 PDF 처리
- **선행기술 조사**: KIPRIS Open API (국내) + USPTO PatentsView API (미국)
- **Cache**: Upstash Redis
- **i18n**: next-intl
- **Theme**: next-themes
- **Deployment**: Vercel

## 폴더 구조
```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/             # 로그인/회원가입
│   │   └── (dashboard)/
│   │       ├── dashboard/      # 특허 프로젝트 대시보드
│   │       │   └── patents/[id]/  # 특허 작업 뷰 (STEP 1~6)
│   │       ├── admin/          # 프롬프트 관리 등
│   │       ├── credits/        # 크레딧 관리
│   │       └── settings/       # 설정
│   └── api/
│       ├── patents/[id]/       # 특허 API 라우트 (신규)
│       ├── admin/              # 관리자 API (재사용)
│       ├── credits/            # 크레딧 API (재사용)
│       ├── auth/               # 인증 API (재사용)
│       ├── notifications/      # 알림 API (재사용)
│       └── pdf-ocr/            # OCR API (재사용)
├── components/
│   └── ui/                     # shadcn/ui 컴포넌트 (재사용)
├── features/
│   └── patent/                 # PatentAI 기능 컴포넌트 (신규)
│       ├── step1/              # 입력 & 분석
│       ├── step2/              # 기술 구조화
│       ├── step3/              # 청구범위
│       ├── step4/              # 명세서 본문
│       ├── step5/              # 도면 생성
│       ├── step6/              # 최종 출력
│       ├── gates/              # GATE 1~5 UI
│       └── common/             # 공통 컴포넌트
├── lib/
│   ├── supabase/               # Supabase 클라이언트 (재사용)
│   ├── prompts/                # 프롬프트 엔진 (재사용)
│   ├── ai/                     # AI API 래퍼 Claude/Gemini/OpenAI (재사용)
│   ├── auth/                   # 인증 유틸 (재사용)
│   ├── prior-art/              # 선행기술 조사 KIPRIS/USPTO (신규)
│   ├── services/
│   │   └── patent-generator.ts # 특허 생성 서비스 (신규)
│   └── utils/                  # 공통 유틸 (재사용 + docx-extract 신규)
├── hooks/                      # 커스텀 훅 useSSE 등 (재사용)
├── i18n/                       # 다국어 메시지
├── types/                      # TypeScript 타입
└── config/                     # 설정 상수
```

## 데이터베이스 테이블 (PatentAI 전용)
모든 테이블 접두사: `bi_`
- bi_patent_projects — 특허 프로젝트
- bi_patent_inputs — 입력 소스 (텍스트/파일)
- bi_patent_components — 구성요소 트리 (참조번호 체계)
- bi_patent_prior_art — 선행기술 조사 결과
- bi_patent_claims — 청구항
- bi_patent_sections — 명세서 섹션 (9개)
- bi_patent_drawings — 특허 도면
- bi_patent_gates — GATE 승인 이력 (1~5)

## 워크플로우 (6단계 + 5게이트)
```
STEP1(입력/분석) → GATE1 → STEP2(구조화) → GATE2(+선행기술) →
STEP3(청구범위) → GATE3 → STEP4(본문) → GATE4 →
STEP5(도면) → GATE5 → STEP6(출력)
```

## 코딩 컨벤션

### 파일 명명
- 컴포넌트: PascalCase (`ClaimsEditor.tsx`)
- 훅: camelCase with "use" prefix (`useSSE.ts`)
- 유틸: camelCase (`docx-extract.ts`)
- 타입: PascalCase (`Database.ts`)

### 컴포넌트
```typescript
export function ComponentName({ prop }: Props) {
  return <div>...</div>
}
// default export 지양, named export 사용
```

### API 라우트
```typescript
// app/api/patents/[id]/xxx/route.ts
import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { requireProjectOwner } from '@/lib/auth/guards'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authResult = await requireProjectOwner(id)
  if (authResult instanceof Response) return authResult
  try {
    return successResponse(data)
  } catch (error) {
    return errorResponse('에러 메시지', 500)
  }
}
```

### SSE 스트리밍 패턴
```typescript
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts/prompt-engine'

async function* generate() {
  const prompt = await preparePrompt('patent_xxx', { variable: value })
  for await (const event of streamClaude(prompt)) {
    if (event.type === 'text') yield { type: 'text', data: event.data }
  }
  yield { type: 'done', data: {} }
}
return createSSEResponse(generate())
```

### Supabase 사용
```typescript
import { createClient } from '@/lib/supabase/client'   // 클라이언트 컴포넌트
import { createClient } from '@/lib/supabase/server'   // 서버 컴포넌트
import { createServiceClient } from '@/lib/supabase/service'  // Service Role
```

### 다크모드
- 모든 색상에 `dark:` 클래스 필수
- `bg-white dark:bg-gray-900`
- `text-gray-900 dark:text-white`

## 주요 원칙
1. **RLS 필수**: 모든 bi_patent_* 테이블에 Row Level Security 적용
2. **Zod 검증**: API 입력은 반드시 Zod로 검증
3. **SSE 스트리밍**: AI 생성 작업은 전부 SSE 사용 (`createSSEResponse`)
4. **Gate 확인**: 각 STEP API는 이전 Gate 통과 여부 확인 후 실행
5. **크레딧 차감**: AI 호출 전 `deductCredits()` 실행
6. **에러 핸들링**: try-catch + `errorResponse()`
7. **KIPRIS 폴백**: 선행기술 조사 실패 시 빈 결과로 계속 진행 (차단 금지)
