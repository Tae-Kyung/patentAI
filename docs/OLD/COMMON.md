# SaaS 공통 개발 가이드 — Vibe Coding Edition

> **목적:** AI 기반 코딩(Vibe Coding)으로 SaaS를 빌드할 때, 반복적인 시행착오 없이 처음부터 견고하게 구현하기 위한 실전 가이드.
> **기반:** AskDocs RAG Platform 개발 과정에서의 30+ 개선 사항 + 업계 공통 사례 분석
> **대상 스택:** Next.js (App Router) + Supabase + Tailwind CSS + Vercel (유사 스택에도 적용 가능)

---

## 목차

1. [프로젝트 초기 설정](#1-프로젝트-초기-설정)
2. [데이터베이스 설계](#2-데이터베이스-설계)
3. [인증 & 멀티테넌트 보안](#3-인증--멀티테넌트-보안)
4. [API 설계 패턴](#4-api-설계-패턴)
5. [프론트엔드 UX 패턴](#5-프론트엔드-ux-패턴)
6. [성능 & 대량 처리](#6-성능--대량-처리)
7. [배포 & 운영](#7-배포--운영)
8. [테스트 전략](#8-테스트-전략)
9. [마스터 체크리스트](#9-마스터-체크리스트)

---

## 1. 프로젝트 초기 설정

### 1.1 코드를 작성하기 전에 준비할 것

AI에게 코드를 요청하기 **전에** 아래 문서를 먼저 작성한다:

| 문서 | 내용 | 이유 |
|------|------|------|
| **PRD** | 사용자 역할, 핵심 기능, 데이터 엔티티, 가격 정책 | AI에게 일관된 컨텍스트 제공 |
| **CLAUDE.md** | 기술 스택, 폴더 구조, 코딩 컨벤션, 환경변수 | 모든 세션에서 동일한 규칙 적용 |
| **DB 스키마** | 테이블, FK, 인덱스, RLS 정책 | 나중에 FK 추가하면 마이그레이션 지옥 |
| **.env.example** | 모든 환경변수 목록 + 설명 | 비밀키 하드코딩 방지 |

> **실패 사례:** AI는 종종 API 키를 클라이언트 코드에 직접 넣거나, DB 스키마 없이 JSON 블롭에 모든 것을 저장한다. PRD와 스키마가 없으면 세션마다 다른 패턴이 생긴다.

### 1.2 폴더 구조 — 첫 커밋에서 확정

```
src/
├── app/                    # 라우트 (페이지 + API)
│   ├── (public)/           # 비인증 페이지
│   ├── dashboard/          # 인증 필요 페이지
│   ├── admin/              # 관리자 전용
│   └── api/
│       ├── owner/          # 인증 API (세션 기반)
│       ├── v1/             # 퍼블릭 API (API 키 기반)
│       └── webhooks/       # 외부 서비스 웹훅
├── components/             # 공유 UI 컴포넌트
├── features/               # 도메인별 컴포넌트
├── lib/                    # 비즈니스 로직 (auth, billing, rag 등)
├── hooks/                  # 커스텀 훅
├── types/                  # TypeScript 타입
├── config/                 # 상수, 설정
└── i18n/                   # 다국어 메시지
```

### 1.3 공유 컴포넌트 — 기능 구현 전에 만들 것

첫 기능을 만들기 전에 아래 공통 컴포넌트를 먼저 구축:

```typescript
// 이것들을 먼저 만들면 이후 모든 기능이 일관된 UX를 가진다
components/
├── ConfirmModal.tsx       // window.confirm() 절대 사용 금지
├── LoadingSpinner.tsx     // 모든 비동기 작업의 로딩 표시
├── EmptyState.tsx         // 데이터 없을 때 표시
├── ErrorMessage.tsx       // 에러 표시 (일관된 스타일)
├── Pagination.tsx         // 모든 목록에 사용
├── DataTable.tsx          // 체크박스 + 정렬 + 벌크 액션
├── ProgressBar.tsx        // 장시간 작업 진행률
├── ThemeToggle.tsx        // 다크모드 토글
└── MobileDrawer.tsx       // 모바일 사이드바
```

> **실패 사례:** `window.confirm()`으로 삭제를 구현한 뒤, 나중에 모든 삭제 로직을 커스텀 모달로 교체해야 했다. 처음부터 `ConfirmModal`을 만들었으면 5분이면 됐을 일에 1시간을 썼다.

---

## 2. 데이터베이스 설계

### 2.1 FK + CASCADE — 첫 마이그레이션에서 모두 정의

**규칙:** 부모-자식 관계는 반드시 FK + `ON DELETE CASCADE`를 첫 마이그레이션에 포함한다.

```sql
-- WRONG: FK 없이 나중에 추가
CREATE TABLE qa_pairs (
  id UUID PRIMARY KEY,
  bot_id UUID NOT NULL,              -- FK 없음!
  document_id UUID,                  -- FK 없음!
  question TEXT NOT NULL,
  answer TEXT NOT NULL
);

-- RIGHT: 첫 마이그레이션에서 완성
CREATE TABLE qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

> **실패 사례:** `qa_pairs`에 `document_id` FK가 없어서, 문서를 삭제해도 Q&A가 고아(orphan)로 남았다. 운영 중 마이그레이션으로 FK를 추가하면서 데이터 정합성 이슈가 발생했다.

### 2.2 인덱스 — WHERE, JOIN, ORDER BY 컬럼에 필수

```sql
-- 자주 쿼리하는 컬럼에 인덱스 추가
CREATE INDEX idx_documents_bot_id ON documents(bot_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX idx_usage_records_user_period ON usage_records(user_id, period_start);

-- 벡터 검색 인덱스 (pgvector)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 2.3 RLS (Row Level Security) — 첫날부터 활성화

```sql
-- 모든 사용자 데이터 테이블에 RLS 필수
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own bots" ON bots
  FOR ALL USING (auth.uid() = user_id);

-- End User가 접근하는 테이블은 service role INSERT 허용
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role inserts" ON conversations
  FOR INSERT WITH CHECK (true);  -- service role client로만 접근
CREATE POLICY "Bot owners read" ON conversations
  FOR SELECT USING (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));
```

### 2.4 사용량 추적 함수 — 배치 지원 필수

```typescript
// WRONG: 루프에서 개별 호출 (N*2 DB 호출)
for (const item of items) {
  await incrementDocumentCount(userId);  // 2 DB calls each!
}

// RIGHT: 배치 카운트 지원 (2 DB 호출)
export async function incrementDocumentCount(
  userId: string,
  count: number = 1   // <-- 배치 파라미터
): Promise<void> {
  const usage = await getOrCreateUsageRecord(userId);
  if (!usage) return;
  await supabase
    .from('usage_records')
    .update({ documents_used: (usage.documents_used ?? 0) + count })
    .eq('id', usage.id);
}

// 호출
await incrementDocumentCount(userId, items.length);  // 단 1회
```

> **실패 사례:** Q&A 500건 일괄 업로드 시 `incrementDocumentCount`를 500번 호출 → 1,000 DB 쿼리 → 10% 진행률에서 수 분간 정체. `count` 파라미터 추가로 2 DB 쿼리로 해결.

### 2.5 Race Condition 처리

```typescript
// 월별 사용량 레코드 생성 시 동시 요청 처리
const { data: created, error } = await supabase
  .from('usage_records')
  .insert({ user_id: userId, period_start: periodStart, ... })
  .select()
  .single();

if (error) {
  // 다른 요청이 먼저 생성했을 수 있음 → 조회로 fallback
  const { data: retry } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', periodStart)
    .single();
  return retry;
}
```

---

## 3. 인증 & 멀티테넌트 보안

### 3.1 크로스 엔티티 소유권 검증 — 가장 흔한 보안 실수

**규칙:** 클라이언트가 보내는 모든 ID가 현재 요청의 맥락에 속하는지 검증한다.

```typescript
// CRITICAL: conversation_id가 현재 bot_id 소유인지 검증
// WRONG: 클라이언트가 보낸 conversation_id를 그대로 사용
let convId = conversation_id;

// RIGHT: 소유권 검증 후 사용
const { data: existingConv } = await supabase
  .from('conversations')
  .select('id')
  .eq('id', convId)
  .eq('bot_id', bot_id)  // 소유권 검증!
  .single();

if (!existingConv) {
  // 다른 봇의 대화 → 새 대화 생성
  const { data: conv } = await supabase
    .from('conversations')
    .insert({ bot_id, language: detectedLang })
    .select('id')
    .single();
  convId = conv?.id;
}
```

> **실패 사례:** 학사규정봇이 다른 봇의 Q&A 데이터를 참고해서 답변. 원인은 `conversation_id`를 `bot_id`와 교차 검증하지 않아서 다른 봇의 대화 이력이 로드된 것.

### 3.2 인증 가드 패턴

```typescript
// 모든 보호된 API 라우트에 일관된 가드 적용
export async function requireAuth(): Promise<User>
export async function requireAdmin(): Promise<User>
export async function requireOwner(botId: string): Promise<User>
export async function requirePlan(minPlan: PlanId): Promise<Subscription>

// 사용 예
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireOwner(botId);
    // ... 비즈니스 로직
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    return errorResponse('Internal server error', 500);
  }
}
```

### 3.3 API 키 보안

```typescript
// API 키는 절대 원본 저장하지 않는다
const key = `ask_${crypto.randomBytes(32).toString('hex')}`;
const keyHash = crypto.createHash('sha256').update(key).digest('hex');
const keyPrefix = key.substring(0, 8);

// DB에는 해시와 prefix만 저장
await supabase.from('api_keys').insert({
  key_hash: keyHash,      // 검증용 (SHA-256)
  key_prefix: keyPrefix,  // 표시용 (ask_xxxx)
});

// 원본 키는 생성 시 1회만 사용자에게 표시
return { key, prefix: keyPrefix };
```

### 3.4 입력 검증 — 모든 API 라우트에 Zod

```typescript
import { z } from 'zod';

const CreateBotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().max(5000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(100).max(4000).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateBotSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message);
  }
  // parsed.data는 타입 안전
}
```

---

## 4. API 설계 패턴

### 4.1 일관된 응답 형태

```typescript
// 모든 API 응답은 동일한 shape
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
```

### 4.2 목록 API — 페이지네이션 + 필터링 필수

**규칙:** 첫 구현부터 20건 이상 될 수 있는 모든 목록에 페이지네이션을 적용한다.

```typescript
// API 설계
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type') || 'all';  // 타입 필터
  const offset = (page - 1) * limit;

  // 쿼리 빌더
  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('bot_id', botId);

  if (type !== 'all') {
    query = query.eq('file_type', type);
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // 타입별 카운트 (필터 탭 배지용)
  const { data: countData } = await supabase.rpc('count_by_type', { bot: botId });

  return successResponse({
    documents: data || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    counts: { all: count, file: countData.file, url: countData.url, qa: countData.qa },
  });
}
```

### 4.3 SSE 스트리밍 — 3초 이상 걸리는 작업

**규칙:** 3초 이상 걸릴 수 있는 모든 API는 SSE 스트리밍으로 진행률을 제공한다.

```typescript
// === 서버 측 패턴 ===

// 1단계: 스트리밍 전에 검증 (JSON 에러 반환)
try {
  const user = await requireOwner(botId);
  const body = await request.json();
  // 모든 검증 로직...
  if (!valid) return errorResponse('Validation failed');
} catch (err) {
  return errorResponse(err.message, err.status);
}

// 2단계: 검증 통과 후 스트리밍 시작
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    function send(data: Record<string, unknown>) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }

    try {
      send({ phase: 'prepare', message: 'Preparing...', progress: 5 });
      // ... 작업 수행, 단계별 send() 호출 ...
      send({ phase: 'done', message: 'Complete!', progress: 100 });
    } catch (err) {
      send({ phase: 'error', message: err.message });
    } finally {
      controller.close();
    }
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

```typescript
// === 클라이언트 측 패턴 ===

const res = await fetch(url, { method: 'POST', body: JSON.stringify(data) });

// Content-Type으로 에러 vs 스트림 구분
const contentType = res.headers.get('content-type') || '';
if (contentType.includes('application/json')) {
  const json = await res.json();
  setError(json.error);
  return;
}

// SSE 스트림 읽기
const reader = res.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value, { stream: true });
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));

    setProgress({ phase: event.phase, message: event.message, progress: event.progress });

    if (event.phase === 'done') { /* 완료 처리 */ }
    if (event.phase === 'error') { setError(event.message); }
  }
}
```

```tsx
// === 프로그레스 바 UI ===

{progress && (
  <div className="mt-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {progress.message}
      </span>
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
        {progress.progress}%
      </span>
    </div>
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
        style={{ width: `${progress.progress}%` }}
      />
    </div>
  </div>
)}
```

### 4.4 파일 다운로드 — Signed URL 패턴

```typescript
// 비공개 스토리지의 파일을 안전하게 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await requireOwner(botId);

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, file_name')
    .eq('id', docId)
    .single();

  if (!doc?.storage_path) return errorResponse('No file available', 404);

  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 60);  // 60초 유효

  return successResponse({
    url: signedData.signedUrl,
    file_name: doc.file_name,
  });
}

// 클라이언트에서 다운로드 트리거
const res = await fetch(`/api/download/${docId}`);
const { data } = await res.json();
const a = document.createElement('a');
a.href = data.url;
a.download = data.file_name;
a.click();
```

---

## 5. 프론트엔드 UX 패턴

### 5.1 다크 모드 — 컴포넌트 작성 규칙

**규칙:** 모든 컴포넌트에서 아래 매핑을 일관되게 적용한다. `dark:` 없는 색상 클래스는 코드 리뷰에서 거부한다.

```
┌─────────────────────┬──────────────────────────┐
│ Light Mode          │ Dark Mode                │
├─────────────────────┼──────────────────────────┤
│ bg-white            │ dark:bg-gray-900         │
│ bg-gray-50          │ dark:bg-gray-800         │
│ bg-gray-100         │ dark:bg-gray-700         │
│ text-gray-900       │ dark:text-white          │
│ text-gray-700       │ dark:text-gray-200       │
│ text-gray-500       │ dark:text-gray-400       │
│ text-gray-400       │ dark:text-gray-500       │
│ border-gray-200     │ dark:border-gray-700     │
│ border-gray-300     │ dark:border-gray-600     │
│ divide-gray-200     │ dark:divide-gray-700     │
│ ring-gray-300       │ dark:ring-gray-600       │
│ hover:bg-gray-50    │ dark:hover:bg-gray-800   │
│ hover:bg-gray-100   │ dark:hover:bg-gray-700   │
│ placeholder-gray-400│ dark:placeholder-gray-500│
│ shadow-sm           │ dark:shadow-gray-900/20  │
└─────────────────────┴──────────────────────────┘
```

```tsx
// next-themes 설정 (layout.tsx)
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

> **실패 사례:** 37개 파일에 걸쳐 다크모드를 사후 적용. 텍스트 가시성 문제로 추가 수정 필요. 위 매핑 테이블을 첫날부터 적용했으면 전부 방지 가능했다.

### 5.2 반응형 레이아웃 — 대시보드 필수 패턴

```tsx
// 대시보드 레이아웃 — 첫 구현부터 모바일 지원
export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 — 모바일: 슬라이드 드로어, 데스크톱: 고정 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setSidebarOpen(true)}>
            <MenuIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 5.3 삭제 확인 모달 — window.confirm() 절대 금지

```tsx
// 재사용 가능한 삭제 확인 상태 패턴
type DeleteConfirm =
  | { type: 'single'; id: string; name: string }
  | { type: 'bulk'; count: number }
  | null;

const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);

// 삭제 요청 (모달 표시)
const handleDeleteRequest = (id: string, name: string) => {
  setDeleteConfirm({ type: 'single', id, name });
};

const handleBulkDeleteRequest = () => {
  setDeleteConfirm({ type: 'bulk', count: selectedIds.size });
};

// 실제 삭제 실행
const confirmDelete = async () => {
  if (!deleteConfirm) return;
  if (deleteConfirm.type === 'single') {
    await deleteItem(deleteConfirm.id);
  } else {
    await bulkDelete([...selectedIds]);
  }
  setDeleteConfirm(null);
};

// 모달 UI
{deleteConfirm && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        삭제 확인
      </h3>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {deleteConfirm.type === 'single'
          ? `"${deleteConfirm.name}"을(를) 삭제하시겠습니까?`
          : `선택한 ${deleteConfirm.count}개 항목을 삭제하시겠습니까?`}
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={() => setDeleteConfirm(null)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
          취소
        </button>
        <button onClick={confirmDelete}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
          삭제
        </button>
      </div>
    </div>
  </div>
)}
```

### 5.4 목록 UI — 체크박스 + 벌크 액션 + 페이지네이션

```tsx
// 모든 데이터 테이블의 표준 패턴
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [currentPage, setCurrentPage] = useState(1);
const [filterType, setFilterType] = useState('all');

// 전체 선택 체크박스 (indeterminate 상태 포함)
<input
  type="checkbox"
  ref={(el) => {
    if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < items.length;
  }}
  checked={selectedIds.size === items.length && items.length > 0}
  onChange={toggleSelectAll}
/>

// 필터 탭 (카운트 배지 포함)
<div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
  {['all', 'file', 'url', 'qa'].map((type) => (
    <button
      key={type}
      onClick={() => { setFilterType(type); setCurrentPage(1); }}
      className={`px-3 py-2 text-sm rounded-t-lg ${
        filterType === type
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {type.toUpperCase()}
      <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
        {counts[type]}
      </span>
    </button>
  ))}
</div>

// 벌크 액션 바 (선택 시 표시)
{selectedIds.size > 0 && (
  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg flex items-center justify-between">
    <span className="text-sm text-blue-700 dark:text-blue-300">
      {selectedIds.size}개 선택됨
    </span>
    <button onClick={handleBulkDeleteRequest}
      className="text-sm text-red-600 dark:text-red-400 hover:underline">
      선택 삭제
    </button>
  </div>
)}
```

### 5.5 3가지 필수 상태 — 로딩, 에러, 빈 상태

**규칙:** 모든 데이터 페칭 컴포넌트는 아래 3가지 상태를 반드시 처리한다.

```tsx
// 모든 비동기 데이터 컴포넌트의 패턴
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} onRetry={reload} />;
if (data.length === 0) return <EmptyState
  icon={<DocumentIcon />}
  title="문서가 없습니다"
  description="PDF, URL, Q&A를 업로드하여 지식 베이스를 구축하세요."
  action={<button>첫 문서 업로드</button>}
/>;

// 데이터 렌더링
return <DataTable data={data} ... />;
```

> **실패 사례:** AI가 생성한 코드는 거의 항상 happy path만 구현한다. 로딩 스피너 없이 배포하면 사용자는 "멈춘 것 같다"고 느끼고, 에러 상태 없이 배포하면 흰 화면만 보게 된다.

### 5.6 네비게이션 — 첫날부터 완성

```tsx
// 퍼블릭 헤더 — 인증 상태에 따라 분기
<nav className="flex items-center gap-6">
  <Link href="/pricing">Pricing</Link>
  <Link href="/docs">Docs</Link>
  <Link href="/demo">Demo</Link>
  <ThemeToggle />
  {user ? (
    <Link href="/dashboard" className="btn-primary">Dashboard</Link>
  ) : (
    <Link href="/login" className="btn-primary">Login</Link>
  )}
</nav>

// 대시보드 사이드바 — admin 역할 조건부 표시
<nav>
  <SidebarLink href="/dashboard" icon={Home}>Dashboard</SidebarLink>
  <SidebarLink href="/dashboard/bots" icon={Bot}>Bots</SidebarLink>
  <SidebarLink href="/dashboard/billing" icon={CreditCard}>Billing</SidebarLink>
  {user.role === 'admin' && (
    <SidebarLink href="/admin" icon={Shield}>Admin</SidebarLink>
  )}
</nav>
```

### 5.7 i18n (다국어) — 설계 패턴

```typescript
// IP 기반 자동 언어 감지 (서버 컴포넌트)
function detectLanguageFromIP(request: NextRequest): string {
  const country = request.headers.get('x-vercel-ip-country') || '';
  const langMap: Record<string, string> = {
    KR: 'ko', JP: 'ja', CN: 'zh', TW: 'zh',
  };
  return langMap[country] || 'en';
}

// 메시지 내 언어 감지 (채팅)
function detectLanguage(text: string): string {
  const cleaned = text.replace(/[\s\d\p{P}]/gu, '');
  if (!cleaned) return 'ko';

  let hangul = 0;
  for (const char of cleaned) {
    const code = char.codePointAt(0)!;
    if (code >= 0xAC00 && code <= 0xD7AF) hangul++;
  }
  if (hangul / cleaned.length > 0.3) return 'ko';
  return 'en';
}
```

---

## 6. 성능 & 대량 처리

### 6.1 N+1 쿼리 방지

```typescript
// WRONG: 루프 안에서 개별 DB 호출
for (const item of items) {
  const { data } = await supabase.from('table').select().eq('id', item.id).single();
  // ...
}

// RIGHT: 배치 쿼리
const ids = items.map(i => i.id);
const { data } = await supabase.from('table').select().in('id', ids);
const lookup = new Map(data.map(d => [d.id, d]));
for (const item of items) {
  const record = lookup.get(item.id);
  // ...
}
```

### 6.2 대량 INSERT — 배치 분할

```typescript
// Supabase/PostgreSQL은 대량 INSERT에 배치 분할 필요
const BATCH_SIZE = 50;  // 청크 INSERT
const QA_BATCH_SIZE = 100;  // Q&A INSERT

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from('table').insert(batch);
  if (error) { /* 에러 처리 */ }

  // 진행률 보고
  const done = Math.min(i + BATCH_SIZE, records.length);
  send({ phase: 'saving', progress: calculateProgress(done, records.length) });
}
```

### 6.3 외부 API 호출 — 배치 + Rate Limit 존중

```typescript
// OpenAI 임베딩 — 배치 처리
const EMBEDDING_BATCH_SIZE = 100;
const allEmbeddings: number[][] = [];

for (let i = 0; i < contents.length; i += EMBEDDING_BATCH_SIZE) {
  const batch = contents.slice(i, i + EMBEDDING_BATCH_SIZE);
  const embeddings = await generateEmbeddings(batch);  // 1 API call per batch
  allEmbeddings.push(...embeddings);
}

// NEVER: Promise.all(contents.map(c => generateEmbedding(c)))
// → 사용자 제어 배열에 대한 무제한 병렬 호출은 API 한도 초과
```

### 6.4 캐싱 전략

```typescript
// 자주 접근하지만 거의 변하지 않는 데이터 → 메모리 캐시
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 60_000; // 60초

async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data as T;

  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

// 사용 예: 봇 설정 캐싱
const botConfig = await getCached(`bot:${botId}`, () =>
  supabase.from('bots').select('*').eq('id', botId).single()
);
```

---

## 7. 배포 & 운영

### 7.1 Vercel 타임아웃 — 라우트별 설정 필수

**규칙:** API 라우트 생성 시 `maxDuration`을 즉시 설정한다. 기본값(10초)은 LLM/임베딩 호출에 부족하다.

```typescript
// 라우트별 타임아웃 가이드
export const maxDuration = 60;   // 채팅 스트리밍 (LLM 호출)
export const maxDuration = 300;  // 문서 처리, 일괄 업로드 (Pro 플랜 필요)
export const maxDuration = 30;   // 웹훅 (빠른 응답 필요)
// 단순 CRUD: 기본값 사용 (설정 불필요)
```

> **실패 사례:** Vercel 배포 후 문서 처리와 채팅이 타임아웃. `maxDuration` 미설정이 원인. 모든 라우트에 사후 추가해야 했다.

### 7.2 환경변수 체크리스트

```env
# === 필수 ===
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase 익명 키
SUPABASE_SERVICE_ROLE_KEY=      # 서비스 역할 키 (서버 전용, NEXT_PUBLIC 금지!)
OPENAI_API_KEY=                 # OpenAI API 키 (서버 전용)
NEXT_PUBLIC_APP_URL=            # 앱 URL (콜백, 웹훅용)

# === 결제 ===
PADDLE_API_KEY=                 # Paddle 서버 API 키 (서버 전용)
PADDLE_WEBHOOK_SECRET=          # Webhook 서명 검증용
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN= # 클라이언트용 토큰
NEXT_PUBLIC_PADDLE_ENV=sandbox  # sandbox | production

# === 주의사항 ===
# NEXT_PUBLIC_ 접두사 = 클라이언트에 노출됨! 비밀키에 절대 사용 금지
# 서버 전용 키: SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, PADDLE_API_KEY
```

### 7.3 에러 모니터링

```typescript
// 모든 API 라우트의 catch 블록에서 구조화된 로깅
export async function POST(request: NextRequest) {
  try {
    // ... 비즈니스 로직
  } catch (err) {
    console.error('[API] POST /api/chat error:', {
      message: err instanceof Error ? err.message : 'Unknown',
      stack: err instanceof Error ? err.stack : undefined,
      url: request.url,
      timestamp: new Date().toISOString(),
    });
    return errorResponse('Internal server error', 500);
  }
}
```

---

## 8. 테스트 전략

### 8.1 최소 테스트 범위

```
우선순위 1 (필수):
├── 인증 가드 (requireAuth, requireAdmin, requireOwner, requirePlan)
├── 플랜 제한 (checkBotLimit, checkDocumentLimit, checkMessageLimit)
├── API 키 인증 (authenticateAPIKey)
├── Rate Limiting (rateLimit)
└── API 응답 헬퍼 (successResponse, errorResponse)

우선순위 2 (권장):
├── RAG 파이프라인 (chunker, embeddings, search)
├── Webhook 핸들러 (Paddle, Telegram, etc.)
├── 사용량 추적 (incrementMessageCount, checkMessageQuota)
└── CSV 파서 (인코딩, 컬럼 매핑)

우선순위 3 (선택):
├── UI 컴포넌트 스냅샷 테스트
├── E2E 플로우 (가입 → 봇 생성 → 채팅)
└── 결제 플로우 (Paddle Sandbox)
```

### 8.2 테스트 패턴

```typescript
// Vitest + 모킹 패턴
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase 모킹
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
  })),
}));

describe('requireOwner', () => {
  it('should allow bot owner', async () => {
    // 봇 소유자 → 성공
    const user = await requireOwner('bot-123');
    expect(user.id).toBe('user-123');
  });

  it('should reject non-owner', async () => {
    // 비소유자 → AuthError
    await expect(requireOwner('other-bot')).rejects.toThrow(AuthError);
  });
});
```

---

## 9. 마스터 체크리스트

새 SaaS 프로젝트를 시작할 때, 각 단계에서 아래 항목을 확인한다.

### Day 1: 프로젝트 설정

- [ ] PRD 작성 (사용자 역할, 핵심 기능, 데이터 엔티티)
- [ ] CLAUDE.md 작성 (스택, 폴더 구조, 컨벤션)
- [ ] DB 스키마 설계 (모든 FK + CASCADE + 인덱스 포함)
- [ ] RLS 정책 작성
- [ ] `.env.example` 작성 (서버/클라이언트 키 구분 명시)
- [ ] 공유 컴포넌트 생성 (ConfirmModal, Pagination, EmptyState, ProgressBar 등)
- [ ] 다크모드 색상 매핑 테이블 확정
- [ ] 대시보드 레이아웃 (데스크톱 사이드바 + 모바일 드로어)

### 기능 구현 시 (매 기능마다)

- [ ] API: 입력 검증 (Zod) 적용
- [ ] API: 인증 가드 적용 (requireAuth/requireOwner)
- [ ] API: 크로스 엔티티 소유권 검증 (클라이언트 ID → DB 확인)
- [ ] API: 목록은 페이지네이션 + 필터 포함
- [ ] API: 3초+ 작업은 SSE 스트리밍
- [ ] API: `maxDuration` 설정
- [ ] UI: 로딩 상태 구현
- [ ] UI: 에러 상태 구현
- [ ] UI: 빈 상태 구현
- [ ] UI: 다크모드 매핑 적용 + 확인
- [ ] UI: 모바일 반응형 확인
- [ ] UI: 삭제는 ConfirmModal 사용 (window.confirm 금지)
- [ ] 테스트: 핵심 로직 단위 테스트

### 대량 처리 기능 구현 시

- [ ] DB INSERT 배치 분할 (50-100건 단위)
- [ ] 외부 API 호출 배치 분할
- [ ] 사용량 추적 함수 batch count 파라미터 지원
- [ ] SSE 진행률 보고 (단계별 progress)
- [ ] 검증 실패는 스트리밍 전에 JSON 에러 반환

### 배포 전

- [ ] 모든 환경변수 프로덕션 값 설정
- [ ] `NEXT_PUBLIC_` 접두사에 비밀키 없는지 확인
- [ ] 모든 API 라우트 `maxDuration` 설정 확인
- [ ] 무료 플랜 사용자 전체 플로우 테스트 (null 구독 처리)
- [ ] 다크모드 전체 페이지 테스트
- [ ] 모바일 전체 페이지 테스트
- [ ] 단위 테스트 전체 통과
- [ ] 에러 모니터링 설정

---

## 참고 자료

### 프로젝트 내부
- `docs/RAG_PLATFORM_PRD.md` — 제품 요구사항
- `docs/RAG_PLATFORM_TASK.md` — 개발 계획 + 30+ 개선 이력
- `CLAUDE.md` — 프로젝트 컨벤션

### 외부 (바이브 코딩 Best Practices)
- [Vibe Coding Best Practices — Softr](https://www.softr.io/blog/vibe-coding-best-practices)
- [Vibe Coding is a Dangerous Fantasy — nmn.gl](https://nmn.gl/blog/vibe-coding-fantasy)
- [Hidden Pitfalls of Vibe Coding — CompileInfy](https://compileinfy.com/pitfalls-of-vibe-coding-technical-debt-at-scale/)
- [You're Doing Vibe Coding Wrong — LogRocket](https://blog.logrocket.com/youre-doing-vibe-coding-wrong/)
- [Complete Guide to Vibe Coding — SaaStr](https://www.saastr.com/the-complete-guide-to-vibe-coding-hard-won-lessons-for-building-your-first-commercial-app/)
- [Vibe Coding and Vibe Design — UX Tigers](https://www.uxtigers.com/post/vibe-coding-vibe-design)
- [Why Vibe Coding Won't End SaaS — Bootstrapped Founder](https://thebootstrappedfounder.com/vibe-coding-wont-kill-saas/)
