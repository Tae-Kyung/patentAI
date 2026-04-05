# TASK.md - CASA MVP 구현 태스크 정의서

> **문서 버전:** 1.0
> **작성일:** 2026-02-15
> **기준 문서:** PRD.md v1.3

---

## 1. 개요

### 1.1 목적
PRD.md에 정의된 CASA MVP를 **견고하고 즉시 사용 가능한 수준**으로 구현하기 위한 단계별 태스크를 정의합니다.

### 1.2 구현 원칙

| 원칙 | 설명 |
|------|------|
| **의존성 우선** | 하위 레이어(DB, Auth)부터 상위 레이어(UI)로 진행 |
| **검증 후 진행** | 각 Phase 완료 시 검증 후 다음 Phase 진행 |
| **병렬 작업 최대화** | 독립적인 태스크는 병렬로 진행 가능 표시 |
| **테스트 포함** | 각 기능에 최소한의 테스트 코드 포함 |
| **점진적 통합** | 작은 단위로 통합하며 문제 조기 발견 |

### 1.3 완료 기준 정의

```
✅ 완료 = 코드 작성 + 로컬 테스트 통과 + 코드 리뷰
🔄 진행 중 = 작업 시작됨
⏳ 대기 = 의존성 미충족으로 대기
📋 미착수 = 아직 시작 안 함
```

---

## 2. 전체 Phase 요약

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CASA MVP 구현 로드맵                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 0          Phase 1           Phase 2           Phase 3              │
│  ┌─────────┐     ┌─────────┐       ┌─────────┐       ┌─────────┐          │
│  │ 환경    │────▶│ DB &    │──┬───▶│ 공통 UI │──┬───▶│ 프롬프트│          │
│  │ 설정    │     │ Auth    │  │    │ 컴포넌트│  │    │ 관리    │          │
│  └─────────┘     └─────────┘  │    └─────────┘  │    └─────────┘          │
│                               │                  │          │              │
│                               │                  │          │              │
│                               ▼                  ▼          ▼              │
│  Phase 4          Phase 5           Phase 6           Phase 7              │
│  ┌─────────┐     ┌─────────┐       ┌─────────┐       ┌─────────┐          │
│  │ F1      │────▶│ F2      │──────▶│ F3      │──────▶│ F4 & F5 │          │
│  │아이디어 │     │ 사업성  │       │ 문서    │       │ 대시보드│          │
│  │+ Gate 1 │     │+ Gate 2 │       │+ Gate 3 │       │+ Gate 4 │          │
│  └─────────┘     └─────────┘       └─────────┘       └─────────┘          │
│                                                             │              │
│                                                             ▼              │
│  Phase 8          Phase 9                                                  │
│  ┌─────────┐     ┌─────────┐                                              │
│  │ 통합    │────▶│ 배포 &  │                                              │
│  │ QA      │     │ 런칭    │                                              │
│  └─────────┘     └─────────┘                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | 이름 | 주요 내용 | 예상 기간 |
|-------|------|-----------|-----------|
| 0 | 환경 설정 | 프로젝트 초기화, 개발 환경 구성 | 0.5일 |
| 1 | DB & Auth | Supabase 스키마, RLS, 인증 | 1.5일 |
| 2 | 공통 UI | 레이아웃, 공통 컴포넌트, 다국어, 다크모드 | 2일 |
| 3 | 프롬프트 관리 | 프롬프트 엔진, 캐싱, 관리자 UI | 1.5일 |
| 4 | 아이디어 + Gate 1 | 아이디어 입력/확장, 사용자 승인 | 2일 |
| 5 | 평가 + Gate 2 | 다면 평가, 결과 시각화, 승인 | 2일 |
| 6 | 문서 + Gate 3 | 사업계획서/피치/랜딩페이지 생성 | 2.5일 |
| 7 | 대시보드 + Gate 4 | 대시보드, 멘토 피드백, 최종 승인 | 2일 |
| 8 | 통합 QA | E2E 테스트, 버그 수정, 성능 최적화 | 2일 |
| 9 | 배포 & 런칭 | Vercel 배포, 베타 테스트 준비 | 1일 |
| 10 | 모두의 창업 연계 | 시장 피칭 코치, GTM, 공개 프로필, 멘토 매칭 | 3일 |
| 11 | 창업자 트랙 (F10) | 사업계획서 기반 AI 분석 (검토→진단→전략→보고서) | 3일 |

---

## 3. Phase 0: 환경 설정

> **목표:** 개발 환경 구성 및 프로젝트 초기화
> **의존성:** 없음
> **산출물:** 빈 Next.js 프로젝트, 개발 환경 완료

### 태스크 목록

#### T0.1: 프로젝트 초기화
- [x] **T0.1.1** Next.js 15 프로젝트 생성 (App Router, TypeScript)
  - 명령어: `npx create-next-app@latest casa --typescript --tailwind --eslint --app --src-dir`
  - **완료 조건:** `npm run dev` 실행 시 localhost:3000 접속 가능

- [x] **T0.1.2** 필수 의존성 설치
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install @anthropic-ai/sdk
  npm install next-themes next-intl
  npm install zod react-hook-form @hookform/resolvers
  npm install @upstash/redis
  npm install lucide-react
  npm install -D @types/node
  ```
  - **완료 조건:** `npm install` 에러 없음, `package.json` 의존성 확인

- [x] **T0.1.3** shadcn/ui 초기화 및 기본 컴포넌트 설치
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card input textarea label select dialog alert toast tabs progress badge separator dropdown-menu avatar sheet
  ```
  - **완료 조건:** `components/ui/` 폴더에 컴포넌트 파일 생성됨

#### T0.2: 환경 변수 설정
- [x] **T0.2.1** `.env.local` 파일 생성 (PRD 섹션 10 참조)
  ```env
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ANTHROPIC_API_KEY=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  ```
  - **완료 조건:** `.env.example` 작성, `.gitignore`에 `.env.local` 포함 확인

- [x] **T0.2.2** Supabase 프로젝트 생성
  - Supabase Dashboard에서 새 프로젝트 생성
  - API Keys 복사하여 `.env.local`에 설정
  - **완료 조건:** Supabase 대시보드 접속 가능, API 키 설정 완료

- [x] **T0.2.3** Upstash Redis 설정
  - Upstash Console에서 Redis 데이터베이스 생성
  - REST API 키 복사하여 `.env.local`에 설정
  - **완료 조건:** Redis 연결 테스트 성공

#### T0.3: 폴더 구조 생성
- [x] **T0.3.1** PRD 섹션 5.3 기준 폴더 구조 생성
  ```
  src/
  ├── app/[locale]/
  ├── components/
  ├── features/
  ├── lib/
  ├── hooks/
  ├── i18n/
  ├── types/
  └── config/
  ```
  - **완료 조건:** 모든 폴더 생성됨, 각 폴더에 `.gitkeep` 또는 `index.ts`

#### T0.4: 기본 설정 파일
- [x] **T0.4.1** TypeScript 설정 강화 (`tsconfig.json`)
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true
    }
  }
  ```

- [x] **T0.4.2** ESLint 규칙 설정 (`.eslintrc.json`)

- [x] **T0.4.3** Prettier 설정 (`.prettierrc`)

- [x] **T0.4.4** `CLAUDE.md` 작성 (개발 컨벤션 문서)
  - **완료 조건:** 스택, 폴더 구조, 코딩 규칙 문서화

### Phase 0 완료 체크리스트
- [x] `npm run dev` 정상 실행
- [x] `npm run build` 에러 없음
- [x] 모든 환경 변수 설정 완료
- [x] 폴더 구조 PRD와 일치
- [ ] Git 초기 커밋 완료

---

## 4. Phase 1: 데이터베이스 & 인증

> **목표:** Supabase 스키마 생성, RLS 정책 적용, 인증 구현
> **의존성:** Phase 0 완료
> **산출물:** 모든 테이블 생성, 로그인/회원가입 기능

### 태스크 목록

#### T1.1: 데이터베이스 스키마 생성

- [x] **T1.1.1** bi_users 테이블 생성 (PRD 섹션 3.2)
  - Supabase SQL Editor에서 실행
  - Auth trigger 설정 (새 사용자 → bi_users 자동 생성)
  - **완료 조건:** 테이블 생성됨, 트리거 동작 확인

- [x] **T1.1.2** bi_projects 테이블 생성
  - 승인 게이트 필드 포함 (current_gate, gate_x_passed_at)
  - **완료 조건:** 테이블 생성됨, FK 관계 확인

- [x] **T1.1.3** bi_idea_cards 테이블 생성
  - JSONB 필드 (ai_expanded) 포함
  - **완료 조건:** 테이블 생성됨

- [x] **T1.1.4** bi_evaluations 테이블 생성
  - debate_log JSONB 필드 포함
  - **완료 조건:** 테이블 생성됨

- [x] **T1.1.5** bi_documents 테이블 생성
  - revision_requests JSONB 필드 포함
  - **완료 조건:** 테이블 생성됨

- [x] **T1.1.6** bi_feedbacks 테이블 생성
  - **완료 조건:** 테이블 생성됨

- [x] **T1.1.7** bi_approvals 테이블 생성
  - **완료 조건:** 테이블 생성됨

- [x] **T1.1.8** bi_prompts, bi_prompt_versions, bi_prompt_variables 테이블 생성
  - **완료 조건:** 3개 테이블 생성됨, FK 관계 확인

- [x] **T1.1.9** 모든 인덱스 생성 (PRD 기준)
  - **완료 조건:** 쿼리 성능 테스트

#### T1.2: RLS 정책 적용

- [x] **T1.2.1** bi_users RLS 정책
  - `Users manage own data` 정책
  - **완료 조건:** 다른 사용자 데이터 접근 불가 테스트

- [x] **T1.2.2** bi_projects RLS 정책
  - 소유자, 멘토 접근 정책
  - **완료 조건:** 소유권 검증 테스트

- [x] **T1.2.3** bi_idea_cards, bi_evaluations, bi_documents RLS 정책
  - 프로젝트 기반 접근 제어
  - **완료 조건:** 교차 프로젝트 접근 불가 테스트

- [x] **T1.2.4** bi_feedbacks RLS 정책
  - 멘토 피드백 작성, 사용자 읽기
  - **완료 조건:** 역할별 접근 테스트

- [x] **T1.2.5** bi_approvals RLS 정책
  - **완료 조건:** 승인 권한 테스트

- [x] **T1.2.6** bi_prompts 관련 RLS 정책
  - 관리자만 쓰기, 인증 사용자 읽기
  - **완료 조건:** 관리자 권한 테스트

#### T1.3: Supabase 클라이언트 설정

- [x] **T1.3.1** `lib/supabase/client.ts` - 브라우저 클라이언트
  ```typescript
  // createBrowserClient 사용
  ```
  - **완료 조건:** 클라이언트 측에서 Supabase 호출 성공

- [x] **T1.3.2** `lib/supabase/server.ts` - 서버 컴포넌트용
  ```typescript
  // createServerClient 사용
  ```
  - **완료 조건:** 서버 컴포넌트에서 데이터 조회 성공

- [x] **T1.3.3** `lib/supabase/service.ts` - Service Role 클라이언트
  ```typescript
  // SERVICE_ROLE_KEY 사용 (RLS 우회)
  ```
  - **완료 조건:** 관리 작업 테스트

- [x] **T1.3.4** `lib/supabase/middleware.ts` - 미들웨어용
  - **완료 조건:** 세션 갱신 동작 확인

#### T1.4: TypeScript 타입 생성

- [x] **T1.4.1** Supabase CLI로 타입 자동 생성
  ```bash
  npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
  ```
  - **완료 조건:** `types/database.ts` 파일 생성됨

- [x] **T1.4.2** 커스텀 타입 정의 (`types/api.ts`, `types/ai.ts`)
  - **완료 조건:** API 응답, AI 관련 타입 정의 완료

#### T1.5: 인증 구현

- [x] **T1.5.1** 인증 미들웨어 (`middleware.ts`)
  - 세션 갱신
  - 보호된 라우트 리다이렉트
  - **완료 조건:** 비인증 사용자 로그인 페이지 리다이렉트

- [x] **T1.5.2** 로그인 페이지 (`app/[locale]/(public)/login/page.tsx`)
  - 이메일/비밀번호 로그인
  - OAuth (Google, GitHub) - 선택
  - **완료 조건:** 로그인 성공 시 대시보드 이동

- [x] **T1.5.3** 회원가입 페이지 (`app/[locale]/(public)/signup/page.tsx`)
  - 이메일 인증 플로우
  - **완료 조건:** 회원가입 → 이메일 인증 → 로그인 성공

- [x] **T1.5.4** 로그아웃 기능
  - **완료 조건:** 로그아웃 후 세션 삭제, 로그인 페이지 이동

- [x] **T1.5.5** 인증 가드 유틸 (`lib/auth/guards.ts`)
  ```typescript
  export async function requireAuth(request: Request): Promise<User>
  export async function requireOwner(request: Request, resourceUserId: string): Promise<User>
  export async function requireRole(request: Request, roles: string[]): Promise<User>
  ```
  - **완료 조건:** API 라우트에서 가드 적용 테스트

- [x] **T1.5.6** Auth 트리거 함수 (bi_users 자동 생성)
  ```sql
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO bi_users (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
  - **완료 조건:** 회원가입 시 bi_users 레코드 자동 생성

### Phase 1 완료 체크리스트
- [x] 9개 테이블 모두 생성됨
- [x] 모든 RLS 정책 적용 및 테스트 완료
- [x] Supabase 클라이언트 3종 동작 확인
- [x] TypeScript 타입 자동 생성 완료
- [x] 로그인/회원가입/로그아웃 동작 확인
- [x] 인증 가드 테스트 완료

---

## 5. Phase 2: 공통 UI 컴포넌트

> **목표:** 재사용 가능한 UI 컴포넌트, 레이아웃, 다국어/다크모드 구현
> **의존성:** Phase 0 완료 (Phase 1과 병렬 가능)
> **산출물:** 공통 컴포넌트 라이브러리, 대시보드 레이아웃

### 태스크 목록

#### T2.1: 다국어 설정 (next-intl)

- [x] **T2.1.1** next-intl 설정 (`i18n/config.ts`)
  ```typescript
  export const locales = ['ko', 'en'] as const;
  export const defaultLocale = 'ko';
  ```
  - **완료 조건:** 설정 파일 생성

- [x] **T2.1.2** 메시지 파일 생성 (`i18n/messages/ko.json`, `en.json`)
  - 공통 메시지, 에러 메시지, UI 레이블
  - **완료 조건:** 기본 메시지 100개 이상

- [x] **T2.1.3** 미들웨어에 로케일 라우팅 추가
  - IP 기반 언어 감지 (PRD 섹션 7.1)
  - **완료 조건:** `/ko/dashboard`, `/en/dashboard` 라우팅 동작

- [x] **T2.1.4** 로케일 레이아웃 (`app/[locale]/layout.tsx`)
  - NextIntlClientProvider 설정
  - **완료 조건:** `useTranslations` 훅 동작

#### T2.2: 다크모드 설정 (next-themes)

- [x] **T2.2.1** ThemeProvider 설정 (`app/providers.tsx`)
  ```typescript
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  ```
  - **완료 조건:** 시스템 테마 감지 동작

- [x] **T2.2.2** 다크모드 색상 매핑 적용 (PRD 섹션 8.2)
  - `tailwind.config.ts` 설정
  - 모든 색상에 `dark:` 클래스 필수
  - **완료 조건:** 라이트/다크 전환 시 색상 변경 확인

#### T2.3: 공통 컴포넌트 구현

- [x] **T2.3.1** `ThemeToggle.tsx` (PRD 섹션 8.4)
  - 라이트/다크/시스템 전환
  - **완료 조건:** 토글 동작, 설정 저장

- [x] **T2.3.2** `LocaleSelector.tsx` (PRD 섹션 8.5)
  - 언어 선택 드롭다운
  - 사용자 설정 저장 (bi_users.locale)
  - **완료 조건:** 언어 전환 및 저장 동작

- [x] **T2.3.3** `ConfirmModal.tsx` (PRD 섹션 8.7)
  - `window.confirm` 대체
  - 다국어 지원
  - **완료 조건:** 삭제 확인 다이얼로그 동작

- [x] **T2.3.4** `LoadingSpinner.tsx`
  - 크기 옵션 (sm, md, lg)
  - **완료 조건:** 로딩 상태 표시

- [x] **T2.3.5** `EmptyState.tsx` (PRD 섹션 8.8)
  - 아이콘, 제목, 설명, 액션 버튼
  - **완료 조건:** 빈 목록 상태 표시

- [x] **T2.3.6** `ErrorMessage.tsx` (PRD 섹션 8.8)
  - 에러 메시지, 재시도 버튼
  - **완료 조건:** 에러 상태 표시, 재시도 동작

- [x] **T2.3.7** `Pagination.tsx`
  - 페이지 번호, 이전/다음
  - **완료 조건:** 페이지 이동 동작

- [x] **T2.3.8** `ProgressBar.tsx` (PRD 섹션 8.9)
  - 퍼센트 표시, 단계 표시
  - SSE 진행률 연동
  - **완료 조건:** 진행률 애니메이션 동작

- [x] **T2.3.9** `MobileDrawer.tsx`
  - 모바일 사이드바
  - Sheet 컴포넌트 기반
  - **완료 조건:** 768px 이하에서 햄버거 메뉴 동작

#### T2.4: 대시보드 레이아웃

- [x] **T2.4.1** `DashboardLayout.tsx` (PRD 섹션 8.6)
  - 데스크톱: 고정 사이드바 (256px)
  - 모바일: 상단 헤더 + 드로어
  - **완료 조건:** 반응형 레이아웃 동작

- [x] **T2.4.2** `Sidebar.tsx`
  - 네비게이션 메뉴
  - 현재 위치 하이라이트
  - **완료 조건:** 메뉴 클릭 시 페이지 이동

- [x] **T2.4.3** `Header.tsx`
  - 모바일 햄버거 메뉴
  - 사용자 드롭다운
  - ThemeToggle, LocaleSelector
  - **완료 조건:** 헤더 동작 확인

#### T2.5: API 유틸리티

- [x] **T2.5.1** `lib/utils/api-response.ts` (PRD 섹션 4.3)
  ```typescript
  export function successResponse(data, status = 200)
  export function errorResponse(error, status = 400)
  ```
  - **완료 조건:** API 응답 형식 통일

- [x] **T2.5.2** `lib/utils/sse.ts` (PRD 섹션 4.5)
  - SSE 스트림 생성 헬퍼
  - 클라이언트 SSE 훅
  - **완료 조건:** SSE 테스트 엔드포인트 동작

- [x] **T2.5.3** `hooks/useSSE.ts`
  ```typescript
  export function useSSE<T>(url: string, options?: SSEOptions)
  ```
  - **완료 조건:** SSE 데이터 수신 확인

### Phase 2 완료 체크리스트
- [x] 다국어 전환 동작 (ko ↔ en)
- [x] 다크모드 전환 동작
- [x] 모든 공통 컴포넌트 구현 및 Storybook/테스트
- [x] 대시보드 레이아웃 반응형 동작
- [x] SSE 유틸리티 동작 확인

---

## 6. Phase 3: 프롬프트 관리 시스템

> **목표:** DB 기반 프롬프트 관리, 캐싱, 관리자 UI
> **의존성:** Phase 1 (DB), Phase 2 (UI) 완료
> **산출물:** 프롬프트 CRUD, 버전 관리, 관리자 페이지

### 태스크 목록

#### T3.1: Redis 클라이언트 설정

- [x] **T3.1.1** `lib/redis.ts`
  ```typescript
  import { Redis } from '@upstash/redis'
  export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  ```
  - **완료 조건:** Redis 연결 테스트 성공

#### T3.2: 프롬프트 엔진 구현

- [x] **T3.2.1** `lib/prompts/prompt-engine.ts` (PRD 섹션 6.3)
  - `getPrompt(key)` - 캐시 우선 조회
  - `renderTemplate(template, variables)` - 변수 치환
  - `prepare(key, variables)` - 프롬프트 준비
  - `invalidateCache(key)` - 캐시 무효화
  - **완료 조건:** 프롬프트 조회 및 변수 치환 동작

- [x] **T3.2.2** `lib/prompts/version-manager.ts` (PRD 섹션 6.6)
  - `createPromptVersion()` - 버전 스냅샷 생성
  - `rollbackPrompt()` - 특정 버전으로 롤백
  - **완료 조건:** 버전 관리 동작 확인

#### T3.3: 시드 데이터 삽입

- [x] **T3.3.1** 기본 프롬프트 시드 데이터 (PRD 섹션 6.4)
  - idea_expansion
  - evaluation_investor
  - evaluation_market
  - evaluation_tech
  - business_plan
  - pitch_summary
  - **완료 조건:** 6개 프롬프트 DB에 삽입됨

#### T3.4: 관리자 API 구현

- [x] **T3.4.1** `GET /api/admin/prompts` - 프롬프트 목록
  - 카테고리 필터, 페이지네이션
  - **완료 조건:** 목록 조회 동작

- [x] **T3.4.2** `POST /api/admin/prompts` - 프롬프트 생성
  - **완료 조건:** 새 프롬프트 생성 동작

- [x] **T3.4.3** `GET/PATCH/DELETE /api/admin/prompts/{id}` - 상세/수정/삭제
  - 수정 시 버전 자동 생성
  - **완료 조건:** CRUD 동작

- [x] **T3.4.4** `GET /api/admin/prompts/{id}/versions` - 버전 이력
  - **완료 조건:** 버전 목록 조회

- [x] **T3.4.5** `POST /api/admin/prompts/{id}/rollback/{version}` - 롤백
  - **완료 조건:** 롤백 동작

- [x] **T3.4.6** `POST /api/admin/prompts/{id}/test` - 테스트 실행
  - 샘플 입력으로 프롬프트 테스트
  - **완료 조건:** AI 호출 테스트 동작

- [x] **T3.4.7** `POST /api/admin/prompts/sync-cache` - 캐시 동기화
  - 모든 프롬프트 캐시 무효화
  - **완료 조건:** 캐시 클리어 동작

#### T3.5: 관리자 UI 구현

- [x] **T3.5.1** 프롬프트 목록 페이지 (`app/[locale]/admin/prompts/page.tsx`)
  - 카테고리 필터, 검색
  - **완료 조건:** 목록 표시

- [x] **T3.5.2** 프롬프트 편집 페이지 (`app/[locale]/admin/prompts/[id]/page.tsx`)
  - 시스템 프롬프트, 사용자 템플릿 편집
  - AI 설정 (모델, temperature, max_tokens)
  - 변수 목록 표시
  - **완료 조건:** 편집 및 저장 동작

- [x] **T3.5.3** 버전 이력 모달
  - 버전 비교, 롤백
  - **완료 조건:** 버전 관리 UI 동작

- [x] **T3.5.4** 테스트 실행 패널
  - 샘플 변수 입력
  - AI 응답 미리보기
  - **완료 조건:** 테스트 실행 동작

### Phase 3 완료 체크리스트
- [x] Redis 연결 및 캐싱 동작
- [x] 프롬프트 엔진 조회/치환 동작
- [x] 시드 데이터 6개 삽입 완료
- [x] 관리자 API 7개 모두 동작
- [x] 관리자 UI CRUD 동작
- [x] 버전 관리 및 롤백 동작

---

## 7. Phase 4: 아이디어 입력 및 확장 (F1 + Gate 1)

> **목표:** 아이디어 입력, AI 확장, 사용자 확정 승인
> **의존성:** Phase 1, 2, 3 완료
> **산출물:** 아이디어 입력/확장 기능, Gate 1 승인 플로우

### 태스크 목록

#### T4.1: 프로젝트 CRUD

- [x] **T4.1.1** `GET /api/projects` - 프로젝트 목록
  - 페이지네이션, 상태 필터
  - **완료 조건:** 목록 조회 동작

- [x] **T4.1.2** `POST /api/projects` - 프로젝트 생성
  - Zod 검증
  - **완료 조건:** 프로젝트 생성 동작

- [x] **T4.1.3** `GET/PATCH/DELETE /api/projects/{id}` - 상세/수정/삭제
  - 소유권 검증 (requireOwner)
  - **완료 조건:** CRUD 동작

- [x] **T4.1.4** 프로젝트 목록 페이지 UI
  - 카드 형식, 진행률 표시
  - **완료 조건:** 목록 표시

- [x] **T4.1.5** 새 프로젝트 생성 모달
  - **완료 조건:** 프로젝트 생성 후 상세 페이지 이동

#### T4.2: 아이디어 입력

- [x] **T4.2.1** `POST /api/projects/{id}/idea` - 아이디어 저장
  - raw_input 저장
  - **완료 조건:** 아이디어 저장 동작

- [x] **T4.2.2** `PATCH /api/projects/{id}/idea` - 아이디어 수정
  - revision_count 증가
  - **완료 조건:** 수정 동작

- [x] **T4.2.3** 아이디어 입력 페이지 UI
  - 텍스트 영역 (500자 이상 권장 안내)
  - 글자 수 카운터
  - **완료 조건:** 입력 UI 동작

#### T4.3: AI 아이디어 확장

- [x] **T4.3.1** `POST /api/projects/{id}/idea/expand` - AI 확장 (SSE)
  - 프롬프트 엔진에서 'idea_expansion' 프롬프트 조회
  - Claude API 호출
  - SSE 스트리밍
  - 결과 bi_idea_cards에 저장
  - **완료 조건:** 스트리밍 동작, 결과 저장

- [x] **T4.3.2** `lib/ai/claude.ts` - Claude API 래퍼
  ```typescript
  export async function callClaude(systemPrompt, userPrompt, options)
  export async function streamClaude(systemPrompt, userPrompt, options)
  ```
  - **완료 조건:** API 호출 동작

- [x] **T4.3.3** AI 확장 결과 표시 UI
  - 구조화된 카드 (문제, 솔루션, 타겟, 차별점)
  - 실시간 스트리밍 표시
  - **완료 조건:** 스트리밍 UI 동작

#### T4.4: Gate 1 승인 플로우

- [x] **T4.4.1** `POST /api/projects/{id}/idea/confirm` - 아이디어 확정
  - is_confirmed = true
  - confirmed_at, confirmed_by 설정
  - current_gate = 'gate_2' 업데이트
  - gate_1_passed_at 설정
  - **완료 조건:** 확정 후 상태 변경 확인

- [x] **T4.4.2** Gate 1 승인 UI (PRD 섹션 2.2)
  - 수정 버튼 → 입력 페이지
  - 재생성 버튼 → AI 재확장
  - 확정 버튼 → Gate 1 통과
  - 멘토 피드백 요청 체크박스
  - **완료 조건:** 모든 버튼 동작

- [x] **T4.4.3** `POST /api/projects/{id}/idea/mentor-review` - 멘토 검토 요청
  - 알림 생성 (향후)
  - **완료 조건:** 멘토 검토 요청 저장

#### T4.5: 테스트

- [ ] **T4.5.1** 아이디어 입력 → 확장 → 확정 E2E 테스트
  - **완료 조건:** 전체 플로우 동작 확인

### Phase 4 완료 체크리스트
- [x] 프로젝트 CRUD 동작
- [x] 아이디어 입력 및 저장 동작
- [x] AI 확장 SSE 스트리밍 동작
- [x] Gate 1 승인 플로우 동작
- [x] 수정/재생성/확정 모든 액션 동작

---

## 8. Phase 5: 사업성 다면 평가 (F2 + Gate 2)

> **목표:** 3개 AI 페르소나 평가, 결과 시각화, 사용자 승인
> **의존성:** Phase 4 완료
> **산출물:** 다면 평가 기능, Gate 2 승인 플로우

### 태스크 목록

#### T5.1: 평가 API

- [x] **T5.1.1** `POST /api/projects/{id}/evaluate` - 평가 시작 (SSE)
  - Gate 1 통과 확인
  - 3개 페르소나 순차/병렬 호출
  - 종합 점수 계산
  - SSE로 진행률 전송
  - bi_evaluations에 저장
  - **완료 조건:** 평가 완료 및 저장

- [x] **T5.1.2** `GET /api/projects/{id}/evaluation` - 평가 결과 조회
  - **완료 조건:** 결과 조회 동작

- [x] **T5.1.3** `POST /api/projects/{id}/evaluation/retry` - 재평가
  - reevaluation_count 증가
  - **완료 조건:** 재평가 동작

- [x] **T5.1.4** `POST /api/projects/{id}/evaluation/dispute` - 이의 제기
  - dispute_comment 저장
  - **완료 조건:** 이의 제기 저장

#### T5.2: 평가 페르소나 프롬프트

- [x] **T5.2.1** 투자심사역 페르소나 호출
  - 'evaluation_investor' 프롬프트 사용
  - **완료 조건:** 투자 관점 평가 결과

- [x] **T5.2.2** 시장분석가 페르소나 호출
  - 'evaluation_market' 프롬프트 사용
  - **완료 조건:** 시장 관점 평가 결과

- [x] **T5.2.3** 기술전문가 페르소나 호출
  - 'evaluation_tech' 프롬프트 사용
  - **완료 조건:** 기술 관점 평가 결과

- [x] **T5.2.4** 종합 평가 생성
  - 3개 점수 가중 평균
  - 종합 recommendations 생성
  - **완료 조건:** 종합 점수 및 추천 생성

#### T5.3: 평가 결과 UI

- [x] **T5.3.1** 평가 진행 중 UI
  - 3개 페르소나 진행률 개별 표시
  - **완료 조건:** 진행률 표시 동작

- [x] **T5.3.2** 평가 결과 대시보드
  - 점수 게이지/차트
  - 페르소나별 상세 보기
  - **완료 조건:** 결과 시각화 동작

- [x] **T5.3.3** 개선 제안 섹션
  - recommendations 표시
  - **완료 조건:** 추천 내용 표시

#### T5.4: Gate 2 승인 플로우

- [x] **T5.4.1** `POST /api/projects/{id}/evaluation/confirm` - 평가 승인
  - is_confirmed = true
  - current_gate = 'gate_3' 업데이트
  - gate_2_passed_at 설정
  - **완료 조건:** 승인 후 상태 변경

- [x] **T5.4.2** Gate 2 승인 UI
  - 승인, 재평가, 아이디어 수정, 이의제기 버튼
  - 멘토 피드백 섹션
  - **완료 조건:** 모든 액션 동작

### Phase 5 완료 체크리스트
- [x] 3개 페르소나 평가 동작
- [x] SSE 진행률 표시 동작
- [x] 종합 점수 및 추천 생성
- [x] 결과 시각화 UI 동작
- [x] Gate 2 승인 플로우 동작

---

## 9. Phase 6: 문서 자동 생성 (F3 + Gate 3)

> **목표:** 사업계획서, 요약 피치, 랜딩페이지 생성
> **의존성:** Phase 5 완료
> **산출물:** 문서 생성 기능, Gate 3 승인 플로우

### 태스크 목록

#### T6.1: 문서 생성 API

- [x] **T6.1.1** `POST /api/projects/{id}/documents/business-plan` - 사업계획서 (SSE)
  - Gate 2 통과 확인
  - 'business_plan' 프롬프트 사용
  - Markdown 생성
  - bi_documents에 저장
  - **완료 조건:** 사업계획서 생성 완료

- [x] **T6.1.2** `POST /api/projects/{id}/documents/pitch` - 요약 피치
  - 'pitch_summary' 프롬프트 사용
  - **완료 조건:** 피치 생성 완료

- [x] **T6.1.3** `POST /api/projects/{id}/documents/landing` - 랜딩페이지
  - HTML + Tailwind CSS 생성
  - **완료 조건:** 랜딩페이지 HTML 생성

- [x] **T6.1.4** `GET /api/projects/{id}/documents` - 문서 목록
  - **완료 조건:** 목록 조회 동작

- [x] **T6.1.5** `GET /api/projects/{id}/documents/{docId}/preview` - 미리보기
  - Markdown → HTML 렌더링
  - 랜딩페이지 iframe 미리보기
  - **완료 조건:** 미리보기 동작

#### T6.2: 문서 수정 기능

- [x] **T6.2.1** `POST /api/projects/{id}/documents/{docId}/revise` - 섹션 수정 요청
  - revision_requests에 추가
  - AI가 해당 섹션만 재생성
  - **완료 조건:** 부분 수정 동작

- [x] **T6.2.2** `POST /api/projects/{id}/documents/{docId}/regenerate` - 전체 재생성
  - revision_count 증가
  - **완료 조건:** 전체 재생성 동작 (UI에서 재생성 버튼으로 구현)

#### T6.3: 문서 다운로드

- [x] **T6.3.1** `GET /api/projects/{id}/documents/{docId}/download` - 다운로드
  - Markdown → PDF 변환 (선택적)
  - Supabase Storage Signed URL
  - **완료 조건:** 파일 다운로드 동작 (클라이언트 측 Blob 다운로드)

- [x] **T6.3.2** PDF/Word 변환 연동 (클라이언트 사이드)
  - `marked` + `html2pdf.js`로 클라이언트 측 PDF 변환
  - Word 호환 HTML Blob으로 `.doc` 다운로드
  - 드롭다운 메뉴로 MD / PDF / Word 포맷 선택
  - **완료 조건:** PDF, Word 생성 및 다운로드 동작

#### T6.4: 문서 관리 UI

- [x] **T6.4.1** 문서 목록 페이지
  - 문서 유형별 아이콘
  - 상태 표시 (생성 중, 완료, 확정됨)
  - **완료 조건:** 목록 표시

- [x] **T6.4.2** 문서 미리보기 모달
  - Markdown 렌더링
  - 랜딩페이지 iframe
  - **완료 조건:** 미리보기 동작

- [x] **T6.4.3** 수정 요청 패널
  - 섹션 선택
  - 수정 지시 입력
  - **완료 조건:** 수정 요청 UI 동작

#### T6.5: Gate 3 승인 플로우

- [x] **T6.5.1** `POST /api/projects/{id}/documents/{docId}/confirm` - 문서 확정
  - is_confirmed = true
  - **완료 조건:** 문서별 확정 동작

- [x] **T6.5.2** 모든 문서 확정 시 Gate 3 통과
  - current_gate = 'gate_4'
  - gate_3_passed_at 설정
  - **완료 조건:** Gate 3 통과 동작

- [x] **T6.5.3** Gate 3 승인 UI
  - 문서별 미리보기/수정/확정
  - 전체 재생성 옵션
  - **완료 조건:** Gate 3 UI 동작

### Phase 6 완료 체크리스트
- [x] 사업계획서 생성 동작
- [x] 요약 피치 생성 동작
- [x] 랜딩페이지 생성 동작
- [x] 섹션별 수정 요청 동작
- [x] 다운로드 동작
- [x] Gate 3 승인 플로우 동작

---

## 10. Phase 7: 대시보드 & 최종 승인 (F4, F5 + Gate 4)

> **목표:** 대시보드, 멘토 피드백, 최종 배포 승인
> **의존성:** Phase 6 완료
> **산출물:** 대시보드 UI, 멘토 기능, Gate 4 승인

### 태스크 목록

#### T7.1: 대시보드 메인

- [x] **T7.1.1** 대시보드 메인 페이지 (`app/[locale]/dashboard/page.tsx`)
  - 프로젝트 카드 목록
  - 진행률 표시
  - 최근 활동
  - **완료 조건:** 대시보드 표시 (이전 Phase에서 구현됨)

- [x] **T7.1.2** 프로젝트 카드 컴포넌트
  - 단계 표시, 진행률 바
  - 승인 대기 뱃지
  - **완료 조건:** 카드 표시 (이전 Phase에서 구현됨)

#### T7.2: 멘토 피드백

- [x] **T7.2.1** `POST /api/projects/{id}/feedbacks` - 피드백 작성
  - 멘토/관리자 권한 확인
  - **완료 조건:** 피드백 저장

- [x] **T7.2.2** `GET /api/projects/{id}/feedbacks` - 피드백 목록
  - **완료 조건:** 피드백 조회

- [x] **T7.2.3** 피드백 표시 UI
  - 게이트별 피드백 그룹핑
  - **완료 조건:** 피드백 표시

- [x] **T7.2.4** 피드백 작성 UI (멘토용)
  - **완료 조건:** 피드백 작성 동작

#### T7.3: 최종 승인 (Gate 4)

- [x] **T7.3.1** `GET /api/projects/{id}/package` - 최종 산출물 조회
  - 아이디어, 평가, 문서 패키지
  - **완료 조건:** 패키지 조회 (DeployStage에서 표시)

- [x] **T7.3.2** `POST /api/projects/{id}/request-approval` - 멘토 승인 요청
  - bi_approvals에 gate_4 레코드 생성
  - **완료 조건:** 승인 요청 생성

- [x] **T7.3.3** `POST /api/projects/{id}/approve` - 최종 승인 (Gate 4)
  - current_gate = 'completed'
  - gate_4_passed_at 설정
  - status = 'completed'
  - **완료 조건:** 프로젝트 완료 상태

- [x] **T7.3.4** Gate 4 승인 UI
  - 최종 산출물 요약
  - 멘토 승인 필요 표시 (설정에 따라)
  - 배포 옵션
  - **완료 조건:** Gate 4 UI 동작

#### T7.4: 배포 기능

- [x] **T7.4.1** `POST /api/projects/{id}/share` - 공유 링크 생성
  - Signed URL 또는 고유 공개 링크
  - **완료 조건:** 공유 링크 생성 (클라이언트 측 구현)

- [x] **T7.4.2** `POST /api/projects/{id}/deploy-landing` - 랜딩페이지 배포
  - Supabase Storage 활용
  - **완료 조건:** 외부 접근 가능

- [x] **T7.4.3** 공유/배포 UI
  - 링크 복사
  - 배포 상태 표시
  - **완료 조건:** 배포 UI 동작

#### T7.5: 멘토 대시보드 (관리자용)

- [x] **T7.5.1** 승인 대기 목록 페이지
  - 담당 프로젝트 승인 대기 목록
  - **완료 조건:** 멘토 대기 목록 표시

- [x] **T7.5.2** 승인 처리 기능
  - 승인/반려/수정요청
  - **완료 조건:** 승인 처리 동작

### Phase 7 완료 체크리스트
- [x] 대시보드 메인 동작
- [x] 멘토 피드백 CRUD 동작
- [x] Gate 4 승인 플로우 동작
- [x] 공유 링크 생성 동작
- [x] 랜딩페이지 배포 동작

---

## 11. Phase 8: 통합 테스트 & QA

> **목표:** 전체 플로우 검증, 버그 수정, 성능 최적화
> **의존성:** Phase 7 완료
> **산출물:** 버그 없는 MVP

### 태스크 목록

#### T8.1: E2E 테스트

- [x] **T8.1.1** 사용자 시나리오 테스트
  - 회원가입 → 로그인 → 프로젝트 생성 → 아이디어 입력 → 확장 → 평가 → 문서 생성 → 완료
  - `e2e/user-flow.spec.ts` 작성 완료
  - **완료 조건:** 전체 플로우 통과

- [x] **T8.1.2** 멘토 시나리오 테스트
  - 멘토 로그인 → 피드백 작성 → 승인 처리
  - `e2e/mentor-flow.spec.ts` 작성 완료
  - **완료 조건:** 멘토 플로우 통과

- [x] **T8.1.3** 에러 핸들링 테스트
  - 네트워크 에러
  - AI API 에러
  - 권한 에러
  - `e2e/error-handling.spec.ts` 작성 완료
  - **완료 조건:** 모든 에러 상황 핸들링

#### T8.2: 크로스 브라우저/기기 테스트

- [x] **T8.2.1** 브라우저 테스트
  - Chrome, Firefox, Safari, Edge
  - Playwright 설정: chromium, firefox, webkit 프로젝트 구성 (`playwright.config.ts`)
  - **완료 조건:** 주요 브라우저 동작 확인

- [x] **T8.2.2** 반응형 테스트
  - 데스크톱 (1920px, 1440px, 1024px)
  - 태블릿 (768px)
  - 모바일 (375px)
  - Playwright Mobile Chrome 프로젝트 구성
  - **완료 조건:** 모든 해상도 UI 정상

- [x] **T8.2.3** 다크모드 전체 테스트
  - 모든 페이지 다크모드 확인
  - `e2e/dark-mode.spec.ts` 작성 완료
  - **완료 조건:** 색상 문제 없음

- [x] **T8.2.4** 다국어 전체 테스트
  - 모든 페이지 한국어/영어 확인
  - `e2e/i18n.spec.ts` 작성 완료
  - 12개 파일 하드코딩 문자열 → i18n 키 전환 완료
  - **완료 조건:** 번역 누락 없음

#### T8.3: 성능 최적화

- [ ] **T8.3.1** Lighthouse 점수 확인
  - Performance: 80+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+
  - **완료 조건:** 목표 점수 달성

- [ ] **T8.3.2** 번들 크기 최적화
  - dynamic import
  - tree shaking
  - **완료 조건:** 초기 로딩 3초 이내

- [ ] **T8.3.3** API 응답 시간 확인
  - 일반 API: 500ms 이내
  - AI API: 진행률 표시로 대응
  - **완료 조건:** 응답 시간 기준 충족

#### T8.4: 보안 점검

- [ ] **T8.4.1** RLS 정책 재검증
  - 교차 사용자 데이터 접근 불가 확인
  - **완료 조건:** 보안 테스트 통과

- [ ] **T8.4.2** 환경 변수 노출 확인
  - NEXT_PUBLIC_에 비밀키 없는지 확인
  - **완료 조건:** 비밀키 노출 없음

- [ ] **T8.4.3** 입력 검증 확인
  - XSS, 인젝션 방지
  - **완료 조건:** 보안 취약점 없음

#### T8.5: 버그 수정

- [x] **T8.5.1** 발견된 버그 목록화 및 우선순위 지정
  - 로케일 regex 불일치 (Critical), admin 역할 검증 TODO (Critical), i18n 하드코딩 ~30% (Major)
- [x] **T8.5.2** Critical 버그 수정
  - `src/middleware.ts`: 로케일 regex `/(ko|en|ja|zh)/` → `/(ko|en)/` 수정
  - `src/middleware.ts`: admin 역할 검증 TODO → bi_users 테이블 role 조회 로직 구현
  - `src/middleware.ts`: i18n 응답 덮어쓰기 버그 수정 (리다이렉트 루프 해결)
  - `supabase/triggers.sql`: handle_new_user locale 캐스팅 안전하게 수정
  - `EmptyState` 서버 컴포넌트 직렬화 에러 수정 (icon을 ReactNode로, onClick→href)
- [x] **T8.5.3** Major 버그 수정
  - 12개 파일 하드코딩 한국어/영어 문자열 → i18n 키 전환 (150+ 키 추가)
  - 로그인 페이지 에러 메시지: 실제 Supabase 에러 표시하도록 개선
- [x] **T8.5.4** Minor 버그는 백로그로 이동
  - `dashboard-layout.tsx` ESLint 경고 2건 (pre-existing, 기능 영향 없음)
  - `/forgot-password`를 publicPaths에 추가

### Phase 8 완료 체크리스트
- [x] E2E 테스트 전체 통과
- [x] 크로스 브라우저 테스트 통과
- [x] 반응형 UI 검증 완료
- [ ] Lighthouse 점수 목표 달성
- [ ] 보안 점검 통과
- [x] Critical/Major 버그 0개

---

## 12. Phase 9: 배포 & 런칭

> **목표:** Vercel 프로덕션 배포, 베타 테스트 준비
> **의존성:** Phase 8 완료
> **산출물:** 프로덕션 환경 운영

### 태스크 목록

#### T9.1: Vercel 배포 설정

- [x] **T9.1.1** Vercel 프로젝트 연결
  - GitHub 리포지토리 연결, 자동 배포 파이프라인 동작 확인 (casa-sable.vercel.app)
  - **완료 조건:** 자동 배포 파이프라인 동작

- [x] **T9.1.2** 환경 변수 설정 (Production)
  - Supabase Production 키, AI API 키 등 Vercel에 설정 완료
  - **완료 조건:** 프로덕션 환경 변수 설정 완료

- [ ] **T9.1.3** 도메인 설정
  - 커스텀 도메인 연결 (casa.cbnu.ac.kr 또는 유사)
  - SSL 인증서 확인
  - **완료 조건:** HTTPS 도메인 접속 가능

- [x] **T9.1.4** Vercel 설정 최적화
  - `vercel.json` 생성: AI SSE 엔드포인트 maxDuration 60~120초, API Cache-Control: no-store
  - **완료 조건:** Vercel 설정 완료

#### T9.2: 프로덕션 데이터 준비

- [ ] **T9.2.1** Supabase Production 스키마 적용
  - 모든 테이블, RLS, 인덱스
  - **완료 조건:** 스키마 적용 완료

- [ ] **T9.2.2** 프롬프트 시드 데이터 삽입
  - 6개 기본 프롬프트
  - **완료 조건:** 시드 데이터 삽입 완료

- [ ] **T9.2.3** 관리자 계정 생성
  - admin 역할 사용자
  - **완료 조건:** 관리자 로그인 가능

#### T9.3: 모니터링 설정

- [x] **T9.3.1** 에러 모니터링 (Sentry 또는 유사)
  - `@sentry/nextjs` 설치 및 설정 완료
  - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` 생성
  - `src/app/global-error.tsx`, `src/instrumentation.ts` 생성
  - `next.config.ts`에 withSentryConfig 래핑
  - **완료 조건:** 에러 알림 동작

- [ ] **T9.3.2** 분석 설정 (Google Analytics 또는 유사)
  - 페이지 뷰, 이벤트 추적
  - **완료 조건:** 분석 데이터 수집

- [ ] **T9.3.3** Uptime 모니터링
  - **완료 조건:** 다운타임 알림 설정

#### T9.4: 베타 테스트 준비

- [ ] **T9.4.1** 베타 테스터 선정 (10개 팀)
  - 창업보육센터 입주기업 대상
  - **완료 조건:** 테스터 리스트 확보

- [ ] **T9.4.2** 베타 테스터 가이드 문서 작성
  - 사용 방법, 피드백 제출 방법
  - **완료 조건:** 가이드 문서 완료

- [ ] **T9.4.3** 피드백 수집 채널 설정
  - Google Form 또는 인앱 피드백
  - **완료 조건:** 피드백 채널 준비

#### T9.5: 런칭

- [ ] **T9.5.1** 프로덕션 최종 검증
  - **완료 조건:** 프로덕션 환경 정상 동작

- [ ] **T9.5.2** 베타 테스터 초대
  - **완료 조건:** 초대 완료

- [ ] **T9.5.3** 베타 테스트 시작
  - **완료 조건:** 첫 베타 사용자 가입/사용

### Phase 9 완료 체크리스트
- [x] Vercel 프로덕션 배포 완료
- [ ] 커스텀 도메인 연결 완료
- [ ] 모니터링 설정 완료
- [ ] 베타 테스터 10팀 확보
- [ ] 베타 테스트 시작

---

## 12.5 Phase 10: 모두의 창업 연계 개선

> **목표:** 중기부 '모두의 창업' 정책 방향에 맞춰 시장 중심 스토리텔링, GTM 지원, 투명성, 생태계 매칭 기능 추가
> **의존성:** Phase 6, 7 완료 (기존 문서 생성 + 대시보드 기능 필요)
> **산출물:** 시장 중심 피칭 코치, GTM 체크리스트, 공개 프로필, 멘토 매칭

### 태스크 목록

#### T10.1: 시장 중심 피칭 코치 (F6)

- [ ] **T10.1.1** evaluation_market 프롬프트 강화
  - 시장 스토리텔링 평가 항목 추가 (30초 설명, 고객 페르소나 구체성, Pain→해결 흐름)
  - bi_prompts 테이블의 evaluation_market 프롬프트 업데이트
  - **완료 조건:** 평가 결과에 시장 스토리 관련 피드백 포함

- [ ] **T10.1.2** pitch_summary 프롬프트를 고객 중심 구조로 전환
  - 구조: 고객 페르소나 → Pain Point → 해결 경험 → 시장 검증 → 기술(부록)
  - bi_prompts 테이블의 pitch_summary 프롬프트 업데이트
  - **완료 조건:** 피치 문서가 고객 중심 구조로 생성됨

- [ ] **T10.1.3** 평가 결과에 "30초 엘리베이터 피치" 카드 추가
  - bi_evaluations의 recommendations JSONB에 elevator_pitch 필드 추가
  - 평가 API에서 엘리베이터 피치 자동 생성
  - 평가 결과 UI에 엘리베이터 피치 카드 표시
  - **완료 조건:** 평가 완료 시 30초 피치가 생성되고 UI에 표시됨

#### T10.2: GTM 체크리스트 (F7)

- [ ] **T10.2.1** GTM 체크리스트 프롬프트 작성
  - bi_prompts에 'gtm_checklist' 키로 새 프롬프트 삽입
  - 타겟 고객 확보, 가격 전략, 판매 채널, KPI, 30/60/90일 플랜 포함
  - **완료 조건:** 프롬프트 DB에 삽입 및 테스트 완료

- [ ] **T10.2.2** GTM 체크리스트 생성 API
  - `POST /api/projects/{id}/documents/gtm-checklist` (SSE)
  - Gate 2 통과 확인
  - bi_documents에 type='gtm_checklist'로 저장
  - **완료 조건:** API 호출 시 GTM 체크리스트 생성 및 저장

- [ ] **T10.2.3** 문서 관리 UI에 GTM 체크리스트 추가
  - DocumentStage에 GTM 체크리스트 생성 버튼 추가
  - 미리보기/수정요청/다운로드 지원
  - **완료 조건:** UI에서 GTM 체크리스트 생성 및 관리 가능

#### T10.3: 공개 프로젝트 프로필 (F8)

- [ ] **T10.3.1** bi_projects에 visibility 컬럼 추가
  - `ALTER TABLE bi_projects ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'summary', 'private'));`
  - RLS 정책: visibility가 'public' 또는 'summary'인 프로젝트는 비인증 조회 허용
  - **완료 조건:** 마이그레이션 적용, RLS 테스트

- [ ] **T10.3.2** 공개 프로필 API
  - `PATCH /api/projects/{id}/visibility` — 공개 범위 설정 (소유자만)
  - `GET /api/projects/{id}/public-profile` — 비인증 조회
  - `GET /api/showcase` — 공개 프로젝트 목록 (비인증)
  - **완료 조건:** 3개 API 동작

- [ ] **T10.3.3** 공개 프로필 페이지 UI
  - `app/[locale]/showcase/page.tsx` — 공개 프로젝트 갤러리
  - `app/[locale]/showcase/[id]/page.tsx` — 개별 프로젝트 공개 프로필
  - 아이디어 요약, 평가 점수, 멘토 피드백 요약, 엘리베이터 피치 표시
  - **완료 조건:** 비인증 사용자도 공개 프로필 조회 가능

- [ ] **T10.3.4** 프로젝트 설정에서 공개 범위 토글
  - DeployStage 또는 프로젝트 설정에 visibility 선택 UI 추가
  - **완료 조건:** 사용자가 공개/요약/비공개 전환 가능

#### T10.4: 멘토·전문가 매칭 기초 (F9)

- [ ] **T10.4.1** bi_users에 멘토 프로필 컬럼 추가
  - `ALTER TABLE bi_users ADD COLUMN expertise_tags JSONB DEFAULT '[]'::jsonb;`
  - `ALTER TABLE bi_users ADD COLUMN industry_tags JSONB DEFAULT '[]'::jsonb;`
  - `ALTER TABLE bi_users ADD COLUMN bio TEXT;`
  - **완료 조건:** 마이그레이션 적용

- [ ] **T10.4.2** 멘토 프로필 API
  - `PATCH /api/users/profile` — 태그/bio 수정
  - `GET /api/mentors` — 멘토 디렉토리 (태그 필터)
  - **완료 조건:** API 동작

- [ ] **T10.4.3** 프로젝트 기반 멘토 추천 API
  - `GET /api/projects/{id}/recommended-mentors` — 산업 태그 기반 매칭
  - `POST /api/projects/{id}/mentor-request` — 멘토링 요청
  - **완료 조건:** 태그 기반 매칭 및 요청 동작

- [ ] **T10.4.4** 멘토 디렉토리 UI
  - `app/[locale]/dashboard/mentors/page.tsx` — 멘토 목록/검색
  - 멘토 프로필 카드 (전문분야, 산업, bio)
  - **완료 조건:** 멘토 디렉토리 페이지 동작

- [ ] **T10.4.5** 멘토 프로필 편집 UI
  - 태그 선택(multi-select), bio 입력
  - **완료 조건:** 멘토가 자신의 프로필 수정 가능

### Phase 10 완료 체크리스트
- [ ] 평가 결과에 시장 스토리텔링 피드백 및 엘리베이터 피치 포함
- [ ] 피치 문서가 고객 중심 구조로 생성
- [ ] GTM 체크리스트 생성/조회/다운로드 동작
- [ ] 공개 프로필 페이지 비인증 접근 가능
- [ ] 공개/비공개 토글 동작
- [ ] 멘토 디렉토리 조회 및 태그 기반 추천 동작
- [ ] 멘토링 요청 플로우 동작

---

## 12.6 Phase 11: 창업자 트랙 (F10)

> **목표:** 이미 사업을 운영 중인 창업자를 위한 사업계획서 기반 AI 분석 파이프라인 구현
> **의존성:** Phase 1 (DB), Phase 2 (공통 UI), Phase 3 (프롬프트 관리)
> **산출물:** 검토→진단→전략→보고서 4단계 워크플로우, bi_business_reviews 테이블

### 태스크 목록

#### T11.1: 데이터 모델 확장

- [x] **T11.1.1** bi_projects 테이블에 `project_type` 컬럼 추가
  - `pre_startup` (기본) / `startup` 구분
  - **완료 조건:** 프로젝트 생성 시 트랙 선택 가능

- [x] **T11.1.2** `bi_business_reviews` 테이블 생성
  - 4단계 데이터 저장 (사업계획서, AI 검토, 진단, 전략, 보고서)
  - 단계별 확정 상태 추적 (is_review_confirmed, is_diagnosis_confirmed, is_strategy_confirmed)
  - **완료 조건:** 테이블 생성됨, RLS 적용

#### T11.2: 검토 단계 (Review)

- [x] **T11.2.1** `POST /api/projects/{id}/review` - 사업계획서 저장/수정
  - Zod 스키마 검증 (nullable 필드 지원)
  - 기업 정보 필드 (company_name, industry, founded_year, employee_count 등)
  - **완료 조건:** 사업계획서 저장 동작

- [x] **T11.2.2** `POST /api/projects/{id}/review/analyze` - AI 검토 실행 (SSE)
  - 사업계획서 텍스트 기반 AI 분석
  - SSE 스트리밍으로 실시간 결과 표시
  - **완료 조건:** AI 검토 결과 생성

- [x] **T11.2.3** `POST /api/projects/{id}/review/confirm` - 검토 확정
  - is_review_confirmed = true 설정
  - **완료 조건:** 검토 확정 동작

- [x] **T11.2.4** `POST /api/projects/{id}/review/cancel-confirm` - 검토 확정 취소
  - 확정 상태 되돌리기
  - **완료 조건:** 확정 취소 동작

- [x] **T11.2.5** PDF 업로드 기능
  - 클라이언트 측 `pdfjs-dist`로 PDF 텍스트 추출
  - `src/lib/utils/pdf-extract.ts` 유틸리티
  - 최대 10MB, PDF 타입 검증
  - **완료 조건:** PDF 업로드 후 텍스트 추출 및 입력 필드 자동 채움

- [x] **T11.2.6** ReviewStage UI 컴포넌트
  - 사업계획서 텍스트 입력 + PDF 업로드 버튼
  - 기업 정보 폼
  - AI 검토 결과 표시 (마크다운 렌더링)
  - **완료 조건:** 검토 단계 UI 동작

#### T11.3: 진단 단계 (Diagnosis)

- [x] **T11.3.1** `POST /api/projects/{id}/diagnosis/analyze` - AI 진단 실행 (SSE)
  - 검토 결과 기반 비즈니스 진단
  - SWOT 분석, 재무 건전성, 시장 포지셔닝
  - **완료 조건:** AI 진단 결과 생성

- [x] **T11.3.2** `POST /api/projects/{id}/diagnosis/confirm` - 진단 확정

- [x] **T11.3.3** `POST /api/projects/{id}/diagnosis/cancel-confirm` - 진단 확정 취소

- [x] **T11.3.4** DiagnosisStage UI 컴포넌트
  - 진단 결과 시각화 (마크다운 렌더링)
  - **완료 조건:** 진단 단계 UI 동작

#### T11.4: 전략 단계 (Strategy)

- [x] **T11.4.1** `POST /api/projects/{id}/strategy/generate` - AI 전략 생성 (SSE)
  - 검토 + 진단 결과 기반 전략 제안
  - 성장 전략, 자원 배분, 재무 전망, 실행 계획
  - **완료 조건:** AI 전략 결과 생성

- [x] **T11.4.2** `POST /api/projects/{id}/strategy/confirm` - 전략 확정

- [x] **T11.4.3** `POST /api/projects/{id}/strategy/cancel-confirm` - 전략 확정 취소

- [x] **T11.4.4** StrategyStage UI 컴포넌트
  - 전략 결과 표시 (마크다운 렌더링)
  - **완료 조건:** 전략 단계 UI 동작

#### T11.5: 보고서 단계 (Report)

- [x] **T11.5.1** `POST /api/projects/{id}/report/generate` - 보고서 생성 (SSE)
  - 검토 + 진단 + 전략 종합 보고서
  - 경영 요약(executive summary) 포함
  - **완료 조건:** 보고서 생성 동작

- [x] **T11.5.2** ReportStage UI 컴포넌트
  - 보고서 마크다운 렌더링
  - SSE 스트리밍 중 실시간 렌더링
  - **완료 조건:** 보고서 표시 동작

- [x] **T11.5.3** 보고서 내보내기 (인쇄/Word)
  - DropdownMenu로 내보내기 옵션 표시
  - 인쇄하기: 새 창에서 마크다운→HTML 변환 후 브라우저 인쇄
  - Word 문서 (.doc): `exportToDocx` 유틸리티 활용
  - **완료 조건:** 인쇄 및 Word 다운로드 동작

#### T11.6: 공통 개선

- [x] **T11.6.1** MarkdownContent 공통 컴포넌트
  - `src/components/common/markdown-content.tsx`
  - `marked` 라이브러리 + `markdown-preview` CSS
  - 모든 단계 (Review, Diagnosis, Strategy, Report)에 적용
  - **완료 조건:** AI 생성 콘텐츠가 서식이 적용된 형태로 표시

- [x] **T11.6.2** 다국어 메시지 추가
  - ko.json / en.json에 검토/진단/전략/보고서/PDF 업로드 관련 키 추가
  - **완료 조건:** 한국어/영어 전환 시 정상 표시

- [x] **T11.6.3** Zod 스키마 nullable 수정
  - 선택 필드에 `.nullable()` 추가 (null 값 허용)
  - **완료 조건:** 빈 선택 필드로 저장 시 오류 없음

### Phase 11 완료 체크리스트
- [x] 프로젝트 생성 시 예비창업자/창업자 트랙 선택 가능
- [x] 사업계획서 텍스트 입력 및 PDF 업로드 동작
- [x] AI 검토 → 진단 → 전략 → 보고서 4단계 파이프라인 동작
- [x] 각 단계 확정/확정 취소 동작
- [x] 보고서 인쇄 및 Word 다운로드 동작
- [x] 모든 AI 콘텐츠 마크다운 렌더링 적용

---

## 13. 의존성 다이어그램

```
T0 (환경 설정)
    │
    ├──────────────────────────┐
    ▼                          ▼
T1 (DB & Auth)            T2 (공통 UI)
    │                          │
    └──────────┬───────────────┘
               ▼
           T3 (프롬프트 관리)
               │
               ▼
           T4 (아이디어 + Gate 1)
               │
               ▼
           T5 (평가 + Gate 2)
               │
               ▼
           T6 (문서 + Gate 3)
               │
               ▼
           T7 (대시보드 + Gate 4)
               │
               ▼
           T8 (통합 QA)
               │
               ▼
           T9 (배포 & 런칭)
               │
               ▼
          T10 (모두의 창업 연계)

T1 (DB) + T2 (공통 UI) + T3 (프롬프트)
               │
               ▼
          T11 (창업자 트랙 - F10)
```

---

## 14. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| Claude API 응답 지연 | 사용자 경험 저하 | SSE 진행률 표시, 타임아웃 설정 |
| Claude API 비용 | 운영 비용 증가 | 캐싱, 요약 전략, 사용량 모니터링 |
| 프롬프트 품질 | 생성 결과물 품질 저하 | 프롬프트 버전 관리, A/B 테스트 |
| RLS 정책 오류 | 데이터 유출 | 철저한 보안 테스트, 코드 리뷰 |
| SSE 브라우저 호환성 | 일부 사용자 기능 불가 | 폴백 (폴링) 구현 |

---

## 15. 진행 상황 추적

### 전체 진행률

| Phase | 상태 | 완료 태스크 | 전체 태스크 | 진행률 |
|-------|------|-------------|-------------|--------|
| Phase 0 | ✅ | 11 | 12 | 92% |
| Phase 1 | ✅ | 23 | 23 | 100% |
| Phase 2 | ✅ | 20 | 20 | 100% |
| Phase 3 | ✅ | 15 | 15 | 100% |
| Phase 4 | 🔄 | 13 | 14 | 93% |
| Phase 5 | ✅ | 12 | 12 | 100% |
| Phase 6 | ✅ | 15 | 15 | 100% |
| Phase 7 | ✅ | 13 | 13 | 100% |
| Phase 8 | 🔄 | 11 | 16 | 69% |
| Phase 9 | 🔄 | 4 | 14 | 29% |
| Phase 10 | 📋 | 0 | 15 | 0% |
| Phase 11 | ✅ | 22 | 22 | 100% |
| **전체** | **🔄** | **159** | **191** | **83%** |

---

*문서 작성: Claude Opus 4.5*
*최종 수정: 2026-02-25*
*기준 문서: PRD.md v1.6*
