import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Info } from 'lucide-react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

// Animated Counter Component
const AnimatedNumber = ({ value = 0, decimals = 1 }) => {
  return <span>{parseFloat(value || 0).toFixed(decimals)}</span>;
};

// 3D Isometric Compass Box Component
const Compass3DBox = ({ metrics = [] }) => {
  // SVG isometric projection math (fitted inside 300x140 boundary)
  const project = (x, y, z) => {
    // x: 0..100, y: 0..100, z: 0..100
    const isoX = 150 + (x - y) * 0.95;
    const isoY = 52 + (x + y) * 0.36 - z * 0.42;
    return { x: isoX, y: isoY };
  };

  // 6 3D Pillars positions on floor grid (x, y)
  const positions = [
    { x: 15, y: 15, key: 'winRate', label: 'Win Rate' },
    { x: 15, y: 50, key: 'maxDrawdown', label: 'Max DD' },
    { x: 15, y: 85, key: 'consistency', label: 'Consistency' },
    { x: 60, y: 15, key: 'profitFactor', label: 'Profit Factor' },
    { x: 60, y: 50, key: 'avgWinLoss', label: 'Avg Win/Loss' },
    { x: 60, y: 85, key: 'recoveryFactor', label: 'Recovery Factor' }
  ];

  const w = 11; // pillar width
  const d = 11; // pillar depth

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
    <div className="compass-3d-wrapper" style={{ width: '100%', height: '140px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 300 135" style={{ overflow: 'hidden' }}>
        <defs>
          <linearGradient id="compassFloorGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.12)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.45)" />
          </linearGradient>
          <linearGradient id="pillarFrontGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="pillarSideGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
          </linearGradient>
          <filter id="cyanCapGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 3D Floor Grid Surface */}
        <polygon
          points={`${p000.x},${p000.y} ${p100.x},${p100.y} ${p110.x},${p110.y} ${p010.x},${p010.y}`}
          fill="url(#compassFloorGrad)"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.2"
        />

        {/* Grid lines inside floor */}
        {[25, 50, 75].map(pos => {
          const fx1 = project(pos, 0, 0);
          const fx2 = project(pos, 100, 0);
          const fy1 = project(0, pos, 0);
          const fy2 = project(100, pos, 0);
          return (
            <g key={pos}>
              <line x1={fx1.x} y1={fx1.y} x2={fx2.x} y2={fx2.y} stroke="rgba(56, 189, 248, 0.16)" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1={fy1.x} y1={fy1.y} x2={fy2.x} y2={fy2.y} stroke="rgba(56, 189, 248, 0.16)" strokeWidth="0.8" strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* Wireframe Back Vertical Pillars */}
        <line x1={p000.x} y1={p000.y} x2={p001.x} y2={p001.y} stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={p100.x} y1={p100.y} x2={p101.x} y2={p101.y} stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={p010.x} y1={p010.y} x2={p011.x} y2={p011.y} stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Top Wireframe Box Ceiling Rim */}
        <polygon
          points={`${p001.x},${p001.y} ${p101.x},${p101.y} ${p111.x},${p111.y} ${p011.x},${p011.y}`}
          fill="none"
          stroke="rgba(56, 189, 248, 0.28)"
          strokeWidth="0.9"
          strokeDasharray="4 4"
        />

        {/* Render 6 3D Pillars */}
        {positions.map((posInfo, idx) => {
          const metric = metrics.find(m => m.id === posInfo.key) || { score: 50 };
          const score = Math.max(15, Math.min(100, metric.score || 50));
          const h = (score / 100) * 52; // pillar height scaled to fit

          const px = posInfo.x;
          const py = posInfo.y;

          // Corner points for 3D pillar
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
                stroke="rgba(56, 189, 248, 0.85)"
                strokeWidth="0.8"
              />
              {/* Side Face */}
              <polygon
                points={`${b01.x},${b01.y} ${t01.x},${t01.y} ${t11.x},${t11.y} ${b11.x},${b11.y}`}
                fill="url(#pillarSideGrad)"
                stroke="rgba(56, 189, 248, 0.65)"
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
              {/* Top Glowing Light Cap Dot */}
              <circle
                cx={centerTop.x}
                cy={centerTop.y}
                r="3.5"
                fill="#bae6fd"
                filter="url(#cyanCapGlow)"
              />
              <circle
                cx={centerTop.x}
                cy={centerTop.y}
                r="1.5"
                fill="#ffffff"
              />
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
    { id: 'winRate', label: 'WIN RATE', val: `${stats.winRate || 0}%`, score: stats.winRate || 0 },
    { id: 'maxDrawdown', label: 'MAX DRAWDOWN', val: `${radarData.find(d => d.subject === 'Max Drawdown')?.value?.toFixed(0) || 50}%`, score: radarData.find(d => d.subject === 'Max Drawdown')?.value || 50 },
    { id: 'consistency', label: 'CONSISTENCY', val: `${consistencyScore}%`, score: consistencyScore || 0 },
    { id: 'profitFactor', label: 'PROFIT FACTOR', val: stats.profitFactor || '0.00', score: radarData.find(d => d.subject === 'Profit Factor')?.value || 0 },
    { id: 'avgWinLoss', label: 'AVG WIN / LOSS', val: `${stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) + 'x' : '1.0x'}`, score: radarData.find(d => d.subject === 'Avg Win/Loss')?.value || 0 },
    { id: 'recoveryFactor', label: 'RECOVERY FACTOR', val: `${radarData.find(d => d.subject === 'Recovery Factor')?.value ? (radarData.find(d => d.subject === 'Recovery Factor').value / 25).toFixed(1) + 'x' : '0.0x'}`, score: radarData.find(d => d.subject === 'Recovery Factor')?.value || 0 }
  ];

  return (
    <motion.div
      whileHover={{ translateY: -2 }}
      className="tz-card compass-score-card"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px', position: 'relative' }}
    >
      {/* Top Header */}
      <div className="tz-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', marginBottom: '4px' }}>
        <div className="tz-card-title" style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flexShrink: 1 }}>
          <Compass size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <span style={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>COMPASS SCORE</span>
          <button
            onClick={() => setShowTooltip(prev => !prev)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            title="What is Compass Score?"
          >
            <Info size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* View Switcher */}
          <div style={{ display: 'flex', background: 'var(--surface-glass)', padding: '2px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn btn-xs ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.58rem', padding: '2px 5px', height: 'auto', lineHeight: 1 }}
            >
              3D Box
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`btn btn-xs ${viewMode === 'radar' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.58rem', padding: '2px 5px', height: 'auto', lineHeight: 1 }}
            >
              Radar
            </button>
          </div>

          {/* Score Badge */}
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#38bdf8',
            textShadow: '0 0 10px rgba(56, 189, 248, 0.45)',
            lineHeight: 1
          }}>
            <AnimatedNumber value={scoreValue} decimals={1} />
          </div>
        </div>
      </div>

      {/* Info Tooltip Overlay */}
      {showTooltip && (
        <div className="anim-fade-in" style={{
          padding: '6px 10px',
          background: 'var(--bg-tertiary)',
          border: '1px solid #38bdf8',
          borderRadius: 'var(--r-sm)',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          margin: '4px 0',
          lineHeight: 1.35
        }}>
          🎯 <strong>Compass Score</strong> evaluates trading execution across 6 dimensions: Win Rate, Max Drawdown, Consistency, Profit Factor, Avg Win/Loss, and Recovery Factor.
        </div>
      )}

      {/* Main Visual Content */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', my: '2px' }}>
        {!hasTrades ? (
          <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', gap: '6px' }}>
            <Compass size={24} style={{ opacity: 0.3 }} />
            Log trades to calculate your Compass Score
          </div>
        ) : viewMode === '3d' ? (
          <Compass3DBox metrics={metrics} />
        ) : (
          <div style={{ height: 140, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="var(--border-mid)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} />
                <Radar name="Compass Score" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom 6-Metric Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px 10px',
        borderTop: '1px solid var(--border)',
        paddingTop: '8px',
        marginTop: '4px',
        fontSize: '0.65rem'
      }}>
        {metrics.map(m => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.56rem', fontWeight: 600, letterSpacing: '0.04em' }}>{m.label}</span>
            <span style={{ fontWeight: 800, color: m.id === 'winRate' ? 'var(--profit)' : m.id === 'consistency' ? '#38bdf8' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
              {m.val}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
