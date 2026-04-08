# TASK_PATENT.md — PatentAI 구현 태스크

> **기준 PRD:** `docs/PATENT/PRD.md` v1.2
> **프로젝트 경로:** `C:\DATA\workspace\patentAI`
> **CASA 베이스코드:** `C:\DATA\workspace\casa`
> **작성일:** 2026-04-05
> **최종 업데이트:** 2026-04-05
> **규칙:** 체크박스 완료 시 `[x]`로 변경. CASA 재사용 파일은 반드시 경로 명시.
>
> **⚠️ 테이블명 변경 (v1.2):** 모든 테이블 접두사 `bi_` → `patentai_`. `bi_users` → `auth.users` 직접 참조. `patentai_prompts` 테이블 신규 추가.

---

## 진행 상황 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| P0 | 프로젝트 초기화 | 🟡 일부완료 |
| P1 | DB 마이그레이션 + 프롬프트 등록 | ✅ 완료 |
| P2 | 공통 인프라 (CASA 재사용) | ✅ 완료 |
| P3 | STEP 1 — 입력 및 AI 분석 | ✅ 완료 |
| P4 | STEP 2 — 기술 구조화 | ✅ 완료 |
| P5 | GATE 2 — 선행기술조사 통합 | ✅ 완료 |
| P6 | STEP 3 — 청구범위 초안 | ✅ 완료 |
| P7 | STEP 4 — 명세서 본문 작성 | ✅ 완료 |
| P8 | STEP 5 — 도면 생성 | ✅ 완료 |
| P9 | STEP 6 — 최종 출력 | ✅ 완료 |
| P10 | 대시보드 & 프로젝트 관리 | ⬜ |

---

## P0. 프로젝트 초기화

### P0-1. Next.js 프로젝트 생성 (CASA 클론 방식)
> CASA 전체를 복사 후 PatentAI 전용으로 정리하는 것이 재사용 효율 최대화.

- [x] `C:\DATA\workspace\patentAI` 디렉토리에 CASA 프로젝트 클론
- [ ] `package.json` → `name` 필드를 `"patent-ai"`로 변경 (현재 `"casa-temp"`)
- [x] `CLAUDE.md` → PatentAI 용으로 내용 업데이트
- [ ] 불필요한 기존 CASA 기능 폴더 제거 (`src/features/` 하위 CASA 폴더 13개 잔존)
  - `src/features/` — `patent/` 폴더만 남기고 나머지 삭제 (idea, mentor, strategy 등)
  - `src/app/[locale]/(dashboard)/` — CASA 전용 페이지들 정리

### P0-2. 환경변수 설정
- [x] `.env.local` 생성 및 설정 완료
  ```env
  # Supabase (PatentAI 전용 프로젝트 생성 또는 CASA 공유)
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # AI
  ANTHROPIC_API_KEY=
  OPENAI_API_KEY=          # OCR 폴백용
  GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini 도면 생성

  # 선행기술 조사
  KIPRIS_API_KEY=           # https://www.kipris.or.kr/openapi
  USPTO_API_KEY=            # https://developer.uspto.gov

  # Cache
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  ```
- [x] `.env.local`을 `.gitignore`에 추가 확인 (CASA에서 이미 설정됨)

### P0-3. 의존성 추가
- [x] KIPRIS/USPTO 연동용 패키지 확인 (별도 SDK 없음 — fetch 직접 사용)
- [x] `mammoth` 패키지 추가 (DOCX → 텍스트 추출) — `npm install mammoth` 완료
- [x] 기존 의존성 그대로 유지 (CASA 의존성 패키지 전부 재사용)

---

## P1. 데이터베이스 마이그레이션 ✅

> 실제 SQL 파일 위치: `supabase/migration-patent-tables.sql`, `supabase/seed-patent-prompts.sql`
> Supabase Dashboard > SQL Editor에서 순서대로 실행 — **완료됨**

### P1-1. Enum 타입 + 테이블 생성
- [x] SQL 실행 (`supabase/migration-patent-tables.sql`):
  ```sql
  CREATE TYPE patent_status AS ENUM (
    'draft', 'step1_done', 'step2_done', 'step3_done',
    'step4_done', 'step5_done', 'completed'
  );

  CREATE TYPE patent_input_type AS ENUM ('idea', 'prd', 'paper', 'mixed');

  CREATE TYPE patent_claim_type AS ENUM ('independent', 'dependent');

  CREATE TYPE patent_section_type AS ENUM (
    'title', 'tech_field', 'background', 'problem',
    'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract'
  );

  CREATE TYPE patent_drawing_type AS ENUM (
    'system_architecture', 'flowchart', 'ui_wireframe', 'data_flow', 'other'
  );

  CREATE TYPE prior_art_risk AS ENUM ('high', 'medium', 'low');

  CREATE TYPE prior_art_source AS ENUM ('kipris', 'uspto');
  ```

### P1-2. 핵심 테이블 생성
- [x] `patentai_patent_projects` 테이블:
  ```sql
  CREATE TABLE patentai_patent_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL DEFAULT '새 특허 프로젝트',
    status patent_status NOT NULL DEFAULT 'draft',
    input_type patent_input_type NOT NULL DEFAULT 'idea',
    ipc_codes JSONB DEFAULT '[]',          -- ["G06F 40/56", "G06N 20/00"]
    tech_domain TEXT,                       -- AI 추출 기술 분야
    core_inventions JSONB DEFAULT '[]',     -- 핵심 발명 포인트 목록
    overall_prior_art_risk prior_art_risk,  -- GATE 2 선행기술 종합 위험도
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE patentai_patent_projects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_projects
    USING (user_id = auth.uid());
  ```

- [x] `patentai_patent_inputs` 테이블:
  ```sql
  CREATE TABLE patentai_patent_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('text', 'file')),
    content TEXT,                  -- 텍스트 입력 또는 추출된 텍스트
    file_name VARCHAR(500),
    file_url TEXT,                 -- Supabase Storage URL
    file_size_bytes BIGINT,
    analysis_result JSONB,         -- AI 분석 결과 JSON
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE patentai_patent_inputs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_inputs
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_components` 테이블:
  ```sql
  CREATE TABLE patentai_patent_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES patentai_patent_components(id) ON DELETE CASCADE,
    ref_number VARCHAR(10) NOT NULL,   -- "100", "110", "111"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    has_prior_art_conflict BOOLEAN DEFAULT FALSE,
    conflict_risk prior_art_risk,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE patentai_patent_components ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_components
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_prior_art` 테이블:
  ```sql
  CREATE TABLE patentai_patent_prior_art (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    source_db prior_art_source NOT NULL,
    patent_number VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT,
    similarity_score INT CHECK (similarity_score BETWEEN 0 AND 100),
    risk_level prior_art_risk NOT NULL,
    conflicting_component_ids JSONB DEFAULT '[]',  -- patentai_patent_components.id 배열
    avoidance_suggestion TEXT,
    searched_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE patentai_patent_prior_art ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_prior_art
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_claims` 테이블:
  ```sql
  CREATE TABLE patentai_patent_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    claim_number INT NOT NULL,
    claim_type patent_claim_type NOT NULL DEFAULT 'independent',
    parent_claim_id UUID REFERENCES patentai_patent_claims(id),
    content TEXT NOT NULL,
    strength_score INT CHECK (strength_score BETWEEN 0 AND 100),
    strength_issues JSONB DEFAULT '[]',  -- ["모호한 표현 발견", ...]
    is_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE patentai_patent_claims ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_claims
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_sections` 테이블:
  ```sql
  CREATE TABLE patentai_patent_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    section_type patent_section_type NOT NULL,
    content TEXT,
    version INT NOT NULL DEFAULT 1,
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, section_type)
  );

  ALTER TABLE patentai_patent_sections ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_sections
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_drawings` 테이블:
  ```sql
  CREATE TABLE patentai_patent_drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    drawing_number INT NOT NULL,
    drawing_type patent_drawing_type NOT NULL,
    caption TEXT,                    -- 도면 설명 (도면의 간단한 설명 섹션용)
    prompt_used TEXT,                -- Gemini에 사용한 프롬프트
    image_url TEXT,                  -- Supabase Storage URL
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, drawing_number)
  );

  ALTER TABLE patentai_patent_drawings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_drawings
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

- [x] `patentai_patent_gates` 테이블:
  ```sql
  CREATE TABLE patentai_patent_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES patentai_patent_projects(id) ON DELETE CASCADE,
    gate_number INT NOT NULL CHECK (gate_number BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'returned')),
    approved_by UUID REFERENCES auth.users(id),
    notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, gate_number)
  );

  ALTER TABLE patentai_patent_gates ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "owner_all" ON patentai_patent_gates
    USING (EXISTS (
      SELECT 1 FROM patentai_patent_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    ));
  ```

### P1-3. Supabase Storage 버킷 생성
- [ ] Supabase Dashboard > Storage > New Bucket — **미완료 (수동 작업 필요)**
  - 버킷명: `patent-files` (Public: OFF, 50MB, PDF/DOCX/MD/TXT)
  - 버킷명: `patent-drawings` (Public: OFF, PNG/JPEG/WEBP)

### P1-4. 프롬프트 등록 (`patentai_prompts` 테이블)
> 실제 SQL 파일: `supabase/seed-patent-prompts.sql` — **완료됨**

- [x] SQL로 프롬프트 삽입 (`supabase/seed-patent-prompts.sql`):
  ```sql
  -- STEP 1: 기술 분석
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES (
    'patent_tech_analysis',
    '특허 기술 분석',
    '당신은 한국 특허 전문가이자 기술 분석가입니다. KIPO 출원 경험이 풍부합니다.',
    '아래 [입력 문서]를 분석하여 특허 명세서 작성에 필요한 핵심 기술 정보를 추출하세요.

  [입력 문서]
  {{input_content}}

  출력 형식 (반드시 JSON):
  {
    "tech_domain": "기술 분야 설명 (1~2문장)",
    "ipc_suggestions": ["G06F 40/56", "G06N 20/00"],
    "core_inventions": ["핵심 발명 포인트 1", "포인트 2", "포인트 3"],
    "problems_solved": ["기존 기술 문제점 1", "문제점 2"],
    "effects": ["기술적 효과 1", "효과 2"],
    "key_components": [
      {"name": "구성요소명", "function": "기능 설명", "ref_number_suggestion": "100"}
    ]
  }',
    'claude-sonnet-4-5-20251001', 3
  );

  -- STEP 2: 구성요소 정교화
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES (
    'patent_component_structuring',
    '특허 구성요소 구조화',
    '당신은 한국 특허 전문가입니다. KIPO 표준 참조번호 체계를 준수합니다.',
    '아래 기술 분석 결과를 바탕으로 KIPO 표준 참조번호 체계로 구성요소 트리를 완성하세요.

  [기술 분석 결과]
  {{analysis_result}}

  규칙:
  - 100번대: 메인 장치/시스템
  - 110~190: 1차 서브 모듈 (10단위)
  - 111~119: 2차 세부 컴포넌트 (1단위)
  - 200번대: 서버/외부 시스템 (필요시)

  출력 형식 (JSON):
  {
    "components": [
      {
        "ref_number": "100",
        "name": "메인 장치명",
        "description": "기능 설명",
        "parent_ref": null,
        "children": ["110", "120", "130"]
      }
    ],
    "recommended_drawings": [
      {"type": "system_architecture", "title": "전체 시스템 구성도"},
      {"type": "flowchart", "title": "처리 흐름도"}
    ]
  }',
    'claude-sonnet-4-5-20251001', 2
  );

  -- GATE 2: 선행기술 회피 전략
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES (
    'patent_prior_art_avoidance',
    '선행기술 회피 전략',
    '당신은 한국 특허 전문가입니다. 선행기술 분석 및 청구항 회피 전략에 특화되어 있습니다.',
    '아래 [유사 특허 목록]과 [구성요소 트리]를 비교하여 충돌 위험을 분석하고 회피 전략을 제안하세요.

  [구성요소 트리]
  {{components}}

  [유사 특허 목록]
  {{prior_art_list}}

  출력 형식 (JSON):
  {
    "overall_risk": "high|medium|low",
    "summary": "전반적 위험도 및 권장 조치 요약",
    "component_risks": [
      {
        "ref_number": "120",
        "component_name": "AI분석부",
        "conflicting_patent": "KR10-2024-0012345",
        "risk_level": "high",
        "avoidance_suggestion": "멀티모달 입력 처리 기능을 추가하여 차별화"
      }
    ]
  }',
    'claude-sonnet-4-5-20251001', 2
  );

  -- STEP 3: 청구범위 생성
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES (
    'patent_claims_generation',
    '특허 청구범위 생성',
    '당신은 한국 특허청(KIPO) 출원 경험이 풍부한 변리사입니다. KIPO 표준 청구항 문체를 정확히 준수합니다.',
    '아래 [구성요소 트리]와 [선행기술 회피 전략]을 기반으로 KIPO 표준 청구범위를 작성하세요.

  [구성요소 트리]
  {{components}}

  [선행기술 회피 전략]
  {{avoidance_strategy}}

  [발명 유형] {{claim_type}} (장치/방법/시스템 중 하나)

  규칙:
  - 독립항(청구항 1)은 반드시 1개 이상
  - 종속항은 "청구항 N에 있어서," 로 시작
  - 모든 청구항은 "~을 특징으로 하는 {{claim_type}}." 으로 종료
  - 금지 표현: 최선, 최고, 최적, 약, 대략, 다수의 (모호한 상대 표현)
  - 참조번호는 반드시 (110) 형식으로 포함
  - 충돌 위험 구성요소는 차별화 표현 강조

  출력 형식 (JSON):
  {
    "claims": [
      {
        "claim_number": 1,
        "claim_type": "independent",
        "parent_claim_number": null,
        "content": "청구항 전문",
        "strength_score": 85,
        "strength_issues": []
      }
    ]
  }',
    'claude-sonnet-4-5-20251001', 5
  );

  -- STEP 4: 명세서 섹션 생성 (섹션별 개별 프롬프트)
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES
  ('patent_section_title', '발명의 명칭 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '아래 발명 정보를 바탕으로 "발명의 명칭"을 한국어와 영어로 작성하세요.
  [발명 정보] {{invention_summary}}
  형식: {"ko": "한국어 제목", "en": "ENGLISH TITLE IN CAPS"}',
  'claude-haiku-4-5-20251001', 1),

  ('patent_section_tech_field', '기술분야 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '본 발명이 속하는 기술분야를 KIPO 표준 문체로 2~3문장으로 작성하세요.
  시작: "본 발명은 ~에 관한 것이다."
  [발명 정보] {{invention_summary}}
  [IPC 코드] {{ipc_codes}}',
  'claude-haiku-4-5-20251001', 1),

  ('patent_section_background', '배경기술 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '기존 기술의 문제점과 한계를 KIPO 표준 문체로 3~5개 단락으로 작성하세요.
  [해결 과제] {{problems_solved}}
  [기술 분야] {{tech_domain}}',
  'claude-sonnet-4-5-20251001', 2),

  ('patent_section_problem', '해결하려는 과제 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '본 발명이 해결하려는 과제를 KIPO 표준 문체로 2~3단락으로 작성하세요.
  시작: "본 발명은 상기와 같은 문제점을 해결하기 위하여..."
  [해결 과제] {{problems_solved}}',
  'claude-haiku-4-5-20251001', 1),

  ('patent_section_solution', '과제의 해결 수단 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '청구항 내용을 기반으로 과제의 해결 수단을 KIPO 표준 문체로 작성하세요.
  [청구항 목록] {{claims_summary}}',
  'claude-haiku-4-5-20251001', 1),

  ('patent_section_effect', '발명의 효과 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '본 발명의 기술적·경제적 효과를 KIPO 표준 문체로 3~5개 단락으로 작성하세요.
  [기대 효과] {{effects}}',
  'claude-haiku-4-5-20251001', 1),

  ('patent_section_detailed_desc', '발명 실시를 위한 구체적 내용 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '참조번호 기반으로 각 구성요소의 상세한 기능과 동작을 KIPO 표준 문체로 작성하세요.

  규칙:
  - 각 구성요소(참조번호)는 최소 2개 단락으로 기술
  - "상기 ~(110)은 ~역할을 한다." 패턴 사용
  - 도면 참조 표현 포함: "도 N에 도시된 바와 같이,"
  - "구체적으로", "예를 들어", "따라서" 등 전환 표현 사용

  [구성요소 트리] {{components}}
  [청구범위] {{claims}}
  [도면 목록] {{drawings}}',
  'claude-sonnet-4-5-20251001', 5),

  ('patent_section_abstract', '요약서 생성', '당신은 KIPO 출원 전문 변리사입니다.',
  '본 발명의 요약서를 200자 이내로 작성하세요.
  시작: "본 발명은 ~에 관한 것으로,"
  [발명 정보] {{invention_summary}}
  [청구항 1] {{claim_1}}',
  'claude-haiku-4-5-20251001', 1);

  -- STEP 5: 도면 프롬프트 생성 (Gemini 전달용)
  INSERT INTO patentai_prompts (key, name, system_prompt, user_prompt_template, model, credit_cost)
  VALUES (
    'patent_drawing_prompt_gen',
    '도면 생성 프롬프트 작성',
    '당신은 특허 도면 전문가입니다. Gemini 이미지 생성에 최적화된 영문 프롬프트를 작성합니다.',
    '아래 도면 정보를 바탕으로 Gemini 이미지 생성용 영문 프롬프트를 작성하세요.

  [도면 유형] {{drawing_type}}
  [도면 제목] {{drawing_title}}
  [포함할 구성요소] {{components}}

  기본 지시사항 (반드시 포함):
  "Patent technical drawing, black and white line art only, clean white background,
  no color fills, no shadows, no gradients, professional engineering diagram,
  labeled with reference numerals in parentheses format like (100) (110) (120),
  KIPO patent filing quality, 300 DPI equivalent precision"

  도면 유형별 추가 지시:
  - system_architecture: "block diagram with rectangular boxes connected by arrows"
  - flowchart: "flowchart with diamond decision shapes and rectangular process boxes"
  - ui_wireframe: "wireframe interface diagram with labeled UI components"
  - data_flow: "data flow diagram with directional arrows showing data movement"',
    'claude-haiku-4-5-20251001', 1
  );
  ```

---

## P2. 공통 인프라 (CASA 완전 재사용)

> 아래 파일들은 **수정 없이 그대로 사용**. patentAI 클론 시 이미 포함됨.

### P2-1. 재사용 파일 목록 확인
- [x] `src/lib/ai/claude.ts` — Claude API 래퍼 (callClaude, streamClaude, createSSEResponse)
- [x] `src/lib/ai/gemini.ts` — Gemini API 래퍼 (이미 구현됨)
- [x] `src/lib/ai/openai.ts` — OCR 폴백용
- [x] `src/lib/ai/index.ts` — 멀티 프로바이더 통합
- [x] `src/lib/prompts/prompt-engine.ts` — DB 기반 프롬프트 (Redis 캐싱) — `patentai_prompts` 테이블 참조로 수정됨
- [x] `src/lib/prompts/version-manager.ts` — 프롬프트 버전 관리
- [x] `src/lib/credits.ts` — 크레딧 차감/충전
- [x] `src/lib/auth/guards.ts` — requireAuth, requireProjectOwner
- [x] `src/lib/utils/api-response.ts` — successResponse, errorResponse
- [x] `src/lib/utils/document-export.ts` — exportToDocx, exportToPdf
- [x] `src/lib/utils/pdf-extract.ts` — extractTextFromPdf, renderPdfToImages
- [x] `src/lib/redis.ts` — Upstash Redis 클라이언트
- [x] `src/lib/supabase/client.ts` / `server.ts` / `service.ts`
- [x] `src/hooks/useSSE.ts` — SSE 스트리밍 훅
- [x] `src/hooks/usePaginatedFetch.ts` — 페이지네이션 훅
- [x] `src/components/ui/*.tsx` — shadcn/ui 전체

### P2-2. DOCX 텍스트 추출 추가 (신규)
- [x] `src/lib/utils/docx-extract.ts` 신규 생성:
  ```typescript
  // mammoth 라이브러리 활용
  import mammoth from 'mammoth'

  export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  ```

### P2-3. document-generator 패턴 특허용 서비스 생성
- [x] `src/lib/services/patent-generator.ts` 신규 생성
  - CASA `document-generator.ts` 패턴 복사 후 특허 도메인으로 수정
  - `preparePatentGeneration(projectId, sectionType, promptKey)` 함수
  - Gate 확인 로직: `patentai_patent_gates` 테이블 조회
  - 크레딧 차감: `deductCredits()` 재사용

### P2-4. TypeScript 타입 정의 추가 *(P3 구현 중 추가)*
- [x] `src/types/database.ts` — `patentai_` 테이블 9개 Row/Insert/Update 타입 추가
  - `PatentProject`, `PatentInput`, `PatentComponent`, `PatentPriorArt`
  - `PatentClaim`, `PatentSection`, `PatentDrawing`, `PatentGate`, `PatentaiPrompt`
  - `PatentStatus`, `PatentInputType`, `PatentClaimType`, `PatentSectionType`, `PatentDrawingType`
  - `PriorArtRisk`, `PriorArtSource`, `PatentGateStatus`

---

## P3. STEP 1 — 입력 및 AI 분석

### P3-1. API: 프로젝트 생성 + 텍스트 입력
- [x] `src/app/api/patents/route.ts` 신규
  - `POST`: 새 특허 프로젝트 생성 (`patentai_patent_projects` INSERT)
  - `GET`: 내 프로젝트 목록 조회 (페이지네이션)
  - **재사용**: `requireAuth`, `successResponse`, `errorResponse`
- [x] `src/app/api/patents/[id]/inputs/route.ts` 신규 *(P3 구현 중 추가)*
  - `POST`: 텍스트 입력 저장 (`patentai_patent_inputs` INSERT)
  - `GET`: 입력 목록 조회

### P3-2. API: 파일 업로드
- [x] `src/app/api/patents/[id]/upload/route.ts` 신규
  - `POST`: multipart/form-data로 파일 수신
  - Supabase Storage `patent-files` 버킷에 업로드
  - 파일 타입별 분기:
    - `.pdf` → `extractTextFromPdf()` 시도 → 실패 시 OCR (`/api/pdf-ocr` 재사용)
    - `.docx` → `extractTextFromDocx()` (신규 유틸)
    - `.md` / `.txt` → 직접 읽기
  - `patentai_patent_inputs` INSERT (content = 추출 텍스트)
  - **재사용**: `requireProjectOwner`, Supabase Storage 업로드 패턴

### P3-3. API: OCR (스캔 PDF 처리)
- [ ] `src/app/api/patents/[id]/ocr/route.ts` 신규 *(미구현 — 업로드 시 텍스트 추출 실패할 경우 필요)*
  - CASA `src/app/api/pdf-ocr/route.ts` 로직 그대로 복사
  - 프롬프트만 특허 텍스트 추출용으로 교체

### P3-4. API: AI 기술 분석 (SSE)
- [x] `src/app/api/patents/[id]/analyze/route.ts` 신규
  - `POST`: SSE 스트리밍으로 기술 분석 실행
  - `patentai_patent_inputs`에서 content 조회
  - 프롬프트 키 `patent_tech_analysis` 사용
  - 분석 완료 후 `patentai_patent_projects` 업데이트:
    - `tech_domain`, `ipc_codes`, `core_inventions`
  - **재사용**: `streamClaude`, `createSSEResponse`, `preparePrompt`

### P3-5. UI: STEP 1 페이지
- [x] `src/features/patent/step1/InputForm.tsx` 신규
  - 입력 유형 탭 선택 (아이디어 텍스트 / 파일 업로드)
  - 파일 드래그앤드롭 영역 (PDF/DOCX/MD 허용)
  - 텍스트 입력 시 5,000자 카운터
  - 업로드 진행률 표시
- [x] `src/features/patent/step1/AnalysisResult.tsx` 신규
  - SSE 스트리밍 중 실시간 텍스트 표시
  - 완료 후 분석 결과 카드:
    - 기술 분야, IPC 코드, 핵심 발명 포인트, 해결 과제, 기대 효과
  - **재사용**: `useSSE` 훅

### P3-6. GATE 1 UI
- [x] `src/features/patent/gates/Gate1.tsx` 신규
  - 분석 결과 확인 화면
  - IPC 코드 드롭다운 선택/수정
  - 핵심 발명 포인트 인라인 편집
  - 버튼: ✏️ 수정 / 🔄 재분석 / ✅ 확인하고 다음으로
- [x] `src/app/api/patents/[id]/gates/1/route.ts` 신규
  - `POST`: GATE 1 승인 처리
  - `patentai_patent_gates` INSERT (gate_number=1, status='approved')
  - `patentai_patent_projects` status → `'step1_done'`

---

## P4. STEP 2 — 기술 구조화

### P4-1. API: 구성요소 자동 생성 (SSE)
- [x] `src/app/api/patents/[id]/components/generate/route.ts` 신규
  - 기술 분석 결과 기반으로 구성요소 트리 자동 생성
  - 프롬프트 키 `patent_component_structuring` 사용
  - `patentai_patent_components` 일괄 INSERT
  - **재사용**: `streamClaude`, `createSSEResponse`, `preparePrompt`

### P4-2. API: 구성요소 CRUD
- [x] `src/app/api/patents/[id]/components/route.ts` 신규
  - `GET`: 전체 구성요소 트리 조회 (계층 구조)
  - `POST`: 구성요소 추가
- [x] `src/app/api/patents/[id]/components/[compId]/route.ts` 신규
  - `PATCH`: 구성요소 수정 (이름, 설명, 참조번호, 순서)
  - `DELETE`: 구성요소 삭제 (자식 포함)

### P4-3. UI: 구성요소 트리 편집기
- [x] `src/features/patent/step2/ComponentTree.tsx` 신규
  - 계층적 트리 렌더링 (재귀 컴포넌트)
  - 참조번호 배지 표시 (100, 110, 111 등)
  - 선행기술 충돌 시 ⚠️ 아이콘 표시 (GATE 2 후 업데이트)
  - 인라인 편집 (이름, 설명 클릭 시 input 전환)
  - 추가/삭제 버튼
- [x] `src/features/patent/step2/DrawingPlan.tsx` 신규
  - AI 추천 도면 목록 표시
  - 도면 유형 선택/추가/제거
  - **재사용**: `badge.tsx`, `card.tsx`
- [x] `src/features/patent/step2/ComponentPanel.tsx` 신규
  - AI 자동 생성 + 직접 추가 통합 패널
  - 구성요소 트리 + 도면 계획 조합 뷰

---

## P5. GATE 2 — 구성요소 확정 + 선행기술조사

### P5-1. KIPRIS API 연동
- [x] `src/lib/prior-art/kipris.ts` 신규
  ```typescript
  // KIPRIS Open API: https://www.kipris.or.kr/openapi/searchApi.do
  export async function searchKipris(keywords: string[], ipcCodes: string[]) {
    const query = keywords.join(' ')
    const url = `https://www.kipris.or.kr/openapi/rest/PatentSearchService/patentAdvancedSearch`
    const params = new URLSearchParams({
      ServiceKey: process.env.KIPRIS_API_KEY!,
      word: query,
      ipcCpc: ipcCodes[0] ?? '',
      numOfRows: '10',
      pageNo: '1',
    })
    const res = await fetch(`${url}?${params}`)
    // XML 파싱 → 구조화된 특허 목록 반환
    return parseKiprisResponse(await res.text())
  }
  ```

### P5-2. USPTO API 연동
- [x] `src/lib/prior-art/uspto.ts` 신규
  ```typescript
  // USPTO PatentsView API: https://search.patentsview.org/api/v1/patent/
  export async function searchUsptoPatents(keywords: string[]) {
    const url = 'https://search.patentsview.org/api/v1/patent/'
    const body = {
      q: { _text_any: { patent_abstract: keywords.join(' ') } },
      f: ['patent_number', 'patent_title', 'patent_abstract'],
      o: { per_page: 10 }
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }
  ```

### P5-3. 유사도 분석 서비스
- [x] `src/lib/prior-art/similarity.ts` 신규
  - 구성요소 키워드 추출
  - KIPRIS + USPTO 동시 검색 (`Promise.all`)
  - Claude API로 유사도 점수 산출 (임베딩 없이 텍스트 비교 방식)
  - `patentai_patent_prior_art` INSERT

### P5-4. API: 선행기술 조사
- [x] `src/app/api/patents/[id]/prior-art/search/route.ts` 신규
  - `POST`: 선행기술 조사 실행
  - 구성요소 + IPC 코드 기반 검색
  - 결과를 `patentai_patent_prior_art`에 저장
  - 충돌 컴포넌트 `patentai_patent_components.has_prior_art_conflict` 업데이트

### P5-5. API: 회피 전략 생성 (SSE)
- [x] `src/app/api/patents/[id]/prior-art/avoidance/route.ts` 신규
  - 프롬프트 키 `patent_prior_art_avoidance` 사용
  - 충돌 위험 컴포넌트별 회피 방안 생성
  - `patentai_patent_projects.overall_prior_art_risk` 업데이트
  - **재사용**: `streamClaude`, `createSSEResponse`, `preparePrompt`

### P5-6. UI: GATE 2 — 2패널 화면
- [x] `src/features/patent/gates/Gate2.tsx` 신규
  - **좌측 패널**: 구성요소 트리 (Step2 ComponentTree 재사용)
  - **우측 패널**: 선행기술 조사 결과
    - 유사 특허 카드 목록 (patent_number, title, 유사도 배지)
    - 위험도별 색상: 빨강(high) / 주황(medium) / 초록(low)
    - 💡 회피 전략 제안 표시
  - 버튼: 구성요소 수정 / 재검색 / 확정하고 청구범위 작성
- [x] `src/app/api/patents/[id]/gates/2/route.ts` 신규
  - GATE 2 승인 처리
  - `patentai_patent_projects` status → `'step2_done'`

---

## P6. STEP 3 — 청구범위 초안 작성

### P6-1. API: 청구범위 생성 (SSE)
- [x] `src/app/api/patents/[id]/claims/generate/route.ts` 신규
  - `POST body`: `{ claim_type: 'apparatus' | 'method' | 'system' }`
  - 구성요소 트리 + 회피 전략 컨텍스트 조합
  - 프롬프트 키 `patent_claims_generation` 사용
  - 청구항 JSON 스트리밍 후 `patentai_patent_claims` 일괄 INSERT
  - **재사용**: `streamClaude`, `createSSEResponse`, `preparePrompt`

### P6-2. API: 청구항 CRUD
- [x] `src/app/api/patents/[id]/claims/route.ts` 신규
  - `GET`: 전체 청구항 목록 (claim_number 순)
  - `POST`: 청구항 추가
- [x] `src/app/api/patents/[id]/claims/[claimId]/route.ts` 신규
  - `PATCH`: 청구항 내용 수정 / 번호 변경
  - `DELETE`: 청구항 삭제 (종속 청구항 parent 해제)
- [x] `src/app/api/patents/[id]/claims/reorder/route.ts` 신규
  - `POST`: 청구항 순서 일괄 변경

### P6-3. API: 청구항 강도 분석
- [x] `src/app/api/patents/[id]/claims/strength/route.ts` 신규
  - 금지 표현 탐지 (최선, 최고, 약, 대략, 다수의 등)
  - 참조번호 누락 탐지
  - 독립항 말미 "~특징으로 하는 ~." 패턴 확인
  - `patentai_patent_claims.strength_score`, `strength_issues` UPDATE

### P6-4. UI: 청구항 편집기
- [x] `src/features/patent/step3/ClaimsEditor.tsx` 신규
  - 청구항 목록 (독립항 파란 배경, 종속항 들여쓰기)
  - 강도 점수 ●●●●○ 표시
  - 인라인 textarea 자동 리사이즈 + blur 자동 저장
  - 금지 표현 경고 아이콘 + 이슈 목록
  - 독립항 추가 버튼

### P6-5. GATE 3 UI
- [x] `src/features/patent/gates/Gate3.tsx` 신규
  - 청구항 전체 미리보기 + 강도 요약 (평균 점수, 경고 수)
  - 강도 분석 버튼
  - 경고 없음 / 경고 있음 배너
- [x] `src/app/api/patents/[id]/gates/3/route.ts` 신규
  - `patentai_patent_claims.is_confirmed = true` (전체)
  - `patentai_patent_projects` status → `'step3_done'`

---

## P7. STEP 4 — 명세서 본문 작성

### P7-1. API: 섹션별 생성 (SSE)
> CASA document-generator 패턴 완전 재사용. 섹션별 라우트 생성.

- [ ] `src/app/api/patents/[id]/sections/generate/route.ts` 신규
  - `POST body`: `{ section_type: patent_section_type }`
  - 섹션 유형별 프롬프트 키 매핑:
    ```typescript
    const SECTION_PROMPT_MAP: Record<PatentSectionType, string> = {
      title: 'patent_section_title',
      tech_field: 'patent_section_tech_field',
      background: 'patent_section_background',
      problem: 'patent_section_problem',
      solution: 'patent_section_solution',
      effect: 'patent_section_effect',
      drawing_desc: 'patent_section_drawing_desc',  // 도면 목록에서 자동 생성
      detailed_desc: 'patent_section_detailed_desc',
      abstract: 'patent_section_abstract',
    }
    ```
  - SSE 스트리밍 중 `patentai_patent_sections` UPSERT
  - **재사용**: `streamClaude`, `createSSEResponse`, `preparePrompt`, `patent-generator.ts`

### P7-2. API: 섹션 수정 저장
- [ ] `src/app/api/patents/[id]/sections/[sectionType]/route.ts` 신규
  - `GET`: 섹션 내용 조회
  - `PATCH`: 사용자 직접 수정 내용 저장, version +1

### P7-3. UI: 명세서 본문 편집 뷰
- [ ] `src/features/patent/step4/SectionEditor.tsx` 신규
  - 좌측: 섹션 목록 네비게이션 (9개 섹션)
    - 각 섹션 생성 상태 표시 (생성전 / 생성중 / 완료)
    - 섹션 클릭 시 해당 섹션으로 스크롤
  - 우측: 섹션 편집 영역
    - Markdown 에디터 (textarea 기반)
    - 섹션별 [재생성] 버튼
    - SSE 스트리밍 텍스트 실시간 표시
  - [전체 생성] 버튼: 9개 섹션 순차 생성
  - **재사용**: `useSSE` 훅

### P7-4. GATE 4 UI
- [ ] `src/features/patent/gates/Gate4.tsx` 신규
  - 9개 섹션 완료 여부 체크리스트
  - 전체 미리보기 모달 (스크롤 가능)
  - 버튼: ✏️ 섹션 수정 / ✅ 본문 확정 및 도면 작성
- [ ] `src/app/api/patents/[id]/gates/4/route.ts` 신규
  - 9개 섹션 모두 content 있는지 검증
  - `patentai_patent_projects` status → `'step4_done'`

---

## P8. STEP 5 — 도면 생성

### P8-1. API: 도면 프롬프트 생성
- [ ] `src/app/api/patents/[id]/drawings/prompt/route.ts` 신규
  - 도면 유형별 Gemini 전달용 영문 프롬프트 생성
  - 프롬프트 키 `patent_drawing_prompt_gen` 사용
  - Claude로 프롬프트 생성 → 반환 (저장 X)
  - **재사용**: `callClaude`, `preparePrompt`

### P8-2. API: 도면 이미지 생성
- [ ] `src/app/api/patents/[id]/drawings/generate/route.ts` 신규
  - `POST body`: `{ drawing_number, drawing_type, caption, custom_prompt? }`
  - Gemini API (`src/lib/ai/gemini.ts` 재사용)로 이미지 생성
  - 생성 이미지 → Supabase Storage `patent-drawings` 버킷 업로드
  - `patentai_patent_drawings` INSERT (prompt_used, image_url 포함)
  - **재사용**: `src/lib/ai/gemini.ts` (이미 구현됨)

### P8-3. API: 도면 CRUD
- [ ] `src/app/api/patents/[id]/drawings/route.ts` 신규
  - `GET`: 도면 목록 조회
- [ ] `src/app/api/patents/[id]/drawings/[drawingId]/route.ts` 신규
  - `PATCH`: 캡션 수정, 외부 이미지 교체
  - `DELETE`: 도면 삭제

### P8-4. UI: 도면 뷰어
- [ ] `src/features/patent/step5/DrawingViewer.tsx` 신규
  - 썸네일 그리드 (도면 번호 + 캡션)
  - 클릭 시 전체화면 미리보기 (`<Dialog>` 재사용)
  - [재생성] 버튼: 프롬프트 수정 후 재생성 가능
  - [이미지 교체] 버튼: 외부 이미지 파일 업로드
  - 생성 중 스피너 표시
  - **재사용**: `dialog.tsx`, `card.tsx`

### P8-5. GATE 5 UI
- [ ] `src/features/patent/gates/Gate5.tsx` 신규
  - 도면 목록 확인
  - 도면 번호 ↔ 도면 간단 설명 일치 확인 체크리스트
  - 버튼: 🔄 개별 재생성 / 📤 이미지 교체 / ✅ 도면 확정 및 출력
- [ ] `src/app/api/patents/[id]/gates/5/route.ts` 신규
  - 도면 최소 1개 이상 있는지 검증
  - `patentai_patent_drawings.is_confirmed = true` (전체)
  - `patentai_patent_projects` status → `'step5_done'`

---

## P9. STEP 6 — 최종 출력

### P9-1. API: 명세서 완성도 검사
- [ ] `src/app/api/patents/[id]/validate/route.ts` 신규
  - 자동 점검 항목:
    - [ ] 청구항 번호 연속성 (1, 2, 3... 갭 없는지)
    - [ ] 모든 참조번호가 상세설명에 등장하는지
    - [ ] 도면 번호 ↔ 도면 간단 설명 일치 여부
    - [ ] 발명의 명칭(한) ↔ 청구항 1 발명 유형 일치
    - [ ] 요약서 200자 이내 여부
    - [ ] 금지 표현 감지 (최선, 최고, 최적, 약, 대략, 다수의)
  - 점검 결과 JSON 반환

### P9-2. API: DOCX 출력
- [ ] `src/app/api/patents/[id]/export/docx/route.ts` 신규
  - `patentai_patent_sections` 전체 조회 → 섹션 순서대로 조합
  - KIPO 표준 양식으로 마크다운 조합 후 DOCX 변환
  - `exportToDocx()` 재사용
  - **재사용**: `src/lib/utils/document-export.ts`

### P9-3. API: PDF 출력
- [ ] `src/app/api/patents/[id]/export/pdf/route.ts` 신규
  - `exportToPdf()` 재사용
  - **재사용**: `src/lib/utils/document-export.ts`

### P9-4. API: Markdown 출력
- [ ] `src/app/api/patents/[id]/export/markdown/route.ts` 신규
  - 섹션 + 청구항 + 도면 설명 통합 마크다운 생성
  - 파일 다운로드 응답 반환

### P9-5. UI: 최종 출력 페이지
- [ ] `src/features/patent/step6/ExportView.tsx` 신규
  - 완성도 리포트 카드 (점검 항목별 ✅/⚠️)
  - 출력 형식 선택: DOCX / PDF / Markdown
  - 다운로드 버튼
  - `patentai_patent_projects` status → `'completed'`
  - **재사용**: `card.tsx`, `badge.tsx`, `button.tsx`

---

## P10. 대시보드 & 프로젝트 관리

### P10-1. UI: 대시보드 메인
- [ ] `src/app/[locale]/dashboard/page.tsx` PatentAI 용으로 교체
  - 프로젝트 카드 목록
  - 각 카드: 제목, 현재 STEP 진행바, 상태 배지, 최근 수정일
  - [새 프로젝트 시작] 버튼
  - **재사용**: `card.tsx`, `progress.tsx`, `badge.tsx`

### P10-2. UI: 프로젝트 작업 뷰 (메인 편집 화면)
- [ ] `src/app/[locale]/dashboard/patents/[id]/page.tsx` 신규
  - 상단: STEP 1~6 진행 탭 바 (현재 단계 하이라이트)
  - 현재 단계에 맞는 컴포넌트 렌더링 (조건부)
  - 우측 사이드: 명세서 미리보기 패널 (섹션 완료 시 실시간 업데이트)

### P10-3. UI: 명세서 미리보기 사이드패널
- [ ] `src/features/patent/common/PreviewPanel.tsx` 신규
  - 완성된 섹션만 순서대로 표시
  - KIPO 표준 포맷 렌더링 (폰트, 들여쓰기)
  - Markdown → HTML 렌더링

### P10-4. 네비게이션
- [ ] `src/components/layout/PatentHeader.tsx` 신규 (CASA Header 참고)
  - 로고, 대시보드 링크, 사용자 메뉴
  - 크레딧 잔액 표시
  - **재사용**: 인증/크레딧 UI 패턴

---

## P11. 품질 보증

### P11-1. API 통합 테스트
- [ ] STEP 1 → GATE 1 → STEP 2 → GATE 2 → ... → STEP 6 전체 플로우 수동 E2E 테스트
- [ ] KIPRIS API 응답 없을 시 폴백 처리 확인 (빈 결과로 계속 진행)
- [ ] SSE 스트리밍 중단 후 재시도 시 데이터 정합성 확인
- [ ] 파일 크기 50MB 제한 동작 확인

### P11-2. 특허 문체 품질 검증
- [ ] 생성된 청구항에 금지 표현 없는지 확인
- [ ] 참조번호 형식 `(110)` 준수 확인
- [ ] 독립항 말미 "~것을 특징으로 하는 장치/방법." 패턴 확인
- [ ] 요약서 200자 이내 확인

### P11-3. 보안 확인
- [ ] 모든 API 라우트에 `requireAuth()` 적용 확인
- [ ] `patentai_*` 테이블 전체 RLS ON 확인
- [ ] Supabase Storage 버킷 public 접근 차단 확인
- [ ] 타 사용자 프로젝트 접근 시 403 반환 확인

---

## 파일 생성 체크리스트 (신규 파일 전체)

### API Routes (신규)
```
src/app/api/patents/
├── route.ts                                    (P3-1)
├── [id]/
│   ├── upload/route.ts                         (P3-2)
│   ├── ocr/route.ts                            (P3-3)
│   ├── analyze/route.ts                        (P3-4)
│   ├── validate/route.ts                       (P9-1)
│   ├── gates/
│   │   ├── 1/route.ts                          (P3-6)
│   │   ├── 2/route.ts                          (P5-6)
│   │   ├── 3/route.ts                          (P6-5)
│   │   ├── 4/route.ts                          (P7-4)
│   │   └── 5/route.ts                          (P8-5)
│   ├── components/
│   │   ├── generate/route.ts                   (P4-1)
│   │   ├── route.ts                            (P4-2)
│   │   └── [compId]/route.ts                   (P4-2)
│   ├── prior-art/
│   │   ├── search/route.ts                     (P5-4)
│   │   └── avoidance/route.ts                  (P5-5)
│   ├── claims/
│   │   ├── generate/route.ts                   (P6-1)
│   │   ├── route.ts                            (P6-2)
│   │   ├── [claimId]/route.ts                  (P6-2)
│   │   ├── reorder/route.ts                    (P6-2)
│   │   └── strength/route.ts                   (P6-3)
│   ├── sections/
│   │   ├── generate/route.ts                   (P7-1)
│   │   └── [sectionType]/route.ts              (P7-2)
│   ├── drawings/
│   │   ├── prompt/route.ts                     (P8-1)
│   │   ├── generate/route.ts                   (P8-2)
│   │   ├── route.ts                            (P8-3)
│   │   └── [drawingId]/route.ts                (P8-3)
│   └── export/
│       ├── docx/route.ts                       (P9-2)
│       ├── pdf/route.ts                        (P9-3)
│       └── markdown/route.ts                   (P9-4)
```

### Libraries (신규)
```
src/lib/
├── utils/docx-extract.ts                       (P2-2)
├── services/patent-generator.ts                (P2-3)
└── prior-art/
    ├── kipris.ts                               (P5-1)
    ├── uspto.ts                                (P5-2)
    └── similarity.ts                           (P5-3)
```

### Features / UI (신규)
```
src/features/patent/
├── step1/
│   ├── InputForm.tsx                           (P3-5)
│   └── AnalysisResult.tsx                      (P3-5)
├── step2/
│   ├── ComponentTree.tsx                       (P4-3)
│   └── DrawingPlan.tsx                         (P4-3)
├── step3/
│   └── ClaimsEditor.tsx                        (P6-4)
├── step4/
│   └── SectionEditor.tsx                       (P7-3)
├── step5/
│   └── DrawingViewer.tsx                       (P8-4)
├── step6/
│   └── ExportView.tsx                          (P9-5)
├── gates/
│   ├── Gate1.tsx                               (P3-6)
│   ├── Gate2.tsx                               (P5-6)
│   ├── Gate3.tsx                               (P6-5)
│   ├── Gate4.tsx                               (P7-4)
│   └── Gate5.tsx                               (P8-5)
└── common/
    └── PreviewPanel.tsx                        (P10-3)
```

### Pages (신규)
```
src/app/[locale]/dashboard/
├── page.tsx                                    (P10-1)
└── patents/[id]/page.tsx                       (P10-2)
```

---

## 구현 순서 요약 (의존성 기준)

```
P0 (프로젝트 초기화)
  └→ P1 (DB + 프롬프트)
       └→ P2 (공통 인프라 확인)
            ├→ P3 (STEP 1 입력/분석)
            │    └→ P4 (STEP 2 구조화)
            │         └→ P5 (GATE 2 선행기술)
            │              └→ P6 (STEP 3 청구범위)
            │                   └→ P7 (STEP 4 본문)
            │                        └→ P8 (STEP 5 도면)
            │                             └→ P9 (STEP 6 출력)
            └→ P10 (대시보드 — P3 완료 후 병행 가능)
```

> **MVP 완성 기준:** P0~P6 완료 (STEP 1~3 + GATE 1~3). DOCX 출력까지 동작하면 파일럿 테스트 가능.
