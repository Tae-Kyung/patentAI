# CASA 확장 전략서: "모두의 창업" 에디션

> **문서 버전:** 1.0
> **작성일:** 2026-03-06
> **기준 문서:** requirement.md, PRD.md v1.6, TASK.md v1.0
> **구현 태스크:** [TASK_NEW.md](./TASK_NEW.md) — Phase E0~E6 체크리스트 (131개 태스크)
> **목적:** 기존 CASA MVP를 국가 창업지원 프로그램 "모두의 창업"에 최적화된 다중 이해관계자 플랫폼으로 확장하기 위한 전략 수립

---

## 1. 현재 시스템 분석 (AS-IS)

### 1.1 기존 CASA 아키텍처 요약

| 구분 | 현재 상태 |
|------|-----------|
| **역할** | `user` (예비창업자/창업자), `mentor` (멘토), `admin` (관리자) |
| **프로젝트 트랙** | `pre_startup` (아이디어→평가→문서→배포), `startup` (검토→진단→전략→보고서) |
| **핵심 기능** | AI 아이디어 확장, 3관점 평가, 문서 자동생성, 게이트 승인, 크레딧 시스템 |
| **관리 기능** | 사용자 관리, 프롬프트 관리, 크레딧 충전, 승인 큐 |
| **멘토 기능** | 피드백 작성, 승인/반려 (프로젝트 단위 배정) |
| **DB 테이블** | 12개 (bi_ 접두사: users, projects, idea_cards, evaluations, documents, feedbacks, approvals, prompts, prompt_versions, prompt_variables, credit_logs, business_reviews) |

### 1.2 확장에 유리한 기존 자산

1. **게이트 시스템**: Gate 1~4 승인 체계가 이미 존재 → 멘토링 프로세스와 자연스럽게 연결
2. **역할 기반 접근 제어**: `requireRole`, `requireAuth` 가드 및 RLS 정책 → 새 역할 추가 용이
3. **피드백 시스템**: `bi_feedbacks` 테이블의 stage/gate/feedback_type → 멘토 코멘트 확장 가능
4. **프롬프트 엔진**: DB 기반 프롬프트 관리 + Redis 캐싱 → 멘토 의견서 AI 생성에 활용
5. **크레딧 시스템**: 기관별 크레딧 관리로 확장 가능
6. **문서 생성 파이프라인**: SSE 스트리밍 기반 → 멘토 의견서 자동 생성에 재활용

### 1.3 확장 시 주의 사항 (기존 시스템 리스크)

| 리스크 | 설명 | 대응 방안 |
|--------|------|-----------|
| **역할 체계 전면 변경** | `user/mentor/admin` → 4종 역할로 확장 시 기존 RLS/가드 전체 수정 필요 | 기존 `mentor` 역할 유지, `institution` 역할 추가 방식 |
| **멘토 역할 충돌** | 기존 `mentor`는 "관리자급" 역할 → 새 체계에서 멘토는 "전문가/피드백 제공자" | 역할 의미 재정의 필요 |
| **프로젝트 소유권 모델** | 현재 1:1 (user ↔ project) → 기관-프로젝트 매핑 추가 시 다대다 관계 | 매핑 테이블로 확장 |
| **기존 사용자 마이그레이션** | 기존 사용자의 역할/데이터 호환성 | 마이그레이션 스크립트 + 기본값 처리 |

---

## 2. 아이디어 검토 및 개선 제안

### 2.1 요구사항에서 발견된 문제점

#### 문제 1: 역할 체계가 기존 시스템과 충돌

**현재 문제**: requirement.md에서 "시스템 관리자, 기관담당자, 일반가입자, 멘토"를 별도 역할로 정의했으나, 기존 CASA에는 이미 `admin`, `mentor`, `user` 역할이 존재합니다. 특히 기존 `mentor`는 "승인 권한을 가진 관리자급" 역할인데, 새 체계의 멘토는 "전문 피드백 제공자"로 성격이 다릅니다.

**개선 제안**:
```
기존 역할        → 확장 역할
admin            → admin (시스템 관리자, 변경 없음)
mentor           → institution (기관 담당자로 전환)
user             → user (일반 가입자, 변경 없음)
(신규)           → mentor (전문가 멘토, 신규)
```
기존 `mentor` 역할을 `institution`으로 마이그레이션하고, 새로운 `mentor` 역할을 추가합니다. 이렇게 하면 기존 RLS 정책의 `mentor` 참조를 `institution`으로 변경하되, 핵심 로직은 유지됩니다.

#### 문제 2: 기관-프로젝트 매칭 흐름의 모호함

**현재 문제**: "시스템 관리자가 일반 가입자 프로젝트를 기관으로 매핑"이라고 했지만, 지원자가 직접 기관 지원을 신청하는 흐름도 언급되어 있어 두 가지 경로가 혼재합니다.

**개선 제안**: 두 경로를 모두 지원하되 우선순위를 명확히 합니다.
1. **자동 배정 경로** (주요): 관리자가 K-Startup 신청 데이터 기반으로 지원자를 지역 기관에 일괄 매핑
2. **자율 신청 경로** (보조): 개인 프로젝트를 진행하다가 기관 지원을 신청 → 기관 승인 후 관리

#### 문제 3: 멘토 수당 지급 프로세스의 보안 우려

**현재 문제**: 통장사본, 계좌번호 등 민감한 금융 정보를 시스템에 저장하는 것은 개인정보보호법(PIPA) 및 금융 규제 리스크가 있습니다.

**개선 제안**:
- 통장사본은 **Supabase Storage**의 별도 private 버킷에 암호화하여 저장
- 계좌번호는 DB에 저장하되 **마스킹 처리** (앞 3자리 + 뒷 4자리만 표시)
- 수당 지급은 시스템 내에서 "승인" 처리만 하고, 실제 송금은 외부 시스템 연동 또는 기관별 수기 처리
- 향후 PG사 또는 뱅킹 API 연동을 위한 인터페이스만 설계

#### 문제 4: 멘토링 히스토리 추적의 구체성 부족

**현재 문제**: "진행된 과정을 히스토리로 남겨야 해"라고 했지만, 어떤 데이터를 어떤 구조로 남길지 명확하지 않습니다.

**개선 제안**: 멘토링 히스토리를 "세션" 단위로 관리합니다.
- 멘토 코멘트 → 창업자 수정 → 멘토 재검토의 **라운드별 기록**
- 각 라운드에 타임스탬프, 변경된 섹션, 코멘트, 반영 여부 추적
- 최종 의견서 생성 시 전체 히스토리를 AI가 요약

#### 문제 5: 스케일 고려 부족

**현재 문제**: 전국 17개 광역시도, 수천~수만 명의 지원자, 수백 명의 멘토를 처리해야 하는데 성능 관련 고려가 없습니다.

**개선 제안**:
- 기관별 데이터 파티셔닝 (RLS 기반 자연 파티셔닝)
- 대시보드 조회 시 페이지네이션 + 필터링 필수
- 통계 데이터는 **집계 테이블** 또는 **Supabase Edge Function** 기반 사전 계산
- 실시간 현황은 Supabase Realtime 활용 (변경 알림)

### 2.2 추가 제안 사항

#### 제안 1: 알림 시스템 도입

멘토 매칭, 피드백 알림, 승인 요청 등 다중 이해관계자 간 커뮤니케이션이 핵심입니다.

```
bi_notifications 테이블:
- 인앱 알림 (실시간 표시)
- 이메일 알림 (선택적, Supabase Edge Function + Resend)
- 알림 유형: mentor_assigned, feedback_received, approval_requested,
             mentoring_completed, payout_approved 등
```

#### 제안 2: 프로그램(사업) 단위 관리

"모두의 창업"은 연도별/차수별로 운영되므로 프로그램 단위 관리가 필요합니다.

```sql
bi_programs 테이블:
- id, name (예: "2026년 상반기 모두의 창업")
- year, semester/round
- start_date, end_date
- status (preparing/active/completed)
```

프로젝트와 기관 매핑을 프로그램 단위로 묶으면 연도별 현황 관리, 정산, 통계가 용이합니다.

#### 제안 3: 역할별 온보딩 플로우

가입 시 역할 선택에 따라 다른 온보딩을 제공합니다.
- **일반 가입자**: 바로 대시보드 → 프로젝트 생성
- **멘토**: 가입 → 프로필 설정(이력서, 전문분야) → 관리자 승인 대기 → 활성화
- **기관 담당자**: 가입 → 소속 기관 선택 → 관리자 승인 대기 → 기관 대시보드 접근

---

## 3. 확장 역할 및 권한 설계

### 3.1 역할 정의 (확장)

| 역할 | DB값 | 설명 | 가입 방식 |
|------|------|------|-----------|
| **시스템 관리자** | `admin` | 전체 시스템 관리, 기관 등록, 전국 매핑 | 시드 데이터 또는 수동 지정 |
| **기관 담당자** | `institution` | 소속 기관의 지원자/멘토 관리 | 회원가입 시 기관 선택 → 관리자 승인 |
| **멘토** | `mentor` | 배정된 프로젝트 검토/코멘트/의견서 + **개인 프로젝트 생성/AI 사용** | 회원가입 시 멘토 선택 → 프로필 등록 → 관리자/기관 승인 |
| **일반 가입자** | `user` | AI 기반 아이디어 구체화, 문서 생성 | 자유 가입 (기존과 동일) |

> **핵심 원칙: 모든 역할은 개인 프로젝트 생성 가능**
> 멘토도 본인의 창업 아이디어를 발전시킬 수 있어야 합니다. 멘토 대시보드에서 "내 프로젝트(개인)"와 "멘토링 프로젝트(배정)"를 분리하여 표시합니다.
> 기관 담당자도 마찬가지로 개인 프로젝트를 생성할 수 있습니다.

### 3.2 권한 매트릭스 (확장)

| 기능 | admin | institution | mentor | user |
|------|-------|-------------|--------|------|
| 기관 등록/관리 | ✅ CRUD | ❌ | ❌ | ❌ |
| 기관 승인 | ✅ | ❌ | ❌ | ❌ |
| 기관담당자 승인 | ✅ | ❌ | ❌ | ❌ |
| 멘토 승인 | ✅ | ✅ (소속 기관 내) | ❌ | ❌ |
| 프로젝트-기관 매핑 | ✅ | ❌ | ❌ | ❌ |
| 프로젝트-멘토 매칭 | ✅ | ✅ (소속 기관 내) | ❌ | ❌ |
| 프로젝트 생성/편집 | ✅ (본인) | ✅ (본인) | ✅ (본인) | ✅ (본인) |
| 프로젝트 검토/코멘트 | ✅ | ✅ (관할) | ✅ (배정) | ❌ |
| 멘토 의견서 작성 | ❌ | ❌ | ✅ (배정) | ❌ |
| 의견서 확인/승인 | ✅ | ✅ (관할) | ❌ | ❌ |
| 수당 지급 처리 | ❌ | ✅ (관할) | ❌ | ❌ |
| 전국 현황 조회 | ✅ | ❌ | ❌ | ❌ |
| 기관별 현황 조회 | ✅ | ✅ (소속) | ❌ | ❌ |
| 본인 프로젝트 조회 | ✅ | ✅ | ✅ | ✅ |
| 배정 프로젝트 조회 (멘토링) | ❌ | ❌ | ✅ | ❌ |
| 프로필(이력서/통장) 관리 | ❌ | ❌ | ✅ (본인) | ❌ |
| AI 기능 사용 (개인 프로젝트) | ✅ | ✅ | ✅ | ✅ |
| 크레딧 충전 | ✅ | ✅ (기관 예산) | ❌ | ❌ |
| 메시지 발송 (개별) | ✅ | ✅ (관할 멘토/지원자) | ✅ (기관담당자/지원자) | ✅ (멘토/기관담당자) |
| 메시지 일괄 발송 | ✅ | ✅ (관할 범위 내) | ❌ | ❌ |

---

## 4. 데이터 모델 확장 설계

### 4.1 신규 테이블

```sql
-- ============================================
-- 1. 프로그램 관리 (연도/차수별 사업 관리)
-- ============================================
CREATE TABLE bi_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- "2026년 상반기 모두의 창업"
  year INTEGER NOT NULL,
  round INTEGER DEFAULT 1,        -- 차수
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. 기관 정보
-- ============================================
CREATE TABLE bi_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- "충북창조경제혁신센터"
  region TEXT NOT NULL,            -- "충북", "충남", "경북" 등
  type TEXT DEFAULT 'center' CHECK (type IN ('center', 'university', 'other')),
                                   -- center: 창조경제혁신센터, university: 창업중심대학
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  max_mentors INTEGER DEFAULT 50,  -- 기관별 최대 멘토 수
  max_projects INTEGER DEFAULT 200, -- 기관별 최대 관리 프로젝트 수
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. 기관 담당자 프로필 (bi_users 확장)
-- ============================================
CREATE TABLE bi_institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  role_in_institution TEXT DEFAULT 'staff' CHECK (role_in_institution IN ('manager', 'staff')),
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, institution_id)
);

-- ============================================
-- 4. 멘토 프로필 (기존 bi_users 보완)
-- ============================================
CREATE TABLE bi_mentor_profiles (
  user_id UUID PRIMARY KEY REFERENCES bi_users(id) ON DELETE CASCADE,
  resume_url TEXT,                 -- Supabase Storage private 버킷 경로
  bank_account_url TEXT,           -- 통장사본 이미지 경로 (private 버킷)
  bank_name TEXT,                  -- 은행명
  account_number_masked TEXT,      -- 마스킹된 계좌번호 (표시용)
  account_number_encrypted TEXT,   -- 암호화된 실제 계좌번호
  account_holder TEXT,             -- 예금주
  specialty TEXT[],                -- 전문 분야 태그
  career_summary TEXT,             -- 경력 요약
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. 멘토-기관 풀 (다대다: 한 멘토가 여러 기관에 소속 가능)
-- ============================================
CREATE TABLE bi_mentor_institution_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  registered_by UUID REFERENCES bi_users(id),   -- 등록한 기관 담당자 또는 관리자
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mentor_id, institution_id)
);
-- 예시: 멘토 A → 충북센터(active), 경북센터(active) → 양쪽에서 프로젝트 배정 가능

-- ============================================
-- 6. 프로젝트-기관 매핑 (프로그램 단위)
-- ============================================
CREATE TABLE bi_project_institution_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  program_id UUID REFERENCES bi_programs(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  mapped_by UUID REFERENCES bi_users(id),     -- 매핑한 관리자
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),   -- 승인한 기관 담당자
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, institution_id, program_id)
);

-- ============================================
-- 6. 멘토-프로젝트 매칭
-- ============================================
CREATE TABLE bi_mentor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  program_id UUID REFERENCES bi_programs(id),
  mentor_role TEXT DEFAULT 'primary' CHECK (mentor_role IN ('primary', 'secondary')),
  -- primary: 주멘토 (의견서 작성 책임), secondary: 부멘토 (보조 코멘트)
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'review', 'completed', 'cancelled')),
  matched_by UUID REFERENCES bi_users(id),    -- 매칭한 기관 담당자
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, mentor_id, program_id)
);
-- 다대다 지원: 한 프로젝트에 여러 멘토 배정 가능 (주멘토 1명 + 부멘토 N명)
-- 한 멘토가 여러 기관의 프로젝트를 동시에 멘토링 가능 (institution_id가 다르면 OK)

-- ============================================
-- 7. 멘토링 세션 (라운드별 기록)
-- ============================================
CREATE TABLE bi_mentoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES bi_mentor_matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,    -- 1차, 2차, 3차... 멘토링
  session_type TEXT DEFAULT 'review' CHECK (session_type IN ('review', 'feedback', 'revision', 'final')),

  -- 멘토 코멘트 (섹션별)
  comments JSONB DEFAULT '[]',
  -- [{ section: "idea", target_id: "uuid", comment: "...", created_at: "..." }]

  -- 지원자 수정 내역
  revision_summary TEXT,

  -- 세션 메타
  session_date TIMESTAMPTZ,
  duration_minutes INTEGER,        -- 멘토링 시간 (수당 산정용)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. 멘토링 보고서 (최종 의견서)
-- ============================================
CREATE TABLE bi_mentoring_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES bi_mentor_matches(id) ON DELETE CASCADE,

  -- 멘토 수동 입력
  mentor_opinion TEXT,             -- 멘토의 최종 의견
  strengths TEXT,                  -- 강점 평가
  improvements TEXT,               -- 개선 필요 사항
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),

  -- AI 생성
  ai_summary TEXT,                 -- AI가 세션 히스토리 기반으로 생성한 요약
  ai_generated_report TEXT,        -- AI 전체 보고서 (마크다운)

  -- 상태 관리
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'rejected')),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id), -- 기관 담당자
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. 수당 지급 관리
-- ============================================
CREATE TABLE bi_mentor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES bi_mentoring_reports(id),
  mentor_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  program_id UUID REFERENCES bi_programs(id),

  amount DECIMAL(10, 0),           -- 수당 금액 (원)
  total_sessions INTEGER,          -- 총 세션 수
  total_hours DECIMAL(5, 1),       -- 총 멘토링 시간

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'cancelled')),
  approved_by UUID REFERENCES bi_users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,          -- 지급 참조번호

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. 알림
-- ============================================
CREATE TABLE bi_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- 유형: mentor_assigned, feedback_received, approval_requested,
  --       institution_approved, mentoring_completed, payout_approved,
  --       project_mapped, mentor_matched, report_submitted,
  --       message_received (메시지 수신 알림)
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,                       -- 클릭 시 이동할 경로
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. 메시지 (기관↔멘토/지원자 소통)
-- ============================================
CREATE TABLE bi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES bi_users(id),
  recipient_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID REFERENCES bi_institutions(id),  -- 기관 맥락 (어느 기관 업무로 보낸 메시지인지)
  project_id UUID REFERENCES bi_projects(id),          -- 프로젝트 맥락 (특정 프로젝트 관련 메시지인 경우)
  thread_id UUID REFERENCES bi_messages(id),           -- 답장인 경우 원본 메시지 ID (쓰레드)
  subject TEXT,                                         -- 제목 (일괄 발송 시 사용)
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 일괄 발송 기록 (기관 담당자가 여러 명에게 동시에 보낸 메시지 추적)
CREATE TABLE bi_message_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('mentors', 'applicants', 'all', 'custom')),
  -- mentors: 소속 멘토 전체, applicants: 관할 지원자 전체, all: 전체, custom: 선택
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_messages_recipient ON bi_messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_messages_sender ON bi_messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_thread ON bi_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_project ON bi_messages(project_id) WHERE project_id IS NOT NULL;
```

### 4.2 기존 테이블 수정

```sql
-- bi_users: role 컬럼 확장
ALTER TABLE bi_users
  ALTER COLUMN role TYPE TEXT,
  ADD CONSTRAINT bi_users_role_check
    CHECK (role IN ('user', 'mentor', 'institution', 'admin'));

-- bi_users: 승인 상태 추가 (멘토/기관담당자용)
ALTER TABLE bi_users
  ADD COLUMN is_approved BOOLEAN DEFAULT true,  -- user/admin은 기본 true
  ADD COLUMN approved_at TIMESTAMPTZ;

-- bi_projects: 기관 지원 상태 추가
ALTER TABLE bi_projects
  ADD COLUMN support_type TEXT DEFAULT 'personal'
    CHECK (support_type IN ('personal', 'institutional')),
  ADD COLUMN program_id UUID REFERENCES bi_programs(id);

-- bi_feedbacks: 멘토링 세션 연결
ALTER TABLE bi_feedbacks
  ADD COLUMN session_id UUID REFERENCES bi_mentoring_sessions(id),
  ADD COLUMN feedback_source TEXT DEFAULT 'general'
    CHECK (feedback_source IN ('general', 'mentoring', 'institution'));
```

### 4.3 ERD 관계도 (확장)

```
                                    bi_programs
                                   ┌────────────┐
                                   │ id         │
                                   │ name       │
                                   │ year/round │
                                   │ status     │
                                   └─────┬──────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
              bi_institutions    bi_project_inst_maps   bi_mentor_matches
             ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
             │ id           │◀──│ institution_id   │   │ id           │
             │ name         │   │ project_id ──────│──▶│ project_id   │
             │ region       │   │ program_id       │   │ mentor_id    │
             │ is_approved  │   │ status           │   │ institution_id│
             └──────┬───────┘   └──────────────────┘   │ status       │
                    │                                   └──────┬───────┘
                    │                                          │
         bi_institution_members                     bi_mentoring_sessions
        ┌───────────────────┐                      ┌──────────────────┐
        │ user_id ──────────│──▶ bi_users          │ match_id         │
        │ institution_id    │                      │ round_number     │
        │ is_approved       │                      │ comments (JSONB) │
        └───────────────────┘                      │ status           │
                                                   └──────┬───────────┘
    bi_mentor_profiles                                     │
   ┌──────────────────┐                          bi_mentoring_reports
   │ user_id ─────────│──▶ bi_users             ┌──────────────────┐
   │ resume_url       │                         │ match_id         │
   │ bank_account_url │                         │ mentor_opinion   │
   │ specialty[]      │                         │ ai_summary       │
   │ is_approved      │                         │ status           │
   └──────────────────┘                         └──────┬───────────┘
                                                       │
    bi_mentor_institution_pool (다대다)                  │
   ┌──────────────────────┐                             │
   │ mentor_id ──────────│──▶ bi_users                  │
   │ institution_id ─────│──▶ bi_institutions            │
   │ status (active)     │                              │
   └──────────────────────┘                             │
                                                       │
                                              bi_mentor_payouts
                                             ┌──────────────────┐
                                             │ report_id        │
                                             │ mentor_id        │
                                             │ amount           │
                                             │ status           │
                                             └──────────────────┘
```

---

## 5. 핵심 워크플로우 설계

### 5.1 전체 프로세스 흐름

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    "모두의 창업" 전체 운영 프로세스                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  [Phase A: 사전 설정]                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐          │
│  │ 관리자                                                               │          │
│  │  1. 프로그램 생성 (2026년 상반기 모두의 창업)                          │          │
│  │  2. 기관 등록 (17개 창조경제혁신센터 + 창업중심대학)                    │          │
│  │  3. 기관 담당자 가입 승인                                             │          │
│  │  4. 멘토 가입 승인                                                   │          │
│  └───────────────────────────────────────────────────────────────────────┘          │
│                                         │                                           │
│                                         ▼                                           │
│  [Phase B: 매핑 및 매칭]                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐          │
│  │ 관리자: 지원자 프로젝트 → 기관 매핑                                    │          │
│  │         (K-Startup 데이터 기반 지역별 자동 배정 또는 수동)              │          │
│  │                         │                                             │          │
│  │                         ▼                                             │          │
│  │ 기관 담당자: 매핑된 프로젝트 확인 → 멘토 매칭                          │          │
│  │             (전문 분야 + 산업 태그 기반 AI 추천 또는 수동 선택)         │          │
│  └───────────────────────────────────────────────────────────────────────┘          │
│                                         │                                           │
│                                         ▼                                           │
│  [Phase C: AI 빌딩 + 멘토링 루프]                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐          │
│  │                                                                       │          │
│  │   지원자 (CASA 기존 기능)              멘토 (워크스테이션)             │          │
│  │   ┌─────────────────────┐             ┌─────────────────────┐        │          │
│  │   │ 1. 아이디어 입력    │             │ 배정된 프로젝트 확인│        │          │
│  │   │ 2. AI 확장          │────────────▶│ 산출물 검토         │        │          │
│  │   │ 3. 사업성 평가      │             │ 섹션별 코멘트 작성  │        │          │
│  │   │ 4. 문서 생성        │◀────────────│ 의견 전달           │        │          │
│  │   │ 5. 피드백 반영      │             │                     │        │          │
│  │   │ 6. AI 재생성        │────────────▶│ 재검토              │        │          │
│  │   │ ...반복...          │             │ ...반복...          │        │          │
│  │   └─────────────────────┘             └─────────────────────┘        │          │
│  │            │                                     │                    │          │
│  │            ▼                                     ▼                    │          │
│  │   ┌───────────────────────────────────────────────────────┐          │          │
│  │   │ 멘토링 완료 → 멘토 최종 의견서 작성                     │          │          │
│  │   │            → AI가 세션 히스토리 기반 보고서 자동 생성    │          │          │
│  │   └───────────────────────────────────────────────────────┘          │          │
│  └───────────────────────────────────────────────────────────────────────┘          │
│                                         │                                           │
│                                         ▼                                           │
│  [Phase D: 검수 및 행정 처리]                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐          │
│  │ 기관 담당자:                                                          │          │
│  │  1. 멘토 의견서 검토 및 확인                                          │          │
│  │  2. 최종 산출물 검수                                                  │          │
│  │  3. 수당 지급 승인                                                    │          │
│  │  4. 프로그램 종료 처리                                                │          │
│  └───────────────────────────────────────────────────────────────────────┘          │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 멘토링 루프 상세 흐름

```
지원자                          시스템                          멘토
  │                               │                               │
  │  프로젝트에서 AI 작업 수행     │                               │
  │  (아이디어 확장, 문서 생성)    │                               │
  │──────────────────────────────▶│                               │
  │                               │  알림: "새 산출물 생성됨"      │
  │                               │──────────────────────────────▶│
  │                               │                               │
  │                               │  멘토: 프로젝트 진입          │
  │                               │◀──────────────────────────────│
  │                               │                               │
  │                               │  섹션별 코멘트 작성           │
  │                               │  (아이디어, 사업계획서,       │
  │                               │   발표자료, BM 등 각각)       │
  │                               │◀──────────────────────────────│
  │                               │                               │
  │  알림: "멘토 피드백 도착"      │                               │
  │◀──────────────────────────────│                               │
  │                               │                               │
  │  피드백 확인                   │                               │
  │  AI에게: "멘토 의견 반영해서   │                               │
  │  사업계획서 수정해줘"          │                               │
  │──────────────────────────────▶│                               │
  │                               │  AI 재생성 (SSE)              │
  │◀──────────────────────────────│                               │
  │                               │                               │
  │  수정 완료                     │  알림: "수정본 생성됨"         │
  │                               │──────────────────────────────▶│
  │                               │                               │
  │                               │  재검토 + 최종 의견서 작성    │
  │                               │◀──────────────────────────────│
  │                               │                               │
  │                               │  [AI 멘토링 보고서 자동 생성]  │
  │                               │                               │
  │                               │  기관 담당자에게 알림          │
  │                               │──────────────────────────────▶│ 기관 담당자
  │                               │                               │
  │                               │  의견서 확인 + 수당 승인       │
  │                               │◀──────────────────────────────│
```

### 5.3 멘토 코멘트 시스템 설계

기존 `bi_feedbacks` 테이블을 확장하여 멘토링 전용 코멘트를 지원합니다.

```
코멘트 대상 (target_type):
├── idea          → 아이디어 카드 전체 또는 특정 필드
├── evaluation    → 평가 결과
├── document      → 특정 문서 (사업계획서, 피치, 발표자료 등)
│   └── section   → 문서 내 특정 섹션 (예: "3.2 시장 규모")
├── canvas        → 린 캔버스 특정 블록
└── general       → 프로젝트 전반에 대한 의견
```

멘토 워크스테이션 UI:
```
┌──────────────────────────────────────────────────────────────────────┐
│  [프로젝트명] - 멘토 워크스테이션                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [아이디어] [평가결과] [사업계획서] [피치덱] [발표자료] [BM캔버스]      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐ │
│  │                            │  │  멘토 코멘트                    │ │
│  │  [선택된 산출물 내용]       │  │  ┌──────────────────────────┐ │ │
│  │                            │  │  │ 라운드 1 (2026-03-10)    │ │ │
│  │  1. 문제 정의              │  │  │ "문제 정의가 너무 광범위  │ │ │
│  │  ──────────────            │  │  │  합니다. B2B 고객으로     │ │ │
│  │  현재 대학생들은...         │  │  │  좁혀보세요."            │ │ │
│  │                            │  │  │ ✅ 반영됨                │ │ │
│  │  2. 솔루션 ← 코멘트 달기   │  │  └──────────────────────────┘ │ │
│  │  ──────────────            │  │  ┌──────────────────────────┐ │ │
│  │  AI 기반 매칭 플랫폼...     │  │  │ 라운드 2 (현재)          │ │ │
│  │                            │  │  │                          │ │ │
│  │  3. 시장 규모              │  │  │ 새 코멘트 작성...         │ │ │
│  │  ──────────────            │  │  │ [저장] [제출]            │ │ │
│  │  국내 시장 약 2.5조...      │  │  └──────────────────────────┘ │ │
│  │                            │  │                                │ │
│  └────────────────────────────┘  └────────────────────────────────┘ │
│                                                                      │
│  [멘토링 히스토리 (3회)]  [최종 의견서 작성]                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. 화면 설계 (신규/확장)

### 6.1 역할별 화면 구조

```
// 라우트 구조 (확장)

/[locale]/
├── (public)/
│   ├── login/                 # 로그인 (공통, 역할 무관)
│   └── signup/                # 회원가입 (단일 페이지, 스텝 방식)
│       └── page.tsx           # Step 1: 공통 정보 + 역할 선택
│                              # Step 2: 역할별 추가 정보 입력
│                              # Step 3: 가입 완료/승인 대기 안내
│
├── dashboard/                 # 통합 대시보드 (역할별 분기 렌더링)
│   └── page.tsx               # user: 내 프로젝트
│                              # mentor: 내 프로젝트 + 멘토링 프로젝트
│                              # institution: 기관 현황 요약
│
├── projects/                  # 프로젝트 (모든 역할 공통 - 개인 프로젝트)
│   ├── page.tsx               # 내 프로젝트 목록
│   ├── new/                   # 새 프로젝트 생성 (모든 역할 가능)
│   └── [id]/
│       ├── page.tsx           # 프로젝트 상세 (기존)
│       ├── mentor-feedback/   # 멘토 피드백 확인 (지원자용, 6.13)
│       │   └── page.tsx
│       ├── mentoring/         # 멘토 워크스테이션 (멘토 전용)
│       │   └── page.tsx
│       ├── apply-institution/ # 기관 지원 신청 (지원자용, 6.18)
│       │   └── page.tsx
│       └── satisfaction/      # 만족도 평가 (지원자용, 6.20)
│           └── page.tsx
│
├── mentoring/                 # 멘토 전용 - 멘토링 프로젝트 허브
│   ├── page.tsx               # 배정된 프로젝트 목록 (기관별 그룹핑)
│   └── payouts/               # 내 수당 내역 조회 (6.16)
│       └── page.tsx
│
├── notifications/             # 알림 센터 (모든 역할 공통, 6.17)
│   └── page.tsx
│
├── settings/
│   ├── page.tsx               # 공통 설정 (테마, 언어, 비밀번호 - 기존)
│   └── profile/               # 역할별 프로필 관리 (신규)
│       └── page.tsx           # user: 기본 프로필
│                              # mentor: 전문분야 + 이력서 + 통장사본 + 수당 정보
│                              # institution: 기관 정보 + 담당자 프로필
│
├── messages/                  # 메시지함 (모든 역할 공통)
│   ├── page.tsx               # 받은/보낸 메시지 목록
│   ├── new/                   # 새 메시지 작성
│   └── [id]/                  # 메시지 상세 (쓰레드 뷰)
│
├── institution/               # 기관 담당자 전용 (신규)
│   ├── dashboard/             # 기관 대시보드
│   ├── projects/              # 관할 프로젝트 목록
│   │   └── [id]/              # 프로젝트 상세 (배정 멘토 확인)
│   ├── mentors/               # 소속 멘토 풀 관리
│   │   ├── page.tsx           # 멘토 목록 (담당 프로젝트 수, 상태)
│   │   ├── invite/            # 멘토 초대 (이메일/검색/CSV)
│   │   └── [mentorId]/        # 멘토 상세 (프로필, 담당 프로젝트, 수당)
│   │       └── page.tsx
│   ├── messages/              # 기관 메시지 (일괄 발송 기능 포함)
│   │   ├── page.tsx           # 메시지함 + 일괄 발송 탭
│   │   └── bulk/              # 일괄 발송 이력
│   ├── matches/               # 멘토-프로젝트 매칭
│   ├── reports/               # 멘토링 보고서 관리
│   └── payouts/               # 수당 지급 관리
│
└── admin/                     # 관리자 (확장)
    ├── programs/              # 프로그램 관리 (신규)
    ├── institutions/          # 기관 관리 (신규)
    ├── mappings/              # 기관-프로젝트 매핑 (신규)
    ├── mentors/               # 전체 멘토 관리 (신규)
    ├── approvals/             # 승인 대기 큐 (기관+멘토, 신규)
    ├── overview/              # 전국 현황 대시보드 (신규)
    ├── payouts/               # 전체 수당 현황 (신규)
    └── audit-logs/            # 감사 로그 대시보드 (신규)
```

### 6.2 회원가입 화면 (가입은 가볍게, 프로필은 로그인 후)

> **핵심 원칙: 가입 허들 최소화**
> - 가입 시에는 **이름, 이메일, 비밀번호, 역할 선택**만 요구
> - 기관 담당자만 **소속 기관 선택**을 가입 시 추가로 요구 (승인 연동에 필수)
> - 멘토의 이력서, 수당 정보, 전문분야 등은 모두 **로그인 후 설정에서 입력**
> - 로그인 후 프로필 미완성 시 대시보드 상단에 **프로필 완성 유도 배너** 표시

#### 회원가입 페이지 (단일 페이지)

```
┌──────────────────────────────────────────────────────────────────────┐
│  CASA 회원가입                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── 기본 정보 ──                                                     │
│                                                                      │
│  이름 *           [________________________]                         │
│  이메일 *         [________________________]                         │
│  비밀번호 *       [________________________]                         │
│  비밀번호 확인 *  [________________________]                         │
│                                                                      │
│  ── 가입 유형을 선택하세요 ──                                         │
│                                                                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│  │  💡 일반 가입자  │ │  🎓 멘토        │ │  🏛️ 기관 담당자 │        │
│  │                 │ │                 │ │                 │        │
│  │ AI를 활용해     │ │ 전문 지식으로   │ │ 소속 기관의     │        │
│  │ 내 아이디어를   │ │ 창업자를 돕고   │ │ 창업 지원자를   │        │
│  │ 구체화하고      │ │ 싶은 전문가     │ │ 관리하는       │        │
│  │ 싶은 창업자     │ │                 │ │ 담당자          │        │
│  │                 │ │ ※ 개인 프로젝트 │ │                 │        │
│  │                 │ │   도 생성 가능  │ │ ※ 관리자 승인   │        │
│  │                 │ │ ※ 승인 후 활동  │ │   후 활동 가능  │        │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘        │
│                                                                      │
│  ── [기관 담당자 선택 시에만 표시] ──                                  │
│                                                                      │
│  소속 기관 *       [충북___________________▼]                         │
│                    충북창조경제혁신센터                                 │
│                    충북대학교 창업지원단                                │
│                    충북과학기술혁신원                                   │
│                                                                      │
│  ⓘ 목록에 기관이 없나요? [관리자에게 기관 등록 요청]                   │
│                                                                      │
│  ── 이용 약관 ──                                                     │
│                                                                      │
│  [✓] 서비스 이용약관 동의 (필수)            [전문 보기]                │
│  [✓] 개인정보 처리방침 동의 (필수)          [전문 보기]                │
│                                                                      │
│  [가입하기]                                                           │
│                                                                      │
│  ───── 또는 ─────                                                     │
│  [Google로 가입]  [GitHub로 가입]                                      │
│                                                                      │
│  이미 계정이 있으신가요? [로그인]                                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 가입 완료 안내 (역할별)

```
┌──────────────────────────────────────────────────────────────────────┐
│  가입 완료!                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── [일반 가입자] ──                                                  │
│                                                                      │
│  🎉 가입이 완료되었습니다!                                             │
│  이메일 인증 후 바로 CASA를 이용할 수 있습니다.                        │
│                                                                      │
│  [로그인 하기]                                                        │
│                                                                      │
│  ── [멘토] ──                                                        │
│                                                                      │
│  📋 가입 신청이 접수되었습니다!                                        │
│  관리자 승인 후 멘토 활동을 시작할 수 있습니다.                        │
│                                                                      │
│  ⓘ 승인 대기 중에도 로그인하여 개인 프로젝트를 생성할 수 있습니다.      │
│  ⓘ 로그인 후 [설정 > 프로필]에서 이력서, 전문분야, 수당 정보를         │
│    입력하시면 승인이 빨라집니다.                                        │
│                                                                      │
│  [로그인 하기]                                                        │
│                                                                      │
│  ── [기관 담당자] ──                                                  │
│                                                                      │
│  📋 가입 신청이 접수되었습니다!                                        │
│  소속 기관: 충북창조경제혁신센터                                       │
│  관리자가 기관 소속을 확인한 후 승인합니다.                             │
│                                                                      │
│  [로그인 하기]                                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 로그인 후: 프로필 완성 유도 배너

멘토/기관담당자가 로그인했을 때 프로필이 미완성이면 대시보드 상단에 배너를 표시합니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠️ 프로필을 완성해주세요                                    [설정으로 이동]│
│  멘토 활동을 위해 아래 항목을 입력해주세요:                              │
│  ☐ 전문분야  ☐ 경력요약  ☐ 이력서  ☐ 수당지급정보(통장사본/계좌)       │
│  프로필 완성도: ████░░░░░░ 40%                                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  CASA 대시보드 - 멘토                                                 │
├──────────────────────────────────────────────────────────────────────┤
│  ...                                                                 │
```

> **프로필 완성도 체크 항목 (멘토)**
> | 항목 | 필수 여부 | 입력 시점 |
> |------|-----------|-----------|
> | 이름, 이메일 | 필수 | 가입 시 |
> | 전문 분야 태그 | 필수 (멘토 활동용) | 로그인 후 설정 |
> | 경력 요약 | 필수 (멘토 활동용) | 로그인 후 설정 |
> | 이력서 | 필수 (기관 제출용) | 로그인 후 설정 |
> | 수당 지급 정보 | 선택 (수당 지급 전까지) | 로그인 후 설정 |
> | 통장사본 | 선택 (수당 지급 전까지) | 로그인 후 설정 |
>
> 멘토 프로필 필수 항목이 모두 입력되어야 **기관 멘토 풀에 초대 가능** 상태가 됩니다.
> 수당 지급 정보는 **실제 수당 지급 승인 전까지만** 입력하면 됩니다.

### 6.3 로그인 후 역할별 분기

로그인 페이지는 하나이며, 로그인 후 `bi_users.role`에 따라 자동 분기됩니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  CASA 로그인                                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  이메일           [________________________]                          │
│  비밀번호         [________________________]                          │
│                                                                      │
│  [로그인]                                                             │
│                                                                      │
│  ───── 또는 ─────                                                     │
│  [Google 로그인]  [GitHub 로그인]                                      │
│                                                                      │
│  계정이 없으신가요? [회원가입]    [비밀번호 찾기]                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

로그인 후 분기 로직:
┌─────────────┐
│   로그인    │
└──────┬──────┘
       │
       ▼
┌──────────────┐     ┌──────────────────────────────────────────┐
│ role 확인    │     │ is_approved 확인                          │
└──────┬───────┘     │ (mentor, institution만 해당)              │
       │             └───────────────────┬──────────────────────┘
       │                                 │
       ├── user ──────────────────────── ▶ /dashboard (내 프로젝트)
       │
       ├── mentor ─── approved? ─── Y ──▶ /dashboard (내 프로젝트 + 멘토링)
       │                           N ──▶ /dashboard (내 프로젝트만, 상단에 "승인 대기" 배너)
       │
       ├── institution ── approved? ─ Y ▶ /institution/dashboard (기관 대시보드)
       │                              N ▶ /dashboard (승인 대기 안내)
       │
       └── admin ─────────────────────▶ /admin (관리자 대시보드)
```

### 6.4 멘토 프로필/수당 정보 설정 화면

멘토가 가입 시 수당 정보를 입력하지 않았거나 수정이 필요할 때 사용하는 설정 페이지입니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  설정 > 프로필 관리                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [기본 정보]  [전문 분야]  [수당 지급 정보]  [서류 관리]                │
│  ════════════════════════════════════════════                         │
│                                                                      │
│  ┌─ 기본 정보 ───────────────────────────────────────────────────┐  │
│  │ 이름             [이전문                ] [수정]               │  │
│  │ 이메일           jm@email.com  (변경 불가)                     │  │
│  │ 연락처           [010-1234-5678         ] [수정]               │  │
│  │ 가입 유형        멘토 ✅ 승인됨                                 │  │
│  │ 가입일           2026-03-01                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 전문 분야 ───────────────────────────────────────────────────┐  │
│  │ 전문 분야        [헬스케어 ×] [AI ×] [바이오 ×] [+ 추가]      │  │
│  │ 관심 산업        [의료기기 ×] [디지털헬스 ×] [+ 추가]          │  │
│  │ 경력 요약        [前 삼성헬스 CTO, 20년 경력. AI/바이오 분야  ]│  │
│  │                  [헬스케어 스타트업 투자 및 멘토링 다수 경험   ]│  │
│  │                                                    [저장]      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 수당 지급 정보 ──────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ⚠️ 수당 지급 정보가 미입력 상태입니다.                         │  │
│  │     멘토링 수당을 받으려면 아래 정보를 입력해주세요.             │  │
│  │                                                                │  │
│  │  은행명           [국민은행              ▼]                     │  │
│  │  계좌번호         [________________________]                    │  │
│  │  예금주           [________________________]                    │  │
│  │  통장사본         [📎 파일 선택]  이미지/PDF (최대 5MB)         │  │
│  │                   └ 현재: bankbook_이전문.jpg                   │  │
│  │                     업로드: 2026-03-01  [미리보기] [삭제]       │  │
│  │                                                                │  │
│  │  🔒 금융 정보는 암호화되어 안전하게 보관됩니다.                  │  │
│  │     기관 담당자와 관리자만 수당 처리 시 열람할 수 있습니다.      │  │
│  │                                                                │  │
│  │                                                    [저장]      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 서류 관리 ───────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  이력서                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │ 📄 resume_이전문.pdf                                      ││  │
│  │  │    업로드: 2026-03-01  크기: 2.3MB                        ││  │
│  │  │    [미리보기]  [다운로드]  [새 파일로 교체]                 ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  │                                                                │  │
│  │  통장사본                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │ 🖼️ bankbook_이전문.jpg                                    ││  │
│  │  │    업로드: 2026-03-01  크기: 1.1MB                        ││  │
│  │  │    [미리보기]  [새 파일로 교체]                             ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  │                                                                │  │
│  │  추가 서류 (선택)                                              │  │
│  │  [📎 서류 추가 업로드]  경력증명서, 자격증 등                   │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 소속 기관 현황 ──────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  기관명                    │ 등록일       │ 상태               │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  충북창조경제혁신센터       │ 2026-03-05  │ ✅ 활동 중          │  │
│  │  경북대학교 창업지원단      │ 2026-03-10  │ ✅ 활동 중          │  │
│  │                                                                │  │
│  │  ⓘ 기관 담당자가 멘토 풀에 초대하면 여기에 표시됩니다.           │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.5 관리자 전국 현황 대시보드

```
┌──────────────────────────────────────────────────────────────────────┐
│  CASA 관리자 - 전국 현황 대시보드                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  프로그램: [2026년 상반기 모두의 창업 ▼]                               │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 전체 기관 │ │전체 지원자│ │전체 멘토 │ │진행 중   │ │완료      │  │
│  │    17    │ │  2,340   │ │   180    │ │  1,890   │ │   450    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  기관별 현황                                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 기관명              │ 지원자 │ 멘토 │ 매칭완료 │ 진행률      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 충북창조경제혁신센터  │  140  │  12  │  128   │ ████████░ 91%│  │
│  │ 충남창조경제혁신센터  │  120  │  10  │   95   │ ██████░░░ 79%│  │
│  │ 경북창업중심대학     │  200  │  18  │  180   │ ███████░░ 90%│  │
│  │ ...                 │  ...  │ ...  │  ...   │ ...         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [기관-프로젝트 매핑]  [일괄 배정]  [CSV 내보내기]                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.6 기관 담당자 대시보드

```
┌──────────────────────────────────────────────────────────────────────┐
│  충북창조경제혁신센터 - 기관 대시보드                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 관할     │ │ 멘토링   │ │ 멘토링   │ │ 수당     │ │ 완료     │  │
│  │ 지원자   │ │ 진행 중  │ │ 완료     │ │ 미지급   │ │ 프로젝트 │  │
│  │   140    │ │    85    │ │    42    │ │    15    │ │    13    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  [프로젝트 목록] [멘토 매칭] [멘토링 보고서] [수당 지급]                 │
│                                                                      │
│  멘토 매칭 현황                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 지원자      │ 프로젝트          │ 멘토       │ 상태    │ 액션 │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 김지원      │ AI 헬스케어 앱    │ 이전문멘토  │ 진행중  │ [상세]│ │
│  │ 박예비      │ 캠퍼스 배달       │ 미배정     │ 대기   │ [매칭]│  │
│  │ 최창업      │ 스터디 매칭       │ 박기술멘토  │ 완료   │ [보고서]││
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  수당 지급 대기 (15건)                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ □ 이전문멘토 - 3건 완료 - 450,000원  [의견서 확인] [승인]      │  │
│  │ □ 박기술멘토 - 2건 완료 - 300,000원  [의견서 확인] [승인]      │  │
│  │                                      [선택 일괄 승인]          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.7 기관 담당자 - 멘토 관리 화면

```
┌──────────────────────────────────────────────────────────────────────┐
│  충북창조경제혁신센터 - 멘토 관리                    [멘토 초대] [일괄 초대]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 전체 멘토│ │ 활동 중  │ │ 멘토링   │ │ 초대     │               │
│  │    12    │ │    10    │ │ 가능     │ │ 대기 중  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                      │
│  검색: [멘토명/전문분야 검색___________]  상태: [전체 ▼]             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 멘토          │ 전문분야       │ 담당    │ 진행중 │ 완료 │ 상태│  │
│  │               │                │ 프로젝트│        │      │     │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 이전문        │ 헬스케어, AI   │   5    │   3   │  2  │ 활동 │  │
│  │ [상세보기]    │                │        │       │     │      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 박기술        │ 핀테크, 블록체인│   3    │   1   │  2  │ 활동 │  │
│  │ [상세보기]    │                │        │       │     │      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 김마케팅      │ 마케팅, 유통   │   4    │   4   │  0  │ 활동 │  │
│  │ [상세보기]    │                │        │       │     │      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.8 기관 담당자 - 멘토 상세 화면

```
┌──────────────────────────────────────────────────────────────────────┐
│  멘토 상세: 이전문                          [비활성화] [풀에서 제거]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ 프로필 정보 ─────────────────────────────────────────────────┐  │
│  │ 이름: 이전문          전문분야: 헬스케어, AI, 바이오           │  │
│  │ 이메일: jm@email.com  경력: 前 삼성헬스 CTO, 20년 경력        │  │
│  │ 소속 기관: 충북센터, 경북센터 (2개 기관 활동 중)               │  │
│  │ [이력서 보기]  [통장사본 보기]                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 담당 프로젝트 현황 (우리 기관) ──────────────────────────────┐  │
│  │                                                                │  │
│  │ 프로젝트          │ 지원자   │ 역할 │ 상태    │ 라운드 │ 액션  │  │
│  │───────────────────────────────────────────────────────────────│  │
│  │ AI 헬스케어 앱    │ 김지원   │ 주   │ 진행중  │ 2/3   │[보기] │  │
│  │ 스마트팜 솔루션   │ 박농업   │ 주   │ 진행중  │ 1/3   │[보기] │  │
│  │ 바이오 센서       │ 최기술   │ 부   │ 완료    │ 3/3   │[보고서]│  │
│  │ 원격진료 플랫폼   │ 정의료   │ 주   │ 의견서  │ 3/3   │[확인] │  │
│  │ AI 신약 개발      │ 한약학   │ 주   │ 완료    │ 2/2   │[보고서]│  │
│  │                                                                │  │
│  │ 요약: 총 5건 (진행 2 / 의견서작성 1 / 완료 2)                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 수당 내역 ───────────────────────────────────────────────────┐  │
│  │ 프로젝트          │ 세션 수 │ 시간   │ 금액      │ 지급 상태  │  │
│  │───────────────────────────────────────────────────────────────│  │
│  │ 바이오 센서       │ 3회    │ 4.5h  │ 150,000원 │ ✅ 지급완료 │  │
│  │ AI 신약 개발      │ 2회    │ 3.0h  │ 100,000원 │ ⏳ 승인대기 │  │
│  │                                                                │  │
│  │ 합계: 세션 5회 / 7.5시간 / 250,000원                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 멘토링 품질 요약 ────────────────────────────────────────────┐  │
│  │ 평균 라운드 수: 2.4회   평균 코멘트 수: 8.2개/프로젝트          │  │
│  │ 지원자 만족도: 4.5/5.0  의견서 품질: 양호                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.9 멘토 초대 모달

```
┌──────────────────────────────────────────────┐
│  멘토 초대                            [닫기]  │
├──────────────────────────────────────────────┤
│                                              │
│  방법 선택: (○) 이메일로 초대                 │
│             (○) 기존 멘토 검색                │
│             (○) CSV 일괄 초대                 │
│                                              │
│  ── 기존 멘토 검색 ──                         │
│  [이름 또는 전문분야 검색________] [검색]      │
│                                              │
│  검색 결과:                                   │
│  ┌──────────────────────────────────────┐    │
│  │ □ 김새멘토 - AI, 데이터 - 미소속      │    │
│  │ □ 박전문가 - 핀테크 - 경북센터 소속   │    │
│  │ □ 정기술자 - IoT, 제조 - 미소속       │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [선택한 멘토 초대 (2명)]                      │
│                                              │
└──────────────────────────────────────────────┘
```

### 6.10 메시지 시스템

#### 기관 담당자: 메시지 발송 화면

```
┌──────────────────────────────────────────────────────────────────────┐
│  충북창조경제혁신센터 - 메시지                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [받은 메시지 (3)] [보낸 메시지] [일괄 발송]          [새 메시지 작성]  │
│  ════════════════                                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ● 이전문 멘토                              3분 전              │  │
│  │   Re: AI 헬스케어 앱 멘토링 일정 관련                           │  │
│  │   "네, 3월 15일 오후 2시에 가능합니다."                         │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ● 김지원 (지원자)                          1시간 전            │  │
│  │   사업계획서 보완 관련 문의                                     │  │
│  │   "멘토님 피드백 중 시장규모 부분을 어떻게..."                   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ○ 박기술 멘토                              어제                │  │
│  │   멘토링 보고서 제출 완료                                       │  │
│  │   "스터디 매칭 서비스 프로젝트 보고서를 제출..."                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ● 읽지 않음   ○ 읽음                                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 메시지 작성 / 개별 발송

```
┌──────────────────────────────────────────────────────────────────────┐
│  새 메시지 작성                                              [닫기]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  받는 사람 *    [이전문 ×]  [검색하여 추가...]                        │
│                 ⓘ 우리 기관의 멘토와 지원자만 선택 가능               │
│                                                                      │
│  관련 프로젝트  [AI 헬스케어 앱                ▼]  (선택)             │
│                 ⓘ 선택하면 수신자가 해당 프로젝트로 바로 이동 가능     │
│                                                                      │
│  제목           [멘토링 일정 확인 요청_______________________]       │
│                                                                      │
│  내용 *                                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 이전문 멘토님, 안녕하세요.                                     │   │
│  │ 충북창조경제혁신센터 담당자 홍길동입니다.                       │   │
│  │                                                               │   │
│  │ AI 헬스케어 앱 프로젝트(지원자: 김지원)의                      │   │
│  │ 1차 멘토링 일정을 확인 부탁드립니다.                           │   │
│  │                                                               │   │
│  │ 가능하신 날짜를 회신해주시면 감사하겠습니다.                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│                                    [취소]  [보내기]                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 일괄 메시지 발송

```
┌──────────────────────────────────────────────────────────────────────┐
│  일괄 메시지 발송                                            [닫기]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  수신 대상 *    (●) 소속 멘토 전체 (12명)                            │
│                 (○) 관할 지원자 전체 (140명)                          │
│                 (○) 멘토 + 지원자 전체 (152명)                        │
│                 (○) 직접 선택                                        │
│                                                                      │
│  ── [직접 선택인 경우] ──                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ [✓] 이전문 (멘토)        [✓] 김지원 (지원자)                 │   │
│  │ [✓] 박기술 (멘토)        [ ] 박예비 (지원자)                 │   │
│  │ [ ] 김마케팅 (멘토)      [✓] 최창업 (지원자)                 │   │
│  │                          선택됨: 5명                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  제목 *         [3월 멘토링 일정 안내________________________]       │
│                                                                      │
│  내용 *                                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 안녕하세요, 충북창조경제혁신센터입니다.                         │   │
│  │                                                               │   │
│  │ 3월 멘토링 일정을 아래와 같이 안내드립니다.                     │   │
│  │ ...                                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  미리보기: 12명에게 발송됩니다.                                       │
│                                                                      │
│                                    [취소]  [일괄 발송]                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 메시지 상세 (쓰레드 뷰)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 메시지함    멘토링 일정 확인 요청                                   │
│                관련 프로젝트: AI 헬스케어 앱 [바로가기]                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ 홍길동 (충북센터 담당자) ─────────────── 2026-03-10 14:00 ──┐  │
│  │ 이전문 멘토님, 안녕하세요.                                     │  │
│  │ AI 헬스케어 앱 프로젝트의 1차 멘토링 일정을                     │  │
│  │ 확인 부탁드립니다.                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 이전문 (멘토) ────────────────────────── 2026-03-10 15:30 ──┐  │
│  │ 네, 3월 15일 오후 2시에 가능합니다.                             │  │
│  │ 온라인 멘토링으로 진행하면 될까요?                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ 홍길동 (충북센터 담당자) ─────────────── 2026-03-10 16:00 ──┐  │
│  │ 네, 온라인으로 진행하겠습니다.                                   │  │
│  │ Zoom 링크는 당일 오전에 보내드리겠습니다.                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── 답장 ──                                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 답장 내용 입력...                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                          [답장 보내기]│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 멘토/지원자 측 메시지함

멘토와 지원자도 동일한 메시지함 UI를 사용하되, 일괄 발송 기능은 없습니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  내 메시지함                                         [새 메시지 작성]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [받은 메시지 (2)] [보낸 메시지]                                      │
│  ════════════════                                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ● 홍길동 (충북센터)                           3분 전          │  │
│  │   멘토링 일정 확인 요청                                        │  │
│  │   📎 관련: AI 헬스케어 앱                                      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ○ 충북창조경제혁신센터 (일괄)                 어제              │  │
│  │   3월 멘토링 일정 안내                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ⓘ 소속 기관 담당자 및 배정된 멘토/지원자에게만 메시지를 보낼 수       │
│    있습니다.                                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.11 역할별 네비게이션 구조

```
┌──────────────────────────────────────────────────────────────────────┐
│  [역할별 사이드바 / GNB]                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── 일반 가입자 (user) ──                                            │
│  ┌───────────────┐                                                   │
│  │ 🏠 대시보드    │ → /dashboard                                     │
│  │ 📁 내 프로젝트 │ → /projects                                      │
│  │ 💬 메시지 (2)  │ → /messages                                      │
│  │ 🔔 알림 (3)    │ → /notifications                                 │
│  │ ⚙️ 설정        │ → /settings                                      │
│  └───────────────┘                                                   │
│                                                                      │
│  ── 멘토 (mentor) ──                                                 │
│  ┌───────────────┐                                                   │
│  │ 🏠 대시보드    │ → /dashboard                                     │
│  │ 📁 내 프로젝트 │ → /projects (개인 프로젝트)                       │
│  │ 📋 멘토링     │ → /mentoring (배정된 프로젝트)                     │
│  │ 💬 메시지 (2)  │ → /messages                                      │
│  │ 🔔 알림 (5)    │ → /notifications                                 │
│  │ ⚙️ 프로필/설정 │ → /settings/profile                              │
│  └───────────────┘                                                   │
│                                                                      │
│  ── 기관 담당자 (institution) ──                                      │
│  ┌───────────────┐                                                   │
│  │ 🏠 기관 대시보드│ → /institution/dashboard                        │
│  │ 📊 프로젝트    │ → /institution/projects                          │
│  │ 👥 멘토 관리   │ → /institution/mentors                           │
│  │ 🔗 매칭 관리   │ → /institution/matches                           │
│  │ 📄 보고서      │ → /institution/reports                           │
│  │ 💰 수당 관리   │ → /institution/payouts                           │
│  │ 💬 메시지 (3)  │ → /institution/messages                          │
│  │ 🔔 알림 (7)    │ → /notifications                                 │
│  │ ──────────────│                                                   │
│  │ 📁 내 프로젝트 │ → /projects (개인)                                │
│  │ ⚙️ 설정        │ → /settings                                      │
│  └───────────────┘                                                   │
│                                                                      │
│  ── 관리자 (admin) ──                                                │
│  ┌───────────────┐                                                   │
│  │ 🏠 전국 현황   │ → /admin/overview                                │
│  │ 📋 프로그램    │ → /admin/programs                                │
│  │ 🏛️ 기관 관리   │ → /admin/institutions                            │
│  │ 🔗 매핑 관리   │ → /admin/mappings                                │
│  │ 👤 사용자 관리 │ → /admin/users (기존 + 승인 큐)                   │
│  │ ✅ 승인 대기   │ → /admin/approvals                               │
│  │ 💰 수당 현황   │ → /admin/payouts                                 │
│  │ 📊 감사 로그   │ → /admin/audit-logs                              │
│  │ 🔔 알림        │ → /notifications                                 │
│  │ ──────────────│                                                   │
│  │ ⚙️ 시스템 설정 │ → /admin/settings                                │
│  │ 📝 프롬프트    │ → /admin/prompts (기존)                           │
│  └───────────────┘                                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.12 지원자 대시보드 (멘토링 상태 통합)

기존 CASA 대시보드에 멘토링 상태를 통합하여 표시합니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  CASA 대시보드 - 내 프로젝트                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── [기관 지원 프로젝트가 있는 경우] ──                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 📌 기관 지원 프로젝트                                           │  │
│  │                                                                │  │
│  │ ┌──────────────────────────────────────────────────────────┐  │  │
│  │ │ 🏥 AI 헬스케어 앱                                         │  │  │
│  │ │                                                           │  │  │
│  │ │ 소속 기관: 충북창조경제혁신센터                             │  │  │
│  │ │ 담당 멘토: 이전문 (주멘토) · 박기술 (부멘토)               │  │  │
│  │ │                                                           │  │  │
│  │ │ 진행 현황: ██████████████░░░░░░ 70%                       │  │  │
│  │ │ 아이디어 ✅ → 평가 ✅ → 문서 ✅ → 멘토링 🔄 → 최종 ⬜   │  │  │
│  │ │                                                           │  │  │
│  │ │ ┌─ 새 멘토 피드백 ──────────────────────────────────┐    │  │  │
│  │ │ │ 🔴 이전문 멘토님이 사업계획서에 3개 코멘트를 남겼습니다  │    │  │  │
│  │ │ │    "시장 규모 근거가 부족합니다. 1차 자료를..."          │    │  │  │
│  │ │ │    [코멘트 보기]  [AI로 반영하기]                        │    │  │  │
│  │ │ └───────────────────────────────────────────────────┘    │  │  │
│  │ │                                                           │  │  │
│  │ │ [프로젝트 열기]                                            │  │  │
│  │ └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── 개인 프로젝트 ──                                                 │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 📱 캠퍼스 배달 앱         개인 프로젝트 · 아이디어 단계        │    │
│  │ [열기]  [기관 지원 신청]                                       │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │ 🌱 스마트팜 IOT           개인 프로젝트 · 문서 단계            │    │
│  │ [열기]  [기관 지원 신청]                                       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [+ 새 프로젝트 만들기]                                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.13 지원자 - 멘토 코멘트 확인 화면

프로젝트 상세 페이지 내에 멘토 피드백 탭을 추가합니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI 헬스케어 앱 - 프로젝트 상세                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [아이디어] [평가] [사업계획서] [피치덱] [포스터] [📋 멘토 피드백]     │
│  ═══════════════════════════════════════════════════ ═══════════════  │
│                                                                      │
│  ┌─ 멘토 피드백 요약 ──────────────────────────────────────────────┐│
│  │                                                                  ││
│  │ 멘토링 라운드: 2/3                                               ││
│  │ 담당 멘토: 이전문 (주멘토) · 박기술 (부멘토)                      ││
│  │ 미반영 코멘트: 🔴 3건    반영 완료: ✅ 5건                       ││
│  │                                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─ 라운드 2 (2026-03-10) ─ 이전문 멘토 ──────────────────────────┐│
│  │                                                                  ││
│  │ 📄 사업계획서 > 3.2 시장 규모                         🔴 미반영  ││
│  │ "TAM-SAM-SOM 분석이 필요합니다. 현재 숫자의 출처가               ││
│  │  불분명하고, 경쟁사 대비 점유율 근거를 추가하세요."               ││
│  │                                                                  ││
│  │ 📄 사업계획서 > 4.1 경쟁 분석                         🔴 미반영  ││
│  │ "직접 경쟁자 3개사 비교표가 효과적일 것 같습니다."               ││
│  │                                                                  ││
│  │ 📄 BM 캔버스 > 수익 모델                              🔴 미반영  ││
│  │ "B2B SaaS 가격 체계를 좀 더 구체적으로..."                       ││
│  │                                                                  ││
│  │ ┌──────────────────────────────────────────────────────────┐    ││
│  │ │ 💡 AI로 멘토 의견 반영하기                                │    ││
│  │ │                                                           │    ││
│  │ │ 반영할 코멘트: [✓] 시장 규모  [✓] 경쟁 분석  [ ] BM 캔버스│    ││
│  │ │                                                           │    ││
│  │ │ 추가 지시사항 (선택):                                     │    ││
│  │ │ [멘토님 의견을 반영해서 시장분석을 보강하고, 경쟁사___]    │    ││
│  │ │ [비교표를 추가해줘_____________________________________]    │    ││
│  │ │                                                           │    ││
│  │ │               [선택한 코멘트 반영하여 AI 재생성]           │    ││
│  │ └──────────────────────────────────────────────────────────┘    ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─ 라운드 1 (2026-03-05) ─ 이전문 멘토 ──────────────────────────┐│
│  │ 📄 아이디어 > 문제 정의                               ✅ 반영됨 ││
│  │ "문제 정의가 너무 광범위합니다. B2B 고객으로 좁혀보세요."        ││
│  │                                                                  ││
│  │ 📄 사업계획서 > 1. 개요                               ✅ 반영됨 ││
│  │ "실행 팀 소개가 약합니다. 핵심 역량을 강조하세요."               ││
│  │ ...더보기                                                        ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.14 멘토 대시보드

```
┌──────────────────────────────────────────────────────────────────────┐
│  CASA 대시보드 - 멘토                                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 멘토링   │ │ 진행 중  │ │ 피드백   │ │ 의견서   │ │ 내 개인  │  │
│  │ 프로젝트 │ │          │ │ 대기     │ │ 미제출   │ │ 프로젝트 │  │
│  │    8     │ │    5     │ │    2     │ │    1     │ │    2     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  [멘토링 프로젝트]  [내 프로젝트]                                     │
│  ════════════════                                                    │
│                                                                      │
│  ── 충북창조경제혁신센터 (5건) ──                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 프로젝트          │ 지원자   │ 역할│ 라운드 │ 상태    │ 액션   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ AI 헬스케어 앱    │ 김지원   │ 주  │ 2/3   │ 🔴 피드백 대기 │  │
│  │                   │          │     │       │ [워크스테이션]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 스마트팜 솔루션   │ 박농업   │ 주  │ 1/3   │ 🟡 진행중     │  │
│  │                   │          │     │       │ [워크스테이션]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 원격진료 플랫폼   │ 정의료   │ 주  │ 3/3   │ 🟠 의견서 작성 │  │
│  │                   │          │     │       │ [의견서 쓰기]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── 경북대학교 창업지원단 (3건) ──                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 바이오 센서       │ 최기술   │ 부  │ 2/3   │ 🟡 진행중     │  │
│  │                   │          │     │       │ [워크스테이션]  │  │
│  │ ...               │          │     │       │               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── 수당 내역 요약 ──                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 이번 프로그램 총 수당: 450,000원                                │  │
│  │ ✅ 지급 완료: 150,000원  ⏳ 승인 대기: 200,000원               │  │
│  │ 📋 미제출: 100,000원 (의견서 완료 후 자동 산정)                │  │
│  │                                          [수당 내역 상세보기]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.15 멘토 최종 의견서 작성 화면

```
┌──────────────────────────────────────────────────────────────────────┐
│  최종 멘토 의견서 작성 - AI 헬스케어 앱 (김지원)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ 멘토링 히스토리 요약 ──────────────────────────────────────────┐│
│  │ 총 멘토링 라운드: 3회   총 코멘트: 12개   반영률: 83%            ││
│  │ 기간: 2026-03-05 ~ 2026-03-20                                    ││
│  │ [히스토리 전체 보기]                                              ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ── 최종 평가 ──                                                     │
│                                                                      │
│  종합 평점 *    ⭐⭐⭐⭐☆  (4/5)                                   │
│                                                                      │
│  강점 *                                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ - 헬스케어 분야의 높은 이해도와 실현 가능한 기술 스택          │   │
│  │ - AI/ML 기반 진단 알고리즘의 차별점이 명확                      │   │
│  │ - 멘토 피드백 반영 속도가 빠르고 적극적                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  개선 필요 사항 *                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ - 시장 진입 전략이 아직 추상적, 구체적 파일럿 계획 필요         │   │
│  │ - 수익 모델의 단가 산정 근거가 부족                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  최종 의견 *                                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 전반적으로 사업화 가능성이 높은 프로젝트입니다. 시장 검증을      │   │
│  │ 통해 PMF를 확인한다면 투자 유치도 충분히 가능할 것으로...        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── AI 보고서 생성 (선택) ──                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 💡 AI가 멘토링 세션 히스토리를 기반으로 멘토링 보고서를         │   │
│  │    자동 생성합니다. 생성 후 수정할 수 있습니다.                  │   │
│  │                                                                │   │
│  │ [AI 보고서 생성하기]                                            │   │
│  │                                                                │   │
│  │ ── AI 생성 결과 (수정 가능) ──                                  │   │
│  │ ┌──────────────────────────────────────────────────────────┐ │   │
│  │ │ ## 멘토링 성과 보고서                                     │ │   │
│  │ │                                                           │ │   │
│  │ │ ### 1. 멘토링 개요                                        │ │   │
│  │ │ - 프로젝트: AI 헬스케어 앱                                │ │   │
│  │ │ - 지원자: 김지원                                          │ │   │
│  │ │ - 기간: 2026.03.05 ~ 2026.03.20 (3회 세션, 총 4.5시간)   │ │   │
│  │ │ ...                                                       │ │   │
│  │ └──────────────────────────────────────────────────────────┘ │   │
│  │                                    [수정하기]                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [임시 저장]                           [의견서 제출]                  │
│  ⓘ 제출 후에는 수정할 수 없습니다. 기관 담당자가 검토합니다.          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.16 멘토 수당 내역 조회 (멘토 본인용)

```
┌──────────────────────────────────────────────────────────────────────┐
│  내 수당 내역                                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 총 수당  │ │ 지급완료 │ │ 승인대기 │ │ 미제출   │               │
│  │ 450,000  │ │ 150,000  │ │ 200,000  │ │ 100,000  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                      │
│  프로그램: [2026년 상반기 모두의 창업 ▼]                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 기관/프로젝트     │ 세션 │ 시간  │ 금액       │ 상태         │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ── 충북창조경제혁신센터 ──                                      │  │
│  │ 바이오 센서       │ 3회  │ 4.5h │ 150,000원  │ ✅ 지급완료   │  │
│  │ AI 신약 개발      │ 2회  │ 3.0h │ 100,000원  │ ⏳ 승인대기   │  │
│  │ 원격진료 플랫폼   │ 3회  │ 4.5h │ 150,000원  │ ⏳ 승인대기   │  │
│  │ AI 헬스케어 앱    │ 2회  │ 3.0h │ (미정)     │ 📝 의견서제출전│  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ── 경북대학교 창업지원단 ──                                     │  │
│  │ 스마트워치 앱     │ 1회  │ 1.5h │ 50,000원   │ ⏳ 승인대기   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  🔒 수당 지급 정보:  국민은행 ****1234 (이전문)                       │
│  ⓘ 수당 정보는 [설정 > 프로필 > 수당 지급 정보]에서 수정할 수 있습니다│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.17 알림 센터

```
┌──────────────────────────────────────────────────────────────────────┐
│  알림                                              [전체 읽음 처리]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [전체] [멘토링 (3)] [매칭 (1)] [승인 (1)] [메시지 (2)]               │
│                                                                      │
│  ── 오늘 ──                                                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 📋 이전문 멘토님이 "AI 헬스케어 앱"에 코멘트 3건을         │  │
│  │    남겼습니다.                                          3분 전  │  │
│  │    [코멘트 보기 →]                                              │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 🔴 💬 충북창조경제혁신센터에서 새 메시지가 도착했습니다.       │  │
│  │    "3월 멘토링 일정 안내"                               1시간 전│  │
│  │    [메시지 보기 →]                                              │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ⚪ ✅ 프로젝트 "AI 헬스케어 앱"이 충북창조경제혁신센터에       │  │
│  │    배정되었습니다.                                       어제   │  │
│  │    [프로젝트 보기 →]                                            │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ⚪ 👤 이전문 멘토가 주멘토로 배정되었습니다.              어제   │  │
│  │    [프로젝트 보기 →]                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ── 지난 주 ──                                                      │
│  │ ⚪ 🎉 회원가입이 완료되었습니다. 프로젝트를 생성해보세요!       │  │
│  │    [프로젝트 만들기 →]                                     3일 전│  │
│  │ ...더 보기                                                       │  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.18 기관 지원 신청 화면 (지원자용)

```
┌──────────────────────────────────────────────────────────────────────┐
│  기관 지원 신청 - 캠퍼스 배달 앱                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⓘ 이 프로젝트를 창조경제혁신센터 또는 창업중심대학의 멘토링 지원을    │
│    받을 수 있습니다. 신청이 승인되면 기관에서 멘토를 배정합니다.        │
│                                                                      │
│  ── 신청 정보 ──                                                     │
│                                                                      │
│  프로젝트명         캠퍼스 배달 앱                                    │
│  프로젝트 유형      pre_startup                                      │
│  현재 단계          평가 완료 (Gate 2)                                │
│                                                                      │
│  지원 기관 선택 *   [충북___________________▼]                        │
│                     충북창조경제혁신센터                                │
│                     충북대학교 창업지원단                               │
│                     ...                                               │
│                                                                      │
│  프로그램 *         [2026년 상반기 모두의 창업 ▼]                      │
│                                                                      │
│  지원 동기 (선택)                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 전문 멘토의 도움으로 시장 진입 전략을 구체화하고 싶습니다...   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── 동의 ──                                                          │
│  [✓] 기관 담당자와 배정 멘토에게 프로젝트 산출물(아이디어, 사업계획서  │
│      등)을 공유하는 것에 동의합니다. (필수)                            │
│                                                                      │
│  [취소]                                        [지원 신청하기]        │
│                                                                      │
│  ⓘ 기관 담당자가 승인하면 알림으로 안내해 드립니다.                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.19 빈 상태(Empty State) 및 온보딩 가이드

각 역할이 처음 진입할 때 빈 상태를 안내합니다.

```
── 일반 가입자: 첫 대시보드 ──
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🎉 CASA에 오신 것을 환영합니다!                                      │
│                                                                      │
│  AI와 함께 창업 아이디어를 구체화해 보세요.                            │
│                                                                      │
│  ┌─ 시작하기 ──────────────────────────────────────────────────────┐│
│  │  1️⃣  프로젝트 만들기     아이디어를 입력하면 AI가 확장해 줍니다  ││
│  │  2️⃣  사업성 평가 받기    3가지 관점에서 AI가 평가합니다          ││
│  │  3️⃣  문서 자동 생성      사업계획서, 피치덱, 포스터 등           ││
│  │  4️⃣  기관 지원 신청      전문 멘토의 피드백을 받을 수 있습니다   ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  [+ 첫 프로젝트 만들기]                                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

── 기관 담당자: 승인 후 첫 대시보드 ──
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🏛️ 충북창조경제혁신센터 기관 대시보드 시작하기                         │
│                                                                      │
│  현재 관할 지원자와 멘토가 아직 없습니다.                              │
│  아래 순서대로 진행해주세요:                                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ✅ 1. 기관 승인 완료                                         │   │
│  │  ⬜ 2. 멘토 풀 구성    [멘토 초대하기 →]                      │   │
│  │  ⬜ 3. 지원자 배정 대기  관리자가 프로젝트를 매핑하면 여기      │   │
│  │                          에 표시됩니다.                        │   │
│  │  ⬜ 4. 멘토-프로젝트 매칭  지원자가 배정되면 멘토를 매칭        │   │
│  │                            해주세요.                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

── 멘토: 승인 대기 중 ──
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ⏳ 멘토 승인 대기 중                                                 │
│                                                                      │
│  관리자가 멘토 자격을 검토 중입니다.                                  │
│  승인이 완료되면 알림으로 안내해 드립니다.                             │
│                                                                      │
│  ⓘ 대기 중에도 개인 프로젝트를 생성하고 AI 기능을 사용할 수 있습니다. │
│                                                                      │
│  [프로필 완성하기 →]  [개인 프로젝트 만들기 →]                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.20 멘토 만족도 평가 (지원자용)

멘토링 완료 후 지원자가 멘토에 대해 평가합니다.

```
┌──────────────────────────────────────────────────────────────────────┐
│  멘토링 만족도 평가 - AI 헬스케어 앱                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⓘ 멘토링이 완료되었습니다. 멘토님의 멘토링에 대해 평가해주세요.       │
│    (익명으로 처리됩니다)                                              │
│                                                                      │
│  멘토: 이전문                                                        │
│  멘토링 기간: 2026-03-05 ~ 2026-03-20 (3회 세션)                     │
│                                                                      │
│  ── 평가 항목 ──                                                     │
│                                                                      │
│  전문성         ⭐⭐⭐⭐⭐  5/5                                     │
│  피드백 구체성  ⭐⭐⭐⭐☆  4/5                                     │
│  응답 속도      ⭐⭐⭐⭐☆  4/5                                     │
│  전체 만족도    ⭐⭐⭐⭐⭐  5/5                                     │
│                                                                      │
│  한줄 후기 (선택)                                                     │
│  [실질적인 피드백 덕분에 사업계획서가 크게 개선되었습니다________]     │
│                                                                      │
│  [나중에 하기]                              [평가 제출]               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. API 설계 (신규)

### 7.1 프로그램 관리 API

```
POST   /api/admin/programs                    # 프로그램 생성
GET    /api/admin/programs                    # 프로그램 목록
GET    /api/admin/programs/{id}               # 프로그램 상세
PATCH  /api/admin/programs/{id}               # 프로그램 수정
```

### 7.2 기관 관리 API

```
POST   /api/admin/institutions                # 기관 등록
GET    /api/admin/institutions                # 기관 목록
GET    /api/admin/institutions/{id}           # 기관 상세 + 통계
PATCH  /api/admin/institutions/{id}           # 기관 수정
POST   /api/admin/institutions/{id}/approve   # 기관 승인

# 기관 담당자 승인
GET    /api/admin/institution-members         # 대기 중 기관 담당자 목록
POST   /api/admin/institution-members/{id}/approve  # 기관 담당자 승인
```

### 7.3 매핑/매칭 API

```
# 관리자: 프로젝트-기관 매핑
POST   /api/admin/mappings                    # 프로젝트-기관 매핑 생성
POST   /api/admin/mappings/bulk               # 일괄 매핑
GET    /api/admin/mappings                    # 매핑 목록 (필터: 기관, 프로그램, 상태)
PATCH  /api/admin/mappings/{id}               # 매핑 수정/취소

# 기관 담당자: 멘토-프로젝트 매칭
POST   /api/institution/matches               # 멘토-프로젝트 매칭 생성
GET    /api/institution/matches               # 매칭 목록
PATCH  /api/institution/matches/{id}          # 매칭 상태 변경
# 기관 담당자: 멘토 풀 관리
GET    /api/institution/mentors               # 소속 멘토 풀 목록 (프로필 + 매칭 통계 포함)
GET    /api/institution/mentors/{mentorId}    # 멘토 상세 (프로필 + 담당 프로젝트 목록 + 멘토링 현황)
POST   /api/institution/mentors/invite        # 멘토를 기관 풀에 초대 (이메일 또는 ID 기반)
POST   /api/institution/mentors/bulk-invite   # 멘토 일괄 초대 (CSV 또는 목록)
PATCH  /api/institution/mentors/{mentorId}    # 멘토 풀 상태 변경 (active/inactive)
DELETE /api/institution/mentors/{mentorId}    # 멘토를 기관 풀에서 제거

# 기관 담당자: 멘토별 프로젝트 현황
GET    /api/institution/mentors/{mentorId}/projects   # 특정 멘토가 담당하는 프로젝트 목록
GET    /api/institution/mentors/{mentorId}/sessions    # 특정 멘토의 멘토링 세션 이력
GET    /api/institution/mentors/{mentorId}/reports     # 특정 멘토의 의견서 목록

# 기관 담당자: 프로젝트/추천
GET    /api/institution/projects              # 관할 프로젝트 목록
GET    /api/institution/projects/{id}/mentors  # 프로젝트에 배정된 멘토 목록
GET    /api/institution/recommend-mentor/{projectId}  # AI 멘토 추천
GET    /api/institution/stats                 # 기관 종합 통계 (멘토별 업무량, 프로젝트 진행률 등)

# 지원자: 기관 지원 신청
POST   /api/projects/{id}/apply-institution   # 기관 지원 신청

# 지원자: 멘토 피드백 관련
GET    /api/projects/{id}/mentor-feedback     # 내 프로젝트의 멘토 코멘트 조회 (라운드별)
GET    /api/projects/{id}/mentor-info         # 배정된 멘토 정보 조회
POST   /api/projects/{id}/revise-with-feedback  # 멘토 의견 반영 AI 재생성 (SSE)

# 지원자: 멘토링 만족도 평가
POST   /api/projects/{id}/satisfaction        # 만족도 평가 제출
GET    /api/projects/{id}/satisfaction        # 내 평가 조회
```

### 7.4 멘토 API

```
# 멘토 프로필
GET    /api/mentor/profile                    # 내 프로필 조회
PATCH  /api/mentor/profile                    # 프로필 수정
POST   /api/mentor/profile/upload-resume      # 이력서 업로드
POST   /api/mentor/profile/upload-bank        # 통장사본 업로드

# 멘토 워크스테이션
GET    /api/mentor/projects                   # 배정된 프로젝트 목록
GET    /api/mentor/projects/{id}              # 프로젝트 상세 (모든 산출물 포함)

# 멘토링 세션
POST   /api/mentor/projects/{id}/sessions     # 새 멘토링 세션 시작
GET    /api/mentor/projects/{id}/sessions     # 세션 히스토리
PATCH  /api/mentor/sessions/{sessionId}       # 세션 코멘트 수정
POST   /api/mentor/sessions/{sessionId}/submit  # 세션 제출

# 멘토링 보고서
POST   /api/mentor/projects/{id}/report       # 최종 의견서 작성
GET    /api/mentor/projects/{id}/report       # 의견서 조회
PATCH  /api/mentor/reports/{reportId}         # 의견서 수정
POST   /api/mentor/reports/{reportId}/submit  # 의견서 제출
POST   /api/mentor/reports/{reportId}/generate-ai  # AI 보고서 생성 (SSE)

# 멘토 수당 조회 (본인용)
GET    /api/mentor/payouts                    # 내 수당 내역 목록 (기관별, 프로그램별)
GET    /api/mentor/payouts/summary            # 수당 요약 (총액, 지급완료, 대기)
```

### 7.5 수당 관리 API

```
# 기관 담당자
GET    /api/institution/payouts               # 수당 대기 목록
POST   /api/institution/payouts/{id}/approve  # 수당 승인
POST   /api/institution/payouts/bulk-approve  # 일괄 승인
GET    /api/institution/payouts/export        # 수당 지급 내역 CSV 내보내기
GET    /api/institution/payouts/report-pdf/{id} # 멘토링 확인서 PDF 자동 생성/다운로드

# 관리자
GET    /api/admin/payouts                     # 전체 수당 현황
```

### 7.6 알림 API

```
GET    /api/notifications                     # 내 알림 목록
PATCH  /api/notifications/{id}/read           # 읽음 처리
POST   /api/notifications/read-all            # 전체 읽음
GET    /api/notifications/unread-count         # 미읽은 수
```

### 7.7 메시지 API

```
# 공통 (모든 역할)
GET    /api/messages                          # 내 메시지함 (받은/보낸 필터)
GET    /api/messages/{id}                     # 메시지 상세 (쓰레드 포함)
POST   /api/messages                          # 메시지 보내기 (개별)
POST   /api/messages/{id}/reply               # 답장
PATCH  /api/messages/{id}/read                # 읽음 처리
GET    /api/messages/unread-count             # 미읽은 메시지 수

# 기관 담당자 전용
POST   /api/institution/messages/bulk         # 일괄 메시지 발송
GET    /api/institution/messages/batches      # 일괄 발송 이력
GET    /api/institution/messages/batches/{id} # 일괄 발송 상세 (수신자별 읽음 현황)
```

---

## 8. 구현 전략 (Phase별 로드맵)

### 8.1 구현 우선순위 원칙

1. **기존 기능 유지**: 현재 user 트랙(pre_startup, startup)은 100% 유지
2. **점진적 확장**: 테이블 추가 → 역할 확장 → 화면 추가 순서
3. **독립 배포 가능**: 각 Phase 완료 시 독립적으로 동작 가능
4. **하위 호환**: 기존 사용자가 업데이트 후에도 정상 사용 가능

### 8.2 Phase별 구현 계획

> **상세 구현 태스크는 [TASK_NEW.md](./TASK_NEW.md)를 참고하세요.** 아래는 Phase별 요약입니다.

#### Phase E0: 보안 선행 작업 (확장 전 필수)

> **의존성:** 없음 (즉시 시작)
> **예상 산출물:** 기존 시스템의 보안 취약점 해결, 확장 안전성 확보

**태스크:**
- [ ] E0.1: API 키 로테이션 및 git 이력 정리 (커밋 히스토리 내 노출된 키 제거)
- [ ] E0.2: HTTP 보안 헤더 추가 (`next.config.ts` — CSP, X-Frame-Options, HSTS 등)
- [ ] E0.3: 에러 메시지 클라이언트 노출 차단 (`handleApiError` 수정, 스택 트레이스 제거)
- [ ] E0.4: 기존 API 라우트의 Service Client → anon Client 전환 (공개 라우트 3건)

> ⚠️ **Phase E0은 확장 개발 착수 전에 반드시 완료해야 합니다.**

---

#### Phase E1: 기반 확장 (DB + 역할 + 보안 인프라)

> **의존성:** Phase E0 완료 + 기존 시스템 (Phase 0~9) 완료
> **예상 산출물:** 새 테이블 생성, 역할 체계 확장, 회원가입 분기, 보안 인프라 구축

**태스크 (DB 확장):**
- [ ] E1.1: 신규 테이블 14개 생성 (programs, institutions, institution_members, mentor_profiles, mentor_institution_pool, project_institution_maps, mentor_matches, mentoring_sessions, mentoring_reports, mentor_payouts, notifications, messages, message_batches, **audit_logs**)
- [ ] E1.2: 기존 테이블 수정 (bi_users role 확장, bi_projects support_type 추가, bi_feedbacks session_id 추가)
- [ ] E1.2.1: 프로젝트 생성 권한을 모든 역할에 개방 (기존 user 전용 → 전체 역할)
- [ ] E1.3: 신규 테이블 RLS 정책 생성
- [ ] E1.4: TypeScript 타입 재생성 및 커스텀 타입 추가

**태스크 (보안 인프라):**
- [ ] E1.5: Rate Limiting 미들웨어 도입 (`lib/security/rate-limit.ts`, Upstash Ratelimit 활용)
  - 엔드포인트별 차등 제한: standard(60/min), AI(5/min), auth(10/15min), upload(20/hr), message(10/min)
- [ ] E1.6: 인가 가드 함수 통일 및 확장 (`lib/auth/guards.ts`)
  - `requireRole()`, `requireInstitution()`, `requireMentorProfile()` 등 일원화
  - 기존 인라인 role 체크 → 가드 함수 호출로 전환
- [ ] E1.7: 금융 정보 암호화 모듈 (`lib/security/encryption.ts`, AES-256-GCM)
  - 계좌번호 암호화 저장 + 마스킹 표시 (`****1234`)
- [ ] E1.8: 감사 로그 유틸리티 (`lib/security/audit.ts`)
  - `logAudit(userId, action, resourceType, resourceId, details)` 함수
  - 민감 작업 (로그인, 권한 변경, 매칭, 수당 승인, 금융 조회) 자동 기록
- [ ] E1.9: 페이지네이션 limit 바운딩 공통 스키마 적용 (max 100, 기본 20)
- [ ] E1.10: `/share/[id]` XSS 방어 (CSP 강화 + iframe 샌드박스)

**태스크 (회원/역할):**
- [ ] E1.11: 통합 회원가입 페이지 (단일 페이지, 가입 허들 최소화)
  - 공통: 이름 + 이메일 + 비밀번호 + 역할 선택 카드 + 약관 동의
  - 기관 담당자 선택 시에만: 소속 기관 드롭다운 추가 표시
  - 멘토/일반: 추가 입력 없음 → 가입 즉시 완료
  - 역할별 가입 완료 안내 (즉시 활성 vs 승인 대기 + 프로필 입력 안내)
- [ ] E1.12: Supabase Storage private 버킷 설정 + RLS 정책 (mentor-documents)
  - 버킷별 접근 정책: 본인만 업로드/다운로드, 기관 담당자 읽기 전용
- [ ] E1.13: 파일 업로드 API (이력서, 통장사본 → signed URL 방식, 파일 타입/크기 검증)
- [ ] E1.14: 로그인 후 역할별 리다이렉트 로직 (middleware.ts 수정)
- [ ] E1.15: 대시보드 상단 배너 시스템 (승인 대기 안내 + 프로필 완성 유도)
- [ ] E1.16: 멘토 프로필 설정 페이지 (/settings/profile)
  - 4탭: 기본정보 / 전문분야+경력 / 수당지급정보 / 서류관리(이력서,통장사본)
  - 프로필 완성도 퍼센트 표시
  - 필수 항목 미입력 시 멘토 풀 초대 불가 상태 안내
- [ ] E1.17: 기존 데이터 마이그레이션 스크립트 (UP + DOWN 롤백 스크립트 쌍)

**태스크 (품질 인프라):**
- [ ] E1.18: 테스트 환경 구축 (Vitest + Testing Library + Playwright 설정)
- [ ] E1.19: CI 파이프라인 구축 (GitHub Actions: lint → type-check → test → build)
- [ ] E1.20: RLS 정책 테스트 프레임워크 (역할별 접근 검증 자동화)
- [ ] E1.21: Sentry 에러 추적 연동 + 구조화 로깅 설정
- [ ] E1.22: 피처 플래그 모듈 (`lib/feature-flags.ts`)

#### Phase E2: 관리자 확장

> **의존성:** Phase E1 완료
> **예상 산출물:** 프로그램/기관 관리, 매핑 기능

**태스크:**
- [ ] E2.1: 프로그램 관리 API + UI (CRUD)
- [ ] E2.2: 기관 관리 API + UI (등록, 승인)
- [ ] E2.3: 기관 담당자 승인 API + UI
- [ ] E2.4: 멘토 승인 API + UI
- [ ] E2.5: 프로젝트-기관 매핑 API + UI (단건 + 일괄)
- [ ] E2.6: 전국 현황 대시보드 UI
- [ ] E2.7: 알림 시스템 구현 (bi_notifications + API + UI)

#### Phase E3: 기관 담당자 기능

> **의존성:** Phase E2 완료
> **예상 산출물:** 기관 대시보드, 멘토 매칭, 수당 관리

**태스크:**
- [ ] E3.1: 기관 대시보드 페이지 (통계, 프로젝트 현황)
- [ ] E3.2: 관할 프로젝트 목록 페이지 (필터, 검색, 상태별)
- [ ] E3.3: 멘토 풀 관리 페이지 (소속 멘토 목록, 활동/비활동 상태, 담당 프로젝트 수 표시)
- [ ] E3.3.1: 멘토 상세 페이지 (프로필 조회, 담당 프로젝트 목록, 멘토링 현황, 수당 내역)
- [ ] E3.3.2: 멘토 초대 기능 (이메일 초대, 기존 멘토 검색/추가, CSV 일괄 초대)
- [ ] E3.3.3: 멘토 풀 상태 관리 (활성화/비활성화/제거)
- [ ] E3.4: 멘토-프로젝트 매칭 기능 (수동 + AI 추천, 주멘토/부멘토 지정)
- [ ] E3.5: 멘토링 보고서 검토 + 확인 기능
- [ ] E3.6: 수당 지급 관리 (승인, 일괄 처리, CSV 내보내기)
- [ ] E3.7: 기관별 진행 현황 리포트
- [ ] E3.8: 메시지 시스템
  - 공통 메시지함 UI (받은/보낸, 쓰레드 뷰, 읽음 표시)
  - 개별 메시지 작성 (수신자 검색 - 기관 소속 멘토/지원자만)
  - 기관 담당자 전용: 일괄 메시지 발송 (멘토 전체/지원자 전체/직접 선택)
  - 일괄 발송 이력 및 수신자별 읽음 현황
  - 프로젝트 연결 기능 (메시지에서 프로젝트로 바로 이동)
  - 메시지 수신 시 알림(bi_notifications) 자동 생성
- [ ] E3.9: 메시지 보안 적용
  - 메시지 RLS 정책 (송/수신자만 조회 가능)
  - 일괄 발송 Rate Limit (5회/시간)
  - 개인정보 동의 관리 테이블 + 동의 UI

#### Phase E4: 멘토 기능

> **의존성:** Phase E1 완료 (E2, E3와 일부 병렬 가능)
> **예상 산출물:** 멘토 대시보드, 워크스테이션, 의견서

**태스크:**
- [ ] E4.1: 멘토 통합 대시보드 (6.14 참고)
  - "멘토링 프로젝트" 탭: 기관별 그룹핑, 상태별 정렬 (피드백 대기 > 진행중 > 완료)
  - "내 프로젝트" 탭: 개인 프로젝트 (기존 user 대시보드와 동일 UX)
  - 수당 내역 요약 카드
- [ ] E4.2: 멘토 설정 페이지 (이력서, 통장사본, 전문분야 관리)
- [ ] E4.3: 멘토 워크스테이션 UI (좌: 산출물 뷰어, 우: 코멘트 패널)
  - 산출물 탭 전환 (아이디어, 평가, 사업계획서, 피치덱, BM캔버스)
  - 이전 라운드 코멘트 vs 현재 버전 비교 뷰
- [ ] E4.4: 섹션별 코멘트 CRUD (아이디어, 평가, 각 문서별)
- [ ] E4.5: 멘토링 세션 관리 (라운드별 기록)
- [ ] E4.6: 최종 의견서 작성 UI (6.15 참고)
  - 종합 평점, 강점, 개선사항, 최종 의견 입력
  - AI 보고서 생성 → 검토 → 수정 플로우
  - 임시 저장 / 제출 분리
- [ ] E4.7: AI 멘토링 보고서 자동 생성 (SSE, 프롬프트 추가)
- [ ] E4.8: 멘토링 히스토리 타임라인 뷰
- [ ] E4.9: 멘토 수당 내역 조회 페이지 (6.16 참고) — 기관별/프로그램별 수당 현황
- [ ] E4.10: 멘토 수당 조회 API (`/api/mentor/payouts`, `/api/mentor/payouts/summary`)

#### Phase E5: 지원자 확장

> **의존성:** Phase E4 완료
> **예상 산출물:** 멘토 피드백 확인, AI 반영, 기관 지원 신청, 만족도 평가

**태스크:**
- [ ] E5.1: 지원자 대시보드 확장 (6.12 참고)
  - 기관 지원 프로젝트: 멘토 정보, 진행 현황 프로그레스 바, 새 피드백 알림 카드
  - 개인 프로젝트: 기존 UI + [기관 지원 신청] 버튼 추가
- [ ] E5.2: 멘토 코멘트 확인 탭 (6.13 참고)
  - 프로젝트 상세 내 [멘토 피드백] 탭
  - 라운드별 코멘트 목록 + 반영 상태 (미반영/반영됨) 표시
  - 코멘트 선택 → AI 재생성 진입점
- [ ] E5.3: "멘토 의견 반영" AI 재생성 기능 (기존 revise API 확장)
  - 반영할 코멘트 선택 → 추가 지시사항 입력 → SSE 재생성
  - 재생성 완료 시 자동으로 해당 코멘트 "반영됨" 상태 전환
- [ ] E5.4: 기관 지원 신청 기능 (6.18 참고)
  - 기관/프로그램 선택, 지원 동기, 프로젝트 공유 동의
  - 신청 후 대시보드에 "승인 대기" 상태 표시
- [ ] E5.5: 프로젝트 유형 표시 (개인/기관지원) — 라벨/뱃지
- [ ] E5.6: 멘토링 만족도 평가 (6.20 참고)
  - 멘토링 완료 시 평가 팝업/페이지
  - 전문성, 피드백 구체성, 응답 속도, 전체 만족도 (5점 척도)
  - 한줄 후기 (선택, 익명)
- [ ] E5.7: 배정 멘토 정보 조회 API + UI (멘토 이름, 전문분야, 소속 기관)

#### Phase E6: 통합 및 최적화

> **의존성:** Phase E3, E4, E5 완료
> **예상 산출물:** 전체 플로우 통합 테스트, 성능 최적화, 공통 UX 완성

**태스크:**
- [ ] E6.1: 전체 워크플로우 E2E 테스트 (관리자→기관→멘토→지원자 순환)
- [ ] E6.2: RLS 정책 통합 테스트 (역할별 접근 검증)
- [ ] E6.3: 대시보드 성능 최적화 (대량 데이터 대응)
- [ ] E6.4: 알림 시스템 전체 연결 + 알림 센터 UI (6.17 참고)
- [ ] E6.5: 역할별 네비게이션 구조 구현 (6.11 참고)
- [ ] E6.6: 빈 상태(Empty State) 및 온보딩 가이드 구현 (6.19 참고)
- [ ] E6.7: 다국어 메시지 추가 (신규 화면 한/영)
- [ ] E6.8: 다크모드 적용 확인 (신규 화면)
- [ ] E6.9: 모바일 반응형 검증 (데스크톱 → 태블릿 → 모바일 순)
- [ ] E6.10: 멘토링 확인서 PDF 자동 생성 기능 (수당 증빙용)

### 8.3 Phase 병렬화 전략

```
E1 (기반 확장)
 │
 ├──────────────────────────────┐
 │                              │
 ▼                              ▼
E2 (관리자 확장)             E4 (멘토 기능) ← 일부 병렬 가능
 │                              │
 ▼                              │
E3 (기관 담당자 기능)           │
 │                              │
 ├──────────────────────────────┘
 │
 ▼
E5 (지원자 확장)
 │
 ▼
E6 (통합 및 최적화)
```

### 8.4 Git 브랜치 전략

현재 프로젝트(`Tae-Kyung/casa`, main 브랜치 단독)에서 **별도 리포지토리 없이** feature branch 기반으로 확장을 진행한다.

#### A. 브랜치 구조

```
main (현재 안정 버전 — 기존 CASA 기능 유지)
  │
  └── feature/moduchanup ← 확장 개발 메인 브랜치
        │
        ├── feature/moduchanup/e0-security      ← Phase E0
        ├── feature/moduchanup/e1-foundation     ← Phase E1
        ├── feature/moduchanup/e2-admin          ← Phase E2
        ├── feature/moduchanup/e3-institution    ← Phase E3
        ├── feature/moduchanup/e4-mentor         ← Phase E4
        ├── feature/moduchanup/e5-applicant      ← Phase E5
        └── feature/moduchanup/e6-integration    ← Phase E6
```

#### B. 브랜치 운영 규칙

| 규칙 | 설명 |
|------|------|
| **메인 브랜치 보호** | `main`은 항상 배포 가능 상태 유지. 직접 push 금지 |
| **확장 메인 브랜치** | `feature/moduchanup`이 확장 개발의 통합 브랜치 역할 |
| **Phase 브랜치** | 각 Phase별 하위 브랜치에서 개발 → `feature/moduchanup`으로 PR 머지 |
| **main 머지 시점** | Phase 단위 안정화 후 `feature/moduchanup` → `main` PR 생성 |
| **커밋 컨벤션** | `feat(E1.5): 기관 테이블 생성 및 RLS 적용` 형태 (Phase 태스크 번호 포함) |

#### C. Phase별 머지 전략

```
Phase E0 완료 → feature/moduchanup → main 머지 (보안 패치이므로 즉시 반영)
                    │
Phase E1 완료 → feature/moduchanup → main 머지 (기반 확장, Staging 검증 후)
                    │
Phase E2~E4  → feature/moduchanup 에 누적 머지
                    │
E4 완료 시점  → feature/moduchanup → main 머지 (중간 릴리스)
                    │
Phase E5~E6  → feature/moduchanup 에 누적 머지
                    │
E6 완료 시점  → feature/moduchanup → main 머지 (최종 릴리스)
```

> **이유**: E0(보안)과 E1(기반)은 빠르게 main에 반영하여 기존 서비스 안정성을 확보한다.
> E2~E4는 기관/멘토 기능이 서로 의존하므로 묶어서 검증 후 반영한다.
> E5~E6은 지원자 확장과 통합 테스트를 포함하므로 최종 릴리스로 반영한다.

#### D. 태그 및 릴리스 전략

| 이벤트 | 태그 | 설명 |
|--------|------|------|
| E0 main 머지 | `v1.1.0-security` | 보안 패치 릴리스 |
| E1 main 머지 | `v2.0.0-alpha` | 확장 기반 (역할/테이블 추가, 기존 기능 정상 동작 확인) |
| E2~E4 main 머지 | `v2.0.0-beta` | 기관/멘토 기능 포함 중간 릴리스 |
| E5~E6 main 머지 | `v2.0.0` | 모두의 창업 에디션 정식 릴리스 |

#### E. Vercel 배포 연동

```
main 브랜치          → Production 배포 (casa.vercel.app)
feature/moduchanup   → Preview 배포 (moduchanup-casa.vercel.app)
Phase 하위 브랜치     → PR Preview (자동 생성 URL)
```

- **Preview 배포**를 활용하여 확장 기능을 main 머지 전에 실제 환경에서 검증
- Vercel의 브랜치별 환경변수를 활용하여 Preview에는 **별도 Supabase 프로젝트(Staging)**를 연결

#### F. 즉시 실행 순서

```bash
# 1. 확장 메인 브랜치 생성
git checkout main
git checkout -b feature/moduchanup

# 2. Phase E0 브랜치에서 보안 작업 시작
git checkout -b feature/moduchanup/e0-security

# 3. E0 완료 후
git checkout feature/moduchanup
git merge feature/moduchanup/e0-security
# feature/moduchanup → main PR 생성 및 머지

# 4. E1 브랜치 시작
git checkout feature/moduchanup
git checkout -b feature/moduchanup/e1-foundation
# ... Phase 반복
```

> **왜 새 리포지토리가 아닌가?**
> - 코드베이스 규모가 190개 파일, 1.5MB로 관리 가능한 수준
> - 이미 `모두의 창업 신청서` 관련 커밋(2804a81)이 main에 존재
> - Vercel + Supabase + 환경변수 등 인프라 재구축 비용 불필요
> - strategy.md 자체가 "기존 시스템 위에 점진적 확장"으로 설계됨

---

## 9. 기술적 고려사항

### 9.1 Supabase Storage 설계

```
Storage Buckets:
├── mentor-documents (private)     # 이력서, 통장사본
│   ├── {user_id}/resume/          # 이력서 파일
│   └── {user_id}/bank/            # 통장사본 이미지
├── mentoring-reports (private)    # 멘토링 보고서 PDF
│   └── {match_id}/               # 매칭별 보고서
└── documents (기존, public/private) # 프로젝트 산출물
```

**접근 정책:**
- `mentor-documents`: 본인 + admin만 접근 가능
- `mentoring-reports`: 관련 멘토 + 기관 담당자 + admin 접근 가능

### 9.2 RLS 정책 설계 원칙

```sql
-- 기관 담당자: 소속 기관의 프로젝트만 조회
CREATE POLICY "institution_view_mapped_projects" ON bi_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bi_project_institution_maps pim
      JOIN bi_institution_members im ON im.institution_id = pim.institution_id
      WHERE pim.project_id = bi_projects.id
        AND im.user_id = auth.uid()
        AND im.is_approved = true
    )
  );

-- 멘토: 배정된 프로젝트만 조회
CREATE POLICY "mentor_view_matched_projects" ON bi_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.project_id = bi_projects.id
        AND mm.mentor_id = auth.uid()
        AND mm.status != 'cancelled'
    )
  );
```

### 9.3 성능 최적화 전략

| 영역 | 전략 | 구현 방법 |
|------|------|-----------|
| **대시보드 통계** | 집계 캐싱 | Supabase Edge Function으로 5분 주기 집계 또는 Redis 캐싱 |
| **프로젝트 목록** | 페이지네이션 | cursor 기반 무한 스크롤 (offset 방식 지양) |
| **실시간 상태** | 변경 알림 | Supabase Realtime (채널별 구독) |
| **검색** | 인덱스 최적화 | 복합 인덱스 (institution_id + status, mentor_id + status) |
| **파일 업로드** | 클라이언트 직접 업로드 | Supabase Storage signed URL 활용 |

### 9.4 보안 아키텍처 (전면 설계)

> **"모두의 창업" 확장 시스템은 전국 수천 명의 창업자, 수백 명의 멘토, 수십 개 기관이 참여하는 국가 사업 플랫폼입니다.**
> **개인정보(금융 포함), 사업 아이디어(지식재산), 멘토링 기록(행정 증빙)을 다루므로 보안은 최우선 과제입니다.**

---

#### 9.4.1 현재 시스템 보안 감사 결과

기존 CASA MVP의 보안 현황을 감사한 결과, 아래와 같은 취약점이 발견되었습니다.
**확장 전에 반드시 선행 조치해야 합니다.**

| 심각도 | 항목 | 현재 상태 | 조치 |
|--------|------|-----------|------|
| 🔴 **Critical** | API 키 노출 | `.env` 파일에 실제 운영 키(Supabase, Anthropic, OpenAI, Google, Upstash) 존재 가능성 | 즉시 모든 키 로테이션 + `.env` git 이력에서 제거(`git filter-branch` 또는 BFG) |
| 🔴 **Critical** | HTTP 보안 헤더 부재 | CSP, X-Frame-Options, HSTS 등 미설정 | `next.config.ts`에 보안 헤더 추가 |
| 🟠 **High** | API Rate Limiting 없음 | 모든 API 엔드포인트에 호출 제한 없음, AI 호출 남용 가능 | Upstash Ratelimit 도입 |
| 🟠 **High** | AI HTML 직접 렌더링(XSS) | `/share/[id]`에서 AI 생성 HTML을 CSP 없이 그대로 제공 | 샌드박스 iframe + CSP 적용 |
| 🟡 **Medium** | 미들웨어가 `/api/*` 전체 스킵 | 각 API 핸들러에 auth 호출 의존 → 누락 시 무방비 | API 미들웨어 레이어 추가 |
| 🟡 **Medium** | Service Client 공개 라우트 사용 | `/showcase`, `/public-profile`에서 RLS 우회 클라이언트 사용 | anon 클라이언트 + 공개용 RLS 정책으로 전환 |
| 🟡 **Medium** | 역할 체크 패턴 불일치 | `requireAdmin()` vs 인라인 role 체크 혼재 | 가드 함수 통일 |
| 🟡 **Medium** | 페이지네이션 limit 무제한 | 일부 API에서 `?limit=1000000` 가능 | `Math.min(limit, 100)` 바운드 적용 |
| 🟡 **Medium** | 에러 메시지 누출 | `error.message`를 클라이언트에 그대로 반환 → 내부 경로/키 노출 가능 | 사용자용 메시지 매핑 |
| 🟡 **Medium** | `bi_credit_logs` INSERT 정책 | `WITH CHECK (true)` → 모든 인증 사용자가 로그 삽입 가능 | service_role 전용으로 제한 |
| 🟡 **Medium** | Storage 버킷 RLS 미정의 | 코드에 Storage 정책 없음 → 대시보드 설정에만 의존 | SQL로 Storage RLS 정책 명시 |
| 🟢 **Low** | CSRF 보호 미흡 | Supabase 쿠키 SameSite=Lax 의존 | 민감 작업에 CSRF 토큰 추가 검토 |

---

#### 9.4.2 데이터 분류 및 보호 등급

확장 시스템에서 다루는 데이터를 등급별로 분류하고, 각 등급에 맞는 보호 조치를 정의합니다.

| 등급 | 데이터 유형 | 예시 | 보호 조치 |
|------|-----------|------|-----------|
| 🔴 **Confidential** (기밀) | 금융 정보 | 통장사본, 계좌번호, 수당 금액 | 암호화 저장 + 마스킹 표시 + Private 버킷 + 접근 로그 + 최소 열람 원칙 |
| 🔴 **Confidential** | 인증 정보 | 비밀번호, API 키, JWT 토큰 | Supabase Auth 위임 + 환경변수 + 절대 로깅 금지 |
| 🟠 **Sensitive** (민감) | 개인 정보 | 이름, 이메일, 연락처, 이력서 | 암호화 전송(HTTPS) + RLS + 본인/관리자만 접근 |
| 🟠 **Sensitive** | 사업 아이디어 | 아이디어 카드, 사업계획서, BM 캔버스 | RLS(소유자+배정멘토+관할기관) + 공개 범위 사용자 통제 |
| 🟡 **Internal** (내부) | 운영 데이터 | 멘토링 세션, 평가 점수, 승인 이력 | RLS + 역할 기반 접근 |
| 🟢 **Public** (공개) | 공개 데이터 | Showcase 프로젝트, 공개 프로필 | 사용자가 명시적으로 공개 선택한 것만 |

---

#### 9.4.3 인증 및 인가 보안

**A. 인증 (Authentication)**

```
┌──────────────────────────────────────────────────────────────────────┐
│                         인증 아키텍처                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [브라우저]                    [Next.js 서버]         [Supabase]     │
│                                                                      │
│  1. 로그인 요청 ──────────────▶ middleware.ts                        │
│                                   │                                  │
│                                   ▼                                  │
│  2. Supabase Auth ◀──────────── getUser() ─────────▶ JWT 검증       │
│     (쿠키 기반)                   │                    (서버 사이드)  │
│                                   │                                  │
│  3. bi_users 조회 ◀─────────── role, is_approved ──▶ DB 조회        │
│                                   │                                  │
│                                   ▼                                  │
│  4. 역할별 분기 ◀──────────── 리다이렉트                             │
│                                                                      │
│  ※ 핵심 원칙:                                                       │
│  • getUser() 사용 (getSession() 절대 금지 - JWT 서버 검증 필수)      │
│  • 모든 민감 역할 확인은 DB 조회 (클라이언트 토큰 신뢰 금지)         │
│  • 세션 만료 시간: 1시간 (리프레시 토큰: 7일)                        │
│  • 동시 세션 수 제한: 기관 담당자/관리자는 최대 3개                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**B. 인가 (Authorization) - 다계층 방어**

```
요청 → [Layer 1: Middleware] → [Layer 2: API Guard] → [Layer 3: RLS] → DB
         │                       │                       │
         │ 인증 상태 확인         │ 역할/소유권 확인       │ 행 단위 접근 제어
         │ 라우트 보호            │ 비즈니스 로직 검증     │ DB 레벨 최종 방어
         │                       │                       │
         └── 1차 필터            └── 2차 필터            └── 3차 필터 (최종)
```

세 계층 중 **하나라도 통과 못하면 차단**됩니다. RLS가 최종 방어선이므로 Guard 누락 시에도 데이터 유출 방지.

**C. 확장 시스템 인가 가드 함수 (통일)**

```typescript
// 기존 가드 유지 + 확장 가드 추가 (일관된 패턴 사용)
requireAuth()                           // 인증된 사용자
requireRole(['admin'])                  // 관리자
requireRole(['admin', 'institution'])   // 관리자 또는 기관 담당자
requireRole(['admin', 'institution', 'mentor']) // 관리자/기관/멘토
requireApproved()                       // 승인된 사용자 (is_approved = true)
requireInstitutionMember(institutionId) // 특정 기관 소속 확인
requireMentorMatch(projectId)           // 특정 프로젝트에 배정된 멘토 확인
requireProjectAccess(projectId)         // 프로젝트 접근 권한 (소유자/멘토/기관/관리자)
requireMessageAccess(recipientId)       // 메시지 발송 권한 (같은 기관/매칭 관계)
```

---

#### 9.4.4 API 보안

**A. Rate Limiting (Upstash Ratelimit 활용)**

기존에 Upstash Redis가 프롬프트 캐싱용으로 설정되어 있으므로, 동일 인프라에 Rate Limiting 추가.

```typescript
// lib/security/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

// 티어별 Rate Limit 설정
export const rateLimits = {
  // 일반 API: 분당 60회
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    prefix: 'rl:standard',
  }),
  // AI 생성 API: 분당 5회 (비용 높음)
  aiGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1m'),
    prefix: 'rl:ai',
  }),
  // 로그인 시도: 15분당 10회 (브루트포스 방지)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15m'),
    prefix: 'rl:auth',
  }),
  // 파일 업로드: 시간당 20회
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1h'),
    prefix: 'rl:upload',
  }),
  // 메시지 발송: 분당 10회 (스팸 방지)
  message: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'),
    prefix: 'rl:message',
  }),
  // 일괄 발송: 시간당 5회
  bulkMessage: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1h'),
    prefix: 'rl:bulk',
  }),
}
```

**B. 입력 검증 강화**

```typescript
// 모든 API에 적용할 공통 검증 패턴
// 1. 페이지네이션 바운딩
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// 2. enum 필터 검증 (as 캐스팅 절대 금지)
const statusFilter = z.enum(['draft', 'in_progress', 'completed']).optional()

// 3. UUID 검증
const uuidParam = z.string().uuid()

// 4. 검색어 길이 제한 + 특수문자 이스케이프
const searchQuery = z.string().max(100).transform(escapeSQL)

// 5. 파일 업로드 검증
const fileUploadSchema = z.object({
  size: z.number().max(10 * 1024 * 1024), // 10MB
  type: z.enum(['application/pdf', 'image/jpeg', 'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
})
```

**C. 에러 응답 보안**

```typescript
// 내부 에러 메시지를 클라이언트에 절대 노출하지 않음
export function handleApiError(error: unknown): NextResponse {
  // 서버 로그에만 상세 기록
  console.error('API Error:', error)

  // 클라이언트에는 일반화된 메시지만 반환
  if (error instanceof z.ZodError) {
    return errorResponse('입력값이 올바르지 않습니다.', 400)
  }
  // ❌ 기존: return errorResponse(error.message, 500) → 내부 경로/키 노출 위험
  // ✅ 개선: 일반 메시지만 반환
  return errorResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500)
}
```

---

#### 9.4.5 HTTP 보안 헤더

```typescript
// next.config.ts에 추가
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js 요구
      "style-src 'self' 'unsafe-inline'",                   // Tailwind 요구
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com",
      "frame-src 'none'",                                   // iframe 차단
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

// /share/[id] (AI 생성 HTML)에는 별도의 강화된 CSP 적용
const sharePageCSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src https://fonts.googleapis.com https://fonts.gstatic.com;"
// → JavaScript 실행 완전 차단
```

---

#### 9.4.6 데이터 보호 (개인정보/금융정보)

**A. 금융 정보 보호 (멘토 수당 관련)**

```
┌──────────────────────────────────────────────────────────────────────┐
│                    금융 정보 보호 아키텍처                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [입력]                                                              │
│  멘토가 계좌번호 입력 ──▶ HTTPS 전송 (TLS 1.3)                      │
│                              │                                       │
│  [처리]                      ▼                                       │
│  서버에서 암호화 ──────▶ AES-256-GCM 암호화                          │
│                              │                                       │
│  [저장]                      ▼                                       │
│  DB: account_number_encrypted ──▶ 암호화된 값                        │
│  DB: account_number_masked ───▶ "***-***-1234" (표시용)              │
│  Storage: 통장사본 ──────────▶ private 버킷 + 서명된 URL로만 접근    │
│                                                                      │
│  [조회]                                                              │
│  멘토 본인 ──────────────▶ 마스킹된 번호만 표시                      │
│  기관 담당자 (수당 처리) ▶ 마스킹된 번호 + 은행명만 표시             │
│  관리자 ─────────────────▶ 마스킹된 번호 + 은행명 (복호화 불가)      │
│                                                                      │
│  ※ 실제 계좌번호 복호화: 수당 지급 시스템 연동 시에만 (서버 내부)     │
│  ※ 복호화 키: 환경변수로 관리, 코드에 절대 포함 금지                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

```typescript
// lib/security/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32바이트

export function encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: (cipher as any).getAuthTag().toString('hex'),
  }
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length < 4) return '****'
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
}
```

**B. 사업 아이디어 보호 (지식재산)**

| 위협 | 대응 |
|------|------|
| 타인이 아이디어 열람 | RLS: 소유자 + 배정 멘토 + 관할 기관만 접근 |
| 멘토가 아이디어 유출 | 이용약관에 NDA 조항 포함 + 접근 로그 기록 |
| AI 학습에 데이터 사용 | Anthropic/OpenAI API의 데이터 학습 미사용 정책 확인 및 명시 |
| 관리자 권한 남용 | 관리자 접근 로그 별도 기록 + 정기 감사 |
| 공개 프로필 과다 노출 | 사용자가 공개 범위를 명시적으로 선택 (기본값: 비공개) |

**C. 개인정보 처리 동의 체계**

```
가입 시 동의:
├── [필수] 서비스 이용약관
├── [필수] 개인정보 수집·이용 동의 (이름, 이메일, 연락처)
├── [선택] 마케팅 수신 동의
│
멘토 수당 정보 입력 시 추가 동의:
├── [필수] 금융정보 수집·이용 동의 (계좌번호, 통장사본)
│         └ 수집 목적: 멘토링 수당 지급
│         └ 보유 기간: 수당 지급 완료 후 5년 (세법 기준)
│         └ 제3자 제공: 해당 기관의 수당 지급 담당자에게만
│
기관 지원 신청 시 추가 동의:
├── [필수] 프로젝트 정보 기관 공유 동의
│         └ 공유 대상: 해당 기관 담당자, 배정 멘토
│         └ 공유 범위: 프로젝트 산출물 (아이디어, 사업계획서 등)
```

---

#### 9.4.7 Storage 보안

```sql
-- Supabase Storage RLS 정책 (코드로 명시)

-- mentor-documents 버킷: 멘토 본인 + 관리자만 접근
CREATE POLICY "mentor_own_documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'mentor-documents'
    AND (
      -- 본인 파일
      (storage.foldername(name))[1] = auth.uid()::text
      -- 또는 관리자
      OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
      -- 또는 해당 멘토의 소속 기관 담당자 (수당 처리 시)
      OR EXISTS (
        SELECT 1 FROM bi_mentor_institution_pool mip
        JOIN bi_institution_members im ON im.institution_id = mip.institution_id
        WHERE mip.mentor_id::text = (storage.foldername(name))[1]
          AND im.user_id = auth.uid()
          AND im.is_approved = true
      )
    )
  );

-- documents 버킷: 프로젝트 접근 권한 기반
CREATE POLICY "project_documents_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND (
      -- 프로젝트 소유자
      EXISTS (
        SELECT 1 FROM bi_projects p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.user_id = auth.uid()
      )
      -- 또는 배정 멘토
      OR EXISTS (
        SELECT 1 FROM bi_mentor_matches mm
        WHERE mm.project_id::text = (storage.foldername(name))[1]
          AND mm.mentor_id = auth.uid()
      )
      -- 또는 관리자
      OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
    )
  );
```

**파일 업로드 보안 규칙:**

| 항목 | 정책 |
|------|------|
| 최대 파일 크기 | 이력서/통장사본: 10MB, 프로젝트 산출물: 20MB |
| 허용 파일 형식 | PDF, DOC, DOCX, JPG, PNG (MIME + 매직바이트 이중 검증) |
| 파일명 처리 | 원본 파일명 저장하되 경로에는 UUID 사용 (path traversal 방지) |
| 악성 파일 검사 | 이미지: 리사이징 처리 (메타데이터 제거), PDF: 텍스트 추출만 허용 |
| 접근 방식 | private 버킷 + Signed URL (유효시간 5분) |
| 다운로드 로깅 | 금융 서류 다운로드 시 `bi_audit_logs`에 기록 |

---

#### 9.4.8 감사 로그 (Audit Log)

민감한 작업에 대해 추적 가능한 감사 로그를 남깁니다.

```sql
CREATE TABLE bi_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id),
  action TEXT NOT NULL,
  -- 액션 유형:
  -- auth: login, logout, login_failed, role_changed
  -- data: project_viewed, document_downloaded, profile_viewed
  -- admin: user_approved, credit_recharged, mapping_created
  -- finance: bank_info_viewed, payout_approved, report_confirmed
  -- message: message_sent, bulk_message_sent
  resource_type TEXT,              -- project, user, document, mentor_profile, payout 등
  resource_id UUID,
  details JSONB,                   -- 추가 컨텍스트 (변경 전/후 값 등)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_user ON bi_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON bi_audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action ON bi_audit_logs(action, created_at DESC);

-- 감사 로그는 삭제 불가 (관리자 포함)
ALTER TABLE bi_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert_only" ON bi_audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_admin_read" ON bi_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );
-- UPDATE, DELETE 정책 없음 → 수정/삭제 불가
```

**감사 대상 액션:**

| 카테고리 | 액션 | 기록 내용 |
|----------|------|-----------|
| 인증 | 로그인/로그아웃/실패 | IP, User-Agent, 시각 |
| 역할 변경 | 승인/역할 수정 | 변경 전→후 값 |
| 금융 정보 | 통장사본 조회/수당 승인 | 조회자, 대상 멘토 |
| 프로젝트 접근 | 타인 프로젝트 조회 | 조회자, 프로젝트 소유자 |
| 관리자 작업 | 매핑/크레딧 충전/삭제 | 상세 변경 내역 |
| 메시지 | 일괄 발송 | 발송 대상 수, 내용 요약 |

---

#### 9.4.9 역할별 접근 격리

```
┌──────────────────────────────────────────────────────────────────────┐
│                    데이터 접근 격리 모델                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [관리자] ─────────────────────────────────────────────────────────  │
│  │ 전체 기관/프로젝트 조회 가능 (읽기)                                │
│  │ 단, 금융 정보 복호화 불가 (마스킹만 표시)                          │
│  │ 모든 작업 감사 로그 기록                                          │
│                                                                      │
│  [기관 A 담당자] ──────────────────┐                                 │
│  │ 기관 A에 매핑된 프로젝트만 조회  │  [기관 B 담당자]                │
│  │ 기관 A 소속 멘토만 관리          │  │ 기관 B 데이터만 접근         │
│  │ 기관 B 데이터 접근 불가 ×        │  │ 기관 A 데이터 접근 불가 ×    │
│  └──────────────────────────────┘  └─────────────────────────────┘  │
│                                                                      │
│  [멘토 X] ────────────────────┐                                     │
│  │ 배정된 프로젝트 1, 2만 조회 │  [멘토 Y]                          │
│  │ 프로젝트 3 접근 불가 ×      │  │ 배정된 프로젝트 3만 조회        │
│  │ 본인 금융 정보만 조회       │  │ 프로젝트 1, 2 접근 불가 ×       │
│  └────────────────────────────┘  └──────────────────────────────┘   │
│                                                                      │
│  [지원자 가] ─────────────────┐                                     │
│  │ 본인 프로젝트만 접근        │  [지원자 나]                        │
│  │ 배정 멘토 프로필(공개부분)  │  │ 본인 프로젝트만 접근             │
│  │ 타 지원자 데이터 접근 불가 × │  │ 지원자 가의 데이터 접근 불가 × │
│  └────────────────────────────┘  └──────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

#### 9.4.10 메시지 보안

| 위협 | 대응 |
|------|------|
| 무관한 사용자에게 메시지 발송 | RLS: 같은 기관/매칭 관계인 사용자에게만 발송 가능 |
| 메시지 스팸 | Rate Limit: 개별 10건/분, 일괄 5건/시간 |
| 메시지 내 XSS | 메시지 내용은 일반 텍스트로 저장/표시 (HTML 렌더링 금지) |
| 타인 메시지 열람 | RLS: sender_id 또는 recipient_id가 본인인 메시지만 조회 가능 |
| 일괄 발송 남용 | 기관 담당자만 가능 + 발송 이력 감사 로그 기록 |

```sql
-- 메시지 RLS 정책
CREATE POLICY "message_access" ON bi_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "message_send" ON bi_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- 같은 기관 소속 (기관↔멘토/지원자)
      EXISTS (
        SELECT 1 FROM bi_institution_members im1
        JOIN bi_institution_members im2 ON im1.institution_id = im2.institution_id
        WHERE im1.user_id = auth.uid() AND im2.user_id = recipient_id
      )
      -- 또는 멘토-지원자 매칭 관계
      OR EXISTS (
        SELECT 1 FROM bi_mentor_matches mm
        JOIN bi_projects p ON p.id = mm.project_id
        WHERE (mm.mentor_id = auth.uid() AND p.user_id = recipient_id)
           OR (p.user_id = auth.uid() AND mm.mentor_id = recipient_id)
      )
      -- 또는 기관 담당자가 관할 지원자에게
      OR EXISTS (
        SELECT 1 FROM bi_project_institution_maps pim
        JOIN bi_institution_members im ON im.institution_id = pim.institution_id
        JOIN bi_projects p ON p.id = pim.project_id
        WHERE im.user_id = auth.uid() AND p.user_id = recipient_id
      )
      -- 또는 관리자
      OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
    )
  );
```

---

#### 9.4.11 보안 구현 로드맵 (우선순위)

| 우선순위 | 작업 | Phase | 비고 |
|----------|------|-------|------|
| 🔴 P0 (즉시) | API 키 로테이션 + git 이력 정리 | 선행 | 확장 전 필수 |
| 🔴 P0 (즉시) | HTTP 보안 헤더 추가 (`next.config.ts`) | 선행 | 10줄 추가로 해결 |
| 🔴 P0 (즉시) | 에러 메시지 클라이언트 노출 차단 | 선행 | `handleApiError` 수정 |
| 🟠 P1 (E1) | Rate Limiting 도입 (Upstash) | E1 | 기존 Redis 활용 |
| 🟠 P1 (E1) | 인가 가드 함수 통일 + 확장 | E1 | 인라인 체크 제거 |
| 🟠 P1 (E1) | 페이지네이션 limit 바운딩 전체 적용 | E1 | 공통 스키마 |
| 🟠 P1 (E1) | `bi_audit_logs` 테이블 생성 | E1 | 감사 인프라 |
| 🟠 P1 (E1) | 금융 정보 암호화 모듈 (`lib/security/encryption.ts`) | E1 | AES-256-GCM |
| 🟡 P2 (E1) | Storage RLS 정책 SQL 작성 | E1 | 버킷별 정책 |
| 🟡 P2 (E1) | Service Client 사용처 정리 (공개 라우트 → anon) | E1 | 3개 라우트 |
| 🟡 P2 (E1) | `/share/[id]` XSS 방어 (CSP + iframe 샌드박스) | E1 | AI HTML |
| 🟡 P2 (E3) | 메시지 RLS 정책 + Rate Limit | E3 | 메시지 시스템 |
| 🟡 P2 (E3) | 개인정보 동의 관리 테이블 + UI | E3 | 법적 요구 |
| 🟢 P3 (E6) | 관리자 감사 로그 대시보드 | E6 | 모니터링 |
| 🟢 P3 (E6) | 이상 접근 탐지 알림 (비정상 로그인, 대량 조회) | E6 | 보안 모니터링 |
| 🟢 P3 (향후) | 침투 테스트 (외부 보안 업체) | 런칭 전 | 전문 감사 |

---

## 10. 구현 품질 보증 체계 (Implementation Quality Assurance)

> **국가 사업 플랫폼에서는 "동작하는 코드"가 아니라 "검증된 코드"가 필요합니다.**
> 수천 명의 창업자 데이터, 금융 정보, 정부 사업 증빙이 걸려 있으므로 구현 과정 전체에 품질 게이트를 적용합니다.

### 10.1 테스팅 전략

#### A. 테스트 피라미드

```
                    ┌─────────────┐
                    │   E2E 테스트  │  ← 핵심 워크플로우 (10~20개)
                    │  (Playwright) │
                 ┌──┴─────────────┴──┐
                 │  통합 테스트 (API)   │  ← 모든 API 엔드포인트 (50+)
                 │     (Vitest)       │
              ┌──┴────────────────────┴──┐
              │     단위 테스트 (로직)      │  ← 비즈니스 로직, 유틸 (200+)
              │        (Vitest)           │
              └───────────────────────────┘
```

#### B. 테스트 범위 및 도구

| 계층 | 도구 | 대상 | 커버리지 목표 |
|------|------|------|-------------|
| **단위 테스트** | Vitest | 유틸 함수, 가드 함수, 암호화 모듈, Zod 스키마, 비즈니스 로직 | 90% |
| **API 통합 테스트** | Vitest + Supertest | 모든 API 라우트 (인증, 인가, 입력검증, 응답 형식) | 100% |
| **RLS 테스트** | Vitest + Supabase Test Helpers | 모든 RLS 정책 (역할별 접근 검증, 교차 기관 격리) | 100% |
| **컴포넌트 테스트** | Vitest + Testing Library | 핵심 UI 컴포넌트 (폼 검증, 역할별 분기, 상태 전환) | 70% |
| **E2E 테스트** | Playwright | 핵심 사용자 여정 (가입→프로젝트→멘토링→의견서→수당) | 핵심 플로우 100% |

#### C. 필수 테스트 시나리오

```
── 역할별 접근 제어 테스트 (Phase E1에서 반드시 작성) ──
□ user가 institution 전용 API 호출 시 403 반환
□ mentor가 미배정 프로젝트 접근 시 403 반환
□ 기관 A 담당자가 기관 B 데이터 조회 시 빈 결과 반환
□ 미승인(is_approved=false) 멘토의 멘토링 기능 접근 차단
□ 모든 역할의 개인 프로젝트 CRUD 정상 동작

── 금융 데이터 보안 테스트 ──
□ 계좌번호 암호화 → 복호화 라운드트립 검증
□ 마스킹 함수 출력 형식 검증 (****1234)
□ 기관 담당자가 멘토 금융 정보 조회 시 마스킹만 표시
□ 감사 로그에 금융 조회 기록 남는지 검증
□ Storage signed URL 만료 후 접근 차단 검증

── 멘토링 워크플로우 E2E ──
□ 지원자 프로젝트 생성 → 기관 매핑 → 멘토 배정 → 코멘트 → 피드백 반영
  → 의견서 작성 → AI 보고서 → 기관 확인 → 수당 승인 (전체 사이클)
□ 멘토 2명(주/부) 동시 코멘트 시 충돌 없이 저장
□ 멘토가 여러 기관 프로젝트를 교차 관리하는 시나리오

── Rate Limiting 테스트 ──
□ AI 생성 API 분당 5회 초과 시 429 반환
□ 로그인 15분당 10회 초과 시 429 반환
□ 일괄 메시지 시간당 5회 초과 시 429 반환
```

#### D. 테스트 실행 정책

| 시점 | 실행 범위 | 실패 시 조치 |
|------|----------|-------------|
| 코드 저장 (로컬) | 변경된 파일 관련 단위 테스트 | 개발자 수정 |
| PR 생성/업데이트 | 전체 단위 + 통합 + RLS 테스트 | PR 머지 차단 |
| main 브랜치 머지 | 전체 테스트 + E2E | 배포 차단, 즉시 수정 |
| 릴리즈 전 | 전체 + 성능 테스트 | 릴리즈 보류 |

---

### 10.2 CI/CD 파이프라인

> **브랜치 전략 연동**: 8.4절의 Git 브랜치 전략에 따라, CI는 모든 PR에서 실행되고 CD는 `feature/moduchanup` → Preview, `main` → Production으로 동작한다.

```yaml
# GitHub Actions 파이프라인 구조

┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PR 생성    │────▶│    CI 검증    │────▶│    Preview    │────▶│  코드 리뷰   │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                           │                                          │
                    ┌──────┴──────┐                                   │
                    │ 1. Lint     │                                   │
                    │ 2. Type     │                                   │
                    │    Check    │                                   │
                    │ 3. Unit     │                                   │
                    │    Tests    │                                   │
                    │ 4. API      │                                   │
                    │    Tests    │                                   │
                    │ 5. RLS      │                                   │
                    │    Tests    │                                   │
                    │ 6. Build    │                                   │
                    └─────────────┘                                   │
                                                                      │
                                                                      ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Production │◀────│   Staging    │◀────│   E2E on     │◀────│  main 머지   │
│   배포      │     │   배포+검증   │     │   Staging    │     │             │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │ 1. DB 마이그 │
       │            │    레이션    │
       │            │ 2. Seed     │
       │            │    데이터    │
       │            │ 3. E2E      │
       │            │    테스트    │
       │            │ 4. 성능     │
       │            │    벤치마크  │
       │            └─────────────┘
       │
       ▼
  수동 승인 후 배포
  (Phase E0~E3: 수동)
  (Phase E4 이후: 자동)
```

#### CI 파이프라인 상세

```yaml
# .github/workflows/ci.yml (핵심 구조)

name: CI Pipeline
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint          # ESLint + Prettier 검증
      - run: npm run type-check    # TypeScript strict 검증
      - run: npm run test          # Vitest 단위 + 통합 테스트
      - run: npm run test:rls      # RLS 정책 테스트 (Supabase local)
      - run: npm run build         # Next.js 빌드 성공 확인

  e2e:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test   # E2E (Playwright)

  security:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit --audit-level=high  # 의존성 보안 감사
      - run: npx eslint-plugin-security    # 코드 보안 검사
```

---

### 10.3 배포 전략

#### A. 환경 구성

| 환경 | 목적 | DB | URL | 배포 조건 |
|------|------|-----|-----|-----------|
| **Local** | 개발 | Supabase Local (Docker) | localhost:3000 | - |
| **Preview** | PR 리뷰 | Supabase Staging (Branch) | pr-123.vercel.app | PR 생성 시 자동 |
| **Staging** | 통합 검증 | Supabase Staging | staging.casa.app | main 머지 시 자동 |
| **Production** | 운영 | Supabase Production | casa.app | 수동 승인 후 |

#### B. 안전한 배포 절차

```
1. [기능 개발] → feature 브랜치에서 작업
       │
2. [PR 생성] → CI 자동 검증 (lint, test, build, security)
       │         Preview 환경 자동 배포
       │
3. [코드 리뷰] → 최소 1인 승인 필수
       │          보안 관련 변경: 2인 승인
       │          DB 스키마 변경: 리드 개발자 승인
       │
4. [main 머지] → Staging 자동 배포
       │          Staging E2E 테스트 자동 실행
       │
5. [Staging 검증] → QA 체크리스트 수동 확인 (역할별 테스트)
       │
6. [Production 배포] → 배포 체크리스트 확인 후 수동 트리거
       │                 DB 마이그레이션 선행 (롤백 스크립트 준비)
       │
7. [배포 후 모니터링] → 30분간 에러율/응답시간 관찰
                        이상 시 즉시 롤백
```

#### C. 피처 플래그 (점진적 릴리즈)

```typescript
// lib/feature-flags.ts
// 대규모 확장 기능을 점진적으로 활성화

export const featureFlags = {
  // Phase별 기능 플래그
  mentorWorkstation: process.env.FF_MENTOR_WORKSTATION === 'true',
  institutionDashboard: process.env.FF_INSTITUTION_DASHBOARD === 'true',
  messagingSystem: process.env.FF_MESSAGING === 'true',
  payoutManagement: process.env.FF_PAYOUT === 'true',
  satisfactionSurvey: process.env.FF_SATISFACTION === 'true',

  // 기관별 점진적 활성화
  enabledInstitutions: (process.env.FF_ENABLED_INSTITUTIONS || '').split(','),
}

// 사용 예시
if (featureFlags.mentorWorkstation) {
  // 멘토 워크스테이션 메뉴 표시
}
```

> **Phase별 피처 플래그 전략:**
> - Phase E1 (DB+역할): 플래그 없이 전체 배포 (하위 호환)
> - Phase E2~E3 (관리자/기관): `FF_INSTITUTION_DASHBOARD` → 승인된 기관만 활성화
> - Phase E4 (멘토): `FF_MENTOR_WORKSTATION` → 1~2개 기관에서 파일럿 후 전체 개방
> - Phase E5~E6 (지원자/통합): 전체 활성화

#### D. 롤백 절차

```
── DB 롤백 ──
모든 마이그레이션에 DOWN 스크립트 필수 작성:
  supabase/migrations/
  ├── 20260301_create_programs.sql          (UP)
  ├── 20260301_create_programs_down.sql     (DOWN - 롤백용)
  ├── 20260302_create_institutions.sql      (UP)
  └── 20260302_create_institutions_down.sql (DOWN - 롤백용)

── 애플리케이션 롤백 ──
Vercel: 이전 배포로 즉시 되돌리기 (1클릭)
  → 롤백 후 30분 모니터링
  → 안정 확인 후 원인 분석 및 수정

── 롤백 불가 상황 ──
데이터 구조 변경 후 신규 데이터 유입 시:
  → 피처 플래그로 기능 비활성화 (데이터 유지)
  → 수정 후 재배포 (롤백 대신 핫픽스)
```

---

### 10.4 DB 마이그레이션 안전 절차

```
── 마이그레이션 실행 순서 ──

1. [마이그레이션 SQL 작성]
   └── UP 스크립트 + DOWN(롤백) 스크립트 쌍으로 작성

2. [로컬 검증]
   └── supabase db reset → 전체 마이그레이션 재실행
   └── 기존 시드 데이터와 호환 확인

3. [Staging 적용]
   └── supabase db push (staging 프로젝트)
   └── 마이그레이션 후 기존 기능 E2E 테스트 실행

4. [데이터 무결성 검증]
   └── 기존 테이블 데이터 정합성 확인 쿼리 실행
   └── 새 테이블 RLS 정책 동작 확인

5. [Production 적용]
   └── 사전: DB 백업 (Supabase Dashboard → Backups)
   └── 적용: supabase db push (production)
   └── 사후: 검증 쿼리 실행 + 모니터링
```

#### 마이그레이션 원칙

| 원칙 | 설명 |
|------|------|
| **비파괴적 변경 우선** | 기존 컬럼 삭제/이름변경 대신 새 컬럼 추가 → 데이터 이전 → 구 컬럼 deprecated → 다음 릴리즈에서 삭제 |
| **DEFAULT 값 필수** | 새 컬럼에는 반드시 DEFAULT 설정 (기존 행 호환) |
| **NOT NULL 주의** | 기존 테이블에 NOT NULL 추가 시 반드시 DEFAULT 병행 |
| **인덱스 별도 적용** | 대규모 테이블 인덱스는 `CONCURRENTLY` 옵션 사용 |
| **롤백 시간 제한** | 마이그레이션 후 24시간 내 문제 없으면 DOWN 스크립트 보관만 |

---

### 10.5 모니터링 및 관측성

#### A. 모니터링 계층

```
┌──────────────────────────────────────────────────────────────────────┐
│                        모니터링 아키텍처                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [인프라 모니터링]                                                    │
│  ├── Vercel Analytics: 페이지 로딩 속도, Web Vitals                  │
│  ├── Supabase Dashboard: DB 커넥션, 쿼리 성능, 스토리지 사용량        │
│  └── Upstash Console: Redis 메모리/히트율                             │
│                                                                      │
│  [애플리케이션 모니터링]                                               │
│  ├── Sentry: 에러 추적 + 성능(트랜잭션) + 릴리즈 트래킹               │
│  ├── 구조화 로깅: JSON 포맷, 요청 ID 추적                            │
│  └── 커스텀 메트릭: AI 생성 시간, 멘토링 완료율, 수당 처리율          │
│                                                                      │
│  [비즈니스 모니터링]                                                   │
│  ├── 관리자 대시보드: 기관별 진행률, 멘토 매칭률                      │
│  ├── 감사 로그: bi_audit_logs (기존 9.4.8 참고)                      │
│  └── 알림: 이상 접근 탐지 (비정상 로그인, 대량 조회)                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### B. 에러 추적 (Sentry 통합)

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,     // 성능 트레이싱 10%
  replaysSessionSampleRate: 0.01, // 세션 리플레이 1%

  beforeSend(event) {
    // 민감 정보 필터링
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }
    return event
  },
})
```

#### C. 구조화 로깅

```typescript
// lib/logger.ts
export function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    // 민감 정보는 절대 로깅하지 않음
    // ❌ accountNumber, password, apiKey, token
  }
  console[level](JSON.stringify(entry))
}

// 사용 예시
log('info', 'Mentor matched to project', {
  mentorId: 'uuid',
  projectId: 'uuid',
  institutionId: 'uuid',
  matchedBy: 'uuid',
})
```

#### D. 알림 기준

| 지표 | 임계값 | 알림 방법 |
|------|--------|----------|
| API 에러율 | > 1% (5분 평균) | Slack + 이메일 |
| API 응답시간 (P95) | > 3초 | Slack |
| AI 생성 실패율 | > 5% | Slack + 이메일 |
| DB 커넥션 | > 80% 사용 | 이메일 |
| 로그인 실패 (동일 IP) | > 20회/시간 | Slack + 감사 로그 |
| 비정상 대량 조회 | > 500회/분 (단일 사용자) | Slack + 자동 차단 |

---

### 10.6 동시성 및 경합 조건 처리

#### A. 동시 편집 시나리오

| 시나리오 | 위험도 | 해결 방법 |
|----------|--------|-----------|
| 멘토 2명이 같은 프로젝트에 동시 코멘트 | 낮음 | 각자 독립 행 INSERT → 충돌 없음 |
| 같은 멘토링 세션을 동시에 수정 | 중간 | **낙관적 잠금** (updated_at 비교) |
| 기관 담당자 2명이 같은 멘토를 동시 매칭 | 중간 | **DB UNIQUE 제약** + 에러 핸들링 |
| 수당 이중 승인 | 높음 | **DB 트랜잭션** + status 체크 + 낙관적 잠금 |
| 의견서 제출과 동시에 수정 시도 | 중간 | status='submitted' 후 UPDATE 차단 (RLS) |

#### B. 낙관적 잠금 구현

```typescript
// 멘토링 세션 수정 시 낙관적 잠금
async function updateSession(sessionId: string, data: SessionUpdate, expectedUpdatedAt: string) {
  const { data: result, error } = await supabase
    .from('bi_mentoring_sessions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('updated_at', expectedUpdatedAt)  // 낙관적 잠금: 수정 시점 일치 확인
    .select()
    .single()

  if (!result) {
    throw new ConflictError('다른 사용자가 이미 수정했습니다. 새로고침 후 다시 시도해주세요.')
  }
  return result
}
```

#### C. 수당 이중 처리 방지

```sql
-- 수당 승인 시 트랜잭션으로 이중 처리 방지
BEGIN;
  -- 현재 상태가 pending인 경우에만 승인
  UPDATE bi_mentor_payouts
  SET status = 'approved',
      approved_by = $approver_id,
      approved_at = now()
  WHERE id = $payout_id
    AND status = 'pending';  -- 이미 approved/paid면 영향 0행

  -- 영향받은 행이 0이면 이미 처리됨
  -- → 클라이언트에 "이미 처리된 건입니다" 반환
COMMIT;
```

---

### 10.7 성능 테스트 계획

#### A. 예상 부하 프로필

| 사용자 유형 | 예상 수 | 동시 접속 (피크) | 주요 작업 |
|------------|---------|----------------|-----------|
| 예비창업자 | 5,000명 | 500명 | AI 생성, 문서 조회 |
| 멘토 | 500명 | 50명 | 코멘트 작성, 산출물 조회 |
| 기관 담당자 | 50명 | 20명 | 대시보드 조회, 매칭, 수당 처리 |
| 관리자 | 5명 | 3명 | 전국 현황, 매핑 |

#### B. 성능 목표

| 지표 | 목표 |
|------|------|
| 페이지 로드 (FCP) | < 1.5초 |
| API 응답 (P95) | < 500ms (일반), < 2초 (집계/검색) |
| AI 생성 (SSE 첫 토큰) | < 3초 |
| 대시보드 로드 (500건) | < 2초 |
| 파일 업로드 (10MB) | < 5초 |
| 동시 접속 500명 | 에러율 < 0.1% |

#### C. 테스트 도구 및 시기

```
도구: k6 (load testing) + Lighthouse CI (Web Vitals)

실행 시점:
├── Phase E1 완료: 기본 API 벤치마크 (기준선 설정)
├── Phase E3 완료: 기관 대시보드 500건 로드 테스트
├── Phase E4 완료: 멘토 워크스테이션 동시 접속 테스트
├── Phase E6 완료: 전체 부하 테스트 (500 동시 접속)
└── 런칭 전: 피크 부하 테스트 (1,000 동시 접속)
```

---

### 10.8 장애 대응 및 복구

#### A. 장애 등급 정의

| 등급 | 정의 | 응답 시간 | 예시 |
|------|------|-----------|------|
| **P0 (긴급)** | 전체 서비스 중단 또는 데이터 유실 | 30분 이내 | DB 장애, 인증 불가, 데이터 유실 |
| **P1 (심각)** | 핵심 기능 불가 | 2시간 이내 | AI 생성 실패, 수당 처리 불가, 멘토링 접근 불가 |
| **P2 (보통)** | 일부 기능 장애 | 8시간 이내 | 알림 미발송, 메시지 지연, 일부 화면 오류 |
| **P3 (경미)** | UX 불편 | 다음 배포 | UI 깨짐, 번역 누락, 성능 저하 |

#### B. 장애 대응 플로우

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  장애 감지   │────▶│  등급 판단    │────▶│ 대응팀 소집   │
│ (모니터링/   │     │ (P0~P3)     │     │ (Slack 채널)  │
│  사용자 제보)│     └──────────────┘     └──────────────┘
└─────────────┘                                │
                                               ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  원인 분석    │◀────│ 영향 범위    │
                    │              │     │ 파악         │
                    └──────┬───────┘     └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌────────────┐ ┌──────────┐ ┌──────────┐
      │ 롤백       │ │ 핫픽스   │ │ 우회 조치 │
      │ (이전 배포)│ │ (긴급 수정)│ │ (기능 OFF)│
      └──────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                   ┌──────────────┐     ┌──────────────┐
                   │  정상 확인    │────▶│ 사후 분석    │
                   │  (모니터링)   │     │ (재발 방지)  │
                   └──────────────┘     └──────────────┘
```

#### C. 데이터 백업 및 복구

| 항목 | 정책 |
|------|------|
| **DB 자동 백업** | Supabase Pro: 일 1회 자동 백업, 7일 보관 |
| **PITR (Point-in-Time Recovery)** | Supabase Pro: 7일간 특정 시점 복구 가능 |
| **수동 백업** | 매 마이그레이션 전 + 매 릴리즈 전 수동 백업 |
| **Storage 백업** | 멘토 금융 서류: 별도 버킷에 복제본 유지 |
| **복구 테스트** | 분기 1회 복구 모의 훈련 (Staging 환경에서) |
| **복구 목표** | RPO(최대 데이터 손실): 1일, RTO(최대 중단 시간): 4시간 |

---

### 10.9 Phase별 품질 게이트 (Definition of Done)

각 Phase가 완료되었다고 판단하기 위한 **필수 충족 조건**입니다.

#### 공통 품질 게이트 (모든 Phase)

```
□ 모든 태스크 체크리스트 완료
□ 단위 테스트 커버리지 90% 이상 (신규 코드)
□ API 통합 테스트 100% (신규 API)
□ RLS 정책 테스트 100% (신규/수정 정책)
□ TypeScript strict 모드 에러 0건
□ ESLint 경고 0건
□ Staging 환경에서 수동 QA 통과
□ 코드 리뷰 완료 (최소 1인 승인)
□ 다크모드 적용 확인
□ 다국어(한/영) 키 추가 완료
□ 기존 기능 회귀 테스트 통과
```

#### Phase별 추가 품질 게이트

| Phase | 추가 조건 |
|-------|----------|
| **E0** | API 키 전체 로테이션 완료, git 이력에서 키 제거 확인, 보안 헤더 검증 (securityheaders.com A등급) |
| **E1** | 14개 신규 테이블 마이그레이션 성공, 롤백 스크립트 테스트 완료, 기존 사용자 로그인/프로젝트 정상 확인, 암호화 모듈 라운드트립 테스트, Rate Limiting 동작 확인 |
| **E2** | 관리자가 프로그램 생성→기관 등록→승인 전체 플로우 E2E 통과, 기관별 데이터 격리 RLS 검증 |
| **E3** | 기관 담당자 멘토 초대→매칭→보고서 검토→수당 승인 E2E 통과, 메시지 RLS 검증, 일괄 발송 Rate Limit 검증 |
| **E4** | 멘토 코멘트→세션→의견서→AI보고서 전체 플로우 E2E 통과, 워크스테이션 성능 (산출물 10개 로드 < 2초) |
| **E5** | 지원자 피드백 확인→AI 반영→재생성 E2E 통과, 만족도 평가 저장/조회, 기관 지원 신청 플로우 |
| **E6** | 전체 사용자 여정 E2E 통과 (4개 역할 × 핵심 시나리오), 500 동시 접속 부하 테스트 통과, 모바일 반응형 검증, 알림 시스템 전체 동작 확인 |

#### 릴리즈 전 최종 체크리스트

```
□ 전체 E2E 테스트 통과
□ 성능 테스트 목표 달성 (P95 < 500ms)
□ 보안 헤더 검증 (A등급)
□ 접근성 기본 검증 (키보드 내비게이션, 색상 대비)
□ 에러 추적(Sentry) 연동 확인
□ 모니터링 알림 설정 확인
□ 데이터 백업 확인
□ 롤백 절차 문서화 및 팀 공유
□ 장애 대응 연락망 확인
□ 개인정보 처리방침 업데이트 확인
```

---

### 10.10 코드 리뷰 및 PR 프로세스

#### PR 체크리스트

```markdown
## PR 체크리스트
- [ ] 대상 브랜치 확인 (Phase 브랜치 → `feature/moduchanup`, 릴리스 → `main`)
- [ ] 커밋 컨벤션 준수: `feat(E1.5): 설명` 형태
- [ ] 관련 태스크 번호 (E1.5, E3.8 등)
- [ ] 변경 요약 (1~3줄)
- [ ] 테스트 추가/수정 여부
- [ ] DB 마이그레이션 포함 시: UP + DOWN 스크립트
- [ ] 새 API 추가 시: Zod 스키마 + 인가 가드 + Rate Limit
- [ ] 새 UI 추가 시: 다크모드 + 다국어 + 모바일 반응형
- [ ] 보안 관련 변경 시: 2인 이상 리뷰
- [ ] 금융 정보 접근 변경 시: 감사 로그 추가 여부
```

#### 리뷰 기준

| 항목 | 체크 포인트 |
|------|------------|
| **보안** | RLS 우회 가능성, 역할 체크 누락, 입력 검증 누락, 민감 정보 로깅 |
| **성능** | N+1 쿼리, 무한 페이지네이션, 불필요한 전체 조회, 인덱스 미사용 |
| **에러 처리** | try-catch 누락, 사용자 메시지 미제공, 내부 에러 노출 |
| **타입 안전** | any 사용, as 캐스팅, 타입 가드 누락 |
| **테스트** | 핵심 로직 테스트 누락, 엣지 케이스 미검증, 테스트 격리 미흡 |

---

## 11. 향후 확장 로드맵

### 11.1 단기 (확장 직후)

- **K-Startup 데이터 연동**: K-Startup API 또는 CSV 가져오기로 지원자 자동 등록
- **멘토링 품질 평가 AI**: 멘토 코멘트 품질 분석 → 부실 의견서 사전 경고
- **멘토 수당 증빙 자동화**: 멘토링 의견서 + 세션 로그를 PDF로 자동 생성

### 11.2 중기 (6개월 후)

- **AI 멘토 매칭 고도화**: 멘토 전문분야 + 프로젝트 산업/단계 + 과거 성과 기반 ML 매칭
- **모바일 앱**: React Native 또는 PWA로 멘토/지원자 모바일 접근성 강화
- **비디오 멘토링 연동**: Zoom/Google Meet 연동으로 온라인 멘토링 세션 기록
- **대시보드 BI**: 기관별 성과 리포트 자동 생성 (정부 보고용)

### 11.3 장기 (1년 이후)

- **다국가 확장**: 해외 창업지원 프로그램 연동 (일본, 동남아)
- **투자 연결**: VC/AC와 우수 프로젝트 매칭 마켓플레이스
- **멘토 마켓플레이스**: 유료 멘토링 서비스 확장
- **블록체인 인증**: 멘토링 이력 및 프로젝트 성과 블록체인 기반 인증서 발급

---

## 12. 리스크 및 대응 방안

| 리스크 | 영향도 | 발생 가능성 | 대응 방안 |
|--------|--------|-------------|-----------|
| 기존 시스템과의 호환성 문제 | 높음 | 중간 | 마이그레이션 스크립트 + 기능 플래그로 점진적 전환 |
| 대규모 사용자 유입 시 성능 저하 | 높음 | 높음 | 인덱스 최적화 + 캐싱 + 페이지네이션 철저 적용 |
| 개인정보보호법 위반 | 높음 | 낮음 | 금융 정보 암호화 + 접근 로그 + 개인정보 처리 동의 |
| 멘토링 프로세스 복잡성으로 인한 UX 저하 | 중간 | 중간 | 역할별 최적화된 대시보드 + 알림 시스템으로 가이드 |
| K-Startup 연동 지연 | 중간 | 높음 | CSV 수동 업로드를 1차 대안으로 준비 |
| 기관별 요구사항 차이 | 중간 | 높음 | 유연한 설정 시스템 (기관별 커스터마이징 옵션) |

---

## 13. UX 심층 분석 및 개선 방향

### 13.1 역할별 UX 평가 요약

| 역할 | 화면 완성도 | 사용성 | 편의성 | 기능성 | 주요 개선 |
|------|------------|--------|--------|--------|-----------|
| **예비창업자** | ⚠️ 중간 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 대시보드+피드백 확인 화면 추가 (6.12, 6.13) |
| **멘토** | ⚠️ 중간→보완 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 대시보드+의견서+수당조회 화면 추가 (6.14~6.16) |
| **기관 담당자** | ✅ 높음 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 온보딩 가이드+AI매칭 화면 보완 |
| **관리자** | ⚠️ 중간 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 승인큐+프로그램관리 화면 추가 필요 |

### 13.2 역할별 사용자 여정(User Journey) 분석

#### A. 예비창업자의 핵심 여정

```
[가입] → [프로젝트 생성] → [AI 아이디어 확장] → [평가] → [문서 생성]
                                                         │
                              ┌─────────────────────────┘
                              │ (기관 지원 신청 시)
                              ▼
                    [기관 배정] → [멘토 배정] → [멘토 피드백 수신]
                                                         │
                              ┌─────────────────────────┘
                              ▼
                    [피드백 확인] → [AI로 반영] → [재검토] → [완료]
                                                         │
                              ┌─────────────────────────┘
                              ▼
                    [최종 산출물 확인] → [만족도 평가]
```

**핵심 UX 원칙:**
- 기관 지원 전후로 화면이 **급변하지 않아야** 함 → 기존 프로젝트 상세에 멘토 탭이 추가되는 방식
- 멘토 피드백은 **대시보드 진입 시 즉시 인지** 가능해야 함 → 알림 카드 + 뱃지
- "AI로 반영하기" 진입점이 **코멘트 옆에 바로** 있어야 함 → 1클릭 진입

#### B. 멘토의 핵심 여정

```
[가입] → [프로필 완성] → [승인 대기] → [기관 풀 초대 수락]
                                                │
                              ┌─────────────────┘
                              ▼
                    [프로젝트 배정 알림] → [워크스테이션 진입]
                              │
                              ▼
                    [산출물 검토] → [섹션별 코멘트] → [세션 제출]
                              │                           │
                              │    ┌──────────────────────┘
                              │    ▼
                              │ [지원자 수정본 확인] → [재검토] → ...반복
                              │
                              ▼
                    [최종 의견서 작성] → [AI 보고서 생성] → [검토/수정] → [제출]
                              │
                              ▼
                    [수당 내역 확인]
```

**핵심 UX 원칙:**
- 멘토는 **여러 기관, 여러 프로젝트**를 관리 → 기관별 그룹핑 + 상태별 정렬 필수
- "피드백 대기" 상태 프로젝트가 **최상단에 올라와야** 함 → 액션이 필요한 항목 우선 표시
- 워크스테이션에서 **이전 라운드 코멘트가 반영되었는지** 한눈에 비교 가능해야 함
- 의견서 작성 시 **임시 저장**이 반드시 있어야 함 (장시간 작성 중 유실 방지)
- 수당 내역은 멘토 스스로 확인할 수 있어야 함 → 별도 수당 페이지 (6.16)

#### C. 기관 담당자의 핵심 여정

```
[가입] → [소속 기관 선택] → [승인 대기] → [기관 대시보드 진입]
                                                │
                    ┌───────────────────────────┘
                    ▼
          [멘토 풀 구성] → [멘토 초대] → [프로젝트 배정 확인]
                    │
                    ▼
          [멘토-프로젝트 매칭] → [멘토링 진행 모니터링]
                    │
                    ▼
          [보고서 검토/확인] → [수당 승인] → [증빙 PDF 다운로드]
```

**핵심 UX 원칙:**
- 첫 진입 시 **온보딩 체크리스트**로 해야 할 일을 안내 (6.19)
- 대시보드에서 **"지금 해야 할 일"**이 명확히 보여야 함 (승인 대기, 미배정 프로젝트, 미확인 보고서)
- 수당 처리 시 **증빙 PDF 자동 생성** → 기관 행정 업무 90% 감소

#### D. 관리자의 핵심 여정

```
[프로그램 생성] → [기관 등록] → [기관/멘토 승인] → [프로젝트-기관 매핑]
                                                │
                    ┌───────────────────────────┘
                    ▼
          [전국 현황 모니터링] → [감사 로그 점검] → [프로그램 종료/정산]
```

**핵심 UX 원칙:**
- 승인 대기 건이 **대시보드 최상단에 뱃지**로 표시
- 기관-프로젝트 매핑은 **일괄 처리**(CSV 업로드)가 기본, 개별 매핑은 보조
- 전국 현황은 **기관별 진행률 한눈에** → 문제 있는 기관 바로 식별

### 13.3 공통 UX 개선 사항 (반영 완료)

| 개선 항목 | 해당 화면 | 상태 |
|-----------|----------|------|
| 역할별 네비게이션(사이드바) 구조 설계 | 6.11 | ✅ 추가됨 |
| 지원자 대시보드 (멘토링 통합) | 6.12 | ✅ 추가됨 |
| 멘토 코멘트 확인 + AI 반영 진입점 | 6.13 | ✅ 추가됨 |
| 멘토 대시보드 (기관별 그룹핑) | 6.14 | ✅ 추가됨 |
| 멘토 의견서 작성 화면 | 6.15 | ✅ 추가됨 |
| 멘토 수당 내역 조회 (본인용) | 6.16 | ✅ 추가됨 |
| 알림 센터 UI | 6.17 | ✅ 추가됨 |
| 기관 지원 신청 화면 | 6.18 | ✅ 추가됨 |
| 빈 상태/온보딩 가이드 (역할별) | 6.19 | ✅ 추가됨 |
| 멘토 만족도 평가 | 6.20 | ✅ 추가됨 |
| 멘토 수당 API (본인 조회) | 7.4 | ✅ 추가됨 |
| 지원자 피드백/만족도 API | 7.3 | ✅ 추가됨 |
| 수당 증빙 PDF API | 7.5 | ✅ 추가됨 |
| 라우트 구조 확장 | 6.1 | ✅ 업데이트됨 |
| Phase E4/E5/E6 태스크 세분화 | 8.2 | ✅ 업데이트됨 |

### 13.4 향후 UX 고도화 방향

| 영역 | 현재 | 향후 |
|------|------|------|
| **실시간 알림** | 페이지 새로고침 시 확인 | Supabase Realtime 구독 → 뱃지 실시간 업데이트 + 브라우저 푸시 알림 |
| **모바일 반응형** | 데스크톱 중심 설계 | 태블릿/모바일 레이아웃 별도 설계 (특히 멘토 워크스테이션) |
| **접근성(a11y)** | 미고려 | WCAG 2.1 AA 기준 적용 (키보드 내비게이션, 스크린 리더 대응) |
| **멘토링 일정 관리** | 세션 기록만 | 캘린더 뷰 + Zoom/Google Meet 연동 |
| **AI 멘토 매칭** | API만 설계 | 추천 결과 UI + 매칭 근거 설명 (전문분야 일치율 등) |

---

## 14. 결론 및 핵심 요약

### 14.1 확장의 핵심 원칙

1. **기존 자산 최대 활용**: 게이트 시스템, 피드백 체계, 프롬프트 엔진, 크레딧 시스템을 그대로 확장
2. **역할 기반 점진적 확장**: user → institution/mentor 역할 추가로 기존 코드 최소 변경
3. **프로그램 단위 관리**: 연도/차수별 사업을 독립적으로 관리하여 행정 효율화
4. **AI 활용 극대화**: 멘토 의견서 자동 생성, AI 기반 멘토 추천, 멘토링 품질 분석

### 14.2 핵심 차별점

| 기존 시스템 | 확장 후 시스템 |
|-------------|---------------|
| 개인 사용자 중심 | 기관-멘토-지원자 다중 이해관계자 |
| 단일 프로젝트 관리 | 프로그램 단위 대규모 관리 |
| AI 자동 생성 위주 | AI + 인간 멘토 하이브리드 루프 |
| 자기 주도 진행 | 체계적 멘토링 프로세스 |
| 산출물 생성 종료 | 멘토링 → 의견서 → 수당 → 행정까지 풀사이클 |

### 14.3 즉시 착수 권장 사항

1. **`feature/moduchanup` 브랜치 생성**: 현재 main에서 확장 메인 브랜치 생성 후 Phase별 하위 브랜치 운영 (8.4절 참고)
2. **Phase E0 최우선 시작**: `feature/moduchanup/e0-security` 브랜치에서 API 키 로테이션, HTTP 보안 헤더, 에러 메시지 정리 → 완료 즉시 main 머지
3. **Phase E1** 시작: DB 테이블 확장 + 보안 인프라 + **테스트/CI 환경 구축**을 함께 진행
4. **CI/CD 파이프라인 구축**: PR 단위 자동 검증 체계를 Phase E1 초기에 확립 (이후 모든 개발에 적용)
5. **기관 시드 데이터 준비**: 전국 17개 창조경제혁신센터 + 주요 창업중심대학 목록 확보
6. **멘토 온보딩 플로우 설계**: 가장 사용자 경험에 영향이 큰 부분이므로 UX 우선 설계
7. **개인정보 처리 동의서 준비**: 멘토 금융 정보 수집 전 법률 검토 필수
8. **모니터링 연동**: Sentry + 구조화 로깅을 Phase E1에서 설정 (개발 초기부터 에러 추적)

> **구현 시 [TASK_NEW.md](./TASK_NEW.md)의 체크리스트를 따라 진행하세요.** (131개 태스크, Phase별 완료 기준 포함)
