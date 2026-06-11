import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, ArrowRight, Zap, TrendingUp, Brain, BarChart2, Calendar } from 'lucide-react';

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await register(form.email, form.password, form.displayName);
      } else {
        await login(form.email, form.password);
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
    <div className="login-bg">
      {/* Subtle grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}/>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s6)', width: '100%', padding: 'var(--s8)' }}>

        {/* Card */}
        <div className="glass-deep login-card anim-fade-up">
          <div className="login-logo">
            <div className="login-logo-mark">
              <Activity size={24} color="#fff"/>
            </div>
            <div>
              <div className="login-title">Trading Journal</div>
              <div className="login-sub" style={{ marginTop: 6 }}>Professional Trading Journal</div>
            </div>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginBottom: 'var(--s6)' }}>
            {features.map((f, i) => (
              <div key={i} className={`anim-fade-up delay-${i+1}`} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s3)',
                padding: '7px var(--s3)', borderRadius: 'var(--r-md)',
                background: 'var(--surface-glass)', border: '1px solid var(--border)',
                fontSize: '0.78rem', color: 'var(--text-tertiary)',
              }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {isRegister && (
              <input
                className="input"
                placeholder="Display Name"
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
              />
            )}
            <input
              className="input"
              type="email"
              placeholder="Email address"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              required
              minLength={6}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--loss-soft)', border: '1px solid var(--loss-border)',
                fontSize: '0.75rem', color: 'var(--loss)',
              }}>
                {error}
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
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight size={15}/>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--s5)' }}>
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Inter',
              }}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>

          <div style={{ marginTop: 'var(--s4)', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Your data is stored securely on your own server
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
