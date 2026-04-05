import { escapeHtml } from '@/lib/utils/html'

export interface PptImageSlide {
  type: string
  title: string
  subtitle?: string
  points?: string[]
  visualDescription: string
}

export interface PptImageStory {
  theme: {
    primaryColor: string
    secondaryColor: string
    style: string
  }
  slides: PptImageSlide[]
}

function normalizeStory(raw: Record<string, unknown>): PptImageStory {
  const theme = (raw.theme as Record<string, unknown>) ?? {}
  const slides = Array.isArray(raw.slides) ? raw.slides : []

  return {
    theme: {
      primaryColor: typeof theme.primaryColor === 'string' ? theme.primaryColor : '#2563eb',
      secondaryColor: typeof theme.secondaryColor === 'string' ? theme.secondaryColor : '#7c3aed',
      style: typeof theme.style === 'string' ? theme.style : 'modern',
    },
    slides: slides.map((s: Record<string, unknown>) => ({
      type: typeof s.type === 'string' ? s.type : 'content',
      title: typeof s.title === 'string' ? s.title : '',
      subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
      points: Array.isArray(s.points) ? s.points.map(String) : undefined,
      visualDescription: typeof s.visualDescription === 'string' ? s.visualDescription : '',
    })),
  }
}

function buildSlideHtml(slide: PptImageSlide, imageUrl: string | null, index: number, primary: string, secondary: string): string {
  const bgStyle = imageUrl
    ? `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, ${primary}, ${secondary});`

  const overlayOpacity = imageUrl ? '0.65' : '0.3'

  const titleHtml = slide.title ? `<h2 class="slide-title">${escapeHtml(slide.title)}</h2>` : ''
  const subtitleHtml = slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''

  let bodyHtml = ''
  if (slide.points && slide.points.length > 0) {
    bodyHtml = `<ul class="slide-points">${slide.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
  }

  const isCover = slide.type === 'cover'
  const isCta = slide.type === 'cta'
  const contentAlign = isCover || isCta ? 'center' : 'flex-start'
  const textAlign = isCover || isCta ? 'center' : 'left'

  return `
  <section class="slide ${index === 0 ? 'active' : ''}" style="${bgStyle}">
    <div class="slide-overlay" style="background: linear-gradient(135deg, rgba(15,23,42,${overlayOpacity}), rgba(30,20,60,${overlayOpacity}));"></div>
    <div class="slide-content" style="align-items: ${contentAlign}; text-align: ${textAlign};">
      ${isCover ? `<div class="slide-badge">${escapeHtml(slide.subtitle || '')}</div>` : ''}
      ${titleHtml}
      ${!isCover ? subtitleHtml : ''}
      ${bodyHtml}
      ${isCta && slide.subtitle ? `<p class="slide-cta-text">${escapeHtml(slide.subtitle)}</p>` : ''}
    </div>
    <div class="slide-number">${index + 1}</div>
  </section>`
}

export function buildPptImageHtml(raw: Record<string, unknown>, imageUrls: (string | null)[]): string {
  const story = normalizeStory(raw)
  const { primaryColor, secondaryColor } = story.theme

  const slidesHtml = story.slides
    .map((slide, i) => buildSlideHtml(slide, imageUrls[i] ?? null, i, primaryColor, secondaryColor))
    .join('\n')

  const totalSlides = story.slides.length

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(story.slides[0]?.title || 'Presentation')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f172a;
    overflow: hidden;
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  }

  .slide-container {
    width: 960px;
    height: 540px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }

  .slide {
    display: none;
    width: 960px;
    height: 540px;
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
  }
  .slide.active { display: block; }

  .slide-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .slide-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 50px 70px;
    color: #ffffff;
  }

  .slide-badge {
    display: inline-block;
    padding: 6px 20px;
    border-radius: 50px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(8px);
    color: rgba(255,255,255,0.9);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
    margin-bottom: 24px;
  }

  .slide-title {
    font-size: 38px;
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 16px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.5);
    color: #ffffff;
  }

  .slide-subtitle {
    font-size: 18px;
    font-weight: 400;
    line-height: 1.6;
    color: rgba(255,255,255,0.85);
    max-width: 700px;
    text-shadow: 0 1px 8px rgba(0,0,0,0.4);
  }

  .slide-points {
    list-style: none;
    padding: 0;
    margin-top: 8px;
  }
  .slide-points li {
    position: relative;
    padding: 10px 0 10px 28px;
    font-size: 17px;
    font-weight: 400;
    color: rgba(255,255,255,0.9);
    line-height: 1.5;
    text-shadow: 0 1px 6px rgba(0,0,0,0.4);
  }
  .slide-points li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${primaryColor};
    box-shadow: 0 0 8px ${primaryColor}80;
  }

  .slide-cta-text {
    font-size: 20px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    margin-top: 20px;
    text-shadow: 0 1px 8px rgba(0,0,0,0.4);
  }

  .slide-number {
    position: absolute;
    bottom: 16px;
    right: 24px;
    z-index: 3;
    color: rgba(255,255,255,0.3);
    font-size: 12px;
    font-weight: 600;
  }

  .nav-btn {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 50;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background 0.2s;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.25); }
  .nav-prev { left: 16px; }
  .nav-next { right: 16px; }

  .slide-counter {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.5);
    font-size: 13px;
    z-index: 50;
    font-weight: 500;
  }

  .thumbnail-bar {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 50;
  }
  .thumb-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }
  .thumb-dot.active {
    background: ${primaryColor};
    box-shadow: 0 0 8px ${primaryColor}80;
    transform: scale(1.3);
  }

  @media print {
    body { background: white; }
    .nav-btn, .slide-counter, .thumbnail-bar { display: none !important; }
    .slide-container { width: 100%; height: auto; }
    .slide {
      display: block !important;
      position: relative !important;
      width: 100% !important;
      height: 540px !important;
      page-break-after: always;
    }
    .slide:last-child { page-break-after: auto; }
  }
</style>
</head>
<body>
<div class="slide-container">
${slidesHtml}
</div>

<button class="nav-btn nav-prev" onclick="navigate(-1)">\u2039</button>
<button class="nav-btn nav-next" onclick="navigate(1)">\u203a</button>
<div class="slide-counter"><span id="current">1</span> / <span id="total">${totalSlides}</span></div>
<div class="thumbnail-bar" id="thumbBar"></div>

<script>
  const slides = document.querySelectorAll('.slide');
  const thumbBar = document.getElementById('thumbBar');
  let idx = 0;

  // Create thumbnail dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'thumb-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => show(i);
    thumbBar.appendChild(dot);
  });

  function show(i) {
    slides.forEach(s => s.classList.remove('active'));
    idx = (i + slides.length) % slides.length;
    slides[idx].classList.add('active');
    document.getElementById('current').textContent = idx + 1;
    // Update dots
    thumbBar.querySelectorAll('.thumb-dot').forEach((d, j) => {
      d.classList.toggle('active', j === idx);
    });
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
