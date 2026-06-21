import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, BarChart2, Brain, Database, Sparkles, ShieldAlert, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ═══════════════════════════════════════════════════════
   ANIMATED CANDLESTICK CHART (Canvas)
   ═══════════════════════════════════════════════════════ */
const CandlestickCanvas = ({ style }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let tick = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const generateCandles = () => {
      const candles = [];
      let price = 1850 + Math.random() * 200;
      for (let i = 0; i < 60; i++) {
        const change = (Math.random() - 0.48) * 30;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * 15;
        const low = Math.min(open, close) - Math.random() * 15;
        price = close;
        candles.push({ open, close, high, low, bullish: close >= open });
      }
      return candles;
    };

    const candles = generateCandles();

    const draw = () => {
      tick++;
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < H; y += H / 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let x = 0; x < W; x += W / 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      const allPrices = candles.flatMap(c => [c.high, c.low]);
      const minP = Math.min(...allPrices);
      const maxP = Math.max(...allPrices);
      const range = maxP - minP || 1;
      const toY = (p) => H * 0.1 + ((maxP - p) / range) * H * 0.8;

      const candleW = (W / candles.length) * 0.6;
      const gap = W / candles.length;

      const maxVisible = Math.min(candles.length, Math.floor(tick / 2));

      for (let i = 0; i < maxVisible; i++) {
        const c = candles[i];
        const x = i * gap + gap / 2;
        const alpha = Math.min(1, (tick - i * 2) / 30) * 0.5;

        ctx.strokeStyle = c.bullish
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(248, 113, 113, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, toY(c.high));
        ctx.lineTo(x, toY(c.low));
        ctx.stroke();

        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBottom = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);

        ctx.fillStyle = c.bullish
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(248, 113, 113, ${alpha})`;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }

      if (maxVisible > 5) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.lineWidth = 1.5;
        const period = 5;
        for (let i = period; i < maxVisible; i++) {
          let sum = 0;
          for (let j = i - period; j < i; j++) sum += candles[j].close;
          const avg = sum / period;
          const x = i * gap + gap / 2;
          const y = toY(avg);
          if (i === period) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════
   TESTIMONIALS CAROUSEL DATA & COMPONENT
   ═══════════════════════════════════════════════════════ */
const testimonials = [
  {
    name: "Alex Rivera",
    handle: "@riveratrades",
    avatar: "AR",
    text: "This journal completely transformed my risk management. The Psychology Audit feature helped me realize that 80% of my losses happened on Fridays when I was trying to force trades. Game changer.",
    stats: "Win Rate: 58% → 67%"
  },
  {
    name: "Sarah Chen",
    handle: "@schen_fx",
    avatar: "SC",
    text: "The MT5 sync works flawlessly. Being able to see my equity curve automatically update without manual logging saves me hours every single weekend. Highly recommend to any serious operator.",
    stats: "Profit Factor: 1.4 → 2.1"
  },
  {
    name: "Marcus Vance",
    handle: "@mv_capital",
    avatar: "MV",
    text: "The Stoic Mindset Coach is surprisingly good. Reframing drawdowns using historical quotes sounds gimmick-y but it actually keeps me extremely calm during tough weeks.",
    stats: "Max Drawdown: -12% → -4%"
  },
  {
    name: "Elena Rostova",
    handle: "@rostova_trades",
    avatar: "ER",
    text: "Dual database control is exactly what I needed. I keep all my sensitive accounts local in the browser and use cloud mode for my public performance tracking account.",
    stats: "Active Accounts: 3 Live"
  },
  {
    name: "Tyler Jenkins",
    handle: "@t_jenkins_options",
    avatar: "TJ",
    text: "Vite build is super fast, UI looks futuristic, and the analytics are extremely detailed. It's the cleanest trading tool I have ever used.",
    stats: "Account Growth: +34% YTD"
  },
  {
    name: "Sophia Martinez",
    handle: "@sophia_quant",
    avatar: "SM",
    text: "I love the clean interface and the responsiveness. The dark claymorphic theme matches my desk setup perfectly. The statistics dashboard makes sharing logs with my team very easy.",
    stats: "Expectancy: +$142/trade"
  }
];

const TestimonialCard = ({ item }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backdropFilter: 'blur(12px)',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
  }} className="testimonial-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent, #6366f1), #a78bfa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#ffffff',
        boxShadow: '0 2px 10px rgba(129, 140, 248, 0.2)',
      }}>
        {item.avatar}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>{item.name}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>{item.handle}</div>
      </div>
    </div>
    <p style={{
      fontSize: '0.8rem',
      color: 'rgba(255, 255, 255, 0.6)',
      lineHeight: 1.5,
      margin: 0,
      fontWeight: 300,
    }}>
      "{item.text}"
    </p>
    {item.stats && (
      <div style={{
        alignSelf: 'flex-start',
        fontSize: '0.68rem',
        fontWeight: 600,
        color: '#10b981',
        background: 'rgba(16, 185, 129, 0.1)',
        padding: '4px 10px',
        borderRadius: '20px',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
        {item.stats}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN REDESIGNED LANDING PAGE
   ═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const videoCanvasRef = useRef(null);
  const videoFallbackRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const heroRef = useRef(null);
  const cardsTriggerRef = useRef(null);
  const fixedCardsRef = useRef(null);
  const sectionThreeInnerRef = useRef(null);

  const [framesReady, setFramesReady] = useState(false);

  const col1 = useMemo(() => [...testimonials.slice(0, 3), ...testimonials.slice(0, 3), ...testimonials.slice(0, 3)], []);
  const col2 = useMemo(() => [...testimonials.slice(3, 6), ...testimonials.slice(3, 6), ...testimonials.slice(3, 6)], []);

  const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260616_212935_bbf608da-62d1-4f25-9be4-c346e4d09cc8.mp4';

  // 1. SCROLL-DRIVEN BACKGROUND VIDEO DECODER & CANVAS RENDERER
  useEffect(() => {
    const canvas = videoCanvasRef.current;
    const videoEl = videoFallbackRef.current;
    if (!canvas || !videoEl) return;
    const ctx = canvas.getContext('2d');
    let frames = [];
    let isMounted = true;
    let lastFrameIndex = -1;
    let videoSeeking = false;

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      lastFrameIndex = -1;
    }

    async function extractFrames() {
      try {
        const response = await fetch(VIDEO_URL, { mode: 'cors' });
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.src = objectUrl;

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject();
          setTimeout(() => reject(), 15000);
        });

        const scale = Math.min(1, 1280 / video.videoWidth);
        const scaledWidth = Math.round(video.videoWidth * scale);
        const scaledHeight = Math.round(video.videoHeight * scale);
        const frameCount = Math.max(30, Math.min(120, Math.round(video.duration * 24)));

        for (let i = 0; i < frameCount; i++) {
          if (!isMounted) break;
          const time = (i / (frameCount - 1)) * (video.duration - 0.05);
          video.currentTime = time;
          await new Promise((resolve, reject) => {
            const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
            video.addEventListener('seeked', onSeeked);
            setTimeout(() => { video.removeEventListener('seeked', onSeeked); reject(); }, 3000);
          });
          const bitmap = await createImageBitmap(video, { resizeWidth: scaledWidth, resizeHeight: scaledHeight });
          frames.push(bitmap);
        }

        if (frames.length > 0 && isMounted) {
          setFramesReady(true);
          canvas.style.visibility = 'visible';
          if (videoEl) videoEl.style.display = 'none';
        }
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.warn("Video frame extraction failed, falling back to seeking fallback video element.", e);
      }
    }

    function getScrollBounds() {
      const vh = window.innerHeight;
      return { start: vh * 0.5, end: document.documentElement.scrollHeight - vh };
    }

    function getProgress() {
      const { start, end } = getScrollBounds();
      const range = end - start;
      if (range <= 0) return 0;
      return Math.max(0, Math.min(1, (window.scrollY - start) / range));
    }

    function drawFrame(frame) {
      if (!canvas) return;
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / frame.width, ch / frame.height);
      const dw = frame.width * s, dh = frame.height * s;
      ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    let animId;
    function videoTick() {
      if (!isMounted) return;
      const progress = getProgress();
      if (frames.length > 0) {
        const idx = Math.round(progress * (frames.length - 1));
        if (idx !== lastFrameIndex) {
          lastFrameIndex = idx;
          if (frames[idx]) drawFrame(frames[idx]);
        }
      } else if (videoEl && videoEl.duration && isFinite(videoEl.duration) && videoEl.readyState >= 1) {
        const target = progress * videoEl.duration;
        if (!videoSeeking && Math.abs(videoEl.currentTime - target) > 0.001) {
          videoSeeking = true;
          videoEl.currentTime = target;
        }
      }
      animId = requestAnimationFrame(videoTick);
    }

    const handleSeeked = () => { videoSeeking = false; };
    videoEl.addEventListener('seeked', handleSeeked);
    videoEl.addEventListener('stalled', handleSeeked);

    canvas.style.visibility = 'hidden';
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animId = requestAnimationFrame(videoTick);
    extractFrames();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      if (videoEl) {
        videoEl.removeEventListener('seeked', handleSeeked);
        videoEl.removeEventListener('stalled', handleSeeked);
      }
      frames.forEach(f => {
        if (f.close) f.close();
      });
    };
  }, []);

  // 2. VECTOR PARTICLES BACKGROUND SIMULATION
  useEffect(() => {
    const pCanvas = particlesCanvasRef.current;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    let particles = [];
    let isMounted = true;
    let animId;

    function resizeParticles() {
      if (!pCanvas) return;
      pCanvas.width = window.innerWidth;
      pCanvas.height = window.innerHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const count = Math.floor((pCanvas.width * pCanvas.height) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * pCanvas.width,
          y: Math.random() * pCanvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.6 + 0.2
        });
      }
    }

    function animateParticles() {
      if (!isMounted || !pCanvas) return;
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = pCanvas.width;
        if (p.x > pCanvas.width) p.x = 0;
        if (p.y < 0) p.y = pCanvas.height;
        if (p.y > pCanvas.height) p.y = 0;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        pCtx.fill();
      }
      animId = requestAnimationFrame(animateParticles);
    }

    resizeParticles();
    window.addEventListener('resize', resizeParticles);
    animId = requestAnimationFrame(animateParticles);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeParticles);
    };
  }, []);

  // 3. SCROLL PROGRESSION EFFECTS (Hero fade & fixed grid cards reveal mask)
  useEffect(() => {
    let animId;
    let isMounted = true;

    function tickScrollEffects() {
      if (!isMounted) return;

      // Hero Opacity fade
      const hero = heroRef.current;
      if (hero) {
        const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.3));
        hero.style.opacity = fade;
      }

      // Fixed Reveal Cards progress bounds
      const trigger = cardsTriggerRef.current;
      const fixedCards = fixedCardsRef.current;
      if (trigger && fixedCards) {
        const cardsGrid = fixedCards.querySelector('.grid');
        const rect = trigger.getBoundingClientRect();
        const triggerTop = rect.top + window.scrollY;
        const triggerHeight = rect.height;
        const scrollY = window.scrollY;
        const vh = window.innerHeight;

        const start = triggerTop - vh * 0.5;
        const end = triggerTop + triggerHeight - vh * 0.3;
        const range = end - start;

        let progress = range > 0 ? (scrollY - start) / range : 0;
        progress = Math.max(0, Math.min(1, progress));

        const isActive = scrollY >= start - vh * 0.2 && scrollY <= end + vh * 0.3;
        const fadeIn = Math.min(1, Math.max(0, (scrollY - (start - vh * 0.2)) / (vh * 0.2)));
        const fadeOut = Math.min(1, Math.max(0, (end + vh * 0.3 - scrollY) / (vh * 0.3)));
        const containerOpacity = isActive ? Math.min(fadeIn, fadeOut) : 0;

        fixedCards.style.opacity = containerOpacity;
        fixedCards.style.pointerEvents = containerOpacity > 0.1 ? 'auto' : 'none';

        if (cardsGrid) {
          const isMobile = window.innerWidth < 768;
          const revealPct = progress * 130;
          if (isMobile) {
            cardsGrid.style.maskImage = `linear-gradient(to bottom, black ${revealPct}%, transparent ${revealPct + 20}%)`;
            cardsGrid.style.webkitMaskImage = `linear-gradient(to bottom, black ${revealPct}%, transparent ${revealPct + 20}%)`;
          } else {
            cardsGrid.style.maskImage = `linear-gradient(to right, black ${revealPct}%, transparent ${revealPct + 15}%)`;
            cardsGrid.style.webkitMaskImage = `linear-gradient(to right, black ${revealPct}%, transparent ${revealPct + 15}%)`;
          }
        }
      }

      animId = requestAnimationFrame(tickScrollEffects);
    }

    animId = requestAnimationFrame(tickScrollEffects);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  // 4. SECTION 3 INTERSECTION VIEWPORT DETECTOR
  useEffect(() => {
    const el = sectionThreeInnerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('visible');
        observer.unobserve(el);
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  const handleCtaClick = () => {
    navigate(user ? '/dashboard' : '/settings');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#010101',
      color: '#ffffff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>

      {/* CSS STYLESHEET */}
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: hidden; scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #010101; color: #fff; }

        .fixed { position: fixed; }
        .absolute { position: absolute; }
        .relative { position: relative; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }

        /* Scroll Video */
        #scroll-video-container {
          position: fixed; inset: 0; z-index: -10;
          background: #0a0a0a; top: -20%;
        }
        #scroll-video-container canvas,
        #scroll-video-container video {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
        }
        #scroll-video-container .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }

        /* Particles */
        #particles-canvas {
          position: fixed; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 3;
        }

        /* Nav */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 2.5rem;
          background: rgba(1, 1, 1, 0.4);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        nav .logo { font-weight: 700; font-size: 1.25rem; color: #fff; letter-spacing: -0.025em; text-transform: lowercase; }
        nav .nav-links { display: flex; align-items: center; gap: 1.5rem; }
        nav .nav-links a { font-size: 0.875rem; color: #d1d5db; text-decoration: none; transition: color 0.2s; }
        nav .nav-links a:hover { color: #fff; }

        /* Hero */
        #hero {
          position: relative; height: 100vh; width: 100%; display: flex; flex-direction: column;
        }
        #hero .gradient-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(1,1,1,0.9), transparent, transparent);
        }
        #hero .content {
          position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: flex-end; text-align: center;
          padding: 0 1.5rem 6rem;
        }
        #hero .subtitle { font-size: 0.875rem; color: #9ca3af; margin-bottom: 1rem; letter-spacing: 0.05em; }
        #hero h1 { font-size: clamp(1.8rem, 5vw, 3.75rem); font-weight: 600; line-height: 1.15; max-width: 48rem; }
        #hero h1 .underlined {
          position: relative; display: inline-block;
        }
        #hero h1 .underlined .line {
          position: absolute; bottom: 0.25rem; left: 0; width: 100%; height: 10px;
          background: #2C5C88; border-radius: 2px;
        }
        #hero h1 .underlined span { position: relative; }
        #hero .ctas {
          display: flex; align-items: center; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; justify-content: center;
        }
        #hero .code-box {
          display: flex; align-items: center; gap: 0.5rem;
          background: #121214; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.5rem; padding: 0.875rem 2rem;
        }
        #hero .code-box .prompt { color: #2C5C88; font-family: monospace; font-size: 0.875rem; }
        #hero .code-box code { font-size: 0.875rem; color: #e5e7eb; font-family: monospace; }
        .cta-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: #2C5C88; color: #fff; font-weight: 500; border-radius: 0.5rem;
          padding: 0.875rem 2rem; font-size: 0.875rem; text-decoration: none; transition: background 0.2s, transform 0.2s;
        }
        .cta-btn:hover { background: #3a7aad; transform: translateY(-1px); }
        #hero .bounce-arrow {
          position: relative; z-index: 10; display: flex; justify-content: center; padding-bottom: 2rem;
        }
        #hero .bounce-arrow svg { width: 1.5rem; height: 1.5rem; color: #6b7280; animation: bounce 1s infinite; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25%); }
        }

        /* Fixed Cards */
        #fixed-cards {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 4;
          padding: 2rem 2.5rem; opacity: 0; pointer-events: none;
          background: transparent;
          display: flex;
          align-items: center;
          height: 100vh;
        }
        #fixed-cards .grid {
          max-width: 72rem; margin: 0 auto;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem;
          width: 100%;
        }
        #fixed-cards .card {
          background: rgba(18, 18, 20, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
          transition: border-color 0.3s;
        }
        #fixed-cards .card:hover {
          border-color: #2C5C88;
        }
        #fixed-cards .card h3 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 1rem; }
        #fixed-cards .card p { color: #d1d5db; font-size: 0.875rem; line-height: 1.6; }

        /* Section 3 */
        #section-three {
          position: relative; min-height: 100vh; display: flex; align-items: center;
          justify-content: center; padding: 0 2.5rem 8rem;
        }
        #section-three .inner {
          position: relative; z-index: 10; display: flex; flex-direction: column;
          align-items: center; text-align: center;
          opacity: 0; transform: translateY(32px); filter: blur(8px);
          transition: opacity 1.2s ease-out, transform 1.2s ease-out, filter 1.2s ease-out;
        }
        #section-three .inner.visible { opacity: 1; transform: translateY(0); filter: blur(0); }
        #section-three .inner p { color: #d1d5db; font-size: 1.2rem; margin-bottom: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; }
        #section-three .inner h2 { font-size: clamp(2rem, 6vw, 4.5rem); font-weight: 700; letter-spacing: -0.02em; }

        /* Content wrapper */
        #content { position: relative; z-index: 2; }

        /* Responsive */
        @media (max-width: 768px) {
          nav { padding: 1rem 1.5rem; }
          nav .nav-links { display: none; }
          #hero .content { padding-bottom: 5rem; }
          #hero h1 { font-size: 1.8rem; }
          #hero .ctas { flex-direction: column; }
          #fixed-cards { display: block; height: auto; position: fixed; top: 50%; transform: translateY(-50%); }
          #fixed-cards .grid { grid-template-columns: 1fr; gap: 1.5rem; }
          #fixed-cards .card { padding: 1.5rem 1.25rem; }
          #fixed-cards { padding: 1.5rem 1rem; }
          #section-three { padding-bottom: 5rem; }
        }

        .feature-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.4s ease;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-4px);
        }

        .ticker-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          white-space: nowrap;
        }

        .testimonial-track-container .testimonial-track {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .testimonial-track-container .track-up {
          animation: scroll-up 24s linear infinite;
        }
        .testimonial-track-container .track-down {
          animation: scroll-down 24s linear infinite;
        }
        .testimonial-track-container:hover .testimonial-track {
          animation-play-state: paused;
        }
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-33.333%); }
        }
        @keyframes scroll-down {
          0% { transform: translateY(-33.333%); }
          100% { transform: translateY(0); }
        }
        .testimonial-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(129, 140, 248, 0.3) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        @keyframes draw-equity {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { r: 3; opacity: 0.6; }
          50% { r: 5; opacity: 1; }
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Scroll Video Background */}
      <div id="scroll-video-container">
        <canvas ref={videoCanvasRef} id="video-canvas"></canvas>
        <video
          ref={videoFallbackRef}
          id="video-fallback"
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          src={VIDEO_URL}
        ></video>
        <div className="overlay"></div>
      </div>

      {/* Particles Simulation Overlay */}
      <canvas ref={particlesCanvasRef} id="particles-canvas"></canvas>

      {/* Navigation */}
      <nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="Trading Journal Logo" 
              style={{ height: '22px', width: 'auto' }} 
            />
            <span className="logo" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.025em' }}>
              trading journal
            </span>
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#testimonials">Testimonials</a>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={handleCtaClick} 
            className="cta-btn" 
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
          >
            {user ? 'Dashboard' : 'Sign In'} &rarr;
          </button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div id="content">

        {/* Section 1: Hero */}
        <section ref={heroRef} id="hero">
          <div className="gradient-overlay"></div>
          <div className="content">
            <p className="subtitle">Systematic Risk & Performance:</p>
            <h1>
              Instantly track, analyze, and master
              <span className="underlined"><span className="line"></span><span>&ensp;your edge&ensp;</span></span>
              on the web.
            </h1>
            <div className="ctas">
              <div className="code-box">
                <span className="prompt">&gt;</span>
                <code>npm i @trading-journal/core</code>
              </div>
              <button 
                onClick={handleCtaClick} 
                className="cta-btn"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                Get Started <span>&rarr;</span>
              </button>
            </div>
          </div>
          <div className="bounce-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </div>
        </section>

        {/* Spacer before reveal cards */}
        <div style={{ height: '100vh' }}></div>

        {/* Cards Trigger Zone (on-scroll fixed grid reveal triggers here) */}
        <div ref={cardsTriggerRef} id="cards-trigger" style={{ height: '220vh' }}></div>

        {/* Fixed Reveal Cards Grid */}
        <div ref={fixedCardsRef} id="fixed-cards">
          <div className="grid">
            <div className="card">
              <h3>Expectancy Analytics</h3>
              <p>Unlock detailed statistics on setup expectancy, session performance, drawdown metrics, and average payout ratios with direct analytical charts.</p>
            </div>
            <div className="card">
              <h3>Psychology Audit</h3>
              <p>Log emotional triggers such as greed, FOMO, or hesitation for every trade. Quantify and separate emotional factors from execution.</p>
            </div>
            <div className="card">
              <h3>Automated Syncing</h3>
              <p>Connect MT5, Tradovate, or Notion to seamlessly synchronize closed positions, P&L adjustments, and stats automatically in real time.</p>
            </div>
          </div>
        </div>

        {/* Spacer before Section 3 */}
        <div style={{ height: '100vh' }}></div>

        {/* Section 3: Product Presenting Banner */}
        <section id="section-three">
          <div ref={sectionThreeInnerRef} className="inner" id="section-three-inner">
            <p>Refining Performance</p>
            <h2>Trading Journal v2.0</h2>
          </div>
        </section>

        {/* ── MARKET TICKER ──────────────────────── */}
        <div style={{
          width: '100%',
          overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '14px 0',
          background: 'rgba(255,255,255,0.01)',
          position: 'relative',
          zIndex: 5,
          maskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
        }}>
          <div style={{
            display: 'flex',
            gap: '40px',
            animation: 'tickerScroll 40s linear infinite',
            whiteSpace: 'nowrap',
          }}>
            {[
              { s: 'EUR/USD', p: '1.0847', c: '+0.12%', up: true },
              { s: 'GBP/USD', p: '1.2731', c: '+0.08%', up: true },
              { s: 'USD/JPY', p: '149.82', c: '-0.15%', up: false },
              { s: 'XAU/USD', p: '2,341.50', c: '+0.45%', up: true },
              { s: 'BTC/USD', p: '67,234', c: '+1.23%', up: true },
              { s: 'US500', p: '5,432', c: '-0.22%', up: false },
              { s: 'NAS100', p: '18,921', c: '+0.67%', up: true },
              { s: 'EUR/USD', p: '1.0847', c: '+0.12%', up: true },
              { s: 'GBP/USD', p: '1.2731', c: '+0.08%', up: true },
              { s: 'USD/JPY', p: '149.82', c: '-0.15%', up: false },
              { s: 'XAU/USD', p: '2,341.50', c: '+0.45%', up: true },
              { s: 'BTC/USD', p: '67,234', c: '+1.23%', up: true },
              { s: 'US500', p: '5,432', c: '-0.22%', up: false },
              { s: 'NAS100', p: '18,921', c: '+0.67%', up: true },
            ].map((t, i) => (
              <div key={i} className="ticker-item">
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{t.s}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t.p}</span>
                <span style={{ color: t.up ? '#10b981' : '#f87171', fontWeight: 600, fontSize: '0.62rem' }}>{t.c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES GRID SECTION ───────────────────── */}
        <section
          id="features"
          style={{
            padding: '100px 24px',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 5,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 200,
              letterSpacing: '0.08em',
              margin: '0 0 16px',
              color: '#ffffff',
            }}>
              Engineered for Precision
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'rgba(255,255,255,0.35)',
              margin: 0,
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}>
              Advanced tools to refine your edge, audit your psychology, and compound your growth.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                icon: <Brain size={20} />,
                title: 'Psychology Audit',
                desc: 'Log emotional tags — greed, FOMO, hesitation — for every trade. Isolate your risk curves from mental slippage.',
              },
              {
                icon: <BarChart2 size={20} />,
                title: 'Expectancy Analytics',
                desc: 'Analyze win rates, average payouts, expectancy index, and drawdowns — categorized by setup and session.',
              },
              {
                icon: <TrendingUp size={20} />,
                title: 'MT5 & Tradovate Sync',
                desc: 'Connect your trading accounts to automatically sync closed positions, P&L, and performance data in real-time.',
              },
              {
                icon: <ShieldAlert size={20} />,
                title: 'Stoic Mindset Engine',
                desc: 'Reframe losses with AI-powered stoic philosophy. Build mental resilience and separate emotion from execution.',
              },
              {
                icon: <Sparkles size={20} />,
                title: 'AI Trading Coach',
                desc: 'Get personalized insights from an AI coach trained on professional trading psychology and risk management.',
              },
              {
                icon: <Database size={20} />,
                title: 'Dual Database Control',
                desc: 'Toggle between cloud PostgreSQL and offline browser storage. Export unified JSON backups with zero data lock-in.',
              },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: 0,
                  color: '#ffffff',
                  letterSpacing: '-0.2px',
                }}>{f.title}</h3>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.35)',
                  margin: 0,
                  lineHeight: 1.6,
                  fontWeight: 300,
                }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── EQUITY CURVE SHOWCASE ──────────────── */}
        <section style={{
          padding: '80px 24px',
          position: 'relative',
          zIndex: 5,
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Mockup header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                letterSpacing: '1px',
              }}>
                EQUITY CURVE // PERFORMANCE TRACKER
              </div>
            </div>

            {/* SVG Equity Curve */}
            <svg viewBox="0 0 800 200" style={{ width: '100%', height: 'auto' }}>
              {[40, 80, 120, 160].map(y => (
                <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              ))}
              <path
                d="M 10 180 Q 80 170 140 145 T 280 120 T 380 90 T 500 70 T 600 45 T 720 25 T 790 15"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1500,
                  strokeDashoffset: 1500,
                  animation: 'draw-equity 3s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards',
                }}
              />
              <defs>
                <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 180 Q 80 170 140 145 T 280 120 T 380 90 T 500 70 T 600 45 T 720 25 T 790 15 L 790 200 L 10 200 Z"
                fill="url(#eq-grad)"
                style={{
                  opacity: 0,
                  animation: 'fadeIn 1s ease 2.5s forwards',
                }}
              />
              <circle cx="790" cy="15" r="3" fill="#10b981" style={{ animation: 'pulse-dot 2s infinite' }} />
            </svg>

            {/* Stats row */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Total Trades', value: '247' },
                { label: 'Win Rate', value: '68.4%' },
                { label: 'Profit Factor', value: '2.84' },
                { label: 'Max Drawdown', value: '-4.2%' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: '1 1 120px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <div style={{
                    fontSize: '0.5rem',
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}>{s.label}</div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS SECTION ──────────────── */}
        <section id="testimonials" style={{
          padding: '100px 24px',
          position: 'relative',
          zIndex: 5,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 70%)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 200,
                letterSpacing: '0.08em',
                margin: '0 0 16px',
                color: '#ffffff',
              }}>
                Trusted by Elite Operators
              </h2>
              <p style={{
                fontSize: '0.95rem',
                color: 'rgba(255,255,255,0.35)',
                margin: 0,
                fontWeight: 300,
                letterSpacing: '0.05em',
              }}>
                Hear from systematic traders who have refined their edge using our analytics.
              </p>
            </div>

            <div 
              className="testimonial-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                height: '520px',
                overflow: 'hidden',
                position: 'relative',
                maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
              }}
            >
              {/* Column 1 - Scrolling UP */}
              <div className="testimonial-track-container" style={{ overflow: 'hidden', height: '100%' }}>
                <div className="testimonial-track track-up">
                  {col1.map((item, idx) => (
                    <TestimonialCard key={`col1-${idx}`} item={item} />
                  ))}
                </div>
              </div>

              {/* Column 2 - Scrolling DOWN */}
              <div className="testimonial-track-container testimonial-track-down-container" style={{ overflow: 'hidden', height: '100%' }}>
                <div className="testimonial-track track-down">
                  {col2.map((item, idx) => (
                    <TestimonialCard key={`col2-${idx}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA SECTION ────────────────────────── */}
        <section style={{
          padding: '80px 24px 100px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 5,
        }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
            fontWeight: 200,
            letterSpacing: '0.08em',
            margin: '0 0 16px',
            color: '#ffffff',
          }}>
            Ready to Master Your Edge?
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '32px',
            fontWeight: 300,
            letterSpacing: '0.04em',
          }}>
            Join disciplined traders who track every decision and compound every insight.
          </p>
          <button
            className="hero-btn cta-btn"
            onClick={handleCtaClick}
            style={{ margin: '0 auto', border: 'none', cursor: 'pointer' }}
          >
            Start Journaling <ArrowRight size={16} />
          </button>
        </section>

        {/* ── FOOTER ─────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '30px 24px',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.2)',
          position: 'relative',
          zIndex: 5,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <Activity size={12} color="rgba(255,255,255,0.4)" />
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', fontSize: '0.72rem' }}>
              TRADING JOURNAL
            </span>
          </div>
          <div style={{ letterSpacing: '0.05em' }}>
            &copy; {new Date().getFullYear()} Trading Journal. All rights reserved. Built for professional risk operators.
          </div>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
