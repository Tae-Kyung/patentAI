# CLAUDE.md - CASA 개발 컨벤션

## 프로젝트 개요
- **이름**: CASA (CBNU AI-Agentic Startup Accelerator)
- **목적**: AI 기반 창업 가속화 플랫폼 MVP
- **문서**: `docs/PRD.md`, `docs/TASK.md`

## 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude 3.5 Sonnet (Anthropic API)
- **Cache**: Upstash Redis
- **i18n**: next-intl
- **Theme**: next-themes
- **Deployment**: Vercel

## 폴더 구조
```
src/
├── app/
│   ├── [locale]/           # 다국어 라우팅
│   │   ├── (public)/       # 비인증 페이지 (login, signup)
│   │   ├── dashboard/      # 인증 필요 페이지
│   │   └── admin/          # 관리자 페이지
│   └── api/                # API 라우트
├── components/
│   └── ui/                 # shadcn/ui 컴포넌트
├── features/               # 기능별 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   ├── prompts/            # 프롬프트 엔진
│   ├── ai/                 # AI API 래퍼
│   ├── auth/               # 인증 유틸
│   └── utils/              # 공통 유틸
├── hooks/                  # 커스텀 훅
├── i18n/                   # 다국어 메시지
├── types/                  # TypeScript 타입
└── config/                 # 설정 상수
```

## 코딩 컨벤션

### 파일 명명
- 컴포넌트: PascalCase (`ProjectCard.tsx`)
- 훅: camelCase with "use" prefix (`useProjects.ts`)
- 유틸: camelCase (`apiResponse.ts`)
- 타입: PascalCase (`Database.ts`)

### 컴포넌트
```typescript
// 함수형 컴포넌트만 사용
export function ComponentName({ prop }: Props) {
  return <div>...</div>
}

// default export 지양, named export 사용
```

### API 라우트
```typescript
// app/api/xxx/route.ts
import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

export async function GET(request: NextRequest) {
  try {
    // 로직
    return successResponse(data)
  } catch (error) {
    return errorResponse('에러 메시지', 500)
  }
}
```

### Supabase 사용
```typescript
// 클라이언트 컴포넌트
import { createClient } from '@/lib/supabase/client'

// 서버 컴포넌트
import { createClient } from '@/lib/supabase/server'

// API 라우트 (Service Role 필요 시)
import { createServiceClient } from '@/lib/supabase/service'
```

### 다국어
```typescript
// 서버 컴포넌트
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('namespace')

// 클라이언트 컴포넌트
import { useTranslations } from 'next-intl'
const t = useTranslations('namespace')
```

### 다크모드
- 모든 색상에 `dark:` 클래스 필수
- `bg-white dark:bg-gray-900`
- `text-gray-900 dark:text-white`

## 데이터베이스 테이블
모든 테이블 접두사: `bi_`
- bi_users, bi_projects, bi_idea_cards
- bi_evaluations, bi_documents, bi_feedbacks
- bi_approvals, bi_prompts, bi_prompt_versions

## 주요 원칙
1. **RLS 필수**: 모든 테이블에 Row Level Security 적용
2. **Zod 검증**: API 입력은 반드시 Zod로 검증
3. **SSE 스트리밍**: 3초 이상 걸리는 AI 작업은 SSE 사용
4. **에러 핸들링**: try-catch + 사용자 친화적 에러 메시지
5. **다국어**: 모든 UI 텍스트는 i18n 키 사용
