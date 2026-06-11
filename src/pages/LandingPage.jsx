import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BarChart2, Brain, Database, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Light-Theme Interactive Particles Background ─── */
const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const particleCount = Math.min(80, Math.floor((width * height) / 20000));
    const mouse = { x: -1000, y: -1000, radius: 120 };

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.15 + 0.05;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Push away from cursor
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          this.x -= Math.cos(angle) * force * 0.8;
          this.y -= Math.sin(angle) * force * 0.8;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw lines between close particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (110 - dist) / 110 * 0.08;
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'absolute', 
        inset: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 2 
      }} 
    />
  );
};

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleCtaClick = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/settings');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      background: '#ffffff',
      color: '#000000',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* CSS Stylesheet Override */}
      <style>{`
        /* Core Animations */
        @keyframes draw-path {
          to { stroke-dashoffset: 0; }
        }
        @keyframes float-widget-slow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-widget-fast {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .anim-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-scale-in {
          animation: scale-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }

        .float-slow {
          animation: float-widget-slow 6s ease-in-out infinite;
        }
        .float-fast {
          animation: float-widget-fast 4.5s ease-in-out infinite;
        }

        /* Mockup interactive grid dot style */
        .dot-matrix {
          background-image: radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 0);
          background-size: 16px 16px;
        }

        .lp-btn-hover {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .lp-btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15) !important;
          background-color: #1a1a1a !important;
        }

        .lp-btn-outline-hover {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .lp-btn-outline-hover:hover {
          transform: translateY(-2px);
          background-color: #f9fafb !important;
          border-color: #000000 !important;
        }
      `}</style>

      {/* Particle Web Backdrop */}
      <InteractiveBackground />

      {/* Subtle Coordinate Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* ─── NAVIGATION ─── */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '72px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={15} color="#fff" />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#000000' }}>Trading Journal</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {user ? (
            <Link to="/" style={{
              background: '#000000',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              Launch Dashboard <ArrowUpRight size={14} />
            </Link>
          ) : (
            <Link to="/settings" style={{
              background: '#000000',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* ─── HERO & DASHBOARD GRID ─── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '120px 20px 60px 20px',
        position: 'relative',
        zIndex: 5,
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Content Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '48px', 
          width: '100%', 
          alignItems: 'center'
        }}>
          
          {/* Left Column: Premium Copywriting */}
          <div 
            className={`anim-slide-up ${isLoaded ? '' : 'hide'}`} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              opacity: isLoaded ? 1 : 0
            }}
          >
            {/* Minimalist Tech Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '12px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#4b5563',
              alignSelf: 'flex-start'
            }}>
              <Sparkles size={11} style={{ color: '#000000' }} /> BEHAVIORAL ANALYTICS ENGINE
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.1rem)', 
              fontWeight: 900,
              letterSpacing: '-2px', 
              lineHeight: 1.05, 
              margin: 0,
              color: '#000000'
            }}>
              Master Your Mind.<br />
              <span style={{ color: '#6b7280' }}>Optimize Your Metrics.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.15rem)', 
              color: '#4b5563',
              lineHeight: 1.6, 
              margin: 0, 
              maxWidth: '520px',
              fontWeight: 400
            }}>
              A premium trading journal engineered to eliminate emotional leaks, audit setup expectancy, and sync your performance statistics automatically.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
              <button 
                onClick={handleCtaClick} 
                className="lp-btn-hover"
                style={{
                  background: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  padding: '14px 32px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                Launch Journal <ArrowRight size={16} />
              </button>
              
              <a 
                href="#features" 
                className="lp-btn-outline-hover"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  padding: '14px 32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Core Modules
              </a>
            </div>
          </div>

          {/* Right Column: Animated B&W Dashboard Mockup */}
          <div 
            className={`anim-scale-in delay-200`} 
            style={{ 
              position: 'relative',
              width: '100%',
              aspectRatio: '1.25/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Dashboard Outer Base */}
            <div 
              className="dot-matrix"
              style={{
                width: '90%',
                height: '90%',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Mockup Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e5e7eb' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e5e7eb' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e5e7eb' }} />
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', fontFamily: 'JetBrains Mono' }}>
                  ANALYTICS // SESSION_ACTIVE
                </div>
              </div>

              {/* Dynamic Self-Drawing Equity Curve SVG */}
              <div style={{ position: 'relative', flex: 1, minHeight: '130px', margin: '10px 0' }}>
                <svg viewBox="0 0 400 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#f3f4f6" strokeWidth="1" />
                  
                  {/* Equity Line (Self drawing animation) */}
                  <path
                    d="M 10 130 Q 80 140 120 95 T 230 80 T 320 35 T 390 15"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 1000,
                      strokeDashoffset: 1000,
                      animation: 'draw-path 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      animationDelay: '0.5s'
                    }}
                  />
                  
                  {/* Pulsing endpoint dot */}
                  <circle
                    cx="390"
                    cy="15"
                    r="4"
                    fill="#000000"
                    style={{
                      animation: 'pulse-ring 2s infinite'
                    }}
                  />
                </svg>
              </div>

              {/* Mockup footer row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#fafafa', border: '1px solid #f3f4f6', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.55rem', color: '#9ca3af', textTransform: 'uppercase' }}>Win Rate</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000' }}>68.4%</div>
                </div>
                <div style={{ flex: 1, background: '#fafafa', border: '1px solid #f3f4f6', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.55rem', color: '#9ca3af', textTransform: 'uppercase' }}>Profit Factor</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000' }}>2.84</div>
                </div>
              </div>
            </div>

            {/* Float Widget 1: AI Coach Response (Drifting) */}
            <div 
              className="float-slow"
              style={{
                position: 'absolute',
                top: '-5%',
                right: '0%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>AI Coach</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#000000' }}>Exit strategy is highly optimal.</div>
              </div>
            </div>

            {/* Float Widget 2: Psychology Leak Warning (Drifting opposite) */}
            <div 
              className="float-fast"
              style={{
                position: 'absolute',
                bottom: '5%',
                left: '-2%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10
              }}
            >
              <ShieldAlert size={14} style={{ color: '#000000' }} />
              <div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Psychology Shield</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#000000' }}>FOMO Alert: Protected.</div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ─── MODULES / FEATURES SECTION ─── */}
      <section 
        id="features" 
        style={{
          borderTop: '1px solid #f3f4f6',
          background: '#fafafa',
          padding: '80px 20px',
          position: 'relative',
          zIndex: 5
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 12px 0' }}>Engineered for Disciplined Execution</h2>
            <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0 }}>Advanced utilities to support your metrics and refine your psychology.</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}>
            {/* Feature 1: Psychology Audits */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '30px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Brain size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Psychology Audit</h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
                Log emotional tags (greed, FOMO, hesitation) for every trade. Keep your risk curves isolated from mental slippage.
              </p>
            </div>

            {/* Feature 2: Expectancy Curves */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '30px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <BarChart2 size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Expectancy Analytics</h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
                Analyze win rates, average payouts, expectancy index, and drawdowns categorized automatically by setups.
              </p>
            </div>

            {/* Feature 3: Data Integrity */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '30px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Database size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Pro Max Control Center</h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
                Seamlessly export unified JSON backups. Restore or merge your database logs with no data lock-in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: '1px solid #e5e7eb',
        padding: '30px 20px',
        textAlign: 'center',
        background: '#ffffff',
        fontSize: '0.72rem',
        color: '#9ca3af',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Activity size={12} color="#000" />
          <span style={{ fontWeight: 700, color: '#000' }}>Trading Journal</span>
        </div>
        <div>&copy; {new Date().getFullYear()} Trading Journal. All rights reserved. Built for professional risk operators.</div>
      </footer>

    </div>
  );
};

export default LandingPage;
