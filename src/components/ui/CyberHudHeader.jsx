import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ChevronDown, Bell, Zap, Shield, Cpu, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const CyberHudHeader = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [ping, setPing] = useState(14);
  const [symbol, setSymbol] = useState('EUR/USD');
  const [aiCore, setAiCore] = useState('Claude 3.7 Sonnet');
  const [showSymbolMenu, setShowSymbolMenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const isLight = theme === 'minimal' || theme === 'chill-white';

  useEffect(() => {
    if (isLight) return;
    const interval = setInterval(() => {
      setPing(Math.floor(12 + Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLight]);

  if (isLight) return null;

  return (
    <div className="cyber-hud-bar">
      {/* Left side: System status & latency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#34d399', letterSpacing: '0.5px' }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block',
            animation: 'pulseGlowGreen 2s infinite'
          }} />
          SYSTEM ACTIVE
        </div>
        <span style={{ opacity: 0.3 }}>|</span>
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>
          PING: <strong style={{ color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>{ping}ms</strong>
        </div>
      </div>

      {/* Middle & Right: Command, Selectors, Execution & User badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Command Palette Trigger */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="cyber-hud-badge"
          style={{ cursor: 'pointer' }}
          onClick={() => alert('Command Palette active. Press ⌘K or Ctrl+K to trigger quick actions.')}
        >
          <Search size={11} style={{ opacity: 0.7 }} />
          <span>COMMAND</span>
          <kbd style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '1px 4px',
            borderRadius: '3px',
            fontSize: '0.58rem',
            color: 'var(--text-primary)',
            fontFamily: 'sans-serif'
          }}>⌘ K</kbd>
        </motion.div>

        {/* Currency / Symbol Selector */}
        <div style={{ position: 'relative' }}>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="cyber-hud-badge"
            onClick={() => {
              setShowSymbolMenu(!showSymbolMenu);
              setShowAiMenu(false);
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{symbol}</span>
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </motion.div>
          
          <AnimatePresence>
            {showSymbolMenu && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.95 }}
                style={{
                  position: 'absolute', top: '120%', right: 0, width: '130px',
                  background: 'rgba(15, 17, 23, 0.95)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px', backdropFilter: 'blur(16px)', padding: '4px', zIndex: 1000
                }}
              >
                {['EUR/USD', 'XAU/USD', 'NAS100', 'US30', 'GBP/USD', 'BTC/USD'].map(s => (
                  <div
                    key={s}
                    onClick={() => { setSymbol(s); setShowSymbolMenu(false); }}
                    style={{
                      padding: '6px 10px', fontSize: '0.68rem', borderRadius: '4px',
                      cursor: 'pointer', color: s === symbol ? '#06b6d4' : 'var(--text-secondary)',
                      fontWeight: s === symbol ? 700 : 400,
                      background: s === symbol ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
                    }}
                  >
                    {s}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active AI Core Selector */}
        <div style={{ position: 'relative' }}>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="cyber-hud-badge"
            onClick={() => {
              setShowAiMenu(!showAiMenu);
              setShowSymbolMenu(false);
            }}
          >
            <Cpu size={11} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>ACTIVE CORE</span>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>{aiCore}</span>
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </motion.div>

          <AnimatePresence>
            {showAiMenu && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.95 }}
                style={{
                  position: 'absolute', top: '120%', right: 0, width: '180px',
                  background: 'rgba(15, 17, 23, 0.95)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px', backdropFilter: 'blur(16px)', padding: '4px', zIndex: 1000
                }}
              >
                {['Claude 3.7 Sonnet', 'Llama-3.1-Nemotron', 'GPT-4o Omnia'].map(core => (
                  <div
                    key={core}
                    onClick={() => { setAiCore(core); setShowAiMenu(false); }}
                    style={{
                      padding: '6px 10px', fontSize: '0.68rem', borderRadius: '4px',
                      cursor: 'pointer', color: core === aiCore ? '#818cf8' : 'var(--text-secondary)',
                      fontWeight: core === aiCore ? 700 : 400,
                      background: core === aiCore ? 'rgba(129, 140, 248, 0.12)' : 'transparent'
                    }}
                  >
                    🤖 {core}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LOG EXECUTION Button */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)' }}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#06b6d4', padding: '4px 10px', borderRadius: '6px',
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.6px',
            cursor: 'pointer', textTransform: 'uppercase'
          }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-new-trade-modal'))}
        >
          <Zap size={11} /> LOG EXECUTION
        </motion.button>

        {/* Notifications Icon with Badge */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}
        >
          <Bell size={13} style={{ color: 'var(--text-secondary)' }} />
          <span style={{
            position: 'absolute', top: '1px', right: '1px',
            background: '#ef4444', color: '#fff', fontSize: '0.52rem',
            fontWeight: 800, width: '13px', height: '13px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>3</span>
        </motion.div>

        {/* Operator Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
          <span>{user?.displayName ? user.displayName.toUpperCase() : 'GUEST OPERATOR'}</span>
          <span style={{
            fontSize: '0.55rem', fontWeight: 800, background: 'rgba(255,255,255,0.08)',
            padding: '2px 5px', borderRadius: '4px', color: 'var(--text-secondary)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>GO</span>
        </div>
      </div>
    </div>
  );
};

export default CyberHudHeader;
