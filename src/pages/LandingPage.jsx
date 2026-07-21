import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, BarChart2, Brain, Database as DatabaseIcon, Sparkles, ShieldAlert, TrendingUp } from 'lucide-react';
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

  // Refs for video section mouse scrub logic
  const mainframeVideoRef = useRef(null);
  const targetTimeRef = useRef(0);
  const prevXRef = useRef(0);
  const isSeekingRef = useRef(false);

  // Mainframe video mouse scrub logic
  useEffect(() => {
    const video = mainframeVideoRef.current;
    if (!video) return;

    const handleMouseMove = (e) => {
      const currentX = e.clientX;
      const prevX = prevXRef.current;
      prevXRef.current = currentX;

      if (!video.duration || isNaN(video.duration)) return;

      const delta = currentX - prevX;
      const timeOffset = (delta / window.innerWidth) * 0.8 * video.duration;
      let newTarget = targetTimeRef.current + timeOffset;

      newTarget = Math.max(0, Math.min(video.duration, newTarget));
      targetTimeRef.current = newTarget;

      seekVideo();
    };

    const seekVideo = () => {
      if (isSeekingRef.current) return;
      if (Math.abs(video.currentTime - targetTimeRef.current) < 0.01) return;

      isSeekingRef.current = true;
      video.currentTime = targetTimeRef.current;
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
      seekVideo();
    };

    window.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

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

  // 2. VECTOR PARTICLES BACKGROUND SIMULATION (Sci-Fi Warp Speed Edition)
  useEffect(() => {
    const pCanvas = particlesCanvasRef.current;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    let particles = [];
    let isMounted = true;
    let animId;

    const maxDepth = 1000;
    const colors = [
      { r: 0, g: 255, b: 102 },   // Neon Green
      { r: 0, g: 240, b: 255 },   // Neon Cyan
      { r: 0, g: 162, b: 255 },   // Cyan Blue
      { r: 16, g: 185, b: 129 }   // Emerald Green
    ];

    function createParticle(resetZ = false) {
      const angle = Math.random() * Math.PI * 2;
      // Distribute particles in a circular space outwards
      const radius = Math.random() * Math.max(pCanvas.width, pCanvas.height) * 0.5 + 10;
      
      const colorObj = colors[Math.floor(Math.random() * colors.length)];
      
      // Categorize particles into streaks, dust, and standard warp particles
      const typeRand = Math.random();
      let type = 'particle';
      let speed = Math.random() * 8 + 6;
      let size = Math.random() * 1.2 + 0.6;
      let trailLength = Math.random() * 4 + 3; // multiplier of speed for tail length

      if (typeRand > 0.85) {
        type = 'streak';
        speed = Math.random() * 14 + 12;
        size = Math.random() * 1.5 + 1.0;
        trailLength = Math.random() * 6 + 6;
      } else if (typeRand < 0.2) {
        type = 'dust';
        speed = Math.random() * 3 + 2;
        size = Math.random() * 0.6 + 0.3;
        trailLength = 1.5;
      }

      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: resetZ ? maxDepth : Math.random() * maxDepth,
        speed: speed,
        size: size,
        color: colorObj,
        trailLength: trailLength,
        type: type
      };
    }

    function resizeParticles() {
      if (!pCanvas) return;
      pCanvas.width = window.innerWidth;
      pCanvas.height = window.innerHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const count = Math.min(800, Math.floor((pCanvas.width * pCanvas.height) / 1800));
      for (let i = 0; i < count; i++) {
        particles.push(createParticle(false));
      }
    }

    function animateParticles() {
      if (!isMounted || !pCanvas) return;

      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

      const cx = pCanvas.width / 2;
      const cy = pCanvas.height / 2;
      const scale = (pCanvas.width + pCanvas.height) / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particle closer on Z axis
        p.z -= p.speed;

        // Reset if it gets past the viewer
        if (p.z <= 0) {
          particles[i] = createParticle(true);
          continue;
        }

        // Project to 2D
        const px = (p.x / p.z) * scale + cx;
        const py = (p.y / p.z) * scale + cy;

        // Reset if it goes out of canvas bounds
        if (px < -100 || px > pCanvas.width + 100 || py < -100 || py > pCanvas.height + 100) {
          particles[i] = createParticle(true);
          continue;
        }

        // Calculate trailing point
        const tailZ = p.z + p.speed * p.trailLength;
        const tx = (p.x / tailZ) * scale + cx;
        const ty = (p.y / tailZ) * scale + cy;

        // Draw trail segment
        pCtx.beginPath();
        pCtx.moveTo(tx, ty);
        pCtx.lineTo(px, py);
        
        const proximity = (1 - p.z / maxDepth);
        const alpha = Math.min(0.85, proximity * 0.75 + 0.1);
        
        pCtx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
        pCtx.lineWidth = p.size * (proximity * 1.5 + 0.5);
        pCtx.lineCap = 'round';
        pCtx.stroke();

        // Draw a glowing, bright core at the front tip
        if (p.type === 'streak' || p.type === 'particle') {
          pCtx.beginPath();
          pCtx.arc(px, py, p.size * 0.75, 0, Math.PI * 2);
          pCtx.fillStyle = `rgba(255, 255, 255, ${alpha + 0.15})`;
          pCtx.fill();
        }
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
          filter: brightness(1.4) contrast(1.1) saturate(1.05);
        }
        #scroll-video-container .overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(6, 12, 38, 0.0) 0%, rgba(1, 4, 16, 0.4) 100%);
        }

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

        /* MAINFRAME PILL STYLING */
        .mainframe-pill-white {
          display: inline-flex; align-items: center; justify-content: center;
          background: #ffffff; color: #000000; border: 1px solid rgba(0,0,0,0.1);
          border-radius: 9999px; font-size: clamp(13px, 2vw, 15px);
          padding: 0.3em 1.2em; margin: 0.2em;
          white-space: nowrap; transition: background 0.2s, color 0.2s;
          cursor: pointer; font-family: var(--font-body);
        }
        .mainframe-pill-white:hover {
          background: #000000; color: #ffffff;
        }
        .mainframe-pill-outline {
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; color: #ffffff; border: 1px solid #ffffff;
          border-radius: 9999px; font-size: clamp(13px, 2vw, 15px);
          padding: 0.3em 1.2em; margin: 0.2em;
          white-space: nowrap; transition: background 0.2s, color 0.2s;
          cursor: pointer; gap: 8px; font-family: var(--font-body);
        }
        .mainframe-pill-outline:hover {
          background: #ffffff; color: #000000;
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
            <p style={{ marginTop: '1.25rem', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.95rem', fontStyle: 'italic', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              "Focus on the process, not on the result"
            </p>
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

        {/* Spacer before Mainframe section */}
        <div style={{ height: '100vh' }}></div>

        {/* Section: Background Video Section (Scrub Interaction) */}
        <section id="mainframe-section" style={{
          position: 'relative',
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 6,
          background: '#010101',
          color: '#ffffff',
        }}>
          {/* Background Video Wrapper (Clipped & Masked) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: '#010101',
            maskImage: 'radial-gradient(circle at 70% 50%, black 10%, transparent 60%)',
            WebkitMaskImage: 'radial-gradient(circle at 70% 50%, black 10%, transparent 60%)',
          }}>
            <video
              ref={mainframeVideoRef}
              muted
              playsInline
              preload="auto"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '70% center',
                filter: 'brightness(0.3) contrast(1.25) saturate(0.85)',
              }}
            >
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Smooth overlay to blend the light-background video with the dark landing page theme */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, #010101 0%, rgba(1, 1, 1, 0.1) 25%, rgba(1, 1, 1, 0.1) 75%, #010101 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        </section>

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
                icon: <DatabaseIcon size={20} />,
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
