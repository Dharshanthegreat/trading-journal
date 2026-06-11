import React, { useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine
} from 'recharts';
import { Brain, Zap, Activity } from 'lucide-react';

const EMOTION_COLORS = {
  Calm: '#818cf8', Confident: '#34d399', Anxious: '#fbbf24',
  Fearful: '#f87171', Greedy: '#f97316', FOMO: '#ef4444',
  Disciplined: '#60a5fa', Revenge: '#dc2626',
};

const Emotions = () => {
  const { trades, fetchTrades, loading } = useTrades();

  useEffect(() => { fetchTrades({ limit: 500 }); }, [fetchTrades]);

  const analytics = useMemo(() => {
    if (!trades.length) return null;

    const scatterData = trades.map(t => ({
      fomo: t.fomoLevel || 5,
      confidence: t.confidenceLevel || 5,
      pnl: t.pnl || 0,
      symbol: t.symbol,
      date: t.entryTime ? new Date(t.entryTime).toLocaleDateString() : '',
    }));

    const fomoGroups = { 'Low (1-3)': [], 'Med (4-7)': [], 'High (8-10)': [] };
    const confGroups = { 'Low (1-3)': [], 'Med (4-7)': [], 'High (8-10)': [] };

    trades.forEach(t => {
      const pnl = t.pnl || 0;
      const fomo = t.fomoLevel || 5;
      const conf = t.confidenceLevel || 5;
      if (fomo <= 3) fomoGroups['Low (1-3)'].push(pnl);
      else if (fomo <= 7) fomoGroups['Med (4-7)'].push(pnl);
      else fomoGroups['High (8-10)'].push(pnl);
      if (conf <= 3) confGroups['Low (1-3)'].push(pnl);
      else if (conf <= 7) confGroups['Med (4-7)'].push(pnl);
      else confGroups['High (8-10)'].push(pnl);
    });

    const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
    const fomoBar = Object.entries(fomoGroups).map(([k, v]) => ({ name: k, avgPnl: avg(v), count: v.length }));
    const confBar = Object.entries(confGroups).map(([k, v]) => ({ name: k, avgPnl: avg(v), count: v.length }));

    const tagMap = {};
    trades.forEach(t => {
      (t.emotionTags || []).forEach(tag => { tagMap[tag] = (tagMap[tag] || 0) + 1; });
    });
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const winConf = trades.filter(t => t.pnl > 0).map(t => t.confidenceLevel || 5);
    const lossConf = trades.filter(t => t.pnl < 0).map(t => t.confidenceLevel || 5);
    const avgFomo = +(trades.reduce((a, t) => a + (t.fomoLevel || 5), 0) / trades.length).toFixed(1);
    const avgConf = +(trades.reduce((a, t) => a + (t.confidenceLevel || 5), 0) / trades.length).toFixed(1);

    return { scatterData, fomoBar, confBar, topTags, avgWinConf: avg(winConf), avgLossConf: avg(lossConf), avgFomo, avgConf };
  }, [trades]);

  const axisProps = {
    stroke: 'transparent',
    tick: { fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter' },
    tickLine: false, axisLine: false,
  };

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.72rem' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.62rem' }}>{label}</div>
        <div style={{ color: payload[0].value >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          Avg P&L: {payload[0].value >= 0 ? '+' : ''}${payload[0].value}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{payload[0].payload.count} trades</div>
      </div>
    );
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.72rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{d.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{d.date}</span></div>
        <div style={{ color: 'var(--text-tertiary)' }}>FOMO: {d.fomo}/10</div>
        <div style={{ color: 'var(--text-tertiary)' }}>Confidence: {d.confidence}/10</div>
        <div style={{ color: d.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          P&L: {d.pnl >= 0 ? '+' : ''}${d.pnl}
        </div>
      </div>
    );
  };

  if (loading && !trades.length) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
      {[...Array(4)].map((_, i) => (<div key={i} className="glass skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }}/>))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><Brain size={18} style={{ opacity: 0.6 }}/> Psychology</div>
        <div className="page-subtitle">Understand how your mindset affects performance</div>
      </div>

      <div className="psych-overview">
        {[
          { label: 'Avg FOMO', value: analytics ? `${analytics.avgFomo}/10` : '—', sub: analytics?.avgFomo <= 4 ? 'Disciplined 🧘' : analytics?.avgFomo <= 7 ? 'Moderate 😐' : 'High Risk ⚠️', col: analytics?.avgFomo <= 4 ? 'var(--profit)' : analytics?.avgFomo <= 7 ? 'var(--warn)' : 'var(--loss)', icon: <Brain size={14}/> },
          { label: 'Avg Confidence', value: analytics ? `${analytics.avgConf}/10` : '—', sub: analytics?.avgConf >= 7 ? 'High 🎯' : analytics?.avgConf >= 4 ? 'Moderate' : 'Low', col: analytics?.avgConf >= 7 ? 'var(--profit)' : analytics?.avgConf >= 4 ? 'var(--accent)' : 'var(--loss)', icon: <Zap size={14}/> },
          { label: 'Win Confidence', value: analytics ? `${analytics.avgWinConf}/10` : '—', sub: `vs Loss: ${analytics?.avgLossConf || '—'}/10`, col: 'var(--accent)', icon: <Activity size={14}/> },
        ].map((card, i) => (
          <div key={card.label} className={`glass psych-card glass-hover anim-fade-up delay-${i+1}`}>
            <div className="stat-label"><span style={{ color: card.col }}>{card.icon}</span> {card.label}</div>
            <div className="emotion-score" style={{ color: card.col }}>{card.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {!analytics ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Brain size={32} style={{ opacity: 0.3 }}/><div className="empty-title">No emotion data yet</div>
          <div className="empty-desc">Log trades with emotion ratings to see psychology patterns</div>
        </div>
      ) : (
        <div className="analytics-grid">
          <div className="glass chart-panel anim-fade-up delay-2">
            <div className="chart-title"><span>P&L vs FOMO Level</span></div>
            <ResponsiveContainer width="100%" height={230}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)"/>
                <XAxis type="number" dataKey="fomo" domain={[0, 10]} name="FOMO" {...axisProps}/>
                <YAxis type="number" dataKey="pnl" name="P&L" {...axisProps}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3"/>
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}/>
                <Scatter data={analytics.scatterData}>
                  {analytics.scatterData.map((e, i) => (<Cell key={i} fill={e.pnl >= 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'} r={6}/>))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="glass chart-panel anim-fade-up delay-3">
            <div className="chart-title"><span>P&L vs Confidence</span></div>
            <ResponsiveContainer width="100%" height={230}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)"/>
                <XAxis type="number" dataKey="confidence" domain={[0, 10]} name="Confidence" {...axisProps}/>
                <YAxis type="number" dataKey="pnl" name="P&L" {...axisProps}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3"/>
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}/>
                <Scatter data={analytics.scatterData}>
                  {analytics.scatterData.map((e, i) => (<Cell key={i} fill={e.pnl >= 0 ? 'rgba(129,140,248,0.7)' : 'rgba(248,113,113,0.7)'} r={6}/>))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="glass chart-panel anim-fade-up delay-4">
            <div className="chart-title"><span>Avg P&L by FOMO</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.fomoBar} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                <XAxis dataKey="name" {...axisProps}/><YAxis {...axisProps}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)"/>
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
                <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                  {analytics.fomoBar.map((e, i) => (<Cell key={i} fill={e.avgPnl >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)'}/>))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass chart-panel anim-fade-up delay-5">
            <div className="chart-title"><span>Avg P&L by Confidence</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.confBar} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                <XAxis dataKey="name" {...axisProps}/><YAxis {...axisProps}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)"/>
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
                <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                  {analytics.confBar.map((e, i) => (<Cell key={i} fill={e.avgPnl >= 0 ? 'rgba(129,140,248,0.6)' : 'rgba(248,113,113,0.6)'}/>))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {analytics.topTags.length > 0 && (
            <div className="glass chart-panel analytics-wide anim-fade-up delay-5">
              <div className="chart-title"><span>Emotion Frequency</span></div>
              <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
                {analytics.topTags.map(([tag, count]) => (
                  <div key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                    padding: '6px 14px', background: `${EMOTION_COLORS[tag] || '#818cf8'}12`,
                    border: `1px solid ${EMOTION_COLORS[tag] || '#818cf8'}30`,
                    borderRadius: 'var(--r-full)', fontSize: '0.72rem',
                    color: EMOTION_COLORS[tag] || '#818cf8', fontWeight: 600,
                  }}>
                    {tag}
                    <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-full)', padding: '1px 6px', fontSize: '0.6rem' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Emotions;
