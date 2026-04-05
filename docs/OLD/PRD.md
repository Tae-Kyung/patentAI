# PRD: CASA (CBNU AI-Agentic Startup Accelerator) MVP

> **문서 버전:** 1.6
> **작성일:** 2026-02-22
> **대상 스택:** Next.js 15 (App Router) + Supabase + Tailwind CSS + Vercel

---

## 1. 제품 개요

### 1.1 제품명
**CASA** (CBNU AI-Agentic Startup Accelerator)

### 1.2 핵심 가치 제안
창업자의 아이디어를 입력받아 **AI 기반 다면 검증 → 사업계획서 자동 생성 → 랜딩페이지 배포**까지 원스톱으로 지원하는 창업 가속화 플랫폼

### 1.3 MVP 목표
- **검증 목표:** 창업자가 AI 지원 도구를 통해 아이디어 구체화 및 문서 생성에 체감하는 가치 확인
- **성공 지표:**
  - 아이디어 입력 → 사업계획서 초안 생성까지 30분 이내
  - 사용자 만족도 4.0/5.0 이상 (초기 10개 팀 대상)
  - 생성된 문서 활용률 70% 이상

### 1.4 대상 사용자

| 역할 | 설명 | 핵심 니즈 |
|------|------|-----------|
| **예비창업자** | 아이디어는 있으나 구체화 역량 부족 | 체계적인 아이디어 검증, 문서화 |
| **창업자(입주기업)** | 이미 사업을 운영 중인 창업자/입주기업 | 기존 사업계획서 AI 검토, 진단, 전략 수립, 보고서 |
| **창업동아리** | 대학 내 창업 동아리 팀 | 빠른 프로토타이핑, 피드백 |
| **멘토(Admin)** | 창업지원단 담당자 | 다수 팀 효율적 관리, 진행 모니터링 |

### 1.5 프로젝트 트랙 (이중 트랙)

플랫폼은 사용자 유형에 따라 **두 가지 프로젝트 트랙**을 제공합니다.

| 트랙 | `project_type` | 대상 | 워크플로우 | 설명 |
|------|----------------|------|-----------|------|
| **예비창업자** | `pre_startup` | 아이디어만 있는 예비창업자 | 아이디어 입력 → 사업성 평가 → 문서 생성 → 배포 (Gate 1→2→3→4) | 기존 F1~F5 플로우 |
| **창업자** | `startup` | 이미 사업을 운영 중인 창업자 | 검토 → 진단 → 전략 → 보고서 (단계별 확정) | 사업계획서 기반 AI 분석 (F10) |

### 1.6 지원 언어

| 언어 | 코드 | 우선순위 | 비고 |
|------|------|----------|------|
| 한국어 | ko | 1 (기본) | 주요 사용자 대상 |
| 영어 | en | 2 | 글로벌 사용자, 폴백 언어 |
| 일본어 | ja | 3 (향후) | 아시아 확장 |
| 중국어 | zh | 4 (향후) | 아시아 확장 |

---

## 2. MVP 기능 범위

### 2.1 기능 구성도 (Human-in-the-Loop 포함)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CASA MVP v1.0 - Human-in-the-Loop Workflow               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌────────┐ │
│  │ 1. 아이디어 │      │ 2. 사업성   │      │ 3. 문서     │      │4. 배포 │ │
│  │    입력/확장│      │    다면평가 │      │    자동생성 │      │   준비 │ │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └───┬────┘ │
│         │                    │                    │                  │      │
│         ▼                    ▼                    ▼                  ▼      │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌────────┐ │
│  │• 자연어입력 │      │• 투자심사역 │      │• 사업계획서 │      │• 최종  │ │
│  │• AI 확장    │      │• 시장분석가 │      │• 요약 피치  │      │  검토  │ │
│  │• 구조화     │      │• 기술전문가 │      │• 랜딩페이지 │      │• 배포  │ │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └───┬────┘ │
│         │                    │                    │                  │      │
│         ▼                    ▼                    ▼                  ▼      │
│  ╔═════════════╗      ╔═════════════╗      ╔═════════════╗      ╔════════╗ │
│  ║  🔄 GATE 1  ║      ║  🔄 GATE 2  ║      ║  🔄 GATE 3  ║      ║ GATE 4 ║ │
│  ║ ─────────── ║      ║ ─────────── ║      ║ ─────────── ║      ║ ────── ║ │
│  ║ 사용자 확인 ║─────▶║ 사용자 검토 ║─────▶║ 사용자 승인 ║─────▶║ 멘토   ║ │
│  ║ • 수정 가능 ║      ║ • 재평가    ║      ║ • 수정 요청 ║      ║ 최종   ║ │
│  ║ • 확정 승인 ║      ║ • 피드백    ║      ║ • 문서 확정 ║      ║ 승인   ║ │
│  ╚═════════════╝      ╚═════════════╝      ╚═════════════╝      ╚════════╝ │
│         │                    │                    │                  │      │
│         │          ┌─────────┴─────────┐          │                  │      │
│         │          ▼                   ▼          │                  │      │
│         │   [멘토 피드백 요청]   [개선 제안 반영]  │                  │      │
│         │          │                   │          │                  │      │
│         └──────────┴───────────────────┴──────────┴──────────────────┘      │
│                                    │                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      5. 대시보드 & 관리                               │  │
│  │  • 프로젝트 현황  • 승인 대기 목록  • 멘토 피드백  • 진행 단계 추적   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

※ 이중 테두리(╔═╗): Human Approval Gate (사람의 승인 필요)
※ 모든 Gate에서 이전 단계로 되돌아가 수정 가능
```

### 2.2 Human-in-the-Loop 승인 게이트

각 단계 전환 시 **사람의 검토와 승인**이 필요합니다. AI는 보조 역할이며, 최종 결정은 사용자가 합니다.

#### Gate 1: 아이디어 확정 승인

| 항목 | 내용 |
|------|------|
| **승인 주체** | 사용자 (필수) |
| **검토 대상** | AI가 구조화한 아이디어 카드 (문제, 솔루션, 타겟, 차별점) |
| **가능한 액션** | ✅ 확정 승인 → 다음 단계 / ✏️ 수정 후 재생성 / 🔄 AI 재확장 요청 |
| **선택적 멘토 검토** | 멘토에게 피드백 요청 가능 (선택) |

```
┌─────────────────────────────────────────────────────────────────┐
│                    아이디어 카드 확정 화면                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 AI 생성 아이디어 카드                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 문제: [AI가 구조화한 문제 정의]                            │ │
│  │ 솔루션: [AI가 제안한 솔루션]                               │ │
│  │ 타겟: [목표 고객층]                                        │ │
│  │ 차별점: [경쟁 우위 요소]                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ 다음 단계(사업성 평가)로 진행하기 전에 검토해주세요.        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  ✏️ 수정    │  │ 🔄 재생성   │  │  ✅ 확정하고 평가 시작  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  [ ] 멘토에게 피드백 요청 (선택)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Gate 2: 평가 결과 검토 및 승인

| 항목 | 내용 |
|------|------|
| **승인 주체** | 사용자 (필수), 멘토 (선택) |
| **검토 대상** | 3가지 AI 평가 결과 (투자/시장/기술), 종합 점수, 개선 제안 |
| **가능한 액션** | ✅ 승인 → 문서 생성 / 🔄 재평가 요청 / 💬 이의 제기 / ✏️ 아이디어 수정 후 재평가 |
| **멘토 피드백** | 평가 결과에 대한 멘토 의견 추가 가능 |

```
┌─────────────────────────────────────────────────────────────────┐
│                    사업성 평가 결과 검토                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 다면 평가 결과                          종합: 68/100점      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 투자심사역 AI: 75점  [상세 보기]                          │ │
│  │ 시장분석가 AI: 68점  [상세 보기]                          │ │
│  │ 기술전문가 AI: 62점  [상세 보기]                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 AI 개선 제안                                                │
│  • 수익 모델을 더 구체화하세요                                  │
│  • B2B 시장도 고려해보세요                                      │
│                                                                 │
│  ⚠️ 평가 결과를 검토하고 다음 단계를 선택하세요.                │
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────────┐ │
│  │ ✏️ 아이디어│ │🔄 재평가  │ │💬 이의제기│ │ ✅ 승인 및 문서 │ │
│  │    수정   │ │   요청    │ │          │ │     생성 시작   │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────────┘ │
│                                                                 │
│  💬 멘토 피드백 (1)                                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ "기술 구현성 부분을 보완하면 좋겠습니다." - 김멘토         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Gate 3: 문서 검토 및 수정 승인

| 항목 | 내용 |
|------|------|
| **승인 주체** | 사용자 (필수) |
| **검토 대상** | 생성된 사업계획서, 요약 피치, 랜딩페이지 |
| **가능한 액션** | ✅ 승인 / ✏️ 부분 수정 요청 / 🔄 전체 재생성 / 📥 다운로드 |
| **수정 요청 방식** | 특정 섹션 지정하여 수정 지시 가능 |

```
┌─────────────────────────────────────────────────────────────────┐
│                    생성 문서 검토                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📄 생성된 문서 (3)                                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✅ 사업계획서         [미리보기] [수정요청] [다운로드 ▼]  │ │
│  │                       MD / PDF / Word                     │ │
│  │ ⏳ 요약 피치           [미리보기] [수정요청] [다운로드 ▼]  │ │
│  │                       MD / PDF / Word                     │ │
│  │ ⏳ 랜딩페이지.html    [미리보기] [수정요청] [다운로드]    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✏️ 수정 요청                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 섹션 선택: [3.2 시장 규모 ▼]                              │ │
│  │ 수정 지시: "국내 시장 데이터를 2025년 기준으로 업데이트"  │ │
│  │                                      [수정 요청 전송]     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │  🔄 전체 재생성  │  │  ✅ 모든 문서 확정 및 배포 준비    │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Gate 4: 최종 배포 승인 (멘토 검토 포함)

| 항목 | 내용 |
|------|------|
| **승인 주체** | 사용자 (필수), 멘토 (선택/필수 설정 가능) |
| **검토 대상** | 최종 확정된 모든 산출물 |
| **가능한 액션** | ✅ 배포 승인 / 📤 외부 공유 링크 생성 / 🔒 비공개 유지 |
| **멘토 최종 승인** | 설정에 따라 멘토 승인 필수화 가능 |

### 2.3 멀티 AI 오케스트레이션 전략

#### 2.3.1 AI 모델별 역할 분담

| AI 모델 | 역할 | 활용 단계 | 선정 이유 |
|---------|------|-----------|-----------|
| **Claude 3.5 Sonnet** | 논리적 분석, 문서 생성 | 아이디어 구조화, 사업계획서 | 한국어 우수, 긴 문맥, 논리적 추론 |
| **OpenAI GPT-4o** | 비즈니스 로직, 창의적 확장 | 브레인스토밍, 마케팅 전략 | 창의성, 비즈니스 도메인 지식 |
| **Google Gemini 1.5 Pro** | 시장 데이터 분석, 멀티모달 | 시장 조사, 경쟁사 분석 | 웹 검색 연동, 최신 정보 |

#### 2.3.2 단계별 AI 활용 전략

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        멀티 AI 오케스트레이션 아키텍처                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1단계: 아이디어 확장]                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   사용자 입력 ──▶ ┌─────────────┐    ┌─────────────┐               │   │
│  │                   │   GPT-4o    │───▶│   Claude    │──▶ 구조화된   │   │
│  │                   │ 창의적 확장 │    │ 논리적 정제 │    아이디어   │   │
│  │                   └─────────────┘    └─────────────┘               │   │
│  │                                                                     │   │
│  │   • GPT-4o: 아이디어 브레인스토밍, 다양한 관점 제시                 │   │
│  │   • Claude: 구조화, 논리적 일관성 검토, 최종 정제                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [2단계: 다면 평가 - 멀티 에이전트 토론]                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │   │  투자심사역  │  │  시장분석가  │  │  기술전문가  │                │   │
│  │   │   (GPT-4o)  │  │  (Gemini)   │  │  (Claude)   │                │   │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │   │
│  │          │                │                │                        │   │
│  │          ▼                ▼                ▼                        │   │
│  │   ┌─────────────────────────────────────────────────────────┐      │   │
│  │   │              AI 토론 라운드 (선택적)                     │      │   │
│  │   │  • 각 AI가 다른 AI의 평가에 대해 반론/보완              │      │   │
│  │   │  • 2-3 라운드 토론 후 합의점 도출                       │      │   │
│  │   └─────────────────────────────────────────────────────────┘      │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │                   ┌─────────────────────┐                          │   │
│  │                   │   Claude (종합)     │                          │   │
│  │                   │ 최종 평가 리포트    │──▶ 종합 평가 결과        │   │
│  │                   └─────────────────────┘                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [3단계: 문서 생성]                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │   │
│  │   │   사업계획서    │  │   요약 피치     │  │   랜딩페이지    │    │   │
│  │   │    (Claude)     │  │   (GPT-4o)     │  │   (Claude)      │    │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘    │   │
│  │                                                                     │   │
│  │   • Claude: 논리적 구조, 정부지원사업 양식 준수, 코드 생성          │   │
│  │   • GPT-4o: 설득력 있는 피치, 스토리텔링                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 MVP vs 확장 단계 AI 활용

| 단계 | MVP (Phase 1) | 확장 (Phase 2+) |
|------|---------------|-----------------|
| **아이디어 확장** | Claude 단독 | GPT-4o → Claude 체인 |
| **사업성 평가** | Claude (3개 페르소나) | GPT-4o + Gemini + Claude (멀티 에이전트) |
| **시장 조사** | 정적 프롬프트 기반 | Gemini + 웹 검색 RAG |
| **문서 생성** | Claude 단독 | 문서 유형별 최적 AI 선택 |
| **AI 토론** | 미지원 | 2-3 라운드 멀티 에이전트 토론 |

#### 2.3.4 AI 오케스트레이션 구현 아키텍처

```typescript
// lib/ai/orchestrator.ts

interface AITask {
  model: 'claude' | 'gpt4o' | 'gemini';
  role: string;
  prompt: string;
  dependsOn?: string[];  // 이전 태스크 결과 의존성
}

interface OrchestratorConfig {
  mode: 'mvp' | 'multi-agent';
  enableDebate: boolean;
  debateRounds: number;
}

// MVP 모드: Claude 단독
const MVP_CONFIG: OrchestratorConfig = {
  mode: 'mvp',
  enableDebate: false,
  debateRounds: 0,
};

// 확장 모드: 멀티 에이전트
const MULTI_AGENT_CONFIG: OrchestratorConfig = {
  mode: 'multi-agent',
  enableDebate: true,
  debateRounds: 2,
};

// 평가 단계 태스크 정의 (확장 모드)
const EVALUATION_TASKS: AITask[] = [
  {
    model: 'gpt4o',
    role: 'investor',
    prompt: INVESTOR_PROMPT,
  },
  {
    model: 'gemini',
    role: 'market_analyst',
    prompt: MARKET_ANALYST_PROMPT,
  },
  {
    model: 'claude',
    role: 'tech_expert',
    prompt: TECH_EXPERT_PROMPT,
  },
  {
    model: 'claude',
    role: 'synthesizer',
    prompt: SYNTHESIS_PROMPT,
    dependsOn: ['investor', 'market_analyst', 'tech_expert'],
  },
];
```

#### 2.3.5 AI 간 결과 통합 방식

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI 결과 통합 파이프라인                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [병렬 실행]                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ GPT-4o  │  │ Gemini  │  │ Claude  │                        │
│  │ 평가 A  │  │ 평가 B  │  │ 평가 C  │                        │
│  └────┬────┘  └────┬────┘  └────┬────┘                        │
│       │            │            │                              │
│       └────────────┼────────────┘                              │
│                    ▼                                            │
│  [토론 라운드] (선택적)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Round 1: 각 AI가 다른 평가에 대한 의견 제시             │   │
│  │ Round 2: 반론 및 보완 의견 교환                         │   │
│  │ Round 3: 최종 입장 정리 (필요시)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                    │                                            │
│                    ▼                                            │
│  [종합 분석]                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Claude (종합)                         │   │
│  │  • 모든 AI 평가 결과 + 토론 내용 입력                   │   │
│  │  • 합의점과 쟁점 정리                                   │   │
│  │  • 가중 평균 점수 산출                                  │   │
│  │  • 최종 권고사항 도출                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                    │                                            │
│                    ▼                                            │
│  [출력: 종합 평가 리포트]                                       │
│  • 개별 AI 평가 요약                                            │
│  • 토론 하이라이트 (의견 차이 및 합의점)                        │
│  • 종합 점수 및 근거                                            │
│  • 핵심 개선 제안                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 기능 상세 명세

#### F1: 아이디어 입력 및 AI 확장

| 항목 | 내용 |
|------|------|
| **목적** | 창업자의 초기 아이디어를 구조화하고 AI로 확장 |
| **입력** | 자연어 아이디어 설명 (500자 이상 권장) |
| **출력** | 구조화된 아이디어 카드 (문제, 솔루션, 타겟, 차별점) |
| **AI 모델 (MVP)** | Claude 3.5 Sonnet (단독) |
| **AI 모델 (확장)** | GPT-4o (창의적 확장) → Claude (논리적 정제) |
| **승인 게이트** | Gate 1: 사용자 확정 승인 필수 |

**사용자 플로우 (Human-in-the-Loop 적용):**
1. 사용자가 아이디어를 자유 형식으로 입력
2. AI가 질문을 통해 부족한 정보 보완 요청
3. AI가 구조화된 아이디어 카드 생성
4. **[Gate 1] 사용자 검토** → 수정/재생성/확정 선택
5. (선택) 멘토에게 피드백 요청
6. 사용자 확정 승인 후 다음 단계 진행

**API 엔드포인트:**
```
POST /api/projects                       # 프로젝트 생성
POST /api/projects/{id}/idea             # 아이디어 입력
POST /api/projects/{id}/idea/expand      # AI 확장 (SSE 스트리밍)
PATCH /api/projects/{id}/idea            # 아이디어 수정
POST /api/projects/{id}/idea/confirm     # 아이디어 확정 (Gate 1 승인)
POST /api/projects/{id}/idea/mentor-review  # 멘토 검토 요청
```

#### F2: 사업성 다면 평가

| 항목 | 내용 |
|------|------|
| **목적** | 3가지 관점에서 아이디어 타당성 검증 |
| **입력** | 확정된 아이디어 카드 (Gate 1 통과) |
| **출력** | 다면 평가 보고서 (점수 + 피드백 + 개선제안) |
| **AI 모델 (MVP)** | Claude 3.5 Sonnet (3개 페르소나 순차 호출) |
| **AI 모델 (확장)** | GPT-4o (투자) + Gemini (시장) + Claude (기술) + 멀티 에이전트 토론 |
| **승인 게이트** | Gate 2: 사용자 검토 및 승인 필수 |

**평가 프레임워크:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                    다면 평가 프레임워크 (멀티 AI)                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [투자심사역]              [시장분석가]              [기술전문가]    │
│  GPT-4o (확장)            Gemini 1.5 Pro (확장)    Claude (MVP/확장) │
│  Claude (MVP)             Claude (MVP)              ────────────     │
│  ├─ 수익 모델 타당성      ├─ 시장 규모 추정         ├─ 기술 구현성   │
│  ├─ 확장 가능성           ├─ 경쟁사 분석            ├─ 기술 트렌드   │
│  ├─ 투자 매력도           ├─ 타겟 고객 검증         ├─ 개발 복잡도   │
│  └─ 리스크 요인           └─ 시장 진입 전략         └─ 필요 자원     │
│                                                                      │
│  [멀티 에이전트 토론] (확장 모드)                                    │
│  ─────────────────────────────────────────────────────────────────── │
│  Round 1: 각 AI가 다른 AI 평가에 대한 의견 제시                      │
│  Round 2: 반론 및 보완 → 합의점 도출                                 │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│  [종합 평가] Claude 3.5 Sonnet                                       │
│  ├─ 사업성: ██████████ 75점                                         │
│  ├─ 시장성: ████████░░ 68점                                         │
│  ├─ 기술성: ███████░░░ 62점                                         │
│  └─ 종합:   ████████░░ 68점                                         │
│                                                                      │
│  ⚠️ [Gate 2] 사용자 검토 필요                                        │
│  가능한 액션: ✅ 승인 | 🔄 재평가 | ✏️ 아이디어 수정 | 💬 이의제기  │
└──────────────────────────────────────────────────────────────────────┘
```

**사용자 플로우 (Human-in-the-Loop 적용):**
1. 확정된 아이디어로 AI 평가 시작
2. 3개 AI 페르소나가 각각 평가 수행 (병렬)
3. (확장 모드) AI 간 토론 및 합의 도출
4. 종합 평가 리포트 생성
5. **[Gate 2] 사용자 검토** → 승인/재평가/수정/이의제기 선택
6. (선택) 멘토 피드백 요청 및 반영
7. 사용자 승인 후 문서 생성 단계 진행

**API 엔드포인트:**
```
POST /api/projects/{id}/evaluate            # 평가 시작 (SSE 스트리밍)
GET  /api/projects/{id}/evaluation          # 평가 결과 조회
POST /api/projects/{id}/evaluation/confirm  # 평가 승인 (Gate 2 승인)
POST /api/projects/{id}/evaluation/retry    # 재평가 요청
POST /api/projects/{id}/evaluation/dispute  # 이의 제기
```

#### F3: 문서 자동 생성

| 항목 | 내용 |
|------|------|
| **목적** | 검증된 아이디어로 창업 필수 문서 자동 생성 |
| **입력** | 확정된 아이디어 + 승인된 평가 결과 (Gate 1, 2 통과) |
| **출력** | 사업계획서(MD/PDF/Word), 요약 피치(MD/PDF/Word), 랜딩페이지(HTML) |
| **승인 게이트** | Gate 3: 문서별 검토 및 수정 요청, 최종 확정 |

**문서 유형 및 담당 AI:**

| 문서 | 형식 | 담당 AI (MVP) | 담당 AI (확장) | 용도 |
|------|------|---------------|----------------|------|
| **사업계획서** | Markdown → PDF/Word | Claude | Claude (논리, 양식 준수) | 정부지원, 투자 |
| **요약 피치** | Markdown → PDF/Word | Claude | GPT-4o (스토리텔링) | 엘리베이터 피치 |
| **랜딩페이지** | HTML (Tailwind) | Claude | Claude (코드 생성) | 서비스 홍보 |

**사용자 플로우 (Human-in-the-Loop 적용):**
1. 승인된 평가 결과 기반으로 문서 생성 요청
2. AI가 문서 초안 생성 (SSE로 진행률 표시)
3. **[Gate 3] 사용자 검토**
   - 문서별 미리보기
   - 섹션별 수정 요청 가능
   - 전체 재생성 요청 가능
4. 수정 요청 시 AI가 해당 섹션만 재생성
5. 모든 문서 확정 후 내보내기(인쇄하기/Word 문서 다운로드)/배포 준비 단계 진행

**API 엔드포인트:**
```
POST /api/projects/{id}/documents/business-plan     # 사업계획서 생성 (SSE)
POST /api/projects/{id}/documents/pitch             # 요약 피치 생성
POST /api/projects/{id}/documents/landing           # 랜딩페이지 생성
GET  /api/projects/{id}/documents                   # 생성된 문서 목록
GET  /api/projects/{id}/documents/{docId}/preview   # 문서 미리보기
POST /api/projects/{id}/documents/{docId}/revise    # 섹션 수정 요청
POST /api/projects/{id}/documents/{docId}/regenerate  # 전체 재생성
POST /api/projects/{id}/documents/{docId}/confirm   # 문서 확정 (Gate 3)
GET  /api/projects/{id}/documents/{docId}/download  # 다운로드 (클라이언트 측 MD/PDF/Word 변환)
```

#### F4: 배포 준비 및 최종 승인

| 항목 | 내용 |
|------|------|
| **목적** | 최종 산출물 검토 및 외부 공유/배포 |
| **입력** | 확정된 모든 문서 (Gate 3 통과) |
| **출력** | 공유 가능한 링크, 배포된 랜딩페이지 |
| **승인 게이트** | Gate 4: 최종 배포 승인 (멘토 승인 선택/필수) |

**사용자 플로우 (Human-in-the-Loop 적용):**
1. 모든 문서 확정 완료
2. 최종 산출물 패키지 확인
3. **[Gate 4] 최종 승인 요청**
   - 사용자 셀프 승인
   - 또는 멘토 승인 요청 (설정에 따라 필수화 가능)
4. 배포 옵션 선택
   - 외부 공유 링크 생성
   - 랜딩페이지 배포
   - 비공개 유지

**API 엔드포인트:**
```
GET  /api/projects/{id}/package                # 최종 산출물 패키지 조회
POST /api/projects/{id}/request-approval       # 멘토 승인 요청
POST /api/projects/{id}/approve                # 최종 승인 (Gate 4)
POST /api/projects/{id}/share                  # 공유 링크 생성
POST /api/projects/{id}/deploy-landing         # 랜딩페이지 배포
```

#### F5: 대시보드 및 관리

| 항목 | 내용 |
|------|------|
| **목적** | 프로젝트 진행 현황 관리, 승인 현황, 멘토 피드백 |
| **기능** | 프로젝트 CRUD, 단계별 진행률, 승인 대기 목록, 멘토 코멘트 |

**대시보드 구성요소:**

```
┌─────────────────────────────────────────────────────────────────┐
│  CASA Dashboard                          [🌙] [🌐 KO ▼] [사용자] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  내 프로젝트 (3)                              [+ 새 프로젝트]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🚀 AI 헬스케어 앱        진행률: ████████░░ 80%         │   │
│  │    단계: 문서 생성 중     마지막 수정: 2시간 전          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 💡 캠퍼스 배달 플랫폼    진행률: ██████░░░░ 55%         │   │
│  │    단계: 사업성 평가      마지막 수정: 1일 전            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 📝 스터디 매칭 서비스    진행률: ███░░░░░░░ 25%         │   │
│  │    단계: 아이디어 입력    마지막 수정: 3일 전            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  멘토 피드백 (1 새 알림)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💬 "AI 헬스케어 앱" 사업계획서에 대한 피드백이 있습니다.  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### F6: 시장 중심 피칭 코치 (모두의 창업 연계)

| 항목 | 내용 |
|------|------|
| **목적** | 기술 설명 중심 → 시장·고객 중심 스토리텔링으로 전환 |
| **배경** | 중기부 '모두의 창업' 정책 방향: "오디션 형식을 통해 시장 중심으로 스토리텔링을 바꿀 수밖에 없다" |
| **적용 범위** | 평가(F2) 프롬프트 강화 + 피치 문서(F3) 구조 전환 |

**개선 내용:**

1. **평가 단계 강화**: 기존 투자/시장/기술 3축 평가에 "시장 스토리텔링" 항목 추가
   - "이 아이디어를 고객에게 30초에 설명한다면?" 평가
   - 고객 페르소나 구체성 평가
   - 고객의 Pain Point → 해결 경험 흐름 평가
2. **피치 문서 구조 전환**: 기술 중심 → 고객 중심 구조
   - 고객 페르소나 → 고객의 Pain → 해결 경험 → 시장 검증 → 기술(부록)
3. **시장 스토리 요약 카드**: 평가 결과에 "30초 엘리베이터 피치" 자동 생성

**구현 방식:** `bi_prompts` 테이블의 기존 프롬프트 수정 (evaluation_market, pitch_summary)

#### F7: GTM 체크리스트 (모두의 창업 연계)

| 항목 | 내용 |
|------|------|
| **목적** | Day 1부터 실질적 Go-to-Market 실행 지원 |
| **배경** | 중기부 정책 방향: "Day 1부터 실질적 세일즈, 마케팅 등 Go-to-Market을 할 수 있도록" |
| **입력** | 확정된 아이디어 + 승인된 평가 결과 (Gate 2 통과) |
| **출력** | 프로젝트 맞춤형 GTM 실행 체크리스트 (Markdown) |

**GTM 체크리스트 구성:**
- 타겟 고객 첫 10명 확보 방법
- 가격 책정 전략
- 초기 판매 채널 (온라인/오프라인)
- 핵심 지표(KPI) 3개
- 30일/60일/90일 실행 플랜

**API 엔드포인트:**
```
POST /api/projects/{id}/documents/gtm-checklist  # GTM 체크리스트 생성 (SSE)
```

**구현 방식:** 기존 문서 생성 파이프라인(F3) 재활용, `bi_documents.type`에 `'gtm_checklist'` 추가

#### F8: 공개 프로젝트 프로필 (모두의 창업 연계)

| 항목 | 내용 |
|------|------|
| **목적** | 창업 생태계 투명성 확보 — 평가 기준·결과 공개 |
| **배경** | 중기부 정책 방향: "어떤 기준으로 선정했는지 다 공표해야 한다. 플랫폼에 공개되니까 의미 있다" |
| **입력** | Gate 4 통과 프로젝트 (사용자가 공개 범위 선택) |
| **출력** | 외부 접근 가능한 공개 프로필 페이지 |

**공개 프로필 구성:**
- 아이디어 요약 (문제/솔루션/타겟/차별점)
- 평가 점수 (투자/시장/기술/종합) + 평가 기준 설명
- 멘토 피드백 요약 (멘토 동의 시)
- 생성 문서 목록 (공개 선택 시)
- 30초 엘리베이터 피치 (F6에서 생성)

**공개 범위 옵션:**
| 옵션 | 공개 내용 |
|------|-----------|
| **전체 공개** | 아이디어 요약 + 평가 점수 + 멘토 피드백 + 문서 |
| **요약 공개** | 아이디어 요약 + 평가 점수만 |
| **비공개** | 외부 접근 불가 (기본값) |

**API 엔드포인트:**
```
PATCH /api/projects/{id}/visibility        # 공개 범위 설정
GET   /api/projects/{id}/public-profile    # 공개 프로필 조회 (비인증)
GET   /api/showcase                        # 공개 프로젝트 목록 (비인증)
```

**데이터 모델 변경:** `bi_projects`에 `visibility` 컬럼 추가

#### F9: 멘토·전문가 매칭 기초 (모두의 창업 연계)

| 항목 | 내용 |
|------|------|
| **목적** | 창업 생태계 참여자 연결 — 프로젝트와 멘토 매칭 |
| **배경** | 중기부 정책 방향: "AC, VC, 멘토, 법률, 미디어 등 창업 생태계 전반을 플랫폼에 참여시켜 매칭" |
| **구현 범위** | MVP 수준 — 태그 기반 단순 매칭 (AI 매칭은 향후) |

**멘토 프로필 확장:**
- 전문 분야 태그 (예: 마케팅, 투자, 법률, 기술)
- 산업 태그 (예: 헬스케어, 핀테크, 에듀테크)
- 경력 요약

**매칭 로직:** 프로젝트의 산업 분류 + 현재 단계 → 관련 태그를 가진 멘토 추천 목록

**API 엔드포인트:**
```
PATCH /api/users/profile                   # 멘토 프로필(태그) 수정
GET   /api/mentors                         # 멘토 디렉토리
GET   /api/projects/{id}/recommended-mentors  # 프로젝트 기반 멘토 추천
POST  /api/projects/{id}/mentor-request    # 멘토링 요청
```

**데이터 모델 변경:** `bi_users`에 `expertise_tags`, `industry_tags`, `bio` 컬럼 추가

#### F10: 창업자 트랙 (사업계획서 기반 AI 분석)

| 항목 | 내용 |
|------|------|
| **목적** | 이미 사업을 운영 중인 창업자를 위한 사업계획서 기반 AI 분석 파이프라인 |
| **대상** | `project_type = 'startup'`인 프로젝트 |
| **입력** | 사업계획서 텍스트 (직접 입력 또는 PDF 업로드로 텍스트 추출) |
| **출력** | AI 검토 → 비즈니스 진단 → 전략 제안 → 종합 보고서 |
| **AI 모델** | Claude 3.5 Sonnet (SSE 스트리밍) |

**4단계 워크플로우:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. 검토     │     │ 2. 진단     │     │ 3. 전략     │     │ 4. 보고서   │
│   (Review)  │────▶│ (Diagnosis) │────▶│ (Strategy)  │────▶│  (Report)   │
│             │     │             │     │             │     │             │
│• 사업계획서 │     │• SWOT 분석  │     │• 성장 전략  │     │• 종합 보고서│
│  입력/PDF   │     │• 재무 건전성│     │• 자원 배분  │     │• 경영 요약  │
│• AI 검토    │     │• 시장 포지션│     │• 재무 전망  │     │• 인쇄/Word  │
│• 사용자 확정│     │• 성장 잠재력│     │• 실행 계획  │     │  내보내기   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**1단계: 검토 (Review)**
- 사업계획서 텍스트 직접 입력 (최소 50자)
- **PDF 업로드 지원**: 클라이언트 측 `pdfjs-dist`로 텍스트 추출 (최대 10MB)
- 기업 정보 입력 (회사명, 업종, 설립연도, 직원 수, 매출, 투자 단계)
- AI가 사업계획서를 분석하여 검토 결과 생성 (SSE 스트리밍)
- 사용자가 검토 결과를 확인하고 확정 → 다음 단계 진행

**2단계: 진단 (Diagnosis)**
- 검토 결과 기반으로 AI가 비즈니스 진단 수행
- SWOT 분석, 재무 건전성, 시장 포지셔닝, 성장 잠재력 분석
- 사용자가 진단 결과를 확인하고 확정 → 다음 단계 진행

**3단계: 전략 (Strategy)**
- 검토 + 진단 결과 기반으로 AI가 전략 제안
- 성장 전략, 자원 배분, 재무 전망, 실행 계획, 리스크 관리
- 사용자가 전략을 확인하고 확정 → 다음 단계 진행

**4단계: 보고서 (Report)**
- 검토 + 진단 + 전략 결과를 종합한 최종 보고서 생성
- 경영 요약(executive summary) 포함
- **내보내기 옵션**: 인쇄하기 (새 창 → 브라우저 인쇄) / Word 문서 (.doc) 다운로드
- AI 생성 콘텐츠는 **마크다운 렌더링**으로 서식이 적용된 형태로 표시

**공통 기능:**
- 모든 단계에서 재실행 가능 (AI 재분석)
- 확정 취소 가능 (이전 단계로 되돌리기)
- AI 생성 콘텐츠는 `marked` 라이브러리로 마크다운 렌더링 (`MarkdownContent` 공통 컴포넌트)

**API 엔드포인트:**
```
POST   /api/projects/{id}/review                  # 사업계획서 저장/수정
POST   /api/projects/{id}/review/analyze           # AI 검토 실행 (SSE)
POST   /api/projects/{id}/review/confirm           # 검토 확정
POST   /api/projects/{id}/review/cancel-confirm    # 검토 확정 취소
POST   /api/projects/{id}/diagnosis/analyze        # AI 진단 실행 (SSE)
POST   /api/projects/{id}/diagnosis/confirm        # 진단 확정
POST   /api/projects/{id}/diagnosis/cancel-confirm # 진단 확정 취소
POST   /api/projects/{id}/strategy/generate        # AI 전략 생성 (SSE)
POST   /api/projects/{id}/strategy/confirm         # 전략 확정
POST   /api/projects/{id}/strategy/cancel-confirm  # 전략 확정 취소
POST   /api/projects/{id}/report/generate          # 보고서 생성 (SSE)
```

**데이터 모델:** `bi_business_reviews` 테이블 (아래 섹션 3.2 참조)

---

## 3. 데이터 모델

### 3.1 ERD (승인 게이트 포함)

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│      bi_users       │     │     bi_projects     │     │    bi_idea_cards    │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │──┐  │ id (PK)             │──┐  │ id (PK)             │
│ email               │  │  │ user_id (FK)        │◀─┘  │ project_id (FK)     │◀─┐
│ name                │  │  │ name                │     │ raw_input           │  │
│ role                │  └─▶│ status              │     │ problem             │  │
│ locale              │     │ current_stage       │     │ solution            │  │
│ theme               │     │ current_gate        │←NEW │ target              │  │
│ created_at          │     │ mentor_required     │←NEW │ differentiation     │  │
│ updated_at          │     │ created_at          │     │ ai_expanded JSONB   │  │
└─────────────────────┘     │ updated_at          │     │ is_confirmed        │←NEW
                            └─────────────────────┘     │ confirmed_at        │←NEW
                                   │                    │ created_at          │  │
                                   │                    └─────────────────────┘  │
                                   ▼                                             │
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐ │
│   bi_evaluations    │     │    bi_documents     │     │    bi_feedbacks     │ │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤ │
│ id (PK)             │     │ id (PK)             │     │ id (PK)             │ │
│ project_id (FK)     │◀────│ project_id (FK)     │◀────│ project_id (FK)     │◀┘
│ investor_score      │     │ type                │     │ user_id (FK)        │
│ investor_feedback   │     │ title               │     │ stage               │
│ market_score        │     │ content             │     │ gate                │←NEW
│ market_feedback     │     │ storage_path        │     │ comment             │
│ tech_score          │     │ file_name           │     │ created_at          │
│ tech_feedback       │     │ is_confirmed        │←NEW └─────────────────────┘
│ total_score         │     │ confirmed_at        │←NEW
│ recommendations     │     │ revision_requests   │←NEW
│ debate_log JSONB    │←NEW │ created_at          │
│ is_confirmed        │←NEW └─────────────────────┘
│ confirmed_at        │←NEW
│ created_at          │               ┌─────────────────────┐
└─────────────────────┘               │   bi_approvals      │←NEW 테이블
                                      ├─────────────────────┤
                                      │ id (PK)             │
                                      │ project_id (FK)     │
                                      │ gate                │ (1,2,3,4)
                                      │ requested_by (FK)   │
                                      │ approved_by (FK)    │
                                      │ status              │
                                      │ comment             │
                                      │ created_at          │
                                      │ approved_at         │
                                      └─────────────────────┘
```

### 3.2 테이블 정의 (승인 게이트 지원)

```sql
-- =====================================================
-- CASA 데이터베이스 스키마 (bi_ 접두사, 승인 게이트 포함)
-- =====================================================

-- 사용자 테이블 (Supabase Auth 연동)
CREATE TABLE bi_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'mentor', 'admin')),
  locale TEXT DEFAULT 'ko' CHECK (locale IN ('ko', 'en', 'ja', 'zh')),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  -- 멘토 프로필 확장 (F9)
  expertise_tags JSONB DEFAULT '[]'::jsonb,  -- 전문 분야 태그
  industry_tags JSONB DEFAULT '[]'::jsonb,   -- 산업 태그
  bio TEXT,                                   -- 경력 요약
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 프로젝트 테이블 (승인 게이트 상태 추적)
CREATE TABLE bi_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project_type TEXT DEFAULT 'pre_startup' CHECK (project_type IN ('pre_startup', 'startup')),  -- 트랙 구분 (F10)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  current_stage TEXT DEFAULT 'idea' CHECK (current_stage IN ('idea', 'evaluation', 'document', 'deploy', 'done')),
  -- 승인 게이트 추적
  current_gate TEXT DEFAULT 'gate_1' CHECK (current_gate IN ('gate_1', 'gate_2', 'gate_3', 'gate_4', 'completed')),
  gate_1_passed_at TIMESTAMPTZ,  -- 아이디어 확정
  gate_2_passed_at TIMESTAMPTZ,  -- 평가 승인
  gate_3_passed_at TIMESTAMPTZ,  -- 문서 확정
  gate_4_passed_at TIMESTAMPTZ,  -- 최종 배포 승인
  -- 멘토 승인 설정
  mentor_approval_required BOOLEAN DEFAULT false,
  assigned_mentor_id UUID REFERENCES bi_users(id),
  -- 공개 프로필 (F8)
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'summary', 'private')),
  industry_tags JSONB DEFAULT '[]'::jsonb,  -- 산업 분류 태그
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 아이디어 카드 테이블 (확정 상태 추적)
CREATE TABLE bi_idea_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  target TEXT,
  differentiation TEXT,
  ai_expanded JSONB,
  ai_model_used TEXT DEFAULT 'claude',  -- 사용된 AI 모델
  -- 확정 상태 (Gate 1)
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  revision_count INTEGER DEFAULT 0,  -- 수정 횟수
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 평가 결과 테이블 (멀티 AI 토론 로그 포함)
CREATE TABLE bi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  -- 투자심사역 평가
  investor_score INTEGER CHECK (investor_score BETWEEN 0 AND 100),
  investor_feedback TEXT,
  investor_ai_model TEXT DEFAULT 'claude',
  -- 시장분석가 평가
  market_score INTEGER CHECK (market_score BETWEEN 0 AND 100),
  market_feedback TEXT,
  market_ai_model TEXT DEFAULT 'claude',
  -- 기술전문가 평가
  tech_score INTEGER CHECK (tech_score BETWEEN 0 AND 100),
  tech_feedback TEXT,
  tech_ai_model TEXT DEFAULT 'claude',
  -- 종합 평가
  total_score INTEGER CHECK (total_score BETWEEN 0 AND 100),
  recommendations JSONB,
  -- 멀티 에이전트 토론 로그 (확장 모드)
  debate_enabled BOOLEAN DEFAULT false,
  debate_rounds INTEGER DEFAULT 0,
  debate_log JSONB,  -- [{round: 1, agent: 'investor', response: '...', rebuttal_to: 'market'}, ...]
  -- 확정 상태 (Gate 2)
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  dispute_comment TEXT,  -- 이의 제기 내용
  reevaluation_count INTEGER DEFAULT 0,  -- 재평가 횟수
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 문서 테이블 (확정 및 수정 요청 추적)
CREATE TABLE bi_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('business_plan', 'pitch', 'landing', 'gtm_checklist', 'ppt', 'leaflet', 'infographic')),
  title TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  file_name TEXT,
  ai_model_used TEXT DEFAULT 'claude',
  -- 확정 상태 (Gate 3)
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  -- 수정 요청 이력
  revision_requests JSONB,  -- [{section: '3.2', instruction: '...', created_at: '...', resolved: true}, ...]
  revision_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 피드백 테이블 (게이트별 피드백)
CREATE TABLE bi_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('idea', 'evaluation', 'document', 'deploy')),
  gate TEXT CHECK (gate IN ('gate_1', 'gate_2', 'gate_3', 'gate_4')),  -- 어느 게이트에서의 피드백인지
  feedback_type TEXT DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'approval', 'rejection', 'revision_request')),
  comment TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,  -- 피드백 반영 완료 여부
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 승인 이력 테이블 (NEW - 모든 게이트 승인 추적)
CREATE TABLE bi_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  gate TEXT NOT NULL CHECK (gate IN ('gate_1', 'gate_2', 'gate_3', 'gate_4')),
  -- 승인 요청
  requested_by UUID NOT NULL REFERENCES bi_users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  request_comment TEXT,
  -- 승인 처리
  approved_by UUID REFERENCES bi_users(id),
  approved_at TIMESTAMPTZ,
  approval_comment TEXT,
  -- 상태
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  -- 거부/수정요청 시
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 창업자 트랙 테이블 (F10)
-- =====================================================

-- 비즈니스 리뷰 테이블 (창업자 트랙 전용)
CREATE TABLE bi_business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  -- 1단계: 사업계획서 입력 + AI 검토
  business_plan_text TEXT,            -- 사업계획서 텍스트 (직접 입력 또는 PDF 추출)
  company_name TEXT,
  industry TEXT,
  founded_year INTEGER,
  employee_count INTEGER,
  annual_revenue TEXT,
  funding_stage TEXT,
  ai_review JSONB,                     -- AI 검토 결과
  review_score INTEGER,                -- AI 검토 점수
  swot_analysis JSONB,                 -- SWOT 분석 결과
  is_review_confirmed BOOLEAN DEFAULT false,
  review_confirmed_at TIMESTAMPTZ,
  -- 2단계: 진단
  diagnosis_result JSONB,              -- AI 진단 결과
  is_diagnosis_confirmed BOOLEAN DEFAULT false,
  diagnosis_confirmed_at TIMESTAMPTZ,
  -- 3단계: 전략
  strategy_result JSONB,               -- AI 전략 제안
  action_items JSONB,                  -- 실행 항목
  is_strategy_confirmed BOOLEAN DEFAULT false,
  strategy_confirmed_at TIMESTAMPTZ,
  -- 4단계: 보고서
  report_content TEXT,                 -- 종합 보고서 (Markdown)
  executive_summary TEXT,              -- 경영 요약
  -- 메타
  ai_model_used TEXT DEFAULT 'claude',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bi_business_reviews_project_id ON bi_business_reviews(project_id);

-- =====================================================
-- 프롬프트 관리 테이블
-- =====================================================

CREATE TABLE bi_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 프롬프트 식별
  key TEXT NOT NULL UNIQUE,  -- 예: 'idea_expansion', 'evaluation_investor', 'business_plan'
  name TEXT NOT NULL,        -- 관리자 UI용 표시명
  description TEXT,          -- 프롬프트 용도 설명
  category TEXT NOT NULL CHECK (category IN ('ideation', 'evaluation', 'document', 'marketing')),
  -- 프롬프트 내용
  system_prompt TEXT NOT NULL,   -- 시스템 프롬프트
  user_prompt_template TEXT NOT NULL,  -- 사용자 프롬프트 템플릿 (변수: {{variable}})
  -- AI 설정
  model TEXT DEFAULT 'claude-3-5-sonnet',  -- 사용할 모델
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  -- 버전 관리
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  -- 메타
  created_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES bi_users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bi_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES bi_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  -- 스냅샷
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature DECIMAL(2,1),
  max_tokens INTEGER,
  -- 변경 정보
  change_note TEXT,           -- 변경 사유
  changed_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- 성과 추적
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(2,1),    -- 사용자 평점 (선택적)
  UNIQUE(prompt_id, version)
);

CREATE TABLE bi_prompt_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES bi_prompts(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,   -- 예: 'user_input', 'project_name'
  description TEXT,              -- 변수 설명
  is_required BOOLEAN DEFAULT true,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prompt_id, variable_name)
);

-- =====================================================
-- 인덱스 (WHERE, JOIN, ORDER BY 컬럼에 필수)
-- =====================================================

CREATE INDEX idx_bi_projects_user_id ON bi_projects(user_id);
CREATE INDEX idx_bi_projects_status ON bi_projects(status);
CREATE INDEX idx_bi_projects_current_gate ON bi_projects(current_gate);
CREATE INDEX idx_bi_projects_created_at ON bi_projects(created_at DESC);
CREATE INDEX idx_bi_idea_cards_project_id ON bi_idea_cards(project_id);
CREATE INDEX idx_bi_idea_cards_confirmed ON bi_idea_cards(is_confirmed);
CREATE INDEX idx_bi_evaluations_project_id ON bi_evaluations(project_id);
CREATE INDEX idx_bi_evaluations_confirmed ON bi_evaluations(is_confirmed);
CREATE INDEX idx_bi_documents_project_id ON bi_documents(project_id);
CREATE INDEX idx_bi_documents_type ON bi_documents(type);
CREATE INDEX idx_bi_documents_confirmed ON bi_documents(is_confirmed);
CREATE INDEX idx_bi_feedbacks_project_id ON bi_feedbacks(project_id);
CREATE INDEX idx_bi_feedbacks_gate ON bi_feedbacks(gate);
CREATE INDEX idx_bi_feedbacks_created_at ON bi_feedbacks(created_at DESC);
CREATE INDEX idx_bi_approvals_project_id ON bi_approvals(project_id);
CREATE INDEX idx_bi_approvals_gate ON bi_approvals(gate);
CREATE INDEX idx_bi_approvals_status ON bi_approvals(status);
CREATE INDEX idx_bi_prompts_key ON bi_prompts(key);
CREATE INDEX idx_bi_prompts_category ON bi_prompts(category);
CREATE INDEX idx_bi_prompts_is_active ON bi_prompts(is_active);
CREATE INDEX idx_bi_prompt_versions_prompt_id ON bi_prompt_versions(prompt_id);
CREATE INDEX idx_bi_prompt_versions_version ON bi_prompt_versions(prompt_id, version DESC);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

ALTER TABLE bi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_idea_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompt_variables ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근
CREATE POLICY "Users manage own data" ON bi_users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own projects" ON bi_projects
  FOR ALL USING (auth.uid() = user_id);

-- 멘토는 담당 프로젝트 접근 가능
CREATE POLICY "Mentors access assigned projects" ON bi_projects
  FOR SELECT USING (assigned_mentor_id = auth.uid());

CREATE POLICY "Users access own project data" ON bi_idea_cards
  FOR ALL USING (project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own evaluations" ON bi_evaluations
  FOR ALL USING (project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own documents" ON bi_documents
  FOR ALL USING (project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid()));

-- 멘토/관리자는 모든 프로젝트에 피드백 가능
CREATE POLICY "Mentors can give feedback" ON bi_feedbacks
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM bi_users WHERE role IN ('mentor', 'admin'))
  );

-- 사용자는 자신의 프로젝트 피드백 읽기 가능
CREATE POLICY "Users read own project feedbacks" ON bi_feedbacks
  FOR SELECT USING (project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid()));

-- 멘토/관리자는 자신이 작성한 피드백 읽기 가능
CREATE POLICY "Mentors read own feedbacks" ON bi_feedbacks
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- bi_approvals 테이블 RLS 정책
-- =====================================================

-- 사용자는 자신의 프로젝트 승인 요청 생성 가능
CREATE POLICY "Users create approval requests" ON bi_approvals
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid())
  );

-- 사용자는 자신의 프로젝트 승인 내역 조회 가능
CREATE POLICY "Users read own project approvals" ON bi_approvals
  FOR SELECT USING (
    project_id IN (SELECT id FROM bi_projects WHERE user_id = auth.uid())
  );

-- 멘토는 담당 프로젝트 승인 내역 조회 가능
CREATE POLICY "Mentors read assigned project approvals" ON bi_approvals
  FOR SELECT USING (
    project_id IN (SELECT id FROM bi_projects WHERE assigned_mentor_id = auth.uid())
  );

-- 멘토/관리자는 승인 처리 가능
CREATE POLICY "Mentors can process approvals" ON bi_approvals
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM bi_users WHERE role IN ('mentor', 'admin'))
  ) WITH CHECK (
    approved_by = auth.uid()
  );

-- =====================================================
-- bi_prompts 테이블 RLS 정책
-- =====================================================

-- 모든 인증된 사용자는 활성 프롬프트 읽기 가능 (AI 기능 사용 위해)
CREATE POLICY "Authenticated users read active prompts" ON bi_prompts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- 관리자만 프롬프트 생성/수정/삭제 가능
CREATE POLICY "Admins manage prompts" ON bi_prompts
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM bi_users WHERE role = 'admin')
  );

-- 모든 인증된 사용자는 프롬프트 버전 이력 조회 가능
CREATE POLICY "Authenticated users read prompt versions" ON bi_prompt_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 관리자만 프롬프트 버전 관리 가능
CREATE POLICY "Admins manage prompt versions" ON bi_prompt_versions
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM bi_users WHERE role = 'admin')
  );

-- 프롬프트 변수도 동일한 정책
CREATE POLICY "Authenticated users read prompt variables" ON bi_prompt_variables
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage prompt variables" ON bi_prompt_variables
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM bi_users WHERE role = 'admin')
  );
```

---

## 4. API 설계

### 4.1 API 엔드포인트 목록

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| **Projects** |
| GET | `/api/projects` | 내 프로젝트 목록 (페이지네이션) | 필수 |
| POST | `/api/projects` | 프로젝트 생성 | 필수 |
| GET | `/api/projects/{id}` | 프로젝트 상세 | 소유자 |
| PATCH | `/api/projects/{id}` | 프로젝트 수정 | 소유자 |
| DELETE | `/api/projects/{id}` | 프로젝트 삭제 | 소유자 |
| **Idea** |
| POST | `/api/projects/{id}/idea` | 아이디어 입력 | 소유자 |
| POST | `/api/projects/{id}/idea/expand` | AI 확장 (SSE) | 소유자 |
| **Evaluation** |
| POST | `/api/projects/{id}/evaluate` | 평가 시작 (SSE) | 소유자 |
| GET | `/api/projects/{id}/evaluation` | 평가 결과 조회 | 소유자 |
| **Documents** |
| POST | `/api/projects/{id}/documents/business-plan` | 사업계획서 생성 (SSE) | 소유자 |
| POST | `/api/projects/{id}/documents/pitch` | 요약 피치 생성 | 소유자 |
| POST | `/api/projects/{id}/documents/landing` | 랜딩페이지 생성 | 소유자 |
| GET | `/api/projects/{id}/documents` | 문서 목록 | 소유자 |
| GET | `/api/projects/{id}/documents/{docId}/download` | 다운로드 | 소유자 |
| **Feedback** |
| POST | `/api/projects/{id}/feedbacks` | 피드백 작성 | 멘토/관리자 |
| GET | `/api/projects/{id}/feedbacks` | 피드백 목록 | 소유자 |
| **Approvals (승인 워크플로우)** |
| POST | `/api/projects/{id}/approvals` | 승인 요청 생성 | 소유자 |
| GET | `/api/projects/{id}/approvals` | 승인 내역 조회 | 소유자/멘토 |
| POST | `/api/projects/{id}/approvals/{approvalId}/approve` | 승인 처리 | 멘토/관리자 |
| POST | `/api/projects/{id}/approvals/{approvalId}/reject` | 반려 처리 | 멘토/관리자 |
| POST | `/api/projects/{id}/approvals/{approvalId}/revision` | 수정 요청 | 멘토/관리자 |
| POST | `/api/projects/{id}/gates/{gate}/pass` | 게이트 통과 (자가 승인) | 소유자 |
| **User** |
| PATCH | `/api/user/preferences` | 테마/언어 설정 | 필수 |
| **Prompts (관리자 전용)** |
| GET | `/api/admin/prompts` | 프롬프트 목록 | 관리자 |
| POST | `/api/admin/prompts` | 프롬프트 생성 | 관리자 |
| GET | `/api/admin/prompts/{id}` | 프롬프트 상세 | 관리자 |
| PATCH | `/api/admin/prompts/{id}` | 프롬프트 수정 | 관리자 |
| DELETE | `/api/admin/prompts/{id}` | 프롬프트 삭제 | 관리자 |
| GET | `/api/admin/prompts/{id}/versions` | 버전 이력 조회 | 관리자 |
| POST | `/api/admin/prompts/{id}/rollback/{version}` | 특정 버전으로 롤백 | 관리자 |
| POST | `/api/admin/prompts/{id}/test` | 프롬프트 테스트 실행 | 관리자 |
| POST | `/api/admin/prompts/sync-cache` | 캐시 강제 동기화 | 관리자 |

### 4.2 API 응답 형식

```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// 에러 응답
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// 페이지네이션 응답 (COMMON.md 기준)
interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// SSE 이벤트 형식 (COMMON.md 기준)
interface SSEEvent {
  phase: 'prepare' | 'processing' | 'saving' | 'done' | 'error';
  message: string;
  progress: number;  // 0-100
  data?: unknown;
}
```

### 4.3 API 헬퍼 함수 (COMMON.md 적용)

```typescript
// lib/utils/api-response.ts
import { NextResponse } from 'next/server';

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
```

### 4.4 Zod 스키마 (입력 검증 필수)

```typescript
import { z } from 'zod';

// 프로젝트 생성
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

// 아이디어 입력
export const IdeaInputSchema = z.object({
  raw_input: z.string().min(50).max(5000),
});

// 구조화된 아이디어
export const IdeaCardSchema = z.object({
  problem: z.string().max(1000),
  solution: z.string().max(1000),
  target: z.string().max(500),
  differentiation: z.string().max(500),
});

// 피드백
export const FeedbackSchema = z.object({
  stage: z.enum(['idea', 'evaluation', 'document']),
  comment: z.string().min(10).max(2000),
});

// 사용자 설정
export const UserPreferencesSchema = z.object({
  locale: z.enum(['ko', 'en', 'ja', 'zh']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

// 페이지네이션 파라미터
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
```

### 4.5 SSE 스트리밍 패턴 (COMMON.md 적용)

```typescript
// lib/utils/sse.ts

export function createSSEStream(
  handler: (send: (data: SSEEvent) => void) => Promise<void>
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: SSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        await handler(send);
      } catch (err) {
        send({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
          progress: 0
        });
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
}

// 사용 예시
export async function POST(request: NextRequest) {
  // 1단계: 스트리밍 전에 검증 (JSON 에러 반환)
  try {
    const user = await requireOwner(projectId);
    const body = await request.json();
    const parsed = IdeaInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message);
    }
  } catch (err) {
    return errorResponse(err.message, err.status);
  }

  // 2단계: 검증 통과 후 스트리밍 시작
  return createSSEStream(async (send) => {
    send({ phase: 'prepare', message: '준비 중...', progress: 5 });
    // ... AI 작업 수행 ...
    send({ phase: 'done', message: '완료!', progress: 100 });
  });
}
```

---

## 5. 기술 아키텍처

### 5.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 15 (App Router)                   │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│   │
│  │  │  Landing  │  │ Dashboard │  │  Project  │  │  Document ││   │
│  │  │(14섹션)   │  │   Page    │  │   Page    │  │  Preview  ││   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘│   │
│  │        Tailwind CSS + shadcn/ui + next-themes + next-intl   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           API Layer                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API Routes                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│   │
│  │  │  /api/    │  │  /api/    │  │  /api/    │  │  /api/    ││   │
│  │  │ projects  │  │   idea    │  │ evaluate  │  │ documents ││   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘│   │
│  │          Zod Validation + Auth Guard + i18n Middleware       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    Supabase         │  │   Claude API        │  │   Vercel Blob       │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │  PostgreSQL   │  │  │  │  Claude 3.5   │  │  │  │   Document    │  │
│  │  + RLS        │  │  │  │   Sonnet      │  │  │  │   Storage     │  │
│  ├───────────────┤  │  │  └───────────────┘  │  │  └───────────────┘  │
│  │  Auth         │  │  │                     │  │                     │
│  ├───────────────┤  │  │  • 아이디어 확장    │  │  • PDF 저장         │
│  │  Storage      │  │  │  • 다면 평가       │  │  • HTML 저장        │
│  └───────────────┘  │  │  • 문서 생성       │  │  • Signed URL       │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### 5.2 기술 스택

| 레이어 | 기술 | 선정 이유 |
|--------|------|-----------|
| **Frontend** | Next.js 15, Tailwind CSS, shadcn/ui | App Router SSR, 빠른 UI 개발 |
| **테마** | next-themes | 다크모드 시스템 연동, SSR 깜빡임 방지 |
| **다국어** | next-intl | App Router 호환, 타입 안전 |
| **Backend** | Next.js API Routes | 풀스택 통합, Vercel 최적화 |
| **Database** | Supabase PostgreSQL | RLS, 실시간 구독, 무료 티어 |
| **Auth** | Supabase Auth | OAuth 지원, 세션 관리 |
| **AI** | Claude 3.5 Sonnet API | 한국어 우수, 긴 컨텍스트 |
| **Cache** | Upstash Redis | 프롬프트 캐싱, Vercel Edge 호환 |
| **Storage** | Supabase Storage / Vercel Blob | 문서 저장, Signed URL |
| **Deployment** | Vercel | Edge 배포, SSE 지원 |

### 5.3 폴더 구조 (COMMON.md 기준)

```
src/
├── app/
│   ├── [locale]/                 # 다국어 라우팅
│   │   ├── (public)/             # 비인증 페이지
│   │   │   ├── page.tsx          # 랜딩 페이지
│   │   │   ├── login/page.tsx    # 로그인
│   │   │   └── signup/page.tsx   # 회원가입
│   │   ├── dashboard/            # 인증 필요 페이지
│   │   │   ├── page.tsx          # 대시보드 메인
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx      # 프로젝트 목록
│   │   │   │   ├── new/page.tsx  # 새 프로젝트
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # 프로젝트 상세
│   │   │   │       ├── idea/page.tsx
│   │   │   │       ├── evaluation/page.tsx
│   │   │   │       └── documents/page.tsx  # PDF/Word 다운로드 지원
│   │   │   └── layout.tsx        # 대시보드 레이아웃
│   │   └── layout.tsx            # 로케일 레이아웃
│   ├── api/
│   │   ├── projects/
│   │   │   ├── route.ts          # GET, POST /api/projects
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET, PATCH, DELETE
│   │   │       ├── idea/
│   │   │       │   ├── route.ts
│   │   │       │   └── expand/route.ts  # SSE
│   │   │       ├── evaluate/route.ts    # SSE
│   │   │       ├── evaluation/route.ts
│   │   │       ├── documents/
│   │   │       │   ├── route.ts
│   │   │       │   ├── business-plan/route.ts  # SSE
│   │   │       │   ├── pitch/route.ts
│   │   │       │   ├── landing/route.ts
│   │   │       │   └── [docId]/download/route.ts
│   │   │       └── feedbacks/route.ts
│   │   ├── user/
│   │   │   └── preferences/route.ts  # 테마/언어 설정
│   │   ├── admin/                 # 관리자 전용 API
│   │   │   └── prompts/
│   │   │       ├── route.ts       # GET, POST /api/admin/prompts
│   │   │       ├── sync-cache/route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts   # GET, PATCH, DELETE
│   │   │           ├── versions/route.ts
│   │   │           ├── test/route.ts
│   │   │           └── rollback/[version]/route.ts
│   │   └── webhooks/             # 외부 웹훅 (향후)
│   └── layout.tsx                # 루트 레이아웃
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── ConfirmModal.tsx          # 삭제 확인 (window.confirm 금지)
│   ├── LoadingSpinner.tsx        # 모든 비동기 작업 로딩
│   ├── EmptyState.tsx            # 데이터 없을 때
│   ├── ErrorMessage.tsx          # 에러 표시 (재시도 포함)
│   ├── Pagination.tsx            # 모든 목록에 사용
│   ├── ProgressBar.tsx           # SSE 진행률
│   ├── ThemeToggle.tsx           # 다크모드 토글
│   ├── LocaleSelector.tsx        # 언어 선택
│   └── MobileDrawer.tsx          # 모바일 사이드바
├── features/
│   ├── landing/                 # 랜딩(홍보) 페이지 전용
│   │   ├── components/
│   │   │   ├── LandingNav.tsx       # 1. 네비게이션 (sticky, 모바일 Sheet)
│   │   │   ├── HeroSection.tsx      # 2. 히어로 (100dvh, 대시보드 목업)
│   │   │   ├── ProblemSection.tsx    # 3. 문제 제기 (3단 카드)
│   │   │   ├── SolutionOverview.tsx  # 4. 솔루션 (4단계 플로우)
│   │   │   ├── FeatureSection.tsx    # 5. 핵심 기능 (지그재그)
│   │   │   ├── AITechSection.tsx     # 6. AI 차별화 (다크 배경)
│   │   │   ├── StatsSection.tsx      # 7. 숫자 성과 (카운트업)
│   │   │   ├── CaseStudySection.tsx  # 8. Before/After (Tabs)
│   │   │   ├── TestimonialSection.tsx # 9. 사용자 후기 (캐러셀)
│   │   │   ├── ProcessSection.tsx    # 10. 이용 프로세스 (타임라인)
│   │   │   ├── PartnerSection.tsx    # 11. 파트너 (로고 그리드)
│   │   │   ├── FAQSection.tsx        # 12. FAQ (Accordion)
│   │   │   ├── FinalCTASection.tsx   # 13. 최종 CTA
│   │   │   └── LandingFooter.tsx     # 14. 푸터
│   │   └── hooks/
│   │       ├── useScrollAnimation.ts # IntersectionObserver 기반
│   │       └── useCountUp.ts         # 숫자 카운트업 애니메이션
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   └── ProjectForm.tsx
│   ├── idea/
│   │   ├── IdeaInput.tsx
│   │   └── IdeaCard.tsx
│   ├── evaluation/
│   │   ├── EvaluationProgress.tsx
│   │   └── EvaluationResult.tsx
│   └── documents/
│       ├── DocumentList.tsx
│       └── DocumentPreview.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   ├── server.ts             # 서버 컴포넌트용
│   │   └── service.ts            # Service Role 클라이언트
│   ├── redis.ts                  # Upstash Redis 클라이언트
│   ├── prompts/
│   │   ├── prompt-engine.ts      # PromptEngine (DB 기반, 캐싱)
│   │   └── version-manager.ts    # 버전 관리/롤백
│   ├── ai/
│   │   ├── claude.ts             # Claude API 래퍼
│   │   ├── orchestrator.ts       # 멀티 AI 오케스트레이션
│   │   └── personas.ts           # AI 페르소나 설정
│   ├── auth/
│   │   ├── guards.ts             # requireAuth, requireOwner
│   │   └── session.ts
│   └── utils/
│       ├── api-response.ts       # successResponse, errorResponse
│       ├── sse.ts                # SSE 헬퍼
│       └── language.ts           # 언어 감지 유틸
├── hooks/
│   ├── useProjects.ts
│   ├── useSSE.ts
│   ├── useAuth.ts
│   └── useLocale.ts
├── i18n/
│   ├── config.ts                 # 지원 언어 설정
│   ├── request.ts                # 서버 컴포넌트용
│   └── messages/
│       ├── ko.json
│       ├── en.json
│       ├── ja.json
│       └── zh.json
├── types/
│   ├── database.ts               # Supabase 타입
│   ├── api.ts
│   └── ai.ts
└── config/
    └── constants.ts
```

---

## 6. 프롬프트 관리 시스템

### 6.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                      프롬프트 관리 시스템                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   Admin UI  │───▶│  Prompts DB │◀───│ Redis Cache │             │
│  │ (관리자 편집)│    │ (bi_prompts)│    │  (TTL 5분)  │             │
│  └─────────────┘    └──────┬──────┘    └──────▲──────┘             │
│                            │                   │                    │
│                            ▼                   │                    │
│                    ┌───────────────┐           │                    │
│                    │ Prompt Engine │───────────┘                    │
│                    │ • 변수 치환   │                                │
│                    │ • 캐싱 관리   │                                │
│                    │ • 버전 추적   │                                │
│                    └───────┬───────┘                                │
│                            │                                        │
│                            ▼                                        │
│                    ┌───────────────┐                                │
│                    │   AI APIs     │                                │
│                    │ Claude/GPT/   │                                │
│                    │ Gemini        │                                │
│                    └───────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 프롬프트 템플릿 변수 문법

```
변수 문법: {{variable_name}}

예시:
- {{user_input}}      : 사용자 원본 입력
- {{project_name}}    : 프로젝트 이름
- {{idea_summary}}    : 아이디어 요약
- {{evaluation_data}} : 평가 결과 JSON
- {{locale}}          : 현재 언어 (ko, en, ja, zh)
- {{current_date}}    : 현재 날짜
```

### 6.3 프롬프트 엔진 구현

```typescript
// lib/prompts/prompt-engine.ts
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';

interface PromptTemplate {
  key: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

const CACHE_TTL = 300; // 5분

export class PromptEngine {
  private static instance: PromptEngine;

  static getInstance(): PromptEngine {
    if (!PromptEngine.instance) {
      PromptEngine.instance = new PromptEngine();
    }
    return PromptEngine.instance;
  }

  // 프롬프트 조회 (캐시 우선)
  async getPrompt(key: string): Promise<PromptTemplate | null> {
    // 1. Redis 캐시 확인
    const cached = await redis.get(`prompt:${key}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. DB 조회
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bi_prompts')
      .select('key, system_prompt, user_prompt_template, model, temperature, max_tokens')
      .eq('key', key)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // 3. 캐시 저장
    await redis.setex(`prompt:${key}`, CACHE_TTL, JSON.stringify(data));

    return data;
  }

  // 변수 치환
  renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  // 프롬프트 실행 준비
  async prepare(
    key: string,
    variables: Record<string, string>
  ): Promise<{
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
  } | null> {
    const prompt = await this.getPrompt(key);
    if (!prompt) return null;

    return {
      systemPrompt: this.renderTemplate(prompt.system_prompt, variables),
      userPrompt: this.renderTemplate(prompt.user_prompt_template, variables),
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.max_tokens,
    };
  }

  // 캐시 무효화 (프롬프트 수정 시 호출)
  async invalidateCache(key: string): Promise<void> {
    await redis.del(`prompt:${key}`);
  }

  // 전체 캐시 무효화
  async invalidateAllCache(): Promise<void> {
    const keys = await redis.keys('prompt:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const promptEngine = PromptEngine.getInstance();
```

### 6.4 기본 프롬프트 시드 데이터

```sql
-- 기본 프롬프트 데이터 삽입
INSERT INTO bi_prompts (key, name, description, category, system_prompt, user_prompt_template, model, temperature, max_tokens) VALUES

-- 아이디어 확장
('idea_expansion', '아이디어 확장', '사용자 아이디어를 구체화하고 확장합니다', 'ideation',
'당신은 스타트업 아이디어 전문가입니다. 사용자의 아이디어를 분석하고 구체화하여 사업 가능성을 높이는 방향으로 확장해주세요.

응답 형식:
1. 핵심 아이디어 요약
2. 타겟 고객 정의
3. 해결하는 문제
4. 제안하는 솔루션
5. 차별화 포인트
6. 확장 아이디어 3가지',
'아이디어: {{user_input}}

위 아이디어를 분석하고 확장해주세요. 응답은 {{locale}} 언어로 작성해주세요.',
'claude-3-5-sonnet', 0.7, 4000),

-- 투자자 관점 평가
('evaluation_investor', '투자자 관점 평가', '투자자 시각에서 사업성을 평가합니다', 'evaluation',
'당신은 경험이 풍부한 벤처 투자자입니다. 10년간 100개 이상의 스타트업에 투자한 경험을 바탕으로 냉정하고 객관적으로 평가해주세요.

평가 기준:
- 시장 규모 및 성장성 (TAM/SAM/SOM)
- 팀 역량 및 실행력
- 제품/서비스 차별성
- 비즈니스 모델 지속가능성
- 투자 매력도 (1-10점)',
'평가 대상 아이디어:
{{idea_summary}}

투자자 관점에서 이 아이디어를 평가해주세요. 점수와 함께 구체적인 피드백을 제공해주세요.
응답 언어: {{locale}}',
'claude-3-5-sonnet', 0.5, 3000),

-- 시장 분석가 관점 평가
('evaluation_market', '시장 분석가 관점 평가', '시장 데이터 기반으로 사업성을 평가합니다', 'evaluation',
'당신은 시장 조사 전문 분석가입니다. 데이터와 트렌드를 기반으로 시장 진입 가능성을 분석해주세요.

분석 항목:
- 시장 현황 및 규모
- 경쟁 환경 분석
- 진입 장벽
- 성장 기회
- 리스크 요인',
'분석 대상:
{{idea_summary}}

시장 분석가 관점에서 이 아이디어의 시장성을 분석해주세요.
응답 언어: {{locale}}',
'claude-3-5-sonnet', 0.5, 3000),

-- 기술 전문가 관점 평가
('evaluation_tech', '기술 전문가 관점 평가', '기술적 구현 가능성을 평가합니다', 'evaluation',
'당신은 10년 경력의 풀스택 개발자이자 기술 컨설턴트입니다. 기술적 관점에서 구현 가능성과 확장성을 평가해주세요.

평가 항목:
- 기술적 구현 난이도
- 필요 기술 스택
- 확장성 및 유지보수성
- MVP 개발 예상 범위
- 기술적 리스크',
'평가 대상:
{{idea_summary}}

기술 전문가 관점에서 이 아이디어의 구현 가능성을 평가해주세요.
응답 언어: {{locale}}',
'claude-3-5-sonnet', 0.5, 3000),

-- 사업계획서 생성
('business_plan', '사업계획서 생성', 'IR용 사업계획서를 생성합니다', 'document',
'당신은 스타트업 사업계획서 전문 작성자입니다. 투자자에게 어필할 수 있는 체계적이고 설득력 있는 사업계획서를 작성해주세요.

사업계획서 구성:
1. Executive Summary
2. 문제 정의
3. 솔루션
4. 시장 분석
5. 비즈니스 모델
6. 경쟁 분석
7. 마케팅 전략
8. 팀 구성
9. 재무 계획
10. 마일스톤',
'프로젝트명: {{project_name}}
아이디어 요약: {{idea_summary}}
평가 결과: {{evaluation_data}}

위 정보를 바탕으로 투자자용 사업계획서를 작성해주세요.
응답 언어: {{locale}}',
'claude-3-5-sonnet', 0.6, 8000),

-- 요약 피치
('pitch_summary', '요약 피치', '엘리베이터 피치용 요약을 생성합니다', 'document',
'당신은 스타트업 피칭 전문가입니다. 30초 안에 투자자의 관심을 끌 수 있는 강렬한 피치를 작성해주세요.',
'프로젝트명: {{project_name}}
아이디어 요약: {{idea_summary}}

위 정보를 바탕으로:
1. 한 줄 소개 (20자 이내)
2. 엘리베이터 피치 (100자 이내)
3. 핵심 가치 제안 3가지

를 작성해주세요. 응답 언어: {{locale}}',
'claude-3-5-sonnet', 0.7, 1500);
```

### 6.5 관리자 프롬프트 편집 UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔧 프롬프트 관리                                    [+ 새 프롬프트]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  카테고리 필터: [전체 ▼]  [아이디어] [평가] [문서] [마케팅]            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📝 idea_expansion                              v3  ✅ 활성   │   │
│  │    아이디어 확장                                              │   │
│  │    최종 수정: 2026-02-15 14:30                               │   │
│  │    [편집] [테스트] [버전 이력] [비활성화]                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📝 evaluation_investor                         v2  ✅ 활성   │   │
│  │    투자자 관점 평가                                           │   │
│  │    최종 수정: 2026-02-14 09:15                               │   │
│  │    [편집] [테스트] [버전 이력] [비활성화]                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📝 프롬프트 편집: idea_expansion                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  기본 정보                                                          │
│  ├─ 이름: [아이디어 확장          ]                                 │
│  ├─ 카테고리: [아이디어 ▼]                                          │
│  └─ 설명: [사용자 아이디어를 구체화하고 확장합니다    ]               │
│                                                                     │
│  AI 설정                                                            │
│  ├─ 모델: [claude-3-5-sonnet ▼]                                    │
│  ├─ Temperature: [0.7] ─────●───── (창의성)                         │
│  └─ Max Tokens: [4000    ]                                          │
│                                                                     │
│  시스템 프롬프트                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 당신은 스타트업 아이디어 전문가입니다. 사용자의 아이디어를    │   │
│  │ 분석하고 구체화하여 사업 가능성을 높이는 방향으로 확장해주세요.│   │
│  │                                                              │   │
│  │ 응답 형식:                                                    │   │
│  │ 1. 핵심 아이디어 요약                                         │   │
│  │ 2. 타겟 고객 정의                                             │   │
│  │ ...                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  사용자 프롬프트 템플릿                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 아이디어: {{user_input}}                                     │   │
│  │                                                              │   │
│  │ 위 아이디어를 분석하고 확장해주세요.                          │   │
│  │ 응답은 {{locale}} 언어로 작성해주세요.                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  사용 가능한 변수: {{user_input}} {{project_name}} {{locale}}        │
│                                                                     │
│  변경 사유: [평가 기준 명확화 및 응답 형식 개선               ]       │
│                                                                     │
│  [취소]                                    [테스트 실행] [💾 저장]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.6 버전 관리 및 롤백

```typescript
// lib/prompts/version-manager.ts
export async function createPromptVersion(
  promptId: string,
  changeNote: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // 1. 현재 프롬프트 조회
  const { data: current } = await supabase
    .from('bi_prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (!current) throw new Error('Prompt not found');

  // 2. 버전 스냅샷 저장
  await supabase.from('bi_prompt_versions').insert({
    prompt_id: promptId,
    version: current.version,
    system_prompt: current.system_prompt,
    user_prompt_template: current.user_prompt_template,
    model: current.model,
    temperature: current.temperature,
    max_tokens: current.max_tokens,
    change_note: changeNote,
    changed_by: userId,
  });

  // 3. 버전 번호 증가
  await supabase
    .from('bi_prompts')
    .update({
      version: current.version + 1,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', promptId);

  // 4. 캐시 무효화
  await promptEngine.invalidateCache(current.key);
}

export async function rollbackPrompt(
  promptId: string,
  targetVersion: number,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // 1. 타겟 버전 조회
  const { data: target } = await supabase
    .from('bi_prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .eq('version', targetVersion)
    .single();

  if (!target) throw new Error('Version not found');

  // 2. 현재 상태를 버전으로 저장 (롤백 전)
  await createPromptVersion(promptId, `Rollback to v${targetVersion}`, userId);

  // 3. 타겟 버전으로 복원
  await supabase
    .from('bi_prompts')
    .update({
      system_prompt: target.system_prompt,
      user_prompt_template: target.user_prompt_template,
      model: target.model,
      temperature: target.temperature,
      max_tokens: target.max_tokens,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', promptId);
}
```

---

## 7. 다국어 지원 (i18n) 설계

### 7.1 IP 기반 자동 언어 감지 (COMMON.md 적용)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

// 지원 로케일
const locales = ['ko', 'en', 'ja', 'zh'];
const defaultLocale = 'ko';

// IP 기반 국가 → 언어 매핑
const countryToLocale: Record<string, string> = {
  KR: 'ko',
  US: 'en',
  GB: 'en',
  AU: 'en',
  JP: 'ja',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
};

export default function middleware(request: NextRequest) {
  // 1. 쿠키에 저장된 사용자 선호 언어 확인
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return createIntlMiddleware(request);
  }

  // 2. IP 기반 국가 코드로 언어 감지 (Vercel 헤더)
  const country = request.headers.get('x-vercel-ip-country') || '';
  const detectedLocale = countryToLocale[country] || defaultLocale;

  // 3. 감지된 언어로 리다이렉트
  const response = createIntlMiddleware(request);
  response.cookies.set('NEXT_LOCALE', detectedLocale, { path: '/' });
  return response;
}

const createIntlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### 7.2 메시지 내 언어 감지 (채팅/입력용)

```typescript
// lib/utils/language.ts

/**
 * 텍스트의 언어를 감지합니다 (COMMON.md 기준)
 */
export function detectLanguage(text: string): 'ko' | 'en' | 'ja' | 'zh' {
  const cleaned = text.replace(/[\s\d\p{P}]/gu, '');
  if (!cleaned) return 'ko';

  let hangul = 0;
  let hiragana = 0;
  let katakana = 0;
  let cjk = 0;
  let latin = 0;

  for (const char of cleaned) {
    const code = char.codePointAt(0)!;

    // 한글 (AC00-D7AF: 완성형, 1100-11FF: 자모)
    if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF)) {
      hangul++;
    }
    // 히라가나 (3040-309F)
    else if (code >= 0x3040 && code <= 0x309F) {
      hiragana++;
    }
    // 가타카나 (30A0-30FF)
    else if (code >= 0x30A0 && code <= 0x30FF) {
      katakana++;
    }
    // CJK 통합 한자 (4E00-9FFF)
    else if (code >= 0x4E00 && code <= 0x9FFF) {
      cjk++;
    }
    // 라틴 문자 (0041-007A, 00C0-00FF)
    else if ((code >= 0x41 && code <= 0x7A) || (code >= 0xC0 && code <= 0xFF)) {
      latin++;
    }
  }

  const total = cleaned.length;

  // 30% 이상이면 해당 언어로 판단
  if (hangul / total > 0.3) return 'ko';
  if ((hiragana + katakana) / total > 0.3) return 'ja';
  if (cjk / total > 0.3) return 'zh';
  if (latin / total > 0.5) return 'en';

  return 'ko'; // 기본값
}
```

### 7.3 다국어 메시지 구조

```json
// i18n/messages/ko.json
{
  "common": {
    "loading": "로딩 중...",
    "error": "오류가 발생했습니다",
    "retry": "다시 시도",
    "cancel": "취소",
    "confirm": "확인",
    "delete": "삭제",
    "save": "저장",
    "edit": "수정",
    "create": "생성"
  },
  "auth": {
    "login": "로그인",
    "logout": "로그아웃",
    "signup": "회원가입"
  },
  "dashboard": {
    "title": "대시보드",
    "myProjects": "내 프로젝트",
    "newProject": "새 프로젝트",
    "mentorFeedback": "멘토 피드백"
  },
  "project": {
    "stages": {
      "idea": "아이디어 입력",
      "evaluation": "사업성 평가",
      "document": "문서 생성",
      "done": "완료"
    },
    "status": {
      "draft": "초안",
      "in_progress": "진행 중",
      "completed": "완료",
      "archived": "보관됨"
    }
  },
  "evaluation": {
    "investor": "투자심사역 AI",
    "market": "시장분석가 AI",
    "tech": "기술전문가 AI",
    "total": "종합 점수"
  },
  "documents": {
    "businessPlan": "사업계획서",
    "pitch": "요약 피치",
    "landing": "랜딩페이지",
    "download": "다운로드",
    "downloadAs": "다운로드",
    "downloadMd": "마크다운 (.md)",
    "downloadPdf": "PDF (.pdf)",
    "downloadDoc": "Word (.doc)",
    "generate": "생성하기"
  },
  "empty": {
    "projects": {
      "title": "프로젝트가 없습니다",
      "description": "새 프로젝트를 만들어 창업 아이디어를 구체화해보세요.",
      "action": "첫 프로젝트 만들기"
    }
  },
  "confirm": {
    "deleteProject": {
      "title": "프로젝트 삭제",
      "message": "\"{name}\" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    }
  },
  "landing": {
    "getStarted": "무료로 시작하기",
    "login": "로그인",
    "nav": { "features": "...", "process": "...", "faq": "..." },
    "hero": { "badge": "...", "titleLine1": "...", "titleLine2": "...", "subtitle": "...", "cta": "...", "ctaSecondary": "...", "trust1~3": "...", "bottom1~3": "..." },
    "problem": { "title": "...", "card1~3Title": "...", "card1~3Desc": "...", "highlightLine1~3": "...", "highlightConclusion": "..." },
    "solution": { "title": "...", "subtitle": "...", "step1~4Title": "...", "step1~4Desc": "...", "step1~4Tags": "..." },
    "features": { "title": "...", "subtitle": "...", "f1~4Title": "...", "f1~4Label": "...", "f1~4Tag1~3": "...", "f1~4Desc": "...", "f1~4Point1~4": "..." },
    "aiTech": { "title": "...", "subtitle": "...", "orchestrator": "...", "ai1~3Name": "...", "ai1~3Role": "...", "col1~3Title": "...", "col1~3Item1~4": "..." },
    "stats": { "title": "...", "stat1~4Value": "...", "stat1~4Label": "...", "stat1~4Sub": "...", "bottom1~4": "..." },
    "caseStudy": { "title": "...", "case1~3Tab": "...", "case1~3Name": "...", "case1~3Before1~3": "...", "case1~3Casa1~3": "...", "case1~3After1~3": "..." },
    "testimonial": { "title": "...", "t1~3Quote": "...", "t1~3Name": "...", "t1~3Role": "...", "cta": "..." },
    "process": { "title": "...", "subtitle": "...", "step1~4Title": "...", "step1~4Time": "...", "step1~4Desc": "...", "totalTime": "...", "cta": "..." },
    "partner": { "title": "...", "org1~3": "...", "tech1~3": "...", "orgLabel": "...", "techLabel": "..." },
    "faq": { "title": "...", "q1~10": "...", "a1~10": "..." },
    "finalCta": { "title": "...", "subtitle": "...", "cta": "...", "badge1~3": "..." },
    "footer": { "brand": "...", "brandDesc": "...", "org": "...", "address": "...", "linksTitle": "...", "supportTitle": "...", "copyright": "...", "poweredBy": "..." }
  }
}
```

> **참고**: `landing` 네임스페이스는 14개 섹션에 대응하는 서브키 ~250개로 구성됨. 상세 키는 `src/i18n/messages/ko.json` 참조.

```json
// i18n/messages/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Retry",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "save": "Save",
    "edit": "Edit",
    "create": "Create"
  },
  "auth": {
    "login": "Log in",
    "logout": "Log out",
    "signup": "Sign up"
  },
  "dashboard": {
    "title": "Dashboard",
    "myProjects": "My Projects",
    "newProject": "New Project",
    "mentorFeedback": "Mentor Feedback"
  },
  "project": {
    "stages": {
      "idea": "Idea Input",
      "evaluation": "Business Evaluation",
      "document": "Document Generation",
      "done": "Completed"
    },
    "status": {
      "draft": "Draft",
      "in_progress": "In Progress",
      "completed": "Completed",
      "archived": "Archived"
    }
  },
  "evaluation": {
    "investor": "Investor AI",
    "market": "Market Analyst AI",
    "tech": "Tech Expert AI",
    "total": "Total Score"
  },
  "documents": {
    "businessPlan": "Business Plan",
    "pitch": "Pitch Summary",
    "landing": "Landing Page",
    "download": "Download",
    "downloadAs": "Download",
    "downloadMd": "Markdown (.md)",
    "downloadPdf": "PDF (.pdf)",
    "downloadDoc": "Word (.doc)",
    "generate": "Generate"
  },
  "empty": {
    "projects": {
      "title": "No projects yet",
      "description": "Create a new project to start refining your startup idea.",
      "action": "Create First Project"
    }
  },
  "confirm": {
    "deleteProject": {
      "title": "Delete Project",
      "message": "Are you sure you want to delete \"{name}\"? This action cannot be undone."
    }
  },
  "landing": {
    "...": "// ko.json의 landing과 동일한 구조, 영어 번역"
  }
}
```

---

## 8. UI/UX 가이드라인 (COMMON.md 전면 적용)

### 8.1 디자인 원칙

1. **명확한 진행 단계**: 현재 위치와 다음 단계를 항상 표시
2. **즉각적 피드백**: 모든 AI 작업에 진행률 표시
3. **에러 복구 용이성**: 실패 시 명확한 안내와 재시도 옵션
4. **모바일 우선**: 태블릿/모바일에서도 핵심 기능 사용 가능
5. **다크모드 필수**: 모든 컴포넌트에 `dark:` 클래스 적용
6. **다국어 지원**: 모든 텍스트는 i18n 키 사용

### 8.2 랜딩(홍보) 페이지 디자인

랜딩 페이지(`src/app/[locale]/page.tsx`)는 비로그인 사용자에게 CASA 플랫폼을 홍보하는 14개 섹션의 단일 페이지로 구현됨. 로그인 사용자는 `/dashboard`로 자동 리다이렉트.

#### 8.2.1 페이지 구조 (14개 섹션)

| # | 섹션 | 컴포넌트 | 핵심 역할 |
|---|------|----------|-----------|
| 1 | 네비게이션 | `LandingNav` | sticky 헤더, 앵커 링크, 모바일 Sheet 메뉴 |
| 2 | 히어로 | `HeroSection` | 100dvh, 그라디언트 헤드라인, CTA 2개, 대시보드 목업 |
| 3 | 문제 제기 | `ProblemSection` | 3단 카드, 하단 시간 비교 강조 박스 |
| 4 | 솔루션 개요 | `SolutionOverview` | 4단계 수평 플로우, 화살표 연결 |
| 5 | 핵심 기능 | `FeatureSection` | 4개 기능 지그재그 레이아웃, 태그 뱃지 |
| 6 | AI 차별화 | `AITechSection` | 다크 배경, 오케스트레이터 다이어그램, 3단 비교 |
| 7 | 숫자 성과 | `StatsSection` | 4단 그리드, `useCountUp` 카운트업 애니메이션 |
| 8 | Before/After | `CaseStudySection` | Tabs 컴포넌트, Before(red)/After(green) |
| 9 | 사용자 후기 | `TestimonialSection` | CSS transform 캐러셀, 점 네비게이션 |
| 10 | 이용 프로세스 | `ProcessSection` | 4단계 타임라인, 시간 뱃지 |
| 11 | 파트너 | `PartnerSection` | 지원 기관 + 기술 파트너 그리드 |
| 12 | FAQ | `FAQSection` | shadcn/ui Accordion, 10개 Q&A, 2단 컬럼 |
| 13 | 최종 CTA | `FinalCTASection` | 그라디언트 배경, 큰 CTA, 안심 뱃지 |
| 14 | 푸터 | `LandingFooter` | 3컬럼 다크 배경 |

#### 8.2.2 CTA 배치 (총 5곳)

1. **네비게이션**: 항상 노출 — "무료로 시작하기" → `/signup`
2. **히어로**: 첫 화면 — "무료로 시작하기" + "자세히 알아보기" → `/signup`, `#features`
3. **사용자 후기 하단**: "나도 시작하기" → `/signup`
4. **이용 프로세스 하단**: "지금 무료로 시작하기" → `/signup`
5. **최종 CTA 섹션**: "무료로 시작하기" + 로그인 링크 → `/signup`, `/login`

#### 8.2.3 애니메이션 전략

| 기법 | 구현 방식 | 용도 |
|------|-----------|------|
| 스크롤 트리거 | `useScrollAnimation` (IntersectionObserver, threshold 0.15, triggerOnce) | 전 섹션 fade-in/slide-in |
| 카운트업 | `useCountUp` (requestAnimationFrame, easeOutExpo) | 숫자 성과 섹션 |
| 캐러셀 | CSS `transform: translateX` | 사용자 후기 슬라이더 |
| 호버 | Tailwind `hover:-translate-y-1 hover:shadow-md` | 카드 상승 효과 |
| 접근성 | `prefers-reduced-motion: reduce` → 애니메이션 비활성화 | 전역 CSS |

#### 8.2.4 반응형 브레이크포인트

| 뷰포트 | 범위 | 주요 변화 |
|--------|------|-----------|
| 모바일 | ~767px | 1단 그리드, 세로 스택, CTA 전체 폭, Sheet 메뉴 |
| 태블릿 | 768~1199px | 2단 그리드, 히어로 세로, 폰트 축소 |
| 데스크톱 | 1200px+ | 2~4단 그리드, 히어로 좌우 분할, 지그재그 |

#### 8.2.5 재사용 기존 컴포넌트

- `Button`, `Card`, `Badge`, `Tabs`, `Sheet`, `Accordion` (shadcn/ui)
- `ThemeToggle`, `LocaleSelector` (common)

### 8.3 다크모드 색상 매핑 (COMMON.md 기준 - 필수 적용)

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

Primary:  blue-600   / dark:blue-500
Success:  green-600  / dark:green-500
Warning:  yellow-600 / dark:yellow-500
Error:    red-600    / dark:red-500
```

### 8.4 next-themes 설정

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 8.5 ThemeToggle 컴포넌트

```tsx
// components/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-2 rounded-md transition-colors ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
```

### 8.6 LocaleSelector 컴포넌트

```tsx
// components/LocaleSelector.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

const locales = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export function LocaleSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    // 쿠키에 저장
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // 경로에서 현재 로케일 교체
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const currentLocale = locales.find(l => l.code === locale);

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg
                         text-gray-700 dark:text-gray-200
                         hover:bg-gray-100 dark:hover:bg-gray-800
                         transition-colors">
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLocale?.flag} {currentLocale?.code.toUpperCase()}</span>
      </button>

      <div className="absolute right-0 mt-2 w-40 py-2
                      bg-white dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      rounded-lg shadow-lg
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all">
        {locales.map(({ code, label, flag }) => (
          <button
            key={code}
            onClick={() => handleChange(code)}
            className={`w-full px-4 py-2 text-left text-sm
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors ${
              locale === code
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {flag} {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 8.7 반응형 대시보드 레이아웃 (COMMON.md 기준)

```tsx
// app/[locale]/dashboard/layout.tsx
'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/features/dashboard/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleSelector } from '@/components/LocaleSelector';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 — 모바일: 슬라이드 드로어, 데스크톱: 고정 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 */}
        <header className="lg:hidden flex items-center justify-between
                          p-4 border-b border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          </button>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LocaleSelector />
          </div>
        </header>

        {/* 데스크톱 헤더 */}
        <header className="hidden lg:flex items-center justify-end
                          p-4 border-b border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LocaleSelector />
          </div>
        </header>

        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 8.8 삭제 확인 모달 (window.confirm 절대 금지)

```tsx
// components/ConfirmModal.tsx
'use client';

import { useTranslations } from 'next-intl';

type DeleteConfirm =
  | { type: 'single'; id: string; name: string }
  | { type: 'bulk'; count: number }
  | null;

interface ConfirmModalProps {
  confirm: DeleteConfirm;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({ confirm, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const t = useTranslations('common');

  if (!confirm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('confirm')}
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {confirm.type === 'single'
            ? `"${confirm.name}"을(를) 삭제하시겠습니까?`
            : `선택한 ${confirm.count}개 항목을 삭제하시겠습니까?`}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg
                       border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg
                       bg-red-600 text-white
                       hover:bg-red-700
                       disabled:opacity-50 transition-colors"
          >
            {loading ? '삭제 중...' : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 8.9 필수 3가지 상태 처리 (COMMON.md 기준)

**규칙:** 모든 데이터 페칭 컴포넌트는 아래 3가지 상태를 반드시 처리한다.

```tsx
// 모든 비동기 데이터 컴포넌트의 패턴
import { useTranslations } from 'next-intl';

function ProjectList() {
  const t = useTranslations();
  const { data, loading, error, refetch } = useProjects();

  // 1. 로딩 상태
  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  // 2. 에러 상태
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  // 3. 빈 상태
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon className="h-12 w-12 text-gray-400" />}
        title={t('empty.projects.title')}
        description={t('empty.projects.description')}
        action={
          <Button onClick={onCreate}>
            {t('empty.projects.action')}
          </Button>
        }
      />
    );
  }

  // 데이터 렌더링
  return <DataTable data={data} />;
}
```

### 8.10 진행률 표시 (SSE 작업)

```tsx
// components/ProgressBar.tsx
interface ProgressState {
  phase: string;
  message: string;
  progress: number;
}

interface ProgressBarProps {
  progress: ProgressState | null;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  if (!progress) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4
                    bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {progress.message}
        </span>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
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
  );
}
```

---

## 9. AI 프롬프트 참고 템플릿

> **참고**: 이 섹션의 프롬프트들은 섹션 6.4의 시드 데이터로 DB에 저장되며, 관리자가 수정 가능합니다.

### 9.1 아이디어 확장 프롬프트

```typescript
export const IDEA_EXPAND_PROMPT = `당신은 창업 아이디어를 구조화하는 전문 컨설턴트입니다.

사용자가 입력한 아이디어를 분석하여 다음 4가지 요소로 구조화하세요:

1. **문제 (Problem)**: 해결하고자 하는 핵심 문제는 무엇인가?
2. **솔루션 (Solution)**: 어떻게 이 문제를 해결하는가?
3. **타겟 고객 (Target)**: 주요 고객은 누구인가?
4. **차별점 (Differentiation)**: 기존 솔루션과 무엇이 다른가?

## 사용자 아이디어
{{user_input}}

## 출력 형식
JSON 형식으로 응답하세요:
{
  "problem": "...",
  "solution": "...",
  "target": "...",
  "differentiation": "...",
  "clarifying_questions": ["추가로 확인이 필요한 질문들..."]
}`;
```

### 9.2 다면 평가 프롬프트 (투자심사역)

```typescript
export const INVESTOR_EVALUATION_PROMPT = `당신은 10년 경력의 벤처캐피탈 투자심사역입니다.

다음 창업 아이디어를 투자 관점에서 평가하세요.

## 아이디어
- 문제: {{problem}}
- 솔루션: {{solution}}
- 타겟: {{target}}
- 차별점: {{differentiation}}

## 평가 기준 (각 25점, 총 100점)
1. **수익 모델 타당성**: 명확한 수익 창출 방안이 있는가?
2. **확장 가능성**: 시장 확장 잠재력이 있는가?
3. **투자 매력도**: 투자자 입장에서 매력적인가?
4. **리스크 수준**: 실패 리스크가 관리 가능한가?

## 출력 형식
JSON 형식으로 응답하세요:
{
  "score": 75,
  "breakdown": {
    "revenue_model": { "score": 20, "comment": "..." },
    "scalability": { "score": 18, "comment": "..." },
    "attractiveness": { "score": 22, "comment": "..." },
    "risk_level": { "score": 15, "comment": "..." }
  },
  "strengths": ["강점1", "강점2"],
  "weaknesses": ["약점1", "약점2"],
  "recommendations": ["추천1", "추천2"]
}`;
```

### 9.3 사업계획서 생성 프롬프트

```typescript
export const BUSINESS_PLAN_PROMPT = `당신은 정부 창업지원사업 심사위원 경험이 풍부한 사업계획서 전문 작성자입니다.

다음 정보를 바탕으로 정부지원사업 및 투자유치에 적합한 사업계획서를 작성하세요.

## 프로젝트 정보
- 프로젝트명: {{project_name}}
- 문제: {{problem}}
- 솔루션: {{solution}}
- 타겟: {{target}}
- 차별점: {{differentiation}}

## 평가 결과 요약
- 투자 관점: {{investor_feedback}}
- 시장 관점: {{market_feedback}}
- 기술 관점: {{tech_feedback}}
- 종합 점수: {{total_score}}점

## 사업계획서 구조 (Markdown 형식)

# {{project_name}} 사업계획서

## 1. 사업 개요
### 1.1 사업 배경 및 필요성
### 1.2 사업 목표
### 1.3 핵심 가치 제안

## 2. 제품/서비스
### 2.1 제품 개요
### 2.2 핵심 기능
### 2.3 기술적 차별점

## 3. 시장 분석
### 3.1 목표 시장
### 3.2 시장 규모 및 성장성
### 3.3 경쟁사 분석

## 4. 비즈니스 모델
### 4.1 수익 모델
### 4.2 가격 전략
### 4.3 고객 확보 전략

## 5. 실행 계획
### 5.1 개발 로드맵
### 5.2 마케팅 계획
### 5.3 조직 구성

## 6. 재무 계획
### 6.1 소요 자금
### 6.2 예상 매출
### 6.3 손익 분석

## 7. 팀 소개

## 8. 기대 효과 및 비전`;
```

---

## 10. 환경 변수

```env
# =====================================================
# 필수 환경변수
# =====================================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# 서버 전용 (NEXT_PUBLIC_ 금지!)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx   # 서버 전용

# App
NEXT_PUBLIC_APP_URL=https://casa.cbnu.ac.kr

# =====================================================
# 선택 환경변수 (향후 확장)
# =====================================================

# 멀티 AI (Phase 2)
# OPENAI_API_KEY=sk-xxx
# GOOGLE_AI_API_KEY=xxx

# Redis (프롬프트 캐싱용)
REDIS_URL=redis://localhost:6379
# 또는 Upstash Redis (Vercel 권장)
# UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=xxx

# =====================================================
# 주의사항
# =====================================================
# NEXT_PUBLIC_ 접두사 = 클라이언트에 노출됨!
# 비밀키에 절대 사용 금지:
# - SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
```

---

## 11. Vercel 설정

### 11.1 라우트별 타임아웃 (COMMON.md 기준)

```typescript
// SSE 스트리밍 라우트 (아이디어 확장, 평가)
export const maxDuration = 60;

// 문서 생성 라우트 (사업계획서 - 긴 생성)
export const maxDuration = 120;

// 일반 CRUD
// 기본값 (10초) 사용 - 설정 불필요
```

---

## 12. 개발 마일스톤

### Phase 1: 기반 구축 (Week 1-2)

- [ ] 프로젝트 초기화 (Next.js 15, Tailwind, shadcn/ui)
- [ ] next-themes 설정 (다크모드)
- [ ] next-intl 설정 (다국어: ko, en)
- [ ] Supabase 프로젝트 생성 및 bi_ 스키마 적용
- [ ] 인증 구현 (로그인, 회원가입, 세션)
- [ ] 공통 컴포넌트 구축 (COMMON.md 기준)
  - [ ] ConfirmModal
  - [ ] LoadingSpinner
  - [ ] EmptyState
  - [ ] ErrorMessage
  - [ ] Pagination
  - [ ] ProgressBar
  - [ ] ThemeToggle
  - [ ] LocaleSelector
  - [ ] MobileDrawer
- [ ] 대시보드 레이아웃 (사이드바 + 모바일 드로어)
- [ ] IP 기반 언어 감지 미들웨어
- [ ] **프롬프트 관리 시스템 구축**
  - [ ] bi_prompts, bi_prompt_versions, bi_prompt_variables 테이블 생성
  - [ ] 프롬프트 엔진 (PromptEngine) 구현
  - [ ] Redis 캐싱 설정 (TTL 5분)
  - [ ] 기본 프롬프트 시드 데이터 삽입
  - [ ] 관리자 프롬프트 편집 UI

### Phase 2: 핵심 기능 (Week 3-4)

- [ ] 프로젝트 CRUD (bi_projects)
- [ ] 아이디어 입력 및 AI 확장 (SSE)
- [ ] **Gate 1: 아이디어 확정 UI (사용자 수정/승인)**
- [ ] 다면 평가 기능 (3개 페르소나, SSE)
- [ ] **Gate 2: 평가 결과 검토 UI (사용자 재평가/승인)**
- [ ] 평가 결과 시각화

### Phase 3: 문서 생성 (Week 5-6)

- [ ] 사업계획서 생성 (SSE)
- [ ] 요약 피치 생성
- [ ] 랜딩페이지 생성
- [ ] **Gate 3: 문서 검토 UI (사용자 수정 요청/확정)**
- [x] 문서 다운로드 (PDF/Word 변환 — 클라이언트 사이드 marked + html2pdf.js)

### Phase 4: 마무리 (Week 7-8)

- [ ] 멘토 피드백 기능
- [ ] **Gate 4: 멘토 최종 승인 워크플로우**
- [ ] 승인 내역 조회 페이지
- [ ] 승인 알림 기능
- [ ] 다크모드 전체 점검
- [ ] 다국어 전체 점검 (ko, en)
- [ ] 모바일 반응형 점검
- [ ] 성능 최적화
- [ ] 베타 테스트 (10개 팀)

### Phase 5: 랜딩(홍보) 페이지 (완료)

- [x] 14개 섹션 컴포넌트 구현 (`features/landing/components/`)
- [x] 스크롤 애니메이션 훅 (`useScrollAnimation`, `useCountUp`)
- [x] CSS keyframes + `prefers-reduced-motion` 지원 (`globals.css`)
- [x] 다국어 메시지 확장 (`landing` 네임스페이스 ~250키, ko/en)
- [x] shadcn/ui Accordion 컴포넌트 추가
- [x] 메인 `page.tsx` 통합 (서버 인증 + 14개 클라이언트 섹션)
- [x] 반응형 3단계 (모바일/태블릿/데스크톱)
- [x] 다크모드 전 섹션 대응 (AI 기술 섹션은 항상 다크)
- [x] CTA 5곳 → `/signup`, `/login` 연결
- [x] 로그인 유저 → `/dashboard` 리다이렉트 유지
- [x] 기존 서비스 기능 미변경 확인

---

## 13. 개발 체크리스트 (COMMON.md 기준)

### Day 1: 프로젝트 설정

- [ ] PRD 작성 완료 (본 문서)
- [ ] CLAUDE.md 작성 (스택, 폴더 구조, 컨벤션)
- [ ] DB 스키마 설계 (모든 FK + CASCADE + 인덱스 포함)
- [ ] RLS 정책 작성
- [ ] `.env.example` 작성 (서버/클라이언트 키 구분 명시)
- [ ] 공유 컴포넌트 생성 (ConfirmModal, Pagination, EmptyState, ProgressBar 등)
- [ ] 다크모드 색상 매핑 테이블 확정
- [ ] 대시보드 레이아웃 (데스크톱 사이드바 + 모바일 드로어)
- [ ] i18n 설정 및 기본 메시지 파일 생성

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
- [ ] UI: 다크모드 매핑 적용 + 확인 (`dark:` 클래스 필수)
- [ ] UI: 모바일 반응형 확인
- [ ] UI: 삭제는 ConfirmModal 사용 (`window.confirm` 금지)
- [ ] UI: 모든 텍스트 i18n 키 사용
- [ ] 테스트: 핵심 로직 단위 테스트

### 배포 전

- [ ] 모든 환경변수 프로덕션 값 설정
- [ ] `NEXT_PUBLIC_` 접두사에 비밀키 없는지 확인
- [ ] 모든 API 라우트 `maxDuration` 설정 확인
- [ ] 다크모드 전체 페이지 테스트
- [ ] 다국어 전체 페이지 테스트 (ko, en)
- [ ] 모바일 전체 페이지 테스트
- [ ] 단위 테스트 전체 통과
- [ ] 에러 모니터링 설정

---

## 14. 성공 지표 (KPIs)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **Time-to-Document** | 아이디어 → 사업계획서 30분 이내 | 타임스탬프 분석 |
| **완료율** | 프로젝트 시작 → 문서 생성 70% | 단계별 전환율 |
| **사용자 만족도** | 4.0/5.0 이상 | 베타 테스터 설문 |
| **문서 활용률** | 생성 문서 70% 이상 다운로드 | 다운로드 로그 |
| **재사용률** | 30일 내 재방문 50% | 세션 분석 |

---

### Phase 6: 모두의 창업 연계 개선

- [ ] **F6: 시장 중심 피칭 코치**
  - [ ] evaluation_market 프롬프트에 시장 스토리텔링 평가 항목 추가
  - [ ] pitch_summary 프롬프트를 고객 중심 구조로 전환
  - [ ] 평가 결과에 "30초 엘리베이터 피치" 자동 생성 추가
- [ ] **F7: GTM 체크리스트**
  - [ ] gtm_checklist 프롬프트 작성
  - [ ] 문서 생성 API에 GTM 체크리스트 타입 추가
  - [ ] 문서 관리 UI에 GTM 체크리스트 표시
- [ ] **F8: 공개 프로젝트 프로필**
  - [ ] bi_projects에 visibility 컬럼 추가
  - [ ] 공개 프로필 페이지 구현
  - [ ] 쇼케이스(공개 프로젝트 목록) 페이지 구현
  - [ ] 프로젝트 설정에서 공개 범위 토글 UI
- [ ] **F9: 멘토·전문가 매칭 기초**
  - [ ] bi_users에 expertise_tags, industry_tags, bio 컬럼 추가
  - [ ] 멘토 디렉토리 페이지
  - [ ] 프로젝트 기반 멘토 추천
  - [ ] 멘토링 요청 플로우

---

## 15. 향후 확장 계획 (Post-MVP)

### Phase 2: 멀티 AI 통합 (섹션 2.3 전략 기반)
- OpenAI GPT-4o (투자자 페르소나), Google Gemini Pro (시장 분석가 페르소나) 실제 연동
- 멀티 에이전트 토론 (Multi-Agent Debate) 구현
- RAG 기반 시장 데이터 연동
- AI 모델 선택 UI (사용자가 모델 조합 선택 가능)

### Phase 3: 마케팅 자동화
- n8n 워크플로우 연동
- SNS 콘텐츠 자동 생성 (YouTube, TikTok, Instagram)
- 네이버 블로그 최적화 (HyperCLOVA X)

### Phase 4: 자율 수정 루프
- 피드백 기반 자동 개선 제안
- A/B 테스트 자동화
- 성과 대시보드

### Phase 5: 다국어 확장
- 일본어 (ja) 지원 추가
- 중국어 (zh) 지원 추가
- 지역별 맞춤 콘텐츠 (정부 지원사업 템플릿 등)

### Phase 6: 정부지원사업 매칭 에이전트
- **사업계획서 ↔ 공고 매칭**: 생성된 사업계획서를 분석하여 현재 접수 중인 정부지원사업 공고와 자동 매칭
- **지원 플랫폼 연동**: K-Startup, 창업진흥원, 중소벤처기업부, 지역 창조경제혁신센터 공고 크롤링
- **적합도 점수 산출**: 사업 분야, 창업 단계, 지원 자격 조건 기반 매칭 점수 제공
- **지원서 초안 생성**: 매칭된 공고의 신청서 양식에 맞춰 사업계획서 내용 자동 변환
- **마감일 알림**: 관심 공고 마감일 자동 알림 (이메일, 푸시)
- **지원 이력 관리**: 신청 현황, 선정/탈락 결과 추적 대시보드

---

*문서 작성: Claude Opus 4.5*
*최종 수정: 2026-02-25*
*버전: 1.6*

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-02-15 | 초안 작성 |
| 1.1 | 2026-02-15 | bi_ 접두사, COMMON.md 가이드라인 전면 반영 (다크모드, i18n, IP 기반 언어 감지) |
| 1.2 | 2026-02-15 | Human-in-the-Loop 승인 워크플로우 추가 (4단계 Gate), Multi-AI 오케스트레이션 전략 추가, bi_approvals 테이블 및 RLS 정책, 승인 관련 API 엔드포인트 |
| 1.3 | 2026-02-15 | **프롬프트 관리 시스템 추가**: bi_prompts/bi_prompt_versions/bi_prompt_variables 테이블, PromptEngine 클래스, Redis 캐싱, 관리자 UI, 버전 관리/롤백, 시드 데이터, 관리자 API 엔드포인트 |
| 1.4 | 2026-02-16 | **랜딩(홍보) 페이지 전면 개편**: 6개→14개 섹션 확장, features/landing/ 컴포넌트 14개 신규, 스크롤 애니메이션(IntersectionObserver + CSS keyframes), 카운트업 훅, shadcn/ui Accordion 추가, landing 다국어 ~250키 확장(ko/en), 폴더 구조·UI/UX 가이드라인·마일스톤 섹션 PRD 반영 |
| 1.5 | 2026-02-22 | **모두의 창업 연계 기능 추가**: F6(시장 중심 피칭 코치), F7(GTM 체크리스트), F8(공개 프로젝트 프로필), F9(멘토·전문가 매칭 기초) 4개 기능 정의, 데이터 모델 확장(bi_projects.visibility, bi_users.expertise_tags/industry_tags/bio, bi_documents.type 확장), Phase 6 마일스톤 추가 |
| 1.6 | 2026-02-25 | **창업자 트랙(F10) 추가**: 이중 트랙 체계(pre_startup/startup) 도입, 사업계획서 기반 AI 분석 파이프라인(검토→진단→전략→보고서), bi_business_reviews 테이블, PDF 업로드(pdfjs-dist), 마크다운 렌더링(MarkdownContent), 보고서 내보내기(인쇄/Word .doc) |
