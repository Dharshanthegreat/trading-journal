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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#ffffff',
      color: '#000000',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Subtle Light Grid Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Subtle Light Gray Auras */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.02)',
        filter: 'blur(120px)',
        pointerEvents: 'none',
        zIndex: 2
      }} />

      {/* NAVIGATION */}
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

        <div>
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
        gap: '20px' 
      }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
          fontWeight: 900,
          letterSpacing: '-2px', 
          lineHeight: 1.05, 
          margin: 0,
          color: '#000000'
        }}>
          Trade Smarter.<br />
          <span style={{ color: '#6b7280' }}>Scale Faster.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', 
          color: '#4b5563',
          lineHeight: 1.6, 
          margin: '10px 0 20px 0', 
          maxWidth: '580px',
          fontWeight: 400
        }}>
          Access Prop Firm Challenges and Real Trading Accounts with MT5 Integration.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user ? (
            <button onClick={handleCtaClick} style={{
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '12px 28px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.2s, background 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              Go to Dashboard <ArrowUpRight size={16} />
            </button>
          ) : (
            <>
              <button onClick={handleCtaClick} style={{
                background: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                padding: '12px 28px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s, background 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                Start Challenge <ArrowUpRight size={16} />
              </button>
              <Link to="/settings" style={{
                background: '#ffffff',
                color: '#000000',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                padding: '12px 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
              >
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
