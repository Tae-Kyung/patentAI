# CASA 리팩토링 전략 및 절차

> **작성일**: 2026-03-08
> **대상**: CASA MVP 코드베이스 전체 (294 파일, 131 API 라우트)
> **목표**: 기능 100% 보존하면서 코드 품질, 성능, 보안, 유지보수성 최적화

---

## 1. 현황 분석 요약

### 1.1 코드베이스 규모

| 영역 | 파일 수 | 비고 |
|------|---------|------|
| API 라우트 | 131 | 40+ 파일이 100줄 초과 |
| 페이지 (pages) | 46 | 17 파일이 200줄 초과 |
| Feature 컴포넌트 | 38 | 9 파일이 200줄 초과 |
| UI/공통 컴포넌트 | 32 | 대체로 양호 |
| 라이브러리 (lib) | 28 | 잘 구조화됨 |
| 타입 정의 | 5 | 양호 |
| 커스텀 훅 | 1 | **부족** - 확장 필요 |

### 1.2 핵심 문제점

| 우선순위 | 문제 | 영향 | 위치 |
|----------|------|------|------|
| CRITICAL | N+1 쿼리 패턴 | 성능 저하 (기관 100개 = 300+ 쿼리) | `admin/overview/route.ts` 등 |
| HIGH | API 라우트 중복 코드 | 유지보수 비용 증가 | 문서 생성 8개, confirm 6개, cancel 4개 |
| HIGH | 모놀리식 페이지 컴포넌트 | 렌더링 성능, 가독성 | 1,000줄 초과 파일 2개 |
| HIGH | Zod 검증 누락 | 보안 취약점 | 7-10개 API 라우트 |
| MEDIUM | 순차 쿼리 (병렬화 가능) | 응답 지연 | 5+ API 라우트 |
| MEDIUM | 반복되는 상태 관리 패턴 | 보일러플레이트 | 69개 클라이언트 컴포넌트 |
| MEDIUM | 하드코딩된 문자열 | i18n 미적용 | DocumentStage 등 |
| LOW | 사용하지 않는 코드 | 번들 크기 | encryption.ts, feature-flags |
| LOW | 설정값 분산 | 관리 어려움 | 여러 파일에 상수 산재 |

---

## 2. 리팩토링 원칙

### 2.1 절대 원칙 (위반 불가)

1. **기능 보존 100%**: 모든 리팩토링 단계에서 기존 기능이 동일하게 작동해야 함
2. **단계적 적용**: 한 번에 하나의 영역만 리팩토링, 각 단계마다 검증
3. **롤백 가능**: 각 단계는 독립적 커밋, 문제 발생 시 즉시 롤백 가능
4. **테스트 우선**: 리팩토링 전 핵심 기능의 동작을 수동/자동으로 확인

### 2.2 리팩토링 가이드라인

- 인터페이스(API 응답 구조) 변경 금지 - 프론트엔드와 백엔드 동시 수정 시에만 허용
- 파일 이동/이름 변경은 import 경로 전체 업데이트 후 수행
- 새로운 의존성 추가 최소화
- 과도한 추상화 지양 - 3회 이상 반복되는 패턴만 추출

---

## 3. 리팩토링 단계 (Phase)

### Phase 0: 준비 (Pre-Refactoring)

**목표**: 안전한 리팩토링을 위한 기반 마련

| 작업 | 설명 | 예상 변경 |
|------|------|-----------|
| 0-1 | 현재 상태의 git 태그 생성 (`v1.0-pre-refactor`) | 태그만 |
| 0-2 | 주요 API 엔드포인트 수동 테스트 체크리스트 작성 | 문서 |
| 0-3 | 핵심 플로우 E2E 확인 (프로젝트 생성→문서 생성→멘토링→보고서→수당) | 테스트 |

---

### Phase 1: 보안 강화 (Security Hardening)

**목표**: 입력 검증 누락 및 보안 취약점 해결
**위험도**: 낮음 (기존 로직에 검증만 추가)

#### 1-1. Zod 스키마 추가 (누락된 API 라우트)

**대상 파일**:
```
src/app/api/projects/[id]/feedbacks/route.ts
src/app/api/mentor/sessions/[sessionId]/route.ts
src/app/api/institution/payouts/[id]/approve/route.ts
src/app/api/admin/mentors/[id]/approve/route.ts
src/app/api/projects/[id]/request-approval/route.ts
src/app/api/mentor/reports/[reportId]/route.ts
src/app/api/mentor/feedbacks/[feedbackId]/route.ts
```

**패턴**:
```typescript
// Before
const body = await request.json()
// body 직접 사용 - 위험

// After
import { z } from 'zod'
const schema = z.object({
  field: z.string().min(1).max(1000),
  // ...
})
const body = schema.parse(await request.json())
```

#### 1-2. UUID 파라미터 검증

**모든 동적 라우트**에 UUID 형식 검증 추가:
```typescript
const { id } = await context.params
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
  return errorResponse('잘못된 ID 형식입니다.', 400)
}
```

#### 1-3. 쿼리 파라미터 검증

정렬, 페이징 등 쿼리 파라미터에 Zod 검증 적용:
```
src/app/api/institution/matches/route.ts (sort, sort_dir)
src/app/api/admin/dashboard/route.ts (page, limit)
src/app/api/mentor/projects/route.ts (pagination)
```

#### 1-4. 중복 인증 가드 제거

`requireProjectOwner()` 후 `requireAuth()` 중복 호출 제거:
```
src/app/api/projects/[id]/documents/[docId]/confirm/route.ts
src/app/api/projects/[id]/evaluation/confirm/route.ts
src/app/api/projects/[id]/idea/confirm/route.ts
```

**검증**: 각 파일 수정 후 해당 API 엔드포인트 호출 테스트

---

### Phase 2: 성능 최적화 (Performance)

**목표**: N+1 쿼리 제거, 순차 쿼리 병렬화
**위험도**: 중간 (쿼리 로직 변경)

#### 2-1. N+1 쿼리 제거

**`src/app/api/admin/overview/route.ts`** (CRITICAL):
```typescript
// Before: 기관마다 3개 쿼리 루프 = 기관 N개 × 3 = 3N 쿼리
for (const inst of institutions) {
  const mentors = await supabase...
  const projects = await supabase...
  const sessions = await supabase...
}

// After: 배치 쿼리 3개로 통합
const [allMentors, allProjects, allSessions] = await Promise.all([
  supabase.from('bi_mentor_matches').select('institution_id, mentor_id').in('institution_id', instIds),
  supabase.from('bi_projects').select('institution_id').in('institution_id', instIds),
  supabase.from('bi_mentoring_sessions').select('match_id, ...').in('match_id', matchIds),
])
// 메모리에서 기관별 그룹핑
```

**`src/app/api/institution/stats/route.ts`**: 동일 패턴 적용

#### 2-2. 순차 쿼리 병렬화

**`src/app/api/projects/[id]/route.ts`** (lines 69-104):
```typescript
// Before: 4개 순차 쿼리
const ideaCard = await supabase...
const evaluation = await supabase...
const documents = await supabase...
const review = await supabase...

// After: Promise.all로 병렬화
const [ideaCard, evaluation, documents, review] = await Promise.all([
  supabase.from('bi_idea_cards')...,
  supabase.from('bi_evaluations')...,
  supabase.from('bi_documents')...,
  supabase.from('bi_feedbacks')...,
])
```

**기타 병렬화 대상**:
```
src/app/api/admin/institutions/[id]/route.ts (mentorCount, projectCount, memberCount)
src/app/api/institution/reports/[id]/confirm/route.ts (후반부 쿼리들)
src/app/api/projects/[id]/apply-institution/route.ts (기관/프로그램 조회)
```

**검증**: 응답 데이터가 변경 전과 동일한지 비교 테스트

---

### Phase 3: API 라우트 통합 (Backend DRY)

**목표**: 중복 API 로직을 공유 유틸리티로 추출
**위험도**: 중간 (로직 이동, API 응답 구조 유지)

#### 3-1. 문서 생성 팩토리 패턴

**신규 파일**: `src/lib/services/document-generator.ts`

8개 문서 생성 라우트의 공통 로직 추출:
```typescript
interface DocumentGeneratorConfig {
  docType: string
  promptCategory: string
  creditCost: number
  buildContext: (project, idea, evaluation) => Record<string, string>
}

export async function generateDocument(
  request: NextRequest,
  projectId: string,
  config: DocumentGeneratorConfig
) {
  // 1. 인증 (requireProjectOwner)
  // 2. 프로젝트/아이디어/평가 데이터 조회
  // 3. gate_2_passed 확인
  // 4. 기존 문서 확인 (confirmed 여부)
  // 5. 크레딧 차감
  // 6. 프롬프트 조회 및 AI 호출
  // 7. SSE 스트리밍 또는 결과 저장
  // 8. 결과 반환
}
```

**대상 파일** (각 파일이 30-50줄로 축소):
```
documents/business-plan/route.ts
documents/pitch/route.ts
documents/startup-application/route.ts
documents/infographic/route.ts
documents/leaflet/route.ts
documents/ppt/route.ts
documents/landing/route.ts
documents/gtm-checklist/route.ts
```

#### 3-2. Confirm/Cancel 유틸리티

**신규 파일**: `src/lib/services/confirmation.ts`

```typescript
export async function confirmResource(params: {
  table: string
  id: string
  userId: string
  projectId: string
  gateField?: string
  gateValue?: number
}) {
  // 1. 리소스 조회
  // 2. 이미 확인됨 체크
  // 3. 내용 존재 체크
  // 4. is_confirmed 업데이트
  // 5. 게이트 진행 (옵션)
}
```

**대상**: confirm 6개 + cancel-confirm 4개 = 10개 라우트

#### 3-3. 사용자 삭제 카스케이드 정리

**`src/app/api/admin/users/[id]/route.ts`** (221줄):
- 16개 테이블 수동 삭제 → DB 트리거 또는 서비스 함수로 추출
- **신규 파일**: `src/lib/services/user-cleanup.ts`

#### 3-4. SSE 스트리밍 공통화

**신규 파일**: `src/lib/services/sse-generator.ts`

AI 스트리밍 응답을 SSE로 변환하는 공통 로직:
```typescript
export function createSSEDocumentStream(params: {
  promptKey: string
  variables: Record<string, string>
  model?: string
  onComplete: (content: string) => Promise<void>
}): ReadableStream
```

**대상**: evaluate, diagnosis, strategy, document 생성 등 SSE 사용 라우트

**검증**: 각 문서 타입별 생성 테스트, 결과물 동일성 확인

---

### Phase 4: 프론트엔드 컴포넌트 분리 (Frontend Decomposition)

**목표**: 1,000줄 초과 모놀리식 컴포넌트를 분리하고 재사용 가능한 패턴 추출
**위험도**: 중간-높음 (UI 상태 관리 변경)

#### 4-1. 커스텀 훅 추출

**신규 파일**: `src/hooks/useDataFetching.ts`
```typescript
export function useDataFetching<T>(url: string, deps?: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // fetch 로직, 에러 처리, 재시도
  return { data, isLoading, error, refetch }
}
```

**신규 파일**: `src/hooks/usePagination.ts`
```typescript
export function usePagination(totalItems: number, itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  // 페이징 로직
  return { currentPage, totalPages, setCurrentPage, paginatedItems }
}
```

**신규 파일**: `src/hooks/useFormDialog.ts`
```typescript
export function useFormDialog<T>() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  return { isOpen, editingItem, isSaving, open, close, save }
}
```

#### 4-2. 대형 페이지 컴포넌트 분리

**`projects/[id]/mentoring/page.tsx`** (1,011줄 → 4-5개 파일):
```
src/app/[locale]/(dashboard)/projects/[id]/mentoring/
├── page.tsx                    (~150줄, 메인 레이아웃)
├── _components/
│   ├── SessionList.tsx         (~200줄, 세션 목록/관리)
│   ├── SessionForm.tsx         (~150줄, 세션 생성/수정)
│   ├── FeedbackSection.tsx     (~200줄, 피드백 목록)
│   └── FeedbackForm.tsx        (~100줄, 피드백 작성)
```

**`features/document/DocumentStage.tsx`** (1,103줄 → 4-5개 파일):
```
src/features/document/components/
├── DocumentStage.tsx           (~200줄, 메인 컨테이너)
├── DocumentGenerator.tsx       (~200줄, 생성 로직)
├── DocumentPreview.tsx         (~200줄, 미리보기/슬라이드)
├── DocumentExport.tsx          (~150줄, 내보내기)
└── RevisionDialog.tsx          (~100줄, 수정 요청)
```

**기타 분리 대상** (200줄 이상):
```
features/evaluation/EvaluationStage.tsx (858줄)
features/review/ReviewStage.tsx (842줄)
features/idea/IdeaStage.tsx (828줄)
institution/messages/page.tsx (829줄)
institution/reports/page.tsx (642줄)
institution/payouts/page.tsx (639줄)
```

#### 4-3. 재사용 가능한 UI 컴포넌트 추출

**`src/components/common/DataTable.tsx`**: 데이터 테이블 (15+ 페이지에서 사용)
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading: boolean
  emptyMessage: string
  pagination?: PaginationProps
  onRowClick?: (item: T) => void
}
```

**`src/components/common/StatusBadge.tsx`**: 상태 뱃지 (10+ 페이지에서 사용)
```typescript
interface StatusBadgeProps {
  status: string
  statusMap: Record<string, { label: string; variant: string }>
}
```

**`src/components/common/ConfirmDialog.tsx`**: 확인 다이얼로그 (삭제/승인 등)

**검증**: 각 페이지별 UI 렌더링 비교, 상호작용 테스트

---

### Phase 5: 코드 정리 (Cleanup)

**목표**: 죽은 코드 제거, 설정 통합, i18n 완성
**위험도**: 낮음

#### 5-1. 죽은 코드 제거

```
src/lib/security/encryption.ts     → 삭제 (0개 사용처)
src/lib/security/encryption.test.ts → 삭제
src/lib/feature-flags.ts           → 실사용 플래그만 남기고 정리
```

#### 5-2. 설정 통합

**신규 파일**: `src/config/constants.ts`
```typescript
export const APP_CONFIG = {
  pagination: { defaultPageSize: 10, maxPageSize: 100 },
  cache: { promptTTL: 3600, defaultTTL: 300 },
  credits: { defaultCost: 1 },
  ai: { defaultProvider: 'claude', fallbackOrder: ['claude', 'openai', 'gemini'] },
}
```

#### 5-3. 하드코딩된 문자열 i18n 전환

```
src/features/document/components/DocumentStage.tsx
  - 'Word export failed' → t('document.exportFailed')
  - 'PowerPoint export failed' → t('document.pptExportFailed')
```

#### 5-4. 중복 유틸리티 통합

`escapeHtml()` 함수가 2개 파일에 중복:
```
src/lib/templates/ppt-template.ts
src/lib/templates/ppt-image-template.ts
→ src/lib/utils/html.ts로 통합
```

#### 5-5. console.log 정리

에러 로깅은 유지하되, 구조화된 로깅으로 전환 검토:
```typescript
// Before
console.error('Payout creation error:', error.message)

// After (Sentry 활용)
Sentry.captureException(error, { tags: { module: 'payout' } })
```

---

## 4. 실행 절차 (Procedure)

### 4.1 각 Phase 실행 순서

```
1. git checkout -b refactor/phase-N-description
2. 변경 대상 파일 목록 확인
3. 변경 전 해당 기능 동작 확인 (수동 테스트)
4. 코드 변경 (한 파일씩, 작은 커밋)
5. 변경 후 동일 기능 동작 확인
6. 코드 리뷰 (diff 확인)
7. main 브랜치에 병합
8. 프로덕션 배포 후 모니터링
```

### 4.2 각 Phase별 검증 체크리스트

#### Phase 1 (보안) 검증
- [ ] 잘못된 입력으로 API 호출 시 400 에러 반환 확인
- [ ] 정상 입력으로 API 호출 시 기존과 동일하게 작동 확인
- [ ] UUID 아닌 값으로 동적 라우트 호출 시 거부 확인

#### Phase 2 (성능) 검증
- [ ] admin/overview 페이지 로딩 속도 개선 확인
- [ ] 프로젝트 상세 페이지 응답 시간 비교
- [ ] API 응답 데이터 구조가 변경 전과 동일한지 확인

#### Phase 3 (API 통합) 검증
- [ ] 모든 문서 타입 생성 테스트 (business-plan, pitch, ppt 등)
- [ ] confirm/cancel-confirm 모든 스테이지 테스트
- [ ] SSE 스트리밍 정상 작동 확인
- [ ] 크레딧 차감 정상 확인

#### Phase 4 (프론트엔드) 검증
- [ ] 멘토링 워크스테이션 페이지 전체 기능 테스트
- [ ] 문서 생성/미리보기/내보내기 테스트
- [ ] 메시지 보내기/받기/삭제 테스트
- [ ] 반응형 레이아웃 확인 (모바일/데스크톱)
- [ ] 다크모드 확인

#### Phase 5 (정리) 검증
- [ ] 빌드 성공 확인 (`npm run build`)
- [ ] 타입 에러 없음 확인
- [ ] 삭제된 코드에 의존하는 import 없음 확인

### 4.3 롤백 절차

```bash
# 문제 발생 시 즉시 롤백
git revert <commit-hash>
git push

# 심각한 문제 시 Phase 전체 롤백
git revert --no-commit <phase-first-commit>..<phase-last-commit>
git commit -m "revert: Phase N 롤백 - [사유]"
git push
```

---

## 5. 실행 우선순위 및 일정

```
Phase 0: 준비           ─ 즉시
Phase 1: 보안 강화       ─ 우선 (위험 최소, 효과 높음)
Phase 2: 성능 최적화     ─ 다음 (N+1 쿼리는 즉시 체감)
Phase 3: API 통합        ─ 핵심 (가장 큰 코드 감소)
Phase 4: 프론트엔드 분리  ─ 주의 필요 (변경 범위 넓음)
Phase 5: 코드 정리       ─ 마무리 (안전한 작업)
```

### 예상 코드 변화

| Phase | 변경 파일 수 | 신규 파일 | 삭제 파일 | 순 코드 감소 |
|-------|-------------|-----------|-----------|-------------|
| 1 | ~15 | 0 | 0 | 0 (추가만) |
| 2 | ~8 | 0 | 0 | ~100줄 |
| 3 | ~25 | 4 | 0 | ~1,500줄 |
| 4 | ~30 | 15 | 0 | ~2,000줄 |
| 5 | ~10 | 1 | 2 | ~500줄 |
| **합계** | **~88** | **20** | **2** | **~4,100줄** |

---

## 6. 신규 파일 구조 (리팩토링 후)

```
src/
├── lib/
│   ├── services/               # [신규] 비즈니스 로직 서비스 레이어
│   │   ├── document-generator.ts
│   │   ├── confirmation.ts
│   │   ├── sse-generator.ts
│   │   └── user-cleanup.ts
│   └── utils/
│       └── html.ts             # [신규] HTML 유틸리티
├── hooks/                      # [확장] 커스텀 훅
│   ├── useSSE.ts               # [기존]
│   ├── useDataFetching.ts      # [신규]
│   ├── usePagination.ts        # [신규]
│   └── useFormDialog.ts        # [신규]
├── components/
│   └── common/                 # [확장] 공통 컴포넌트
│       ├── DataTable.tsx        # [신규]
│       ├── StatusBadge.tsx      # [신규]
│       └── ConfirmDialog.tsx    # [신규]
└── config/
    └── constants.ts            # [신규] 통합 설정
```

---

## 7. 위험 관리

### 높은 위험 작업

| 작업 | 위험 | 대응 |
|------|------|------|
| 문서 생성 팩토리 추출 (Phase 3) | 8개 라우트 동시 영향 | 한 타입씩 전환, 각각 테스트 |
| 페이지 컴포넌트 분리 (Phase 4) | 상태 관리 버그 | props drilling 대신 context 검토, 각 컴포넌트 개별 테스트 |
| N+1 쿼리 제거 (Phase 2) | 데이터 누락 | 변경 전/후 응답 JSON 비교 |

### 하지 않을 것

- **DB 스키마 변경**: 리팩토링 범위에서 제외 (마이그레이션 위험)
- **인증 체계 변경**: requireAuth/requireProjectOwner 등 기존 가드 구조 유지
- **API 응답 구조 변경**: 프론트엔드 호환성 유지
- **프레임워크 업그레이드**: Next.js 버전 변경 등은 별도 작업
- **Server Component 전환**: use client → server 전환은 리팩토링 범위 초과 (별도 과제)

---

## 8. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 100줄 초과 API 라우트 | 40+ | 15 이하 |
| 200줄 초과 컴포넌트 | 26 | 10 이하 |
| N+1 쿼리 | 3-5개 | 0 |
| Zod 검증 누락 API | 7-10개 | 0 |
| 중복 코드 블록 | 15+ | 3 이하 |
| 커스텀 훅 | 1개 | 4개 이상 |
| 빌드 에러 | 0 | 0 (유지) |
