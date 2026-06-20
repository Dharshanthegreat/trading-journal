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

    // Generate candlestick data
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

      // Grid lines
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

      // Normalize prices
      const allPrices = candles.flatMap(c => [c.high, c.low]);
      const minP = Math.min(...allPrices);
      const maxP = Math.max(...allPrices);
      const range = maxP - minP || 1;
      const toY = (p) => H * 0.1 + ((maxP - p) / range) * H * 0.8;

      const candleW = (W / candles.length) * 0.6;
      const gap = W / candles.length;

      // Fade-in based on tick
      const maxVisible = Math.min(candles.length, Math.floor(tick / 2));

      for (let i = 0; i < maxVisible; i++) {
        const c = candles[i];
        const x = i * gap + gap / 2;
        const alpha = Math.min(1, (tick - i * 2) / 30) * 0.5;

        // Wick
        ctx.strokeStyle = c.bullish
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(248, 113, 113, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, toY(c.high));
        ctx.lineTo(x, toY(c.low));
        ctx.stroke();

        // Body
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBottom = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);

        ctx.fillStyle = c.bullish
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(248, 113, 113, ${alpha})`;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }

      // Moving average line
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
   FLOATING STAT WIDGET
   ═══════════════════════════════════════════════════════ */
const FloatingStat = ({ label, value, color, delay, position }) => (
  <div style={{
    position: 'absolute',
    ...position,
    background: 'rgba(15, 15, 20, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '10px 16px',
    opacity: 0,
    animation: `statFloat 8s ease-in-out infinite, fadeSlideIn 1s ease ${delay}s forwards`,
    zIndex: 10,
  }}>
    <div style={{
      fontSize: '0.55rem',
      color: 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontWeight: 600,
      marginBottom: '3px',
      fontFamily: "'Inter', sans-serif",
    }}>{label}</div>
    <div style={{
      fontSize: '1rem',
      fontWeight: 700,
      color,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);    // 0=ferrari, 1=transition, 2=dashboard
  const [loaded, setLoaded] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    setLoaded(true);
    // Phase timeline
    const t1 = setTimeout(() => setPhase(1), 3500);   // start transition
    const t2 = setTimeout(() => setPhase(2), 5000);   // dashboard bg
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleCtaClick = () => {
    navigate(user ? '/dashboard' : '/settings');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0a0a0e',
      color: '#ffffff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>

      {/* ── Stylesheet ─────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes statFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ferrariDrive {
          0% { transform: translateX(-120%) scale(1); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(0%) scale(1.02); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(120%) scale(1); opacity: 0; }
        }
        @keyframes blurWipe {
          0% { backdrop-filter: blur(0px); background: rgba(10,10,14,0); }
          100% { backdrop-filter: blur(40px); background: rgba(10,10,14,0.85); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        @keyframes heroShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes draw-equity {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { r: 3; opacity: 0.6; }
          50% { r: 5; opacity: 1; }
        }

        .hero-title {
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          font-weight: 200;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #ffffff;
          margin: 0;
          line-height: 1.1;
          text-align: center;
        }

        .hero-subtitle {
          font-size: clamp(0.8rem, 1.5vw, 1.05rem);
          font-weight: 300;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.45);
          text-align: center;
          margin: 0;
        }

        .hero-btn {
          padding: 14px 36px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Inter', sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .hero-btn-primary {
          background: #ffffff;
          color: #0a0a0e;
          border: none;
          box-shadow: 0 0 40px rgba(255,255,255,0.08);
        }
        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(255,255,255,0.15);
          background: #f0f0f0;
        }
        .hero-btn-secondary {
          background: transparent;
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .hero-btn-secondary:hover {
          border-color: rgba(255,255,255,0.3);
          color: #ffffff;
          transform: translateY(-2px);
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
      `}</style>

      {/* ── HERO SECTION ───────────────────────── */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          minHeight: '700px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Layer 1: Cinematic Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: phase >= 1 ? 0 : 0.7,
            transition: 'opacity 2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
          }}
        >
          <source src="/trading-journal/Create_an_ultra_realistic_cine.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Layer 2: Cinematic vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 45%, transparent 30%, rgba(10,10,14,0.85) 100%),
            linear-gradient(180deg, rgba(10,10,14,0.3) 0%, transparent 30%, transparent 70%, rgba(10,10,14,0.95) 100%)
          `,
          zIndex: 2,
        }} />

        {/* Layer 3: Transition blur overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: phase >= 1 ? 'blur(30px)' : 'blur(0px)',
          background: phase >= 1 ? 'rgba(10,10,14,0.88)' : 'rgba(10,10,14,0)',
          transition: 'all 1.8s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 3,
        }} />

        {/* Layer 4: Dashboard Candlestick BG (appears after transition) */}
        {phase >= 2 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            opacity: 0,
            animation: 'fadeIn 2s ease 0.3s forwards',
          }}>
            <CandlestickCanvas />
          </div>
        )}

        {/* Layer 5: Subtle grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridPulse 8s ease-in-out infinite',
          zIndex: 5,
          pointerEvents: 'none',
        }} />

        {/* Layer 6: Content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          padding: '0 24px',
          maxWidth: '900px',
          width: '100%',
        }}>
          {/* Title */}
          <h1
            className="hero-title"
            style={{
              opacity: 0,
              animation: loaded ? `fadeSlideIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${phase >= 1 ? '0s' : '1.5s'} forwards` : 'none',
            }}
          >
            Trading Journal
          </h1>

          {/* Subtitle */}
          <p
            className="hero-subtitle"
            style={{
              opacity: 0,
              animation: loaded ? `fadeSlideIn 1s ease ${phase >= 1 ? '0.3s' : '2.2s'} forwards` : 'none',
            }}
          >
            Every Trade.&ensp;Every Insight.&ensp;Every Improvement.
          </p>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            opacity: 0,
            animation: loaded ? `fadeSlideIn 1s ease ${phase >= 1 ? '0.6s' : '2.8s'} forwards` : 'none',
          }}>
            <button
              className="hero-btn hero-btn-primary"
              onClick={handleCtaClick}
            >
              Start Journaling <ArrowRight size={16} />
            </button>
            <a
              href="#features"
              className="hero-btn hero-btn-secondary"
            >
              Explore Dashboard
            </a>
          </div>
        </div>

        {/* Layer 7: Floating Stats (appear in dashboard phase) */}
        {phase >= 2 && (
          <>
            <FloatingStat
              label="Win Rate" value="68.4%"
              color="#10b981" delay={1.2}
              position={{ top: '18%', right: '8%' }}
            />
            <FloatingStat
              label="Profit Factor" value="2.84"
              color="#6366f1" delay={1.6}
              position={{ bottom: '22%', left: '6%' }}
            />
            <FloatingStat
              label="Avg R:R" value="1:2.4"
              color="#f59e0b" delay={2.0}
              position={{ top: '28%', left: '10%' }}
            />
            <FloatingStat
              label="Total P&L" value="+$12,480"
              color="#10b981" delay={2.4}
              position={{ bottom: '18%', right: '10%' }}
            />
          </>
        )}

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(transparent, #0a0a0e)',
          zIndex: 8,
          pointerEvents: 'none',
        }} />
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

      {/* ── FEATURES SECTION ───────────────────── */}
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
            {/* Grid */}
            {[40, 80, 120, 160].map(y => (
              <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            ))}
            {/* Equity Path */}
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
            {/* Gradient fill */}
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
            {/* Endpoint */}
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
          className="hero-btn hero-btn-primary"
          onClick={handleCtaClick}
          style={{ margin: '0 auto' }}
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
  );
};

export default LandingPage;
