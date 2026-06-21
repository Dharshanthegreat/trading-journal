import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth as authApi } from '../../services/api';
import { Activity, ArrowRight, Zap, TrendingUp, Brain, BarChart2, Calendar, Shield, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      const mode = localStorage.getItem('trading_journal_local_mode');
      setIsLocal(mode === 'local');
    };
    checkMode();
    const interval = setInterval(checkMode, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMessage('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (authMode === 'register') {
        await register(form.email, form.password, form.displayName);
      } else if (authMode === 'login') {
        await login(form.email, form.password);
      } else if (authMode === 'forgot') {
        const res = await authApi.forgotPassword(resetEmail);
        setSuccessMessage(res.message || 'Reset code generated. Check your server terminal.');
        setAuthMode('reset');
      } else if (authMode === 'reset') {
        if (newPassword !== confirmNewPassword) {
          throw new Error('New passwords do not match');
        }
        await authApi.resetPassword(resetEmail, resetCode, newPassword);
        setSuccessMessage('Password reset successfully. You can now sign in.');
        setForm(prev => ({ ...prev, email: resetEmail }));
        setNewPassword('');
        setConfirmNewPassword('');
        setResetCode('');
        setAuthMode('login');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <TrendingUp size={14}/>, text: 'Equity curve & advanced analytics' },
    { icon: <Brain size={14}/>, text: 'Psychology & emotion tracking' },
    { icon: <Calendar size={14}/>, text: 'Monthly P&L calendar' },
    { icon: <BarChart2 size={14}/>, text: 'Performance breakdowns' },
  ];

  return (
    <div className="login-bg" style={{
      position: 'relative',
      width: '100vw',
      minHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000',
      // Force dark mode styling variables regardless of active workspace theme
      '--bg-primary': '#0a0b0f',
      '--bg-secondary': '#0f1117',
      '--bg-tertiary': '#141620',
      '--bg-elevated': '#1a1c2b',
      '--surface': 'rgba(10, 10, 12, 0.85)',
      '--surface-glass': 'rgba(255, 255, 255, 0.05)',
      '--surface-glass-h': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#ffffff',
      '--text-secondary': 'rgba(255, 255, 255, 0.88)',
      '--text-tertiary': 'rgba(255, 255, 255, 0.68)',
      '--text-muted': 'rgba(255, 255, 255, 0.48)',
      '--accent': '#818cf8',
      '--accent-hover': '#6366f1',
      '--accent-soft': 'rgba(129, 140, 248, 0.12)',
      '--accent-glow': 'rgba(129, 140, 248, 0.3)',
      '--border': 'rgba(255, 255, 255, 0.08)',
      '--border-mid': 'rgba(255, 255, 255, 0.15)',
      '--border-strong': 'rgba(255, 255, 255, 0.25)',
    }}>
      {/* Full-screen background video */}
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
          zIndex: 0,
        }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4" type="video/mp4" />
      </video>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s6)', width: '100%', padding: 'var(--s8)' }}>

        {/* Card with higher backdrop blur and opacity for text clarity */}
        <div className="liquid-glass login-card anim-fade-up" style={{
          background: 'rgba(5, 5, 7, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <div className="login-logo">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="Trading Journal Logo" 
              className="anim-fade-in"
              style={{ 
                width: '100%', 
                maxWidth: '340px', 
                height: 'auto', 
                borderRadius: 'var(--r-lg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 'var(--s1)'
              }} 
            />
            {authMode === 'forgot' || authMode === 'reset' ? (
              <div className="login-sub" style={{ marginTop: 6, fontWeight: 600, color: 'var(--accent)' }}>
                Password Recovery Mode
              </div>
            ) : null}
          </div>

          {/* Features - Hide during password reset to keep focus */}
          {(authMode === 'login' || authMode === 'register') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginBottom: 'var(--s6)' }}>
              {features.map((f, i) => (
                <div key={i} className={`anim-fade-up delay-${i+1}`} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--s3)',
                  padding: '7px var(--s3)', borderRadius: 'var(--r-md)',
                  background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border)',
                  fontSize: '0.78rem', color: 'var(--text-secondary)',
                }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          )}

          {isLocal && (
            <div className="anim-fade-in" style={{
              background: 'var(--warn-soft)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              borderRadius: 'var(--r-md)',
              padding: '10px var(--s3)',
              marginBottom: 'var(--s4)',
              fontSize: '0.72rem',
              color: 'var(--warn)',
              lineHeight: 1.5,
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Shield size={13} /> Browser Database Mode Active
              </div>
              <div style={{ marginBottom: '8px' }}>
                The local backend server is offline. Your trading journal records will be stored safely in your browser storage.
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('trading_journal_local_mode', 'cloud');
                  window.location.reload();
                }}
                className="btn btn-sm btn-ghost"
                style={{
                  width: '100%', padding: '4px 8px', fontSize: '0.68rem',
                  color: 'var(--accent)', border: '1px solid var(--accent)', background: 'transparent',
                  cursor: 'pointer', display: 'block', textAlign: 'center'
                }}
              >
                Switch to Cloud Database Mode
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            
            {authMode === 'register' && (
              <input
                className="input"
                placeholder="Display Name"
                required
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
              />
            )}

            {(authMode === 'login' || authMode === 'register') && (
              <>
                <input
                  className="input"
                  type="email"
                  placeholder="Email address"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </>
            )}

            {authMode === 'forgot' && (
              <>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: '4px' }}>
                  Enter your registered email address. We will print a 6-digit recovery code directly to your backend server terminal.
                </div>
                <input
                  className="input"
                  type="email"
                  placeholder="Email address"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </>
            )}

            {authMode === 'reset' && (
              <>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: '4px' }}>
                  A reset code was printed to your server console. Enter it here alongside your new password.
                </div>
                <input
                  className="input"
                  type="text"
                  placeholder="6-Digit Reset Code"
                  required
                  maxLength={6}
                  minLength={6}
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password (min 6 characters)"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </>
            )}

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--loss-soft)', border: '1px solid var(--loss-border)',
                fontSize: '0.75rem', color: 'var(--loss)',
              }}>
                {error}
              </div>
            )}

            {successMessage && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r-md)',
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.75rem', color: '#10b981',
              }}>
                {successMessage}
              </div>
            )}

            {authMode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                <button
                  type="button"
                  onClick={() => { handleModeChange('forgot'); setResetEmail(form.email); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Inter',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center',
                padding: '10px', fontSize: '0.85rem', fontWeight: 600,
                marginTop: 'var(--s2)',
              }}
            >
              {loading ? 'Please wait...' : (
                authMode === 'login' ? 'Sign In' :
                authMode === 'register' ? 'Create Account' :
                authMode === 'forgot' ? 'Get Reset Code' : 'Save New Password'
              )}
              {!loading && <ArrowRight size={15}/>}
            </button>
          </form>

          {/* Mode Switchers */}
          <div style={{ textAlign: 'center', marginTop: 'var(--s5)' }}>
            {authMode === 'login' && (
              <button
                onClick={() => handleModeChange('register')}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Inter',
                }}
              >
                Don't have an account? Register
              </button>
            )}
            {authMode === 'register' && (
              <button
                onClick={() => handleModeChange('login')}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Inter',
                }}
              >
                Already have an account? Sign in
              </button>
            )}
            {(authMode === 'forgot' || authMode === 'reset') && (
              <button
                onClick={() => handleModeChange('login')}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Inter',
                }}
              >
                Back to Sign In
              </button>
            )}
          </div>

          <div style={{ marginTop: 'var(--s4)', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            {isLocal ? 'Your data is stored securely in your browser storage' : 'Your data is stored securely on your own server'}
          </div>
        </div>

        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
          Trading Journal v2.0 · Full-Stack Trading Journal
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
