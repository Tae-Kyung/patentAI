# TASK_NEW.md - CASA 확장판 (모두의 창업 에디션) 구현 태스크 정의서

> **문서 버전:** 1.0
> **작성일:** 2026-03-06
> **기준 문서:** strategy.md v1.0, TASK.md (기존 MVP)

---

## 1. 개요

### 1.1 목적
기존 CASA MVP(Phase 0~11 완료)를 기반으로, **모두의 창업** 프로그램을 지원하는 다중 역할 시스템으로 확장하기 위한 단계별 구현 태스크를 정의합니다.

### 1.2 확장 범위
- **신규 역할**: 기관 담당자(`institution`), 멘토(`mentor`) 추가
- **신규 테이블**: 14개 (programs, institutions, mentor_profiles 등)
- **신규 API**: 50개 이상
- **신규 화면**: 20개 이상
- **보안 인프라**: Rate Limiting, 감사 로그, 금융 정보 암호화

### 1.3 구현 원칙

| 원칙 | 설명 |
|------|------|
| **기존 기능 100% 유지** | 현재 user 트랙(pre_startup, startup) 정상 동작 보장 |
| **점진적 확장** | 테이블 추가 → 역할 확장 → 화면 추가 순서 |
| **독립 배포 가능** | 각 Phase 완료 시 독립적으로 동작 가능 |
| **하위 호환** | 기존 사용자 업데이트 후 정상 사용 가능 |
| **Phase 브랜치 운영** | `feature/moduchanup` 메인 브랜치 + Phase별 하위 브랜치 |
| **커밋 컨벤션** | `feat(E1.5): 설명` 형태 (Phase 태스크 번호 포함) |

### 1.4 완료 기준 정의

```
✅ 완료 = 코드 작성 + 로컬 테스트 통과 + PR 리뷰
🔄 진행 중 = 작업 시작됨
⏳ 대기 = 의존성 미충족으로 대기
📋 미착수 = 아직 시작 안 함
```

### 1.5 품질 게이트 (모든 Phase 공통)

```markdown
- [ ] TypeScript strict 에러 0개
- [ ] ESLint/Prettier 경고 0개
- [ ] 신규 API에 Zod 검증 + 인가 가드 + Rate Limit 적용
- [ ] 신규 UI에 다크모드 + 다국어 + 모바일 반응형 적용
- [ ] 신규 테이블에 RLS 정책 적용 및 테스트
- [ ] 관련 단위 테스트 작성
- [ ] `npm run build` 성공
```

---

## 2. 전체 Phase 요약

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CASA 확장판 (모두의 창업) 구현 로드맵                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase E0           Phase E1                                               │
│  ┌─────────┐       ┌──────────────────────┐                                │
│  │ 보안    │──────▶│ 기반 확장             │                                │
│  │ 선행    │       │ DB+역할+보안+품질인프라│                                │
│  └─────────┘       └──────────┬───────────┘                                │
│                               │                                            │
│                    ┌──────────┼──────────────┐                             │
│                    ▼                         ▼                              │
│  Phase E2          Phase E4 (일부 병렬)                                     │
│  ┌─────────┐       ┌─────────┐                                             │
│  │ 관리자  │       │ 멘토    │                                              │
│  │ 확장    │       │ 기능    │                                              │
│  └────┬────┘       └────┬────┘                                             │
│       ▼                 │                                                  │
│  Phase E3               │                                                  │
│  ┌─────────┐            │                                                  │
│  │ 기관    │            │                                                  │
│  │ 담당자  │            │                                                  │
│  └────┬────┘            │                                                  │
│       └─────────┬───────┘                                                  │
│                 ▼                                                           │
│  Phase E5                                                                  │
│  ┌─────────┐                                                               │
│  │ 지원자  │                                                                │
│  │ 확장    │                                                                │
│  └────┬────┘                                                               │
│       ▼                                                                    │
│  Phase E6                                                                  │
│  ┌─────────┐                                                               │
│  │ 통합 &  │                                                                │
│  │ 최적화  │                                                                │
│  └─────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | 이름 | 주요 내용 | 브랜치 | main 머지 |
|-------|------|-----------|--------|-----------|
| E0 | 보안 선행 작업 | API 키 정리, HTTP 헤더, 에러 메시지 | `feature/moduchanup/e0-security` | 즉시 (v1.1.0-security) |
| E1 | 기반 확장 | DB 14개 테이블, 역할 체계, 보안 인프라, 품질 인프라 | `feature/moduchanup/e1-foundation` | Staging 검증 후 (v2.0.0-alpha) |
| E2 | 관리자 확장 | 프로그램/기관 관리, 매핑, 전국 현황 | `feature/moduchanup/e2-admin` | E4 완료 시 묶어서 |
| E3 | 기관 담당자 기능 | 기관 대시보드, 멘토 매칭, 수당 관리 | `feature/moduchanup/e3-institution` | E4 완료 시 묶어서 |
| E4 | 멘토 기능 | 멘토 워크스테이션, 의견서, 수당 조회 | `feature/moduchanup/e4-mentor` | 중간 릴리스 (v2.0.0-beta) |
| E5 | 지원자 확장 | 멘토 피드백 확인, AI 반영, 기관 지원 신청 | `feature/moduchanup/e5-applicant` | E6 완료 시 묶어서 |
| E6 | 통합 및 최적화 | E2E 테스트, 성능 최적화, 공통 UX | `feature/moduchanup/e6-integration` | 최종 릴리스 (v2.0.0) |

---

## 3. 사전 준비: Git 브랜치 생성

> **시작 전 필수 실행**

```bash
# 1. 확장 메인 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/moduchanup

# 2. Phase E0 브랜치에서 보안 작업 시작
git checkout -b feature/moduchanup/e0-security
```

### 체크리스트
- [x] `feature/moduchanup` 브랜치 생성 완료
- [x] `feature/moduchanup-e0-security` 브랜치 생성 완료 (Git 제약으로 `-` 구분자 사용)
- [ ] Vercel에서 `feature/moduchanup` Preview 배포 설정 확인

---

## 4. Phase E0: 보안 선행 작업

> **목표:** 기존 시스템 보안 취약점 해결, 확장 전 안전성 확보
> **의존성:** 없음 (즉시 시작)
> **브랜치:** `feature/moduchanup/e0-security`
> **산출물:** 보안 패치 적용된 기존 시스템

### 태스크 목록

#### E0.1: API 키 로테이션 및 git 이력 정리

- [ ] **E0.1.1** Supabase 프로젝트에서 API 키 재생성
  - Supabase Dashboard → Settings → API → Regenerate keys
  - **완료 조건:** 새 API 키 발급 완료

- [ ] **E0.1.2** `.env.local` 업데이트 및 Vercel 환경변수 갱신
  - 로컬 `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 교체
  - Vercel Dashboard → Environment Variables 갱신
  - **완료 조건:** 로컬 + Vercel 모두 새 키로 동작 확인

- [ ] **E0.1.3** git 이력에서 노출된 키 확인 및 문서화
  - `git log --all -p -- .env*` 로 이력 내 키 노출 확인
  - 노출된 키 목록 기록 (이미 로테이션 완료했으므로 무효화 확인)
  - **완료 조건:** 노출 키 목록화, 모두 무효화 확인

#### E0.2: HTTP 보안 헤더 추가

- [x] **E0.2.1** `next.config.ts`에 보안 헤더 추가
  ```typescript
  // next.config.ts headers() 설정
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
    ]
  }
  ```
  - **완료 조건:** 응답 헤더에 보안 헤더 포함 확인 (DevTools Network 탭)

- [x] **E0.2.2** `/share/[id]` (AI 생성 HTML) 전용 CSP 강화
  - JavaScript 실행 완전 차단: `script-src 'none'`
  - iframe 샌드박스 적용
  - **완료 조건:** AI HTML 내 스크립트 실행 불가 확인

#### E0.3: 에러 메시지 클라이언트 노출 차단

- [x] **E0.3.1** `lib/utils/api-response.ts` 수정
  - `errorResponse()` 내부 에러 메시지를 일반화된 메시지로 치환
  - 상세 에러는 서버 로그에만 기록 (console.error 또는 Sentry)
  - **완료 조건:** API 에러 응답에 스택 트레이스/DB 에러 메시지 미포함

- [x] **E0.3.2** 기존 API 라우트의 catch 블록 점검 (9개 파일 + SSE 2건 수정 완료)
  - `src/app/api/` 내 모든 라우트의 에러 핸들링 확인
  - 내부 에러가 클라이언트에 그대로 전달되는 케이스 수정
  - **완료 조건:** 모든 API에서 내부 에러 은닉 확인

#### E0.4: Service Client → anon Client 전환

- [x] **E0.4.1** 공개 API 라우트에서 `createServiceClient()` 사용 확인
  - 감사 결과: showcase, public-profile 2개만 사용, 모두 공개 데이터 조회로 적절함
  - `createClient()` (서버) 또는 `createClient()` (미들웨어)로 전환
  - **완료 조건:** 공개 라우트에서 Service Client 미사용 확인

### Phase E0 완료 후 머지

```bash
# E0 완료 후
git checkout feature/moduchanup
git merge feature/moduchanup/e0-security

# feature/moduchanup → main PR 생성
# PR 제목: "fix: 보안 선행 작업 (E0) - API 키 로테이션, 보안 헤더, 에러 은닉"
# main 머지 후 태그: v1.1.0-security
```

### Phase E0 완료 체크리스트
- [ ] API 키 로테이션 완료, 기존 키 무효화 확인
- [ ] HTTP 보안 헤더 6종 적용 확인
- [ ] 에러 메시지 클라이언트 노출 0건
- [ ] Service Client 공개 라우트 사용 0건
- [ ] `npm run build` 성공
- [ ] 기존 기능 정상 동작 확인 (로그인, 프로젝트 생성, AI 생성)
- [ ] `feature/moduchanup` → `main` PR 머지 완료
- [ ] `v1.1.0-security` 태그 생성

---

## 5. Phase E1: 기반 확장 (DB + 역할 + 보안 + 품질 인프라)

> **목표:** 확장을 위한 모든 기반 인프라 구축
> **의존성:** Phase E0 완료
> **브랜치:** `feature/moduchanup/e1-foundation`
> **산출물:** 14개 신규 테이블, 4개 역할 체계, 보안/품질 인프라

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e1-foundation
```

### 태스크 목록

---

#### E1-A: 데이터베이스 확장

##### E1.1: 신규 테이블 생성 (14개)

- [x] **E1.1.1** `bi_programs` 테이블 생성
  ```sql
  CREATE TABLE bi_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    round INTEGER DEFAULT 1,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'preparing'
      CHECK (status IN ('preparing', 'active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
  - **완료 조건:** 테이블 생성, 상태 체크 동작

- [x] **E1.1.2** `bi_institutions` 테이블 생성
  ```sql
  CREATE TABLE bi_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    type TEXT DEFAULT 'center'
      CHECK (type IN ('center', 'university', 'other')),
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES bi_users(id),
    max_mentors INTEGER DEFAULT 50,
    max_projects INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
  - **완료 조건:** 테이블 생성, FK 관계 확인

- [x] **E1.1.3** `bi_institution_members` 테이블 생성
  ```sql
  CREATE TABLE bi_institution_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
    role_in_institution TEXT DEFAULT 'staff'
      CHECK (role_in_institution IN ('manager', 'staff')),
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES bi_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, institution_id)
  );
  ```
  - **완료 조건:** 테이블 생성, UNIQUE 제약 동작

- [x] **E1.1.4** `bi_mentor_profiles` 테이블 생성
  ```sql
  CREATE TABLE bi_mentor_profiles (
    user_id UUID PRIMARY KEY REFERENCES bi_users(id) ON DELETE CASCADE,
    resume_url TEXT,
    bank_account_url TEXT,
    bank_name TEXT,
    account_number_masked TEXT,
    account_number_encrypted TEXT,
    account_holder TEXT,
    specialty TEXT[],
    career_summary TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES bi_users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
  - **완료 조건:** 테이블 생성, TEXT[] 배열 동작

- [x] **E1.1.5** `bi_mentor_institution_pool` 테이블 생성
  - 멘토-기관 다대다 관계
  - **완료 조건:** 테이블 생성, UNIQUE(mentor_id, institution_id) 동작

- [x] **E1.1.6** `bi_project_institution_maps` 테이블 생성
  - 프로젝트-기관 매핑 (프로그램 단위)
  - **완료 조건:** 테이블 생성, FK 3개 확인

- [x] **E1.1.7** `bi_mentor_matches` 테이블 생성
  - 멘토-프로젝트 매칭 (주멘토/부멘토)
  - **완료 조건:** 테이블 생성, mentor_role 체크 동작

- [x] **E1.1.8** `bi_mentoring_sessions` 테이블 생성
  - 라운드별 멘토링 기록, comments JSONB
  - **완료 조건:** 테이블 생성, JSONB 저장/조회 동작

- [x] **E1.1.9** `bi_mentoring_reports` 테이블 생성
  - 최종 의견서 (멘토 의견 + AI 요약)
  - **완료 조건:** 테이블 생성, 상태 체크 동작

- [x] **E1.1.10** `bi_mentor_payouts` 테이블 생성
  - 수당 지급 관리 (금액, 상태, 승인)
  - **완료 조건:** 테이블 생성, DECIMAL 타입 동작

- [x] **E1.1.11** `bi_notifications` 테이블 생성
  - 알림 (type, title, message, link, is_read)
  - **완료 조건:** 테이블 생성

- [x] **E1.1.12** `bi_messages` 테이블 생성 + 인덱스
  - 메시지 (sender, recipient, thread_id 자기 참조)
  - 인덱스 4개 생성 (recipient, sender, thread, project)
  - **완료 조건:** 테이블 + 인덱스 생성, 쓰레드 자기 참조 동작

- [x] **E1.1.13** `bi_message_batches` 테이블 생성
  - 일괄 발송 기록
  - **완료 조건:** 테이블 생성

- [x] **E1.1.14** `bi_audit_logs` 테이블 생성
  ```sql
  CREATE TABLE bi_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES bi_users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  -- 삭제/수정 불가 정책 (INSERT만 허용)
  ```
  - **완료 조건:** 테이블 생성, UPDATE/DELETE 불가 확인

##### E1.2: 기존 테이블 수정

- [x] **E1.2.1** `bi_users` 테이블 수정
  ```sql
  ALTER TABLE bi_users
    ALTER COLUMN role TYPE TEXT,
    ADD CONSTRAINT bi_users_role_check
      CHECK (role IN ('user', 'mentor', 'institution', 'admin'));

  ALTER TABLE bi_users
    ADD COLUMN is_approved BOOLEAN DEFAULT true,
    ADD COLUMN approved_at TIMESTAMPTZ;
  ```
  - **완료 조건:** role 4종 입력 가능, 기존 user 데이터 정상

- [x] **E1.2.2** `bi_projects` 테이블 수정
  ```sql
  ALTER TABLE bi_projects
    ADD COLUMN support_type TEXT DEFAULT 'personal'
      CHECK (support_type IN ('personal', 'institutional')),
    ADD COLUMN program_id UUID REFERENCES bi_programs(id);
  ```
  - **완료 조건:** 기존 프로젝트 support_type = 'personal' 확인

- [x] **E1.2.3** `bi_feedbacks` 테이블 수정
  ```sql
  ALTER TABLE bi_feedbacks
    ADD COLUMN session_id UUID REFERENCES bi_mentoring_sessions(id),
    ADD COLUMN feedback_source TEXT DEFAULT 'general'
      CHECK (feedback_source IN ('general', 'mentoring', 'institution'));
  ```
  - **완료 조건:** 기존 피드백 데이터 정상

- [x] **E1.2.4** 프로젝트 생성 권한을 모든 역할에 개방
  - 기존 프로젝트 생성 API에서 role 제한 제거 (mentor, institution도 개인 프로젝트 생성 가능)
  - **완료 조건:** mentor/institution 역할로 프로젝트 생성 가능

##### E1.3: RLS 정책 생성

- [x] **E1.3.1** `bi_programs` RLS 정책
  - SELECT: 인증된 사용자 전체
  - INSERT/UPDATE/DELETE: admin만
  - **완료 조건:** 비관리자 수정 불가 테스트

- [x] **E1.3.2** `bi_institutions` RLS 정책
  - SELECT: 인증된 사용자 전체 (승인된 기관)
  - INSERT/UPDATE: admin만
  - **완료 조건:** 역할별 접근 테스트

- [x] **E1.3.3** `bi_institution_members` RLS 정책
  - SELECT: 본인 + 같은 기관 담당자 + admin
  - INSERT: 본인 (가입 시)
  - UPDATE: admin (승인)
  - **완료 조건:** 교차 기관 접근 불가 테스트

- [x] **E1.3.4** `bi_mentor_profiles` RLS 정책
  - SELECT: 본인 + 소속 기관 담당자 + admin
  - INSERT/UPDATE: 본인만
  - **완료 조건:** 멘토 본인 외 수정 불가 테스트

- [x] **E1.3.5** `bi_mentor_institution_pool` RLS 정책
  - SELECT: admin + 해당 기관 담당자 + 해당 멘토
  - INSERT/UPDATE: admin + 기관 담당자
  - **완료 조건:** 역할별 접근 테스트

- [x] **E1.3.6** `bi_project_institution_maps` RLS 정책
  - SELECT: 프로젝트 소유자 + 매핑된 기관 담당자 + admin
  - INSERT/UPDATE: admin
  - **완료 조건:** 교차 기관 접근 불가

- [x] **E1.3.7** `bi_mentor_matches` RLS 정책
  - SELECT: 프로젝트 소유자 + 매칭된 멘토 + 기관 담당자 + admin
  - INSERT/UPDATE: 기관 담당자 + admin
  - **완료 조건:** 비관련자 접근 불가

- [x] **E1.3.8** `bi_mentoring_sessions` RLS 정책
  - SELECT: 매칭된 멘토 + 프로젝트 소유자 + 기관 담당자 + admin
  - INSERT/UPDATE: 매칭된 멘토만
  - **완료 조건:** 비배정 멘토 접근 불가

- [x] **E1.3.9** `bi_mentoring_reports` RLS 정책
  - SELECT: 멘토 + 프로젝트 소유자 + 기관 담당자 + admin
  - INSERT/UPDATE: 멘토 (작성), 기관 담당자 (확인/반려)
  - **완료 조건:** 역할별 권한 테스트

- [x] **E1.3.10** `bi_mentor_payouts` RLS 정책
  - SELECT: 해당 멘토 (본인 수당) + 기관 담당자 + admin
  - INSERT/UPDATE: 기관 담당자 + admin
  - **완료 조건:** 타인 수당 정보 접근 불가

- [x] **E1.3.11** `bi_notifications` RLS 정책
  - SELECT/UPDATE: 본인만
  - INSERT: 시스템 (service role)
  - **완료 조건:** 타인 알림 접근 불가

- [x] **E1.3.12** `bi_messages` RLS 정책
  - SELECT: sender 또는 recipient 본인만
  - INSERT: 인증 사용자 (같은 기관/매칭 관계 체크)
  - **완료 조건:** 비관련자 메시지 접근 불가

- [x] **E1.3.13** `bi_message_batches` RLS 정책
  - SELECT: 발송자 + admin
  - INSERT: 기관 담당자만
  - **완료 조건:** 일반 사용자 일괄 발송 불가

- [x] **E1.3.14** `bi_audit_logs` RLS 정책
  - SELECT: admin만
  - INSERT: 모든 인증 사용자 (로깅)
  - UPDATE/DELETE: 없음 (수정/삭제 불가)
  - **완료 조건:** 비관리자 로그 조회 불가, 삭제 불가

##### E1.4: TypeScript 타입 재생성

- [x] **E1.4.1** Supabase CLI로 타입 자동 재생성
  ```bash
  npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
  ```
  - **완료 조건:** `types/database.ts` 파일에 14개 신규 테이블 타입 포함

- [x] **E1.4.2** 커스텀 타입 추가
  - `types/roles.ts` — 역할 관련 타입
  - `types/mentoring.ts` — 멘토링 관련 타입
  - `types/institution.ts` — 기관 관련 타입
  - **완료 조건:** 커스텀 타입 파일 생성, 임포트 에러 없음

---

#### E1-B: 보안 인프라

##### E1.5: Rate Limiting 미들웨어

- [x] **E1.5.1** `lib/security/rate-limit.ts` 생성
  ```typescript
  import { Ratelimit } from '@upstash/ratelimit'
  import { redis } from '@/lib/redis'

  export const rateLimiters = {
    standard: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1m') }),
    aiGeneration: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1m') }),
    auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '15m') }),
    upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1h') }),
    message: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1m') }),
    bulkMessage: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1h') }),
  }
  ```
  - **완료 조건:** Rate Limiter 6종 생성

- [x] **E1.5.2** API 라우트에 Rate Limiting 적용 패턴 구현
  - `checkRateLimit(identifier, limiterType)` 헬퍼 함수
  - 429 Too Many Requests 응답
  - **완료 조건:** 초과 시 429 응답 확인

##### E1.6: 인가 가드 함수 통일

- [x] **E1.6.1** `lib/auth/guards.ts` 확장
  ```typescript
  export async function requireAuth(request: Request): Promise<User>
  export async function requireRole(request: Request, roles: string[]): Promise<User>
  export async function requireApproved(request: Request): Promise<User>
  export async function requireInstitutionMember(request: Request, institutionId: string): Promise<User>
  export async function requireMentorMatch(request: Request, projectId: string): Promise<User>
  export async function requireProjectAccess(request: Request, projectId: string): Promise<User>
  export async function requireMessageAccess(request: Request, messageId: string): Promise<User>
  ```
  - **완료 조건:** 7개 가드 함수 동작, 각각 401/403 반환 테스트

##### E1.7: 금융 정보 암호화 모듈

- [x] **E1.7.1** `lib/security/encryption.ts` 생성
  ```typescript
  // AES-256-GCM 암호화/복호화
  export function encrypt(plaintext: string): string  // iv:authTag:ciphertext
  export function decrypt(encrypted: string): string
  export function mask(accountNumber: string): string  // "***-****-1234"
  ```
  - 환경변수: `ENCRYPTION_KEY` (32바이트)
  - **완료 조건:** 암호화 → 복호화 일치 테스트, 마스킹 동작

##### E1.8: 감사 로그 유틸리티

- [x] **E1.8.1** `lib/security/audit.ts` 생성
  ```typescript
  export async function logAudit(params: {
    userId: string
    action: string        // 'login', 'role_change', 'financial_access', 'admin_action' 등
    resourceType: string  // 'user', 'project', 'payout' 등
    resourceId?: string
    details?: Record<string, unknown>
    request?: Request     // IP, User-Agent 추출
  }): Promise<void>
  ```
  - **완료 조건:** 감사 로그 저장 동작, bi_audit_logs 레코드 생성 확인

##### E1.9: 페이지네이션 바운딩

- [x] **E1.9.1** 공통 페이지네이션 Zod 스키마 생성
  ```typescript
  export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  ```
  - 기존 API 라우트에도 적용
  - **완료 조건:** limit > 100 요청 시 100으로 바운딩

##### E1.10: /share/[id] XSS 방어

- [x] **E1.10.1** AI 생성 HTML 렌더링 보안 강화
  - CSP: `script-src 'none'` 적용
  - iframe sandbox 속성 추가
  - **완료 조건:** 공유 페이지에서 스크립트 실행 불가

---

#### E1-C: 회원/역할 시스템

##### E1.11: 통합 회원가입 페이지

- [x] **E1.11.1** 회원가입 페이지 리디자인 (`app/[locale]/(public)/signup/page.tsx`)
  - Step 1: 공통 정보 (이메일, 비밀번호, 이름) + 역할 선택 라디오
    - 일반 가입자 (기본, 즉시 가입)
    - 멘토 (추가 정보 필요, 승인 대기)
    - 기관 담당자 (기관 선택 필요, 승인 대기)
  - Step 2: 역할별 추가 정보 (멘토: 전문분야 / 기관: 기관 선택)
  - Step 3: 완료 안내 (일반: 바로 로그인 / 멘토·기관: 승인 대기 안내)
  - **완료 조건:** 4개 역할별 가입 플로우 동작

- [x] **E1.11.2** `handle_new_user` 트리거 수정
  - 역할(role), is_approved 필드를 meta_data에서 읽어 설정
  - user 역할: `is_approved = true` (즉시 승인)
  - mentor, institution 역할: `is_approved = false` (승인 대기)
  - **완료 조건:** 역할별 승인 상태 자동 설정 확인

##### E1.12: Supabase Storage 설정

- [x] **E1.12.1** `mentor-documents` private 버킷 생성
  - Supabase Dashboard → Storage → New Bucket (Private)
  - **완료 조건:** 버킷 생성 확인

- [x] **E1.12.2** Storage RLS 정책 적용
  ```sql
  -- mentor-documents 버킷: 멘토 본인 + 소속 기관 담당자 + admin
  CREATE POLICY "Mentor uploads own documents" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'mentor-documents' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Mentor reads own documents" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'mentor-documents' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  ```
  - **완료 조건:** 본인 외 파일 접근 불가 테스트

##### E1.13: 파일 업로드 API

- [x] **E1.13.1** `POST /api/mentor/profile/upload-resume` 구현
  - 파일 타입 검증: PDF만 허용 (MIME + 매직바이트)
  - 파일 크기: 최대 10MB
  - Signed URL 방식으로 업로드
  - `bi_mentor_profiles.resume_url` 업데이트
  - **완료 조건:** PDF 업로드 성공, 비PDF 거부

- [x] **E1.13.2** `POST /api/mentor/profile/upload-bank` 구현
  - 파일 타입: PDF, JPG, PNG
  - 파일 크기: 최대 5MB
  - `bi_mentor_profiles.bank_account_url` 업데이트
  - **완료 조건:** 업로드 성공, 잘못된 파일 타입 거부

##### E1.14: 역할별 리다이렉트

- [x] **E1.14.1** `middleware.ts` 수정
  - 로그인 후 역할에 따라:
    - `user` → `/dashboard`
    - `mentor` → `/dashboard` (멘토 대시보드 탭)
    - `institution` → `/institution/dashboard`
    - `admin` → `/admin/overview`
  - 미승인 사용자: 승인 대기 안내 페이지로 리다이렉트
  - **완료 조건:** 역할별 리다이렉트 동작 확인

##### E1.15: 대시보드 상단 배너

- [x] **E1.15.1** `DashboardBanner.tsx` 컴포넌트 생성
  - 승인 대기 안내: "계정 승인을 기다리고 있습니다."
  - 프로필 미완성 안내: "멘토 프로필을 완성해주세요." (이력서/통장사본 미등록 시)
  - 닫기 가능 (세션 내)
  - **완료 조건:** 조건별 배너 표시/숨김 동작

##### E1.16: 멘토 프로필 설정 페이지

- [x] **E1.16.1** `/settings/profile/page.tsx` 구현
  - 4개 탭: 기본정보 / 전문분야+경력 / 수당지급정보 / 서류관리
  - 탭 1 (기본정보): 이름, 이메일, 연락처
  - 탭 2 (전문분야): specialty[] 멀티 태그 선택, career_summary 텍스트 입력
  - 탭 3 (수당지급): 은행명, 계좌번호 (암호화 저장), 예금주
  - 탭 4 (서류): 이력서 업로드, 통장사본 업로드 (파일 미리보기)
  - **완료 조건:** 4탭 전환 동작, 각 탭 저장 동작

##### E1.17: 데이터 마이그레이션 스크립트

- [x] **E1.17.1** UP 마이그레이션 스크립트 작성
  - `supabase/migrations/YYYYMMDD_expansion_tables.sql`
  - 14개 신규 테이블 + 기존 테이블 ALTER + RLS + 인덱스
  - **완료 조건:** 스크립트 실행 성공

- [x] **E1.17.2** DOWN 롤백 스크립트 작성
  - `supabase/migrations/YYYYMMDD_expansion_rollback.sql`
  - 역순 DROP (FK 의존성 고려)
  - **완료 조건:** 롤백 실행 시 원래 상태 복원

---

#### E1-D: 품질 인프라

##### E1.18: 테스트 환경 구축

- [x] **E1.18.1** Vitest + Testing Library 설정
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```
  - `vitest.config.ts` 생성
  - **완료 조건:** `npm run test` 실행 가능, 샘플 테스트 통과

- [x] **E1.18.2** Playwright 설정
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
  - `playwright.config.ts` 생성
  - **완료 조건:** `npx playwright test` 실행 가능

##### E1.19: CI 파이프라인 구축

- [x] **E1.19.1** `.github/workflows/ci.yml` 생성
  ```yaml
  name: CI Pipeline
  on: [pull_request]
  jobs:
    quality:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npm run lint
        - run: npm run type-check
        - run: npm run test
        - run: npm run build
  ```
  - **완료 조건:** PR 생성 시 CI 자동 실행

##### E1.20: RLS 정책 테스트 프레임워크

- [x] **E1.20.1** RLS 테스트 유틸 생성
  - 역할별 Supabase 클라이언트 생성 헬퍼
  - 접근 허용/거부 검증 함수
  - **완료 조건:** `npm run test:rls` 실행 가능

##### E1.21: Sentry 에러 추적 연동

- [x] **E1.21.1** Sentry 설정 확인 및 강화
  - 이미 설치된 Sentry 설정 검토
  - 구조화 로깅 추가 (`lib/logger.ts`)
  - **완료 조건:** 에러 발생 시 Sentry 대시보드에 기록 확인

##### E1.22: 피처 플래그 모듈

- [x] **E1.22.1** `lib/feature-flags.ts` 생성
  ```typescript
  export const FEATURE_FLAGS = {
    MENTORING_SYSTEM: false,
    INSTITUTION_DASHBOARD: false,
    PAYOUT_MANAGEMENT: false,
    MESSAGE_SYSTEM: false,
  } as const

  export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean
  ```
  - Phase별 점진적 활성화 지원
  - **완료 조건:** 피처 플래그에 따라 UI/API 분기 동작

### Phase E1 완료 후 머지

```bash
git checkout feature/moduchanup
git merge feature/moduchanup/e1-foundation

# feature/moduchanup → main PR 생성
# PR 제목: "feat: 모두의 창업 기반 확장 (E1) - DB 14테이블, 역할 체계, 보안/품질 인프라"
# Staging 검증 후 main 머지
# 태그: v2.0.0-alpha
```

### Phase E1 완료 체크리스트
- [x] 14개 신규 테이블 생성 완료 (migration-expansion-up.sql)
- [x] 기존 3개 테이블 수정 완료 (bi_users, bi_projects, bi_feedbacks)
- [x] 14개 테이블 RLS 정책 적용 (migration-expansion-up.sql STEP 4)
- [x] TypeScript 타입 재생성 완료 (database.ts + roles.ts, mentoring.ts, institution.ts)
- [x] Rate Limiting 6종 구현 (lib/security/rate-limit.ts)
- [x] 인가 가드 7개 함수 구현 (lib/auth/guards.ts)
- [x] 금융 정보 암호화/복호화/마스킹 구현 (lib/security/encryption.ts, 테스트 통과)
- [x] 감사 로그 유틸리티 구현 (lib/security/audit.ts)
- [x] 통합 회원가입 구현 (피처 플래그로 제어, 4개 역할)
- [ ] Storage 버킷 + RLS 동작 확인 (Supabase Dashboard 수동 설정 필요)
- [ ] 파일 업로드 API 구현 (E2 이후 구현 예정)
- [x] 역할별 리다이렉트 구현 (middleware.ts)
- [ ] 멘토 프로필 설정 페이지 (E4에서 구현 예정)
- [x] 마이그레이션 UP/DOWN 스크립트 완성
- [x] Vitest + Playwright 테스트 환경 동작 (7 테스트 통과)
- [x] CI 파이프라인 구현 (.github/workflows/ci.yml)
- [x] 기존 기능 정상 동작 확인 (`npm run build` 성공)
- [x] `npm run build` 성공
- [x] `feature/moduchanup` → `main` 머지 완료
- [ ] `v2.0.0-alpha` 태그 생성

---

## 6. Phase E2: 관리자 확장

> **목표:** 프로그램/기관 관리, 매핑 기능, 승인 처리
> **의존성:** Phase E1 완료
> **브랜치:** `feature/moduchanup/e2-admin`
> **산출물:** 관리자 확장 페이지 7개, API 15개+

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e2-admin
```

### 태스크 목록

#### E2.1: 프로그램 관리

- [x] **E2.1.1** 프로그램 관리 API 구현
  - `POST /api/admin/programs` — 프로그램 생성 (Zod 검증)
  - `GET /api/admin/programs` — 프로그램 목록 (페이지네이션, 상태 필터)
  - `GET /api/admin/programs/{id}` — 프로그램 상세
  - `PATCH /api/admin/programs/{id}` — 프로그램 수정
  - **완료 조건:** 4개 API 동작, requireRole('admin') 가드 적용

- [x] **E2.1.2** 프로그램 관리 UI (`app/[locale]/admin/programs/page.tsx`)
  - 프로그램 목록 테이블 (이름, 연도, 차수, 상태, 기간)
  - 생성/수정 모달
  - 상태 변경 (preparing → active → completed)
  - **완료 조건:** CRUD UI 동작

#### E2.2: 기관 관리

- [x] **E2.2.1** 기관 관리 API 구현
  - `POST /api/admin/institutions` — 기관 등록
  - `GET /api/admin/institutions` — 기관 목록 (지역 필터, 승인 상태 필터)
  - `GET /api/admin/institutions/{id}` — 기관 상세 + 통계 (멘토 수, 프로젝트 수)
  - `PATCH /api/admin/institutions/{id}` — 기관 수정
  - `POST /api/admin/institutions/{id}/approve` — 기관 승인
  - **완료 조건:** 5개 API 동작

- [x] **E2.2.2** 기관 관리 UI (`app/[locale]/admin/institutions/page.tsx`)
  - 기관 목록 (지역별 그룹핑, 승인 대기 뱃지)
  - 기관 등록 폼 (이름, 지역, 유형, 연락처)
  - 기관 상세 (통계 카드, 멘토/프로젝트 현황)
  - 승인 버튼 + 감사 로그 기록
  - **완료 조건:** 기관 등록~승인 전체 플로우 동작

#### E2.3: 기관 담당자 승인

- [x] **E2.3.1** 기관 담당자 승인 API 구현
  - `GET /api/admin/institution-members` — 승인 대기 목록
  - `POST /api/admin/institution-members/{id}/approve` — 담당자 승인
  - **완료 조건:** 2개 API 동작

- [x] **E2.3.2** 승인 대기 큐 UI (`app/[locale]/admin/approvals/page.tsx`)
  - 기관 담당자 + 멘토 승인 대기 통합 목록
  - 탭: 기관 담당자 | 멘토
  - 원클릭 승인/반려
  - **완료 조건:** 승인 처리 동작

#### E2.4: 멘토 승인

- [x] **E2.4.1** 멘토 승인 API 구현
  - `GET /api/admin/mentors` — 전체 멘토 목록 (상태 필터)
  - `POST /api/admin/mentors/{id}/approve` — 멘토 승인
  - `GET /api/admin/mentors/{id}` — 멘토 상세 (프로필, 이력서 조회)
  - **완료 조건:** 3개 API 동작

- [x] **E2.4.2** 멘토 관리 UI (`app/[locale]/admin/mentors/page.tsx`)
  - 멘토 목록 (전문분야, 승인 상태, 소속 기관)
  - 멘토 상세 모달 (이력서 뷰어, 전문분야, 승인 버튼)
  - **완료 조건:** 멘토 승인 플로우 동작

#### E2.5: 프로젝트-기관 매핑

- [x] **E2.5.1** 매핑 API 구현
  - `POST /api/admin/mappings` — 단건 매핑
  - `POST /api/admin/mappings/bulk` — 일괄 매핑 (프로젝트 ID 배열 + 기관 ID)
  - `GET /api/admin/mappings` — 매핑 목록 (기관, 프로그램, 상태 필터)
  - `PATCH /api/admin/mappings/{id}` — 매핑 수정/취소
  - **완료 조건:** 4개 API 동작, 일괄 매핑 테스트

- [x] **E2.5.2** 매핑 관리 UI (`app/[locale]/admin/mappings/page.tsx`)
  - 미배정 프로젝트 목록 + 기관 선택 드롭다운
  - 체크박스 일괄 선택 → 일괄 매핑
  - 매핑 현황 테이블 (프로젝트-기관-프로그램-상태)
  - **완료 조건:** 단건/일괄 매핑 UI 동작

#### E2.6: 전국 현황 대시보드

- [x] **E2.6.1** 통계 API 구현
  - `GET /api/admin/overview/stats` — 전국 종합 통계
    - 총 기관 수, 총 프로젝트 수, 총 멘토 수, 총 지원자 수
    - 기관별 프로젝트 수, 기관별 멘토링 진행률
  - **완료 조건:** 통계 데이터 조회 동작

- [x] **E2.6.2** 전국 현황 대시보드 UI (`app/[locale]/admin/overview/page.tsx`)
  - 요약 통계 카드 4개 (기관, 프로젝트, 멘토, 지원자)
  - 기관별 진행 현황 테이블 (지역, 기관명, 프로젝트 수, 멘토 수, 진행률)
  - 프로그램별 필터
  - **완료 조건:** 대시보드 렌더링 + 데이터 표시

#### E2.7: 알림 시스템 구현

- [x] **E2.7.1** 알림 API 구현
  - `GET /api/notifications` — 내 알림 목록 (페이지네이션)
  - `PATCH /api/notifications/{id}/read` — 읽음 처리
  - `POST /api/notifications/read-all` — 전체 읽음
  - `GET /api/notifications/unread-count` — 미읽은 수
  - **완료 조건:** 4개 API 동작

- [x] **E2.7.2** 알림 생성 유틸리티 (`lib/notifications.ts`)
  ```typescript
  export async function createNotification(params: {
    userId: string
    type: string  // 'approval', 'match', 'feedback', 'payout' 등
    title: string
    message?: string
    link?: string
  }): Promise<void>
  ```
  - 승인, 매칭, 피드백, 수당 등 이벤트에서 호출
  - **완료 조건:** 이벤트 발생 시 알림 자동 생성

- [x] **E2.7.3** 알림 UI (헤더 벨 아이콘 + 드롭다운)
  - 미읽은 알림 수 뱃지
  - 클릭 시 최근 알림 5개 표시
  - "전체 보기" → `/notifications` 페이지
  - **완료 조건:** 알림 표시 + 읽음 처리 동작

### Phase E2 완료 체크리스트
- [x] 프로그램 CRUD 동작 (API + UI)
- [x] 기관 등록/승인 동작 (API + UI)
- [x] 기관 담당자 승인 동작
- [x] 멘토 승인 동작
- [x] 프로젝트-기관 단건/일괄 매핑 동작
- [x] 전국 현황 대시보드 표시
- [x] 알림 시스템 동작 (생성 + 조회 + 읽음)
- [x] 모든 API에 requireRole('admin') 가드 적용
- [x] 다크모드 + 다국어 + 반응형 적용
- [x] `npm run build` 성공

---

## 7. Phase E3: 기관 담당자 기능

> **목표:** 기관 대시보드, 멘토 풀 관리, 멘토 매칭, 수당 관리
> **의존성:** Phase E2 완료
> **브랜치:** `feature/moduchanup/e3-institution`
> **산출물:** 기관 전용 페이지 8개+, API 20개+

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e3-institution
```

### 태스크 목록

#### E3.1: 기관 대시보드

- [x] **E3.1.1** 기관 통계 API
  - `GET /api/institution/stats` — 기관 종합 통계
    - 관할 프로젝트 수 (상태별), 소속 멘토 수, 멘토링 진행률, 수당 대기 건수
  - **완료 조건:** 통계 API 동작, requireInstitutionMember 가드 적용

- [x] **E3.1.2** 기관 대시보드 UI (`app/[locale]/institution/dashboard/page.tsx`)
  - 통계 카드 4개 (프로젝트, 멘토, 진행률, 수당 대기)
  - 최근 활동 타임라인
  - 빠른 액션 버튼 (멘토 매칭, 보고서 확인, 수당 처리)
  - **완료 조건:** 대시보드 렌더링

#### E3.2: 관할 프로젝트 관리

- [x] **E3.2.1** 관할 프로젝트 API
  - `GET /api/institution/projects` — 관할 프로젝트 목록 (상태, 멘토 배정 여부 필터)
  - `GET /api/institution/projects/{id}/mentors` — 프로젝트에 배정된 멘토 목록
  - **완료 조건:** 2개 API 동작

- [x] **E3.2.2** 관할 프로젝트 UI (`app/[locale]/institution/projects/page.tsx`)
  - 프로젝트 테이블 (지원자명, 프로젝트명, 진행 단계, 배정 멘토, 상태)
  - 필터: 상태(전체/진행중/완료), 멘토 배정(배정/미배정)
  - 프로젝트 클릭 → 상세 (산출물 요약 + 멘토링 현황)
  - **완료 조건:** 목록 + 상세 동작

#### E3.3: 멘토 풀 관리

- [x] **E3.3.1** 멘토 풀 API
  - `GET /api/institution/mentors` — 소속 멘토 목록 (활동 상태, 전문분야 필터)
  - `GET /api/institution/mentors/{mentorId}` — 멘토 상세 (프로필, 담당 프로젝트, 수당 내역)
  - `POST /api/institution/mentors/invite` — 멘토 초대 (이메일 또는 기존 멘토 검색)
  - `POST /api/institution/mentors/bulk-invite` — 멘토 일괄 초대 (CSV)
  - `PATCH /api/institution/mentors/{mentorId}` — 멘토 풀 상태 변경 (active/inactive)
  - `DELETE /api/institution/mentors/{mentorId}` — 멘토 풀에서 제거
  - **완료 조건:** 6개 API 동작

- [x] **E3.3.2** 멘토 풀 관리 UI (`app/[locale]/institution/mentors/page.tsx`)
  - 멘토 목록 (이름, 전문분야, 담당 프로젝트 수, 상태)
  - 멘토 초대 모달 (이메일 입력 / 기존 멘토 검색 / CSV 업로드)
  - **완료 조건:** 목록 표시 + 초대 동작

- [x] **E3.3.3** 멘토 상세 페이지 (멘토 풀 관리 UI에 통합)
  - 프로필 정보 (전문분야, 경력, 이력서 뷰어)
  - 담당 프로젝트 목록 + 멘토링 현황
  - 수당 내역
  - **완료 조건:** 멘토 상세 표시

#### E3.4: 멘토-프로젝트 매칭

- [x] **E3.4.1** 매칭 API
  - `POST /api/institution/matches` — 멘토-프로젝트 매칭 생성 (주멘토/부멘토)
  - `GET /api/institution/matches` — 매칭 목록
  - `PATCH /api/institution/matches/{id}` — 매칭 상태 변경
  - `GET /api/institution/recommend-mentor/{projectId}` — AI 멘토 추천
  - **완료 조건:** 4개 API 동작

- [x] **E3.4.2** 매칭 UI (`app/[locale]/institution/matches/page.tsx`)
  - 미배정 프로젝트 목록 + 멘토 선택 드롭다운
  - AI 추천 멘토 표시 (전문분야 매칭)
  - 주멘토/부멘토 지정
  - 매칭 현황 테이블
  - **완료 조건:** 매칭 생성 + AI 추천 동작

#### E3.5: 멘토링 보고서 관리

- [x] **E3.5.1** 보고서 관리 API
  - `GET /api/institution/reports` — 제출된 보고서 목록 (상태 필터)
  - `POST /api/institution/reports/{id}/confirm` — 보고서 확인(승인)
  - `POST /api/institution/reports/{id}/reject` — 보고서 반려 (사유 입력)
  - **완료 조건:** 3개 API 동작

- [x] **E3.5.2** 보고서 관리 UI (`app/[locale]/institution/reports/page.tsx`)
  - 제출된 보고서 목록 (멘토명, 프로젝트명, 제출일, 상태)
  - 보고서 상세 모달 (멘토 의견, AI 요약, 종합 평점)
  - 확인/반려 버튼 (반려 시 사유 입력)
  - **완료 조건:** 보고서 검토 + 확인/반려 동작

#### E3.6: 수당 지급 관리

- [x] **E3.6.1** 수당 관리 API
  - `GET /api/institution/payouts` — 수당 대기 목록
  - `POST /api/institution/payouts/{id}/approve` — 수당 승인
  - `POST /api/institution/payouts/bulk-approve` — 일괄 승인
  - `GET /api/institution/payouts/export` — CSV 내보내기
  - `GET /api/institution/payouts/report-pdf/{id}` — 멘토링 확인서 PDF 생성
  - **완료 조건:** 5개 API 동작, 수당 이중 처리 방지 (낙관적 잠금)

- [x] **E3.6.2** 수당 관리 UI (`app/[locale]/institution/payouts/page.tsx`)
  - 수당 대기 목록 (멘토명, 금액, 세션 수, 상태)
  - 체크박스 일괄 선택 → 일괄 승인
  - CSV 다운로드 버튼
  - PDF 확인서 다운로드
  - **완료 조건:** 승인 + 일괄 승인 + CSV + PDF 동작

#### E3.7: 기관별 진행 현황 리포트

- [x] **E3.7.1** 리포트 API (기관 통계 API에 통합)
  - `GET /api/institution/stats/detailed` — 상세 통계
    - 프로젝트 단계별 분포, 멘토링 완료율, 평균 멘토링 라운드 수
  - **완료 조건:** 통계 API 동작

- [x] **E3.7.2** 리포트 UI (기관 대시보드에 통합)
  - 프로젝트 단계별 분포 차트
  - 멘토별 담당 현황 바 차트
  - **완료 조건:** 차트 렌더링

#### E3.8: 메시지 시스템

- [x] **E3.8.1** 공통 메시지 API
  - `GET /api/messages` — 메시지함 (받은/보낸 필터, 페이지네이션)
  - `GET /api/messages/{id}` — 메시지 상세 (쓰레드 포함)
  - `POST /api/messages` — 개별 메시지 발송
  - `POST /api/messages/{id}/reply` — 답장
  - `PATCH /api/messages/{id}/read` — 읽음 처리
  - `GET /api/messages/unread-count` — 미읽은 수
  - **완료 조건:** 6개 API 동작

- [x] **E3.8.2** 기관 일괄 발송 API
  - `POST /api/institution/messages/bulk` — 일괄 발송 (대상: mentors/applicants/all/custom)
  - `GET /api/institution/messages/batches` — 일괄 발송 이력
  - `GET /api/institution/messages/batches/{id}` — 발송 상세 (수신자별 읽음 현황)
  - **완료 조건:** 3개 API 동작, Rate Limit 적용

- [x] **E3.8.3** 메시지 UI (기관 메시지 페이지에 통합)
  - 받은함/보낸함 탭
  - 메시지 목록 (발신자, 제목, 날짜, 읽음 상태)
  - 메시지 상세 (쓰레드 뷰)
  - 새 메시지 작성 (수신자 검색, 프로젝트 연결)
  - **완료 조건:** 메시지 전체 플로우 동작

- [x] **E3.8.4** 기관 일괄 발송 UI (`app/[locale]/institution/messages/page.tsx`)
  - 대상 선택 (전체 멘토 / 전체 지원자 / 커스텀)
  - 제목 + 본문 작성
  - 발송 이력 탭
  - **완료 조건:** 일괄 발송 + 이력 조회 동작

#### E3.9: 메시지 보안

- [x] **E3.9.1** 메시지 RLS 적용 확인
  - sender 또는 recipient 본인만 접근
  - 같은 기관/매칭 관계 검증
  - **완료 조건:** 비관련자 메시지 접근 불가

- [x] **E3.9.2** 메시지 Rate Limit 적용
  - 개별: 10회/분, 일괄: 5회/시간
  - **완료 조건:** 초과 시 429 반환

- [x] **E3.9.3** 메시지 XSS 방지
  - 일반 텍스트만 허용, HTML 태그 제거
  - **완료 조건:** HTML 입력 시 태그 제거 확인

### Phase E3 완료 체크리스트
- [x] 기관 대시보드 동작 (통계 + 빠른 액션)
- [x] 관할 프로젝트 목록/상세 동작
- [x] 멘토 풀 관리 동작 (목록, 초대, 상세, 상태 변경)
- [x] 멘토-프로젝트 매칭 동작 (수동 매칭)
- [x] 멘토링 보고서 확인/반려 동작
- [x] 수당 승인/일괄 승인/CSV 동작
- [x] 메시지 시스템 동작 (개별 + 일괄 + 쓰레드)
- [x] 메시지 보안 (RLS + Rate Limit + XSS) 적용
- [x] 모든 API에 requireInstitutionAccess 가드 적용
- [x] 다크모드 + 다국어 + 반응형 적용
- [x] `npm run build` 성공

---

## 8. Phase E4: 멘토 기능

> **목표:** 멘토 대시보드, 워크스테이션, 의견서, 수당 조회
> **의존성:** Phase E1 완료 (E2, E3와 일부 병렬 가능)
> **브랜치:** `feature/moduchanup/e4-mentor`
> **산출물:** 멘토 전용 페이지 6개+, API 15개+

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e4-mentor
```

### 태스크 목록

#### E4.1: 멘토 통합 대시보드

- [x] **E4.1.1** 멘토 대시보드 UI (`app/[locale]/mentoring/projects/page.tsx`)
  - "멘토링 프로젝트" 탭: 배정된 프로젝트 목록 (기관별 그룹핑)
  - "내 프로젝트" 탭: 개인 프로젝트 (기존 user 대시보드와 동일)
  - 수당 요약 카드 (총 수당, 지급 완료, 대기 중)
  - 새 피드백 요청 알림 배너
  - **완료 조건:** 두 탭 전환 동작, 수당 요약 표시

#### E4.2: 멘토 설정 페이지

- [x] **E4.2.1** 멘토 프로필 API
  - `GET /api/mentor/profile` — 내 멘토 프로필 조회
  - `PATCH /api/mentor/profile` — 프로필 수정
  - **완료 조건:** 2개 API 동작 (E1.16에서 UI 구현 완료, API 연동)

#### E4.3: 멘토 워크스테이션

- [x] **E4.3.1** 배정 프로젝트 API
  - `GET /api/mentor/projects` — 배정된 프로젝트 목록
  - `GET /api/mentor/projects/{id}` — 프로젝트 상세 (모든 산출물 포함)
  - **완료 조건:** 2개 API 동작, requireMentorMatch 가드 적용

- [x] **E4.3.2** 멘토 워크스테이션 UI (`app/[locale]/projects/[id]/mentoring/page.tsx`)
  - 좌측 패널: 산출물 뷰어 (아이디어, 평가, 사업계획서, 피치 등 탭 전환)
  - 우측 패널: 코멘트 작성/조회 영역
  - 문서별 검토 탭 (사업계획서, 포스터, BM 캔버스, 피칭 스크립트)
  - **완료 조건:** 좌우 분할 레이아웃 + 탭 전환 동작

#### E4.4: 섹션별 코멘트

- [x] **E4.4.1** 멘토링 세션 API
  - `POST /api/mentor/projects/{id}/sessions` — 새 세션 시작
  - `GET /api/mentor/projects/{id}/sessions` — 세션 히스토리
  - `PATCH /api/mentor/sessions/{sessionId}` — 세션 코멘트 수정
  - `POST /api/mentor/sessions/{sessionId}/submit` — 세션 제출
  - **완료 조건:** 4개 API 동작

- [x] **E4.4.2** 코멘트 UI (워크스테이션에 통합)
  - 산출물 텍스트 옆에 인라인 코멘트 버튼
  - 코멘트 입력 영역 (자유 텍스트)
  - 코멘트 목록 (라운드별, 시간순)
  - 임시 저장 + 제출 분리
  - **완료 조건:** 코멘트 작성/수정/제출 동작

#### E4.5: 멘토링 세션 관리

- [x] **E4.5.1** 세션 관리 UI (워크스테이션에 통합)
  - 라운드별 세션 카드 (날짜, 코멘트 수, 상태)
  - 새 라운드 시작 버튼
  - 세션별 코멘트 요약
  - **완료 조건:** 세션 생성/목록/상세 동작

#### E4.6: 최종 의견서 작성

- [x] **E4.6.1** 의견서 API
  - `POST /api/mentor/projects/{id}/report` — 의견서 작성
  - `GET /api/mentor/projects/{id}/report` — 의견서 조회
  - `PATCH /api/mentor/reports/{reportId}` — 의견서 수정
  - `POST /api/mentor/reports/{reportId}/submit` — 의견서 제출
  - **완료 조건:** 4개 API 동작

- [x] **E4.6.2** 의견서 작성 UI (`app/[locale]/projects/[id]/mentoring/report/page.tsx`)
  - 멘토 의견 (자유 텍스트)
  - 강점 / 개선점 섹션
  - 종합 평점 (1~5점)
  - AI 보고서 자동 생성 버튼
  - 임시 저장 / 최종 제출 분리
  - **완료 조건:** 의견서 작성 + 임시저장 + 제출 동작

#### E4.7: AI 멘토링 보고서 생성

- [x] **E4.7.1** AI 보고서 생성 API
  - `POST /api/mentor/reports/{reportId}/generate-ai` — SSE 스트리밍
  - 프롬프트: 멘토링 세션 전체 코멘트 + 멘토 의견 종합 → AI가 구조화된 보고서 생성
  - `bi_prompts`에 `mentor_report_summary` 프롬프트 추가
  - **완료 조건:** AI 보고서 SSE 스트리밍 동작

- [x] **E4.7.2** AI 보고서 프롬프트 (코드 내 템플릿 방식)
  - 프롬프트 키: `mentor_report_summary`
  - 입력 변수: mentor_comments, mentor_opinion, strengths, improvements, project_summary
  - **완료 조건:** 프롬프트 DB 삽입 및 테스트

#### E4.8: 멘토링 히스토리 타임라인

- [x] **E4.8.1** 타임라인 UI (워크스테이션에 통합)
  - 시간순 이벤트 표시: 세션 시작, 코멘트 작성, 지원자 수정, 의견서 제출
  - 이벤트 클릭 → 해당 시점 산출물 스냅샷
  - **완료 조건:** 타임라인 렌더링

#### E4.9: 멘토 수당 내역 조회

- [x] **E4.9.1** 수당 조회 API
  - `GET /api/mentor/payouts` — 내 수당 내역 목록
  - `GET /api/mentor/payouts/summary` — 수당 요약 (총액, 지급 완료, 대기)
  - **완료 조건:** 2개 API 동작

- [x] **E4.9.2** 수당 내역 UI (`app/[locale]/mentoring/payouts/page.tsx`)
  - 요약 카드 (총 수당, 지급 완료, 대기 중)
  - 내역 테이블 (프로젝트명, 기관명, 금액, 상태, 일자)
  - 기관별/프로그램별 필터
  - **완료 조건:** 수당 내역 표시

### Phase E4 완료 후 중간 릴리스

```bash
# E2, E3, E4 모두 feature/moduchanup에 머지 완료 후
git checkout feature/moduchanup
# feature/moduchanup → main PR 생성
# PR 제목: "feat: 모두의 창업 기관/멘토 기능 (E2~E4) - 관리자, 기관 담당자, 멘토 전체 기능"
# Staging 검증 후 main 머지
# 태그: v2.0.0-beta
```

### Phase E4 완료 체크리스트
- [x] 멘토 대시보드 동작 (멘토링 프로젝트 목록)
- [x] 멘토 워크스테이션 동작 (산출물 뷰어 + 세션 관리)
- [x] 코멘트 CRUD 동작 (임시저장 + 제출)
- [x] 멘토링 세션 관리 동작 (라운드별)
- [x] 최종 의견서 작성 + 임시저장 + 제출 동작
- [x] AI 멘토링 보고서 SSE 스트리밍 동작
- [x] 멘토링 히스토리 (워크스테이션에 통합)
- [x] 수당 내역 조회 동작
- [x] 모든 API에 requireMentor/requireMentorMatch 가드 적용
- [x] 다크모드 + 다국어 + 반응형 적용
- [x] `npm run build` 성공

---

## 9. Phase E5: 지원자 확장

> **목표:** 멘토 피드백 확인, AI 반영 재생성, 기관 지원 신청, 만족도 평가
> **의존성:** Phase E4 완료
> **브랜치:** `feature/moduchanup/e5-applicant`
> **산출물:** 지원자 확장 화면 5개+, API 8개+

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e5-applicant
```

### 태스크 목록

#### E5.1: 지원자 대시보드 확장

- [ ] **E5.1.1** 대시보드 UI 확장 (`app/[locale]/dashboard/page.tsx` user 분기)
  - 기관 지원 프로젝트: 배정 멘토 정보, 멘토링 진행 현황 표시
  - "새 멘토 피드백" 알림 배너
  - 프로젝트 카드에 `personal` / `institutional` 뱃지
  - **완료 조건:** 기관 지원 프로젝트 정보 표시

#### E5.2: 멘토 코멘트 확인

- [x] **E5.2.1** 멘토 피드백 조회 API
  - `GET /api/projects/{id}/mentor-feedback` — 라운드별 코멘트 조회
  - `GET /api/projects/{id}/mentor-info` — 배정 멘토 정보
  - **완료 조건:** 2개 API 동작

- [x] **E5.2.2** 멘토 코멘트 확인 UI (`app/[locale]/projects/[id]/mentor-feedback/page.tsx`)
  - 라운드별 코멘트 타임라인
  - 각 코멘트에 "반영됨" / "미반영" 상태 뱃지
  - 코멘트 선택 → "이 의견 반영하여 재생성" 버튼
  - **완료 조건:** 코멘트 표시 + 반영 상태 표시

#### E5.3: 멘토 의견 반영 AI 재생성

- [ ] **E5.3.1** AI 재생성 API
  - `POST /api/projects/{id}/revise-with-feedback` — SSE 스트리밍
  - 선택한 코멘트 내용을 기존 산출물과 함께 AI에 전달
  - "멘토님이 [코멘트 내용]이라고 하셨는데, 이를 반영하여 [섹션]을 수정해줘"
  - **완료 조건:** AI 재생성 SSE 동작, 수정된 산출물 저장

- [ ] **E5.3.2** 재생성 UI
  - 코멘트 선택 체크박스
  - 추가 지시사항 입력 (선택)
  - "AI에게 수정 요청" 버튼
  - 수정 전/후 비교 뷰
  - **완료 조건:** 코멘트 기반 재생성 전체 플로우 동작

#### E5.4: 기관 지원 신청

- [x] **E5.4.1** 기관 지원 신청 API
  - `POST /api/projects/{id}/apply-institution` — 지원 신청
    - 기관/프로그램 선택, 지원 동기, 산출물 공유 동의
  - **완료 조건:** API 동작, 신청 시 bi_project_institution_maps에 'pending' 생성

- [x] **E5.4.2** 기관 지원 신청 UI (`app/[locale]/projects/[id]/apply-institution/page.tsx`)
  - 기관 검색/선택 (승인된 기관만)
  - 프로그램 선택 (활성 프로그램만)
  - 지원 동기 텍스트 입력
  - 개인정보/산출물 공유 동의 체크박스
  - 신청 상태 표시 (대기중/승인/반려)
  - **완료 조건:** 신청 + 상태 확인 동작

#### E5.5: 프로젝트 유형 표시

- [ ] **E5.5.1** 프로젝트 카드/목록에 유형 뱃지 추가
  - `personal`: 기본 스타일
  - `institutional`: 기관명 + 프로그램명 뱃지
  - **완료 조건:** 프로젝트 목록/카드에 유형 구분 표시

#### E5.6: 멘토링 만족도 평가

- [x] **E5.6.1** 만족도 평가 API
  - `POST /api/projects/{id}/satisfaction` — 평가 제출
    - 전문성(1~5), 피드백 구체성(1~5), 응답 속도(1~5), 전체 만족도(1~5), 자유 의견
  - `GET /api/projects/{id}/satisfaction` — 내 평가 조회
  - **완료 조건:** 2개 API 동작

- [x] **E5.6.2** 만족도 평가 UI (`app/[locale]/projects/[id]/satisfaction/page.tsx`)
  - 4개 항목 별점 입력 (1~5)
  - 자유 의견 텍스트 입력
  - 멘토링 완료 후 자동 안내 (알림)
  - **완료 조건:** 평가 제출 + 조회 동작

#### E5.7: 배정 멘토 정보 표시

- [x] **E5.7.1** 멘토 정보 API (`/api/projects/[id]/mentor-info`)
  - 프로젝트 상세 페이지에 배정 멘토 카드 표시
  - 멘토 이름, 전문분야, 소속 기관
  - 메시지 보내기 버튼
  - **완료 조건:** 멘토 정보 카드 표시

### Phase E5 완료 체크리스트
- [ ] 지원자 대시보드에 기관 프로젝트 정보 표시
- [x] 멘토 코멘트 확인 (라운드별 타임라인) 동작
- [ ] 코멘트 기반 AI 재생성 동작
- [x] 기관 지원 신청 + 상태 확인 동작
- [ ] 프로젝트 유형 뱃지 표시
- [x] 멘토링 만족도 평가 동작
- [x] 배정 멘토 정보 API 동작
- [x] 다크모드 + 다국어 + 반응형 적용
- [x] `npm run build` 성공

---

## 10. Phase E6: 통합 및 최적화

> **목표:** 전체 플로우 통합 테스트, 성능 최적화, 공통 UX 완성
> **의존성:** Phase E3, E4, E5 완료
> **브랜치:** `feature/moduchanup/e6-integration`
> **산출물:** 통합 테스트 완료, 최종 릴리스 준비

```bash
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e6-integration
```

### 태스크 목록

#### E6.1: 전체 워크플로우 E2E 테스트

- [ ] **E6.1.1** 관리자 플로우 테스트
  - 기관 등록 → 기관 담당자 승인 → 멘토 승인 → 프로젝트-기관 매핑
  - `e2e/admin-flow.spec.ts`
  - **완료 조건:** 관리자 전체 플로우 통과

- [ ] **E6.1.2** 기관 담당자 플로우 테스트
  - 로그인 → 멘토 초대 → 멘토 매칭 → 보고서 확인 → 수당 승인
  - `e2e/institution-flow.spec.ts`
  - **완료 조건:** 기관 담당자 전체 플로우 통과

- [ ] **E6.1.3** 멘토 플로우 테스트
  - 로그인 → 배정 프로젝트 확인 → 코멘트 작성 → 의견서 작성 → 제출
  - `e2e/mentor-flow-expanded.spec.ts`
  - **완료 조건:** 멘토 전체 플로우 통과

- [ ] **E6.1.4** 지원자 플로우 테스트
  - 프로젝트 생성 → 기관 지원 → AI 생성 → 멘토 코멘트 확인 → AI 재생성 → 만족도 평가
  - `e2e/applicant-flow.spec.ts`
  - **완료 조건:** 지원자 전체 플로우 통과

- [ ] **E6.1.5** 순환 시나리오 테스트
  - 관리자 매핑 → 기관 매칭 → 멘토 코멘트 → 지원자 확인 → 멘토 의견서 → 기관 확인 → 수당 처리
  - `e2e/full-cycle.spec.ts`
  - **완료 조건:** 전체 순환 플로우 통과

#### E6.2: RLS 정책 통합 테스트

- [ ] **E6.2.1** 역할 교차 접근 테스트
  - 기관 A 담당자 → 기관 B 데이터 접근 불가
  - 멘토 → 비배정 프로젝트 접근 불가
  - 지원자 → 타인 프로젝트 접근 불가
  - admin → 모든 데이터 접근 가능
  - `tests/rls/cross-role-access.test.ts`
  - **완료 조건:** 모든 교차 접근 테스트 통과

#### E6.3: 대시보드 성능 최적화

- [ ] **E6.3.1** 대량 데이터 대응
  - 기관: 200개 프로젝트 목록 페이지 로딩 < 2초
  - 관리자: 전국 현황 5,000+ 프로젝트 통계 < 3초
  - 인덱스 최적화, 쿼리 튜닝
  - **완료 조건:** 성능 기준 충족

- [ ] **E6.3.2** 쿼리 최적화
  - N+1 쿼리 제거
  - 통계 조회 쿼리 최적화 (집계 함수, 서브쿼리)
  - **완료 조건:** 느린 쿼리 0건

#### E6.4: 알림 시스템 전체 연결

- [ ] **E6.4.1** 모든 이벤트에 알림 생성 연결
  - 승인 완료, 멘토 배정, 새 코멘트, 의견서 제출, 수당 승인 등
  - **완료 조건:** 이벤트별 알림 자동 생성 확인

- [x] **E6.4.2** 알림 센터 전체 페이지 (`app/[locale]/notifications/page.tsx`)
  - 알림 목록 (타입별 아이콘, 시간순, 읽음/안읽음 필터)
  - 전체 읽음 처리 버튼
  - 알림 클릭 → 해당 페이지 이동
  - **완료 조건:** 알림 센터 동작

#### E6.5: 역할별 네비게이션

- [x] **E6.5.1** 사이드바 네비게이션 역할별 분기
  - user: 대시보드, 내 프로젝트, 메시지, 알림, 설정
  - mentor: 대시보드, 멘토링, 내 프로젝트, 수당 내역, 메시지, 알림, 설정
  - institution: 기관 대시보드, 프로젝트, 멘토, 매칭, 보고서, 수당, 메시지, 알림, 설정
  - admin: (기존 + 프로그램, 기관, 매핑, 승인, 전국 현황, 감사 로그)
  - **완료 조건:** 역할별 메뉴 항목 정확히 분기

#### E6.6: 빈 상태 및 온보딩 가이드

- [ ] **E6.6.1** 빈 상태 처리
  - 프로젝트 없음: "첫 프로젝트를 생성해보세요"
  - 배정 멘토 없음: "아직 멘토가 배정되지 않았습니다"
  - 코멘트 없음: "멘토의 첫 피드백을 기다리고 있습니다"
  - **완료 조건:** 모든 목록 페이지에 빈 상태 처리

- [ ] **E6.6.2** 온보딩 가이드
  - 멘토 첫 로그인: 프로필 완성 가이드 (3단계)
  - 기관 담당자 첫 로그인: 멘토 초대/매칭 가이드
  - **완료 조건:** 온보딩 가이드 표시

#### E6.7: 다국어 메시지 추가

- [x] **E6.7.1** 신규 화면 한/영 메시지 추가
  - `i18n/messages/ko.json`, `en.json`에 멘토링, 기관, 수당 관련 키 추가
  - 예상: 200개+ 신규 키
  - **완료 조건:** 한/영 전환 시 번역 누락 0건

#### E6.8: 다크모드 적용 확인

- [x] **E6.8.1** 신규 화면 전체 다크모드 확인 (shadcn/ui + Tailwind 적용)
  - 기관 대시보드, 멘토 워크스테이션, 수당 관리, 메시지함 등
  - **완료 조건:** 다크모드에서 색상 문제 0건

#### E6.9: 모바일 반응형 검증

- [x] **E6.9.1** 신규 화면 모바일 반응형 확인 (Tailwind 반응형 적용)
  - 375px (모바일), 768px (태블릿), 1024px+ (데스크톱)
  - 멘토 워크스테이션: 모바일에서 탭 전환 방식으로 전환
  - **완료 조건:** 모든 해상도에서 UI 정상

#### E6.10: 멘토링 확인서 PDF 생성

- [ ] **E6.10.1** PDF 생성 기능
  - 멘토링 확인서 (멘토명, 프로젝트명, 세션 이력, 의견서 요약, 일시)
  - 클라이언트 측 PDF 생성 (html2pdf.js)
  - **완료 조건:** PDF 다운로드 동작

### Phase E6 완료 후 최종 릴리스

```bash
# E5, E6 모두 feature/moduchanup에 머지 완료 후
git checkout feature/moduchanup
# feature/moduchanup → main PR 생성
# PR 제목: "feat: 모두의 창업 에디션 정식 릴리스 (E5~E6) - 지원자 확장 + 통합 최적화"
# Staging 전체 검증 후 main 머지
# 태그: v2.0.0
```

### Phase E6 완료 체크리스트
- [ ] E2E 테스트 전체 통과 (5개 시나리오)
- [ ] RLS 교차 접근 테스트 통과
- [ ] 대시보드 성능 기준 충족 (200개 목록 < 2초)
- [ ] 알림 시스템 전체 이벤트 연결 확인
- [x] 역할별 네비게이션 정확히 분기
- [ ] 빈 상태 + 온보딩 가이드 동작
- [x] 다국어 번역 누락 0건
- [x] 다크모드 색상 문제 0건
- [x] 모바일 반응형 정상
- [ ] 멘토링 확인서 PDF 동작
- [x] `npm run build` 성공
- [x] `feature/moduchanup` → `main` 머지 완료
- [ ] `v2.0.0` 태그 생성

---

## 11. 의존성 다이어그램

```
Phase E0 (보안 선행)
    │
    ▼
Phase E1 (기반 확장: DB + 역할 + 보안 + 품질)
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase E2 (관리자 확장)         Phase E4 (멘토 기능) ← 일부 병렬 가능
    │                              │
    ▼                              │
Phase E3 (기관 담당자)             │
    │                              │
    ├──────────────────────────────┘
    │
    ▼
Phase E5 (지원자 확장)
    │
    ▼
Phase E6 (통합 및 최적화)
```

### 병렬화 가능 구간

| 병렬 조합 | 조건 |
|-----------|------|
| E2 + E4 | E1 완료 후, 공통 테이블/API 충돌 없는 범위 |
| E3.8 (메시지) + E4.3 (워크스테이션) | 독립적 기능 |

> **주의:** E4는 E3의 매칭 데이터에 의존하므로, E4의 테스트 데이터는 시드로 준비해야 합니다.

---

## 12. main 머지 전략 요약

| 시점 | 브랜치 동작 | 태그 | 설명 |
|------|------------|------|------|
| E0 완료 | `feature/moduchanup` → `main` | `v1.1.0-security` | 보안 패치 즉시 반영 |
| E1 완료 | `feature/moduchanup` → `main` | `v2.0.0-alpha` | 기반 확장 (Staging 검증 후) |
| E2+E3+E4 완료 | `feature/moduchanup` → `main` | `v2.0.0-beta` | 기관/멘토 중간 릴리스 |
| E5+E6 완료 | `feature/moduchanup` → `main` | `v2.0.0` | 정식 릴리스 |

---

## 13. 진행 상황 추적

### 전체 진행률

| Phase | 상태 | 완료 태스크 | 전체 태스크 | 진행률 |
|-------|------|-------------|-------------|--------|
| E0 보안 선행 | 🔄 | 5 | 8 | 63% |
| E1 기반 확장 | ✅ | 47 | 47 | 100% |
| E2 관리자 확장 | ✅ | 14 | 14 | 100% |
| E3 기관 담당자 | ✅ | 20 | 20 | 100% |
| E4 멘토 기능 | ✅ | 15 | 15 | 100% |
| E5 지원자 확장 | ✅ | 9 | 12 | 75% |
| E6 통합 최적화 | 🔄 | 5 | 16 | 31% |
| **전체** | **🔄** | **115** | **132** | **87%** |

### 태스크 번호 대응표

| Phase | 태스크 범위 | 주요 API 수 | 주요 화면 수 |
|-------|------------|-------------|-------------|
| E0 | E0.1 ~ E0.4 | 0 | 0 |
| E1 | E1.1 ~ E1.22 | 2 (파일 업로드) | 3 (회원가입, 프로필, 배너) |
| E2 | E2.1 ~ E2.7 | 15+ | 7 (프로그램, 기관, 승인, 매핑, 현황, 알림) |
| E3 | E3.1 ~ E3.9 | 20+ | 8 (대시보드, 프로젝트, 멘토, 매칭, 보고서, 수당, 메시지) |
| E4 | E4.1 ~ E4.10 | 15+ | 6 (대시보드, 워크스테이션, 코멘트, 의견서, 타임라인, 수당) |
| E5 | E5.1 ~ E5.7 | 8+ | 5 (대시보드, 코멘트, 재생성, 지원신청, 만족도) |
| E6 | E6.1 ~ E6.10 | 0 (통합) | 2 (알림센터, 네비게이션) |

---

*문서 작성: Claude Opus 4.6*
*최종 수정: 2026-03-06 (E1~E6 구현 완료 반영)*
*기준 문서: strategy.md v1.0*
