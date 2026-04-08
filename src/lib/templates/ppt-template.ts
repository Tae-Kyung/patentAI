import { escapeHtml } from '@/lib/utils/html'

export interface PptSlideContent {
  cover: {
    title: string
    subtitle: string
    tagline: string
  }
  problem: {
    title: string
    painPoints: string[]
    impact: string
  }
  solution: {
    title: string
    description: string
    features: Array<{ emoji: string; name: string; desc: string }>
  }
  market: {
    title: string
    targetCustomer: string
    marketSize: string
    growth: string
  }
  competitive: {
    title: string
    advantages: Array<{ emoji: string; point: string }>
  }
  scores: {
    total: number
    investor: number
    market: number
    tech: number
  }
  roadmap: {
    phases: Array<{ period: string; title: string; items: string[] }>
  }
  cta: {
    message: string
    nextSteps: string[]
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return '#ef4444'
}

function normalize(raw: Record<string, unknown>): PptSlideContent {
  const r = raw as Record<string, Record<string, unknown> | undefined>
  const cover = r.cover ?? {}
  const problem = r.problem ?? {}
  const solution = r.solution ?? {}
  const market = r.market ?? {}
  const competitive = r.competitive ?? {}
  const scores = r.scores ?? {}
  const roadmap = r.roadmap ?? {}
  const cta = r.cta ?? {}

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String) : []

  const str = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : fallback

  const num = (v: unknown, fallback = 0): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  const objArr = <T>(v: unknown, mapFn: (item: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.map((item) => mapFn(item as Record<string, unknown>)) : []

  return {
    cover: {
      title: str(cover.title, '프로젝트'),
      subtitle: str(cover.subtitle, ''),
      tagline: str(cover.tagline, ''),
    },
    problem: {
      title: str(problem.title, '문제 정의'),
      painPoints: arr(problem.painPoints),
      impact: str(problem.impact, ''),
    },
    solution: {
      title: str(solution.title, '솔루션'),
      description: str(solution.description, ''),
      features: objArr(solution.features, (f) => ({
        emoji: str(f.emoji, '💡'),
        name: str(f.name, ''),
        desc: str(f.desc || f.description, ''),
      })),
    },
    market: {
      title: str(market.title, '시장 분석'),
      targetCustomer: str(market.targetCustomer || market.target, ''),
      marketSize: str(market.marketSize, ''),
      growth: str(market.growth, ''),
    },
    competitive: {
      title: str(competitive.title, '경쟁 우위'),
      advantages: objArr(competitive.advantages, (a) => ({
        emoji: str(a.emoji, '⚡'),
        point: str(a.point, ''),
      })),
    },
    scores: {
      total: num(scores.total),
      investor: num(scores.investor),
      market: num(scores.market),
      tech: num(scores.tech),
    },
    roadmap: {
      phases: objArr(roadmap.phases, (p) => ({
        period: str(p.period, ''),
        title: str(p.title, ''),
        items: arr(p.items),
      })),
    },
    cta: {
      message: str(cta.message, ''),
      nextSteps: arr(cta.nextSteps),
    },
  }
}

export function buildPptHtml(raw: Record<string, unknown>): string {
  const c = normalize(raw)

  const painPointsHtml = c.problem.painPoints
    .map(
      (p, i) => `
      <div class="flex items-start gap-3 bg-white/10 rounded-xl p-4">
        <span class="text-2xl">${['🔴', '🟠', '🟡', '⚠️'][i % 4]}</span>
        <p class="text-lg text-white/90">${escapeHtml(p)}</p>
      </div>`
    )
    .join('\n')

  const featuresHtml = c.solution.features
    .map(
      (f) => `
      <div class="bg-white/10 rounded-xl p-5 text-center">
        <div class="text-4xl mb-3">${escapeHtml(f.emoji)}</div>
        <h4 class="text-lg font-bold text-white mb-1">${escapeHtml(f.name)}</h4>
        <p class="text-sm text-white/70">${escapeHtml(f.desc)}</p>
      </div>`
    )
    .join('\n')

  const advantagesHtml = c.competitive.advantages
    .map(
      (a) => `
      <div class="flex items-center gap-3 bg-white/10 rounded-xl p-4">
        <span class="text-2xl">${escapeHtml(a.emoji)}</span>
        <span class="text-lg text-white/90">${escapeHtml(a.point)}</span>
      </div>`
    )
    .join('\n')

  const scoreBarHtml = (label: string, value: number) => `
    <div class="mb-4">
      <div class="flex justify-between mb-1">
        <span class="text-sm text-white/80">${escapeHtml(label)}</span>
        <span class="text-sm font-bold" style="color:${scoreColor(value)}">${value}점</span>
      </div>
      <div class="w-full bg-white/20 rounded-full h-3">
        <div class="h-3 rounded-full transition-all" style="width:${value}%;background:${scoreColor(value)}"></div>
      </div>
    </div>`

  const phasesHtml = c.roadmap.phases
    .map(
      (phase, i) => `
      <div class="flex-1 relative">
        <div class="bg-white/15 rounded-xl p-4 h-full">
          <div class="text-xs font-bold text-cyan-300 uppercase tracking-wide mb-1">${escapeHtml(phase.period)}</div>
          <h4 class="text-base font-bold text-white mb-2">${escapeHtml(phase.title)}</h4>
          <ul class="space-y-1">
            ${phase.items.map((item) => `<li class="text-sm text-white/70 flex items-start gap-1"><span class="text-cyan-400 mt-0.5">•</span>${escapeHtml(item)}</li>`).join('\n')}
          </ul>
        </div>
        ${i < c.roadmap.phases.length - 1 ? '<div class="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-white/40 text-xl">→</div>' : ''}
      </div>`
    )
    .join('\n')

  const nextStepsHtml = c.cta.nextSteps
    .map(
      (step, i) => `
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">${i + 1}</span>
        <span class="text-lg text-white/90">${escapeHtml(step)}</span>
      </div>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(c.cover.title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; overflow: hidden; font-family: 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  .slide-container { width: 960px; height: 540px; margin: 0 auto; position: relative; }
  .slide { display: none; width: 960px; height: 540px; overflow: hidden; position: absolute; top: 0; left: 0; }
  .slide.active { display: flex; }
  .nav-btn { position: fixed; top: 50%; transform: translateY(-50%); z-index: 50; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); color: white; border: none; font-size: 20px; cursor: pointer; backdrop-filter: blur(4px); transition: background 0.2s; }
  .nav-btn:hover { background: rgba(255,255,255,0.3); }
  .nav-prev { left: 16px; }
  .nav-next { right: 16px; }
  .slide-counter { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.6); font-size: 14px; z-index: 50; }
</style>
</head>
<body>
<div class="slide-container">

  <!-- Slide 1: Cover -->
  <section class="slide active flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-16">
    <div class="mb-6">
      <span class="inline-block px-4 py-1 rounded-full bg-white/10 text-cyan-300 text-sm font-medium tracking-wide">${escapeHtml(c.cover.tagline)}</span>
    </div>
    <h1 class="text-5xl font-extrabold text-white mb-4 leading-tight">${escapeHtml(c.cover.title)}</h1>
    <p class="text-xl text-white/70 max-w-xl">${escapeHtml(c.cover.subtitle)}</p>
    <div class="mt-10 flex gap-2">
      <div class="w-12 h-1 rounded bg-cyan-400"></div>
      <div class="w-12 h-1 rounded bg-purple-400"></div>
      <div class="w-12 h-1 rounded bg-pink-400"></div>
    </div>
  </section>

  <!-- Slide 2: Problem -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(c.problem.title)}</h2>
    <div class="w-16 h-1 rounded bg-red-400 mb-8"></div>
    <div class="grid gap-4 mb-6">
      ${painPointsHtml}
    </div>
    <div class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-auto">
      <p class="text-white/90 text-base font-medium">💡 ${escapeHtml(c.problem.impact)}</p>
    </div>
  </section>

  <!-- Slide 3: Solution -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(c.solution.title)}</h2>
    <div class="w-16 h-1 rounded bg-emerald-400 mb-4"></div>
    <p class="text-lg text-white/80 mb-8 max-w-2xl">${escapeHtml(c.solution.description)}</p>
    <div class="grid grid-cols-${Math.min(c.solution.features.length, 4)} gap-4">
      ${featuresHtml}
    </div>
  </section>

  <!-- Slide 4: Market -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(c.market.title)}</h2>
    <div class="w-16 h-1 rounded bg-blue-400 mb-8"></div>
    <div class="grid grid-cols-3 gap-6">
      <div class="bg-white/10 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">🎯</div>
        <h4 class="text-sm text-white/60 uppercase tracking-wide mb-2">Target</h4>
        <p class="text-lg text-white font-semibold">${escapeHtml(c.market.targetCustomer)}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">📊</div>
        <h4 class="text-sm text-white/60 uppercase tracking-wide mb-2">Market Size</h4>
        <p class="text-lg text-white font-semibold">${escapeHtml(c.market.marketSize)}</p>
      </div>
      <div class="bg-white/10 rounded-xl p-6 text-center">
        <div class="text-4xl mb-3">📈</div>
        <h4 class="text-sm text-white/60 uppercase tracking-wide mb-2">Growth</h4>
        <p class="text-lg text-white font-semibold">${escapeHtml(c.market.growth)}</p>
      </div>
    </div>
  </section>

  <!-- Slide 5: Competitive Advantage -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(c.competitive.title)}</h2>
    <div class="w-16 h-1 rounded bg-amber-400 mb-8"></div>
    <div class="grid gap-4">
      ${advantagesHtml}
    </div>
  </section>

  <!-- Slide 6: Scores -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">AI 평가 점수</h2>
    <div class="w-16 h-1 rounded bg-violet-400 mb-8"></div>
    <div class="grid grid-cols-2 gap-8 items-center">
      <div>
        ${scoreBarHtml('종합 점수', c.scores.total)}
        ${scoreBarHtml('투자 관점', c.scores.investor)}
        ${scoreBarHtml('시장 관점', c.scores.market)}
        ${scoreBarHtml('기술 관점', c.scores.tech)}
      </div>
      <div class="flex items-center justify-center">
        <div class="w-44 h-44 rounded-full flex items-center justify-center" style="background: conic-gradient(${scoreColor(c.scores.total)} ${c.scores.total * 3.6}deg, rgba(255,255,255,0.1) 0deg)">
          <div class="w-36 h-36 rounded-full bg-slate-900 flex flex-col items-center justify-center">
            <span class="text-4xl font-extrabold" style="color:${scoreColor(c.scores.total)}">${c.scores.total}</span>
            <span class="text-sm text-white/50">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Slide 7: Roadmap + CTA -->
  <section class="slide flex-col justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-14">
    <h2 class="text-3xl font-extrabold text-white mb-2">로드맵 & Next Steps</h2>
    <div class="w-16 h-1 rounded bg-cyan-400 mb-6"></div>
    <div class="flex gap-4 mb-8">
      ${phasesHtml}
    </div>
    <div class="bg-white/10 rounded-xl p-5 mt-auto">
      <p class="text-lg font-bold text-cyan-300 mb-3">${escapeHtml(c.cta.message)}</p>
      <div class="flex flex-wrap gap-4">
        ${nextStepsHtml}
      </div>
    </div>
  </section>

</div>

<button class="nav-btn nav-prev" onclick="navigate(-1)">‹</button>
<button class="nav-btn nav-next" onclick="navigate(1)">›</button>
<div class="slide-counter"><span id="current">1</span> / <span id="total">7</span></div>

<script>
  const slides = document.querySelectorAll('.slide');
  let idx = 0;
  function show(i) {
    slides.forEach(s => s.classList.remove('active'));
    idx = (i + slides.length) % slides.length;
    slides[idx].classList.add('active');
    document.getElementById('current').textContent = idx + 1;
    document.getElementById('total').textContent = slides.length;
  }
  function navigate(dir) { show(idx + dir); }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') navigate(1);
    if (e.key === 'ArrowLeft') navigate(-1);
  });
</script>
</body>
</html>`
}
