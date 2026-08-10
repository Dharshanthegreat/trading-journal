import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Info, BarChart2, Sparkles, Layers, ShieldCheck, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

// Animated Counter Component
const AnimatedNumber = ({ value = 0, decimals = 1 }) => {
  return <span>{parseFloat(value || 0).toFixed(decimals)}</span>;
};

// 3D Isometric Compass Box Component
const Compass3DBox = ({ metrics = [] }) => {
  // SVG isometric projection math
  const project = (x, y, z) => {
    const isoX = 142 + (x - y) * 1.05;
    const isoY = 125 + (x + y) * 0.52 - z * 0.72;
    return { x: isoX, y: isoY };
  };

  // 6 3D Pillars positions on floor grid (x, y)
  const positions = [
    { x: 12, y: 12, label: 'Win Rate', key: 'winRate' },
    { x: 12, y: 48, label: 'Max Drawdown', key: 'maxDrawdown' },
    { x: 12, y: 84, label: 'Consistency Score', key: 'consistency' },
    { x: 58, y: 12, label: 'Profit Factor', key: 'profitFactor' },
    { x: 58, y: 48, label: 'Avg. Win/Loss Ratio', key: 'avgWinLoss' },
    { x: 58, y: 84, label: 'Recovery Factor', key: 'recoveryFactor' }
  ];

  const w = 12; // pillar width
  const d = 12; // pillar depth

  // 3D Floor grid boundary points
  const p000 = project(0, 0, 0);
  const p100 = project(100, 0, 0);
  const p110 = project(100, 100, 0);
  const p010 = project(0, 100, 0);

  const p001 = project(0, 0, 100);
  const p101 = project(100, 0, 100);
  const p111 = project(100, 100, 100);
  const p011 = project(0, 100, 100);

  return (
    <div className="compass-3d-wrapper" style={{ width: '100%', height: '175px', position: 'relative', marginTop: '4px' }}>
      <svg width="100%" height="100%" viewBox="0 0 290 195" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pillarFrontGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="pillarSideGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
          </linearGradient>
          <filter id="cyanGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 3D Floor Grid Box */}
        <polygon
          points={`${p000.x},${p000.y} ${p100.x},${p100.y} ${p110.x},${p110.y} ${p010.x},${p010.y}`}
          fill="rgba(15, 23, 42, 0.45)"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
        />

        {/* Grid Lines inside floor */}
        {[25, 50, 75].map(pos => {
          const fx1 = project(pos, 0, 0);
          const fx2 = project(pos, 100, 0);
          const fy1 = project(0, pos, 0);
          const fy2 = project(100, pos, 0);
          return (
            <g key={pos}>
              <line x1={fx1.x} y1={fx1.y} x2={fx2.x} y2={fx2.y} stroke="rgba(56, 189, 248, 0.12)" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1={fy1.x} y1={fy1.y} x2={fy2.x} y2={fy2.y} stroke="rgba(56, 189, 248, 0.12)" strokeWidth="0.8" strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* Wireframe Back Walls */}
        <line x1={p000.x} y1={p000.y} x2={p001.x} y2={p001.y} stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={p100.x} y1={p100.y} x2={p101.x} y2={p101.y} stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={p010.x} y1={p010.y} x2={p011.x} y2={p011.y} stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Top Wireframe Rim */}
        <polygon
          points={`${p001.x},${p001.y} ${p101.x},${p101.y} ${p111.x},${p111.y} ${p011.x},${p011.y}`}
          fill="none"
          stroke="rgba(56, 189, 248, 0.2)"
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />

        {/* Render 6 3D Pillars */}
        {positions.map((posInfo, idx) => {
          const metric = metrics.find(m => m.id === posInfo.key) || { score: 50 };
          const score = Math.max(12, Math.min(100, metric.score || 50));
          const h = (score / 100) * 80;

          const px = posInfo.x;
          const py = posInfo.y;

          // Corner points
          const b10 = project(px + w, py, 0);
          const b11 = project(px + w, py + d, 0);
          const b01 = project(px, py + d, 0);

          const t00 = project(px, py, h);
          const t10 = project(px + w, py, h);
          const t11 = project(px + w, py + d, h);
          const t01 = project(px, py + d, h);

          const centerTop = project(px + w / 2, py + d / 2, h);

          return (
            <g key={idx} className="compass-pillar-group">
              {/* Front Face */}
              <polygon
                points={`${b10.x},${b10.y} ${t10.x},${t10.y} ${t11.x},${t11.y} ${b11.x},${b11.y}`}
                fill="url(#pillarFrontGrad)"
                stroke="rgba(56, 189, 248, 0.7)"
                strokeWidth="0.8"
              />
              {/* Side Face */}
              <polygon
                points={`${b01.x},${b01.y} ${t01.x},${t01.y} ${t11.x},${t11.y} ${b11.x},${b11.y}`}
                fill="url(#pillarSideGrad)"
                stroke="rgba(56, 189, 248, 0.5)"
                strokeWidth="0.8"
              />
              {/* Top Face */}
              <polygon
                points={`${t00.x},${t00.y} ${t10.x},${t10.y} ${t11.x},${t11.y} ${t01.x},${t01.y}`}
                fill="#38bdf8"
                fillOpacity="0.95"
                stroke="#bae6fd"
                strokeWidth="1"
              />
              {/* Top Glowing Light Cap */}
              <circle
                cx={centerTop.x}
                cy={centerTop.y}
                r="4.5"
                fill="#bae6fd"
                filter="url(#cyanGlowFilter)"
              />
              <circle
                cx={centerTop.x}
                cy={centerTop.y}
                r="2"
                fill="#ffffff"
              />

              {/* Axis Label Text */}
              <text
                x={b11.x + 2}
                y={b11.y + 9}
                fill="var(--text-muted)"
                fontSize="6"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >
                {posInfo.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const CompassScoreCard = ({
  scoreValue = 0,
  radarData = [],
  stats = {},
  consistencyScore = 0,
  hasTrades = false
}) => {
  const [viewMode, setViewMode] = useState('3d'); // '3d' or 'radar'
  const [showTooltip, setShowTooltip] = useState(false);

  // 6 Metric scores mapped (0-100)
  const metrics = [
    { id: 'winRate', label: 'Win Rate', val: `${stats.winRate || 0}%`, score: stats.winRate || 0 },
    { id: 'maxDrawdown', label: 'Max Drawdown', val: `${radarData.find(d => d.subject === 'Max Drawdown')?.value?.toFixed(0) || 50}%`, score: radarData.find(d => d.subject === 'Max Drawdown')?.value || 50 },
    { id: 'consistency', label: 'Consistency Score', val: `${consistencyScore}%`, score: consistencyScore || 0 },
    { id: 'profitFactor', label: 'Profit Factor', val: stats.profitFactor || '0.00', score: radarData.find(d => d.subject === 'Profit Factor')?.value || 0 },
    { id: 'avgWinLoss', label: 'Avg. Win/Loss Ratio', val: `${stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) + 'x' : '1.0x'}`, score: radarData.find(d => d.subject === 'Avg Win/Loss')?.value || 0 },
    { id: 'recoveryFactor', label: 'Recovery Factor', val: `${radarData.find(d => d.subject === 'Recovery Factor')?.value ? (radarData.find(d => d.subject === 'Recovery Factor').value / 25).toFixed(1) + 'x' : '0.0x'}`, score: radarData.find(d => d.subject === 'Recovery Factor')?.value || 0 }
  ];

  return (
    <motion.div whileHover={{ translateY: -3 }} className="tz-card compass-score-card" style={{ height: '100%', position: 'relative' }}>
      {/* Top Header */}
      <div className="tz-card-header" style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tz-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={15} style={{ color: '#38bdf8' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Compass Score</span>
          <button
            onClick={() => setShowTooltip(prev => !prev)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            title="What is Compass Score?"
          >
            <Info size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--surface-glass)', padding: '2px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn btn-xs ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.6rem', padding: '2px 6px', height: 'auto' }}
              title="3D Compass View"
            >
              3D Box
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`btn btn-xs ${viewMode === 'radar' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.6rem', padding: '2px 6px', height: 'auto' }}
              title="Radar Chart View"
            >
              Radar
            </button>
          </div>

          {/* Score Display Pill */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#38bdf8',
            textShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
            lineHeight: 1
          }}>
            <AnimatedNumber value={scoreValue} decimals={1} />
          </div>
        </div>
      </div>

      {/* Info Tooltip Overlay */}
      {showTooltip && (
        <div className="anim-fade-in" style={{
          padding: '8px 10px',
          background: 'var(--bg-tertiary)',
          border: '1px solid #38bdf8',
          borderRadius: 'var(--r-sm)',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          marginBottom: '8px',
          lineHeight: 1.4
        }}>
          🎯 <strong>Compass Score</strong> measures overall trading execution across 6 metrics: Win Rate, Max Drawdown, Consistency, Profit Factor, Avg Win/Loss Ratio, and Recovery Factor.
        </div>
      )}

      {/* Main Visual Content */}
      {!hasTrades ? (
        <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', gap: '6px' }}>
          <Compass size={24} style={{ opacity: 0.3 }} />
          Log trades to calculate your Compass Score
        </div>
      ) : viewMode === '3d' ? (
        <Compass3DBox metrics={metrics} />
      ) : (
        <div style={{ height: 165, width: '100%', marginTop: '4px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
              <PolarGrid stroke="var(--border-mid)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} />
              <Radar name="Compass Score" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        borderTop: '1px solid var(--border)',
        paddingTop: '6px',
        marginTop: 'auto',
        fontSize: '0.62rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>WIN RATE</span>
          <span style={{ fontWeight: 700, color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>{stats.winRate || 0}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>PROFIT FACTOR</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{stats.profitFactor || '0.00'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>CONSISTENCY</span>
          <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>{consistencyScore}%</span>
        </div>
      </div>
    </motion.div>
  );
};
