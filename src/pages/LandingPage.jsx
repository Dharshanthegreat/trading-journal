import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/settings');
    }
  };

  return (
    <div className="lp-body" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      {/* Visual Backdrop */}
      <div className="lp-grid-bg" />
      <div className="lp-scanline" />

      {/* Radial lighting gradients */}
      <div className="lp-glow-radial" style={{ top: '20%', left: '25%', width: '500px', height: '500px', background: 'rgba(59, 130, 246, 0.15)' }} />
      <div className="lp-glow-radial" style={{ bottom: '20%', right: '25%', width: '500px', height: '500px', background: 'rgba(251, 191, 36, 0.1)' }} />

      {/* NAVIGATION */}
      <nav className="lp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-icon">
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>Trading Journal</span>
        </div>

        <div>
          {user ? (
            <Link to="/" className="lp-btn-neon-blue" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.75rem' }}>
              Launch Dashboard <ArrowUpRight size={14} />
            </Link>
          ) : (
            <Link to="/settings" className="lp-btn-neon-blue" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.75rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* HERO CONTENT */}
      <div style={{ 
        position: 'relative', 
        zIndex: 5, 
        textAlign: 'center', 
        padding: '0 20px', 
        maxWidth: '800px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '24px' 
      }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.2rem)', 
          fontWeight: 800,
          letterSpacing: '-1.5px', 
          lineHeight: 1.1, 
          margin: 0,
          color: '#ffffff'
        }}>
          Trade Smarter. <span className="lp-text-gradient-blue-gold">Scale Faster.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', 
          color: 'rgba(156, 163, 175, 0.9)',
          lineHeight: 1.6, 
          margin: 0, 
          maxWidth: '600px'
        }}>
          Access Prop Firm Challenges and Real Trading Accounts with MT5 Integration.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user ? (
            <button onClick={handleCtaClick} className="lp-btn-neon-blue">
              Go to Dashboard <ArrowUpRight size={16} />
            </button>
          ) : (
            <>
              <button onClick={handleCtaClick} className="lp-btn-neon-blue">
                Start Challenge <ArrowUpRight size={16} />
              </button>
              <Link to="/settings" className="lp-btn-neon-gold">
                Open Real Account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
