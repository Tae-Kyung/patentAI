# CASA (CBNU AI-Agentic Startup Accelerator)

AI 기반 창업 가속화 플랫폼 MVP

창업자의 아이디어를 입력받아 **AI 다면 검증 → 사업계획서 자동 생성 → 랜딩페이지 배포**까지 원스톱으로 지원합니다.

## 주요 기능

| 단계 | 기능 | 설명 |
|------|------|------|
| 1. 아이디어 | 입력/확장 | 자연어 아이디어 입력 → AI가 구조화 및 확장 |
| 2. 평가 | 다면 검증 | 투자심사역·시장분석가·기술전문가 관점 AI 평가 |
| 3. 문서 | 자동 생성 | 사업계획서, 요약 피치덱, 랜딩페이지 HTML |
| 4. 배포 | 최종 승인 | 멘토 피드백 → 승인 → 배포 준비 |

각 단계 사이에 **Human-in-the-Loop Gate**가 있어 사용자가 확인·수정·재요청할 수 있습니다.

## 기술 스택

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Claude 3.5 Sonnet / OpenAI / Gemini
- **Cache:** Upstash Redis
- **i18n:** next-intl (한국어, 영어)
- **Theme:** next-themes (라이트/다크 모드)
- **Deployment:** Vercel

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/           # 다국어 라우팅 (ko, en)
│   │   ├── (auth)/         # 로그인, 회원가입
│   │   ├── (dashboard)/    # 대시보드, 프로젝트, 설정, 관리자
│   │   └── auth/callback/  # OAuth 콜백
│   └── api/                # API 라우트
│       ├── projects/       # 프로젝트 CRUD, 아이디어, 평가, 문서, 배포
│       └── admin/          # 프롬프트 관리, 승인 관리
├── components/
│   ├── common/             # 공통 UI (모달, 로딩, 페이지네이션 등)
│   ├── layout/             # 레이아웃 컴포넌트
│   ├── providers/          # 테마 프로바이더
│   └── ui/                 # shadcn/ui 컴포넌트
├── features/               # 기능별 컴포넌트
│   ├── idea/               # 아이디어 입력/확장
│   ├── evaluation/         # 사업성 평가
│   ├── document/           # 문서 생성
│   ├── deploy/             # 배포 준비
│   └── feedback/           # 피드백
├── hooks/                  # 커스텀 훅 (useSSE 등)
├── i18n/                   # 다국어 메시지
├── lib/
│   ├── ai/                 # AI API 래퍼 (Claude, OpenAI, Gemini)
│   ├── auth/               # 인증 가드
│   ├── prompts/            # 프롬프트 엔진 + 버전 관리
│   ├── supabase/           # Supabase 클라이언트 (client, server, service)
│   └── utils/              # API 응답 유틸
├── types/                  # TypeScript 타입 정의
└── middleware.ts            # 인증 + i18n 미들웨어
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm
- Supabase 프로젝트
- Anthropic API 키 (또는 OpenAI / Google AI 키)
- Upstash Redis (선택)

### 환경 변수

`.env.local` 파일을 생성합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key        # 선택
GOOGLE_AI_API_KEY=your_google_ai_api_key  # 선택

# Redis (선택)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 데이터베이스 설정

Supabase SQL Editor에서 순서대로 실행합니다:

```
1. supabase/schema.sql         # 테이블 생성
2. supabase/rls-policies.sql   # Row Level Security 정책
3. supabase/triggers.sql       # 트리거 함수
4. supabase/seed-prompts.sql   # 프롬프트 시드 데이터
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 사용자 역할

| 역할 | 설명 |
|------|------|
| **예비창업자 (user)** | 아이디어 입력, AI 검증, 문서 생성 |
| **멘토 (mentor)** | 피드백 제공, 최종 승인 |
| **관리자 (admin)** | 프롬프트 관리, 시스템 설정 |

## 라이선스

Private - All rights reserved.
