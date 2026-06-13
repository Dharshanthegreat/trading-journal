import React, { useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Legend
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Award, BarChart2, Zap } from 'lucide-react';

const Analytics = () => {
  const { analytics, fetchAnalytics, loading } = useTrades();

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const data = useMemo(() => {
    if (!analytics || analytics.empty) return null;

    const s = analytics.summary;
    const equityCurve = (analytics.equityCurve || []).map(p => ({
      date: p.date ? format(new Date(p.date), 'MMM d') : '', equity: p.equity,
    }));

    const pnlBars = (analytics.equityCurve || []).map((p, i, arr) => ({
      name: p.date ? format(new Date(p.date), 'MMM d') : `#${i}`,
      pnl: i === 0 ? p.equity : parseFloat((p.equity - arr[i-1].equity).toFixed(2)),
    }));

    const pieData = [
      { name: 'Win', value: s.wins, fill: 'var(--profit)' },
      { name: 'Loss', value: s.losses, fill: 'var(--loss)' },
    ].filter(p => p.value > 0);

    return {
      ...analytics,
      summary: s,
      equityCurve,
      pnlBars,
      pieData,
    };
  }, [analytics]);

  const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)' }}>
        {label && <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.65rem' }}>{label}</div>}
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.value >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {p.value >= 0 ? '+' : ''}${typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </div>
        ))}
      </div>
    );
  };

  if (loading && !analytics) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }}/>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <div className="page-header">
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Deep performance intelligence</div>
        </div>
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <BarChart2 size={32} style={{ opacity: 0.3 }}/>
          <div className="empty-title">No data to analyze</div>
          <div className="empty-desc">Log your first trade in the Journal to see analytics</div>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const axisProps = {
    stroke: 'transparent',
    tick: { fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter' },
    tickLine: false, axisLine: false,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><BarChart2 size={18} style={{ opacity: 0.6 }}/> Analytics</div>
        <div className="page-subtitle">Performance breakdown across {s.totalTrades} trades</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--s4)' }}>
        {(() => {
          const rr = s.avgLoss > 0 ? (s.avgWin / s.avgLoss).toFixed(2) : '∞';
          const winRatePct = s.totalTrades > 0 ? s.wins / s.totalTrades : 0;
          const lossRatePct = 1 - winRatePct;
          const expectancy = ((winRatePct * s.avgWin) - (lossRatePct * s.avgLoss)).toFixed(2);
          return [
            { label: 'Profit Factor', val: s.profitFactor || '—', icon: <Award size={13}/>, col: 'var(--warn)' },
            { label: 'Max Drawdown', val: `-$${s.maxDrawdown}`, icon: <TrendingDown size={13}/>, col: 'var(--loss)' },
            { label: 'Avg Win', val: `$${s.avgWin}`, icon: <TrendingUp size={13}/>, col: 'var(--profit)' },
            { label: 'Avg Loss', val: `-$${s.avgLoss}`, icon: <Target size={13}/>, col: 'var(--loss)' },
            { label: 'Risk:Reward', val: `1:${rr}`, icon: <Zap size={13}/>, col: parseFloat(rr) >= 1.5 ? 'var(--profit)' : 'var(--warn)', tooltip: 'Avg Win ÷ Avg Loss' },
            { label: 'Expectancy', val: `${parseFloat(expectancy) >= 0 ? '+' : ''}$${expectancy}`, icon: <TrendingUp size={13}/>, col: parseFloat(expectancy) >= 0 ? 'var(--profit)' : 'var(--loss)', tooltip: 'Expected P&L per trade' },
          ];
        })().map((k, i) => (
          <div key={k.label} className={`glass glass-hover stat-card anim-fade-up delay-${i+1}`} title={k.tooltip || ''}>
            <div className="stat-label"><span style={{ color: k.col }}>{k.icon}</span> {k.label}</div>
            <div className="stat-value" style={{ color: k.col, fontSize: '1.2rem' }}>{k.val}</div>
          </div>
        ))}
      </div>


      <div className="analytics-grid">
        {/* Equity Curve */}
        <div className="glass chart-panel analytics-wide anim-fade-up delay-1">
          <div className="chart-title"><span>Cumulative Equity</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.equityCurve} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="eq2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.totalPnL >= 0 ? "var(--profit)" : "var(--loss)"} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={s.totalPnL >= 0 ? "var(--profit)" : "var(--loss)"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-mid)" vertical={false}/>
              <XAxis dataKey="date" {...axisProps}/>
              <YAxis {...axisProps}/>
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}/>
              <Area type="monotone" dataKey="equity" stroke={s.totalPnL >= 0 ? "var(--profit)" : "var(--loss)"} strokeWidth={2} fill="url(#eq2)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* P&L Per Trade */}
        <div className="glass chart-panel anim-fade-up delay-2">
          <div className="chart-title"><span>P&L Per Trade</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.pnlBars} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-mid)" vertical={false}/>
              <XAxis dataKey="name" {...axisProps}/>
              <YAxis {...axisProps}/>
              <ReferenceLine y={0} stroke="var(--border-strong)"/>
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'var(--surface-glass-h)' }}/>
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {data.pnlBars.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'} opacity={0.8}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie */}
        <div className="glass chart-panel anim-fade-up delay-3">
          <div className="chart-title"><span>Win / Loss Split</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.pieData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                {data.pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} opacity={0.85}/>
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '0.75rem', fontFamily: 'Inter' }}/>
              <Legend formatter={(v) => <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Day of Week */}
        <div className="glass chart-panel anim-fade-up delay-4">
          <div className="chart-title"><span>P&L by Day of Week</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byDow} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false}/>
              <XAxis dataKey="day" {...axisProps}/>
              <YAxis {...axisProps}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)"/>
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {data.byDow.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? 'rgba(129,140,248,0.55)' : 'rgba(248,113,113,0.55)'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly P&L */}
        <div className="glass chart-panel anim-fade-up delay-4">
          <div className="chart-title"><span>Monthly P&L</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false}/>
              <XAxis dataKey="month" {...axisProps}/>
              <YAxis {...axisProps}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)"/>
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {data.monthly.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Hour */}
        {data.byHour && data.byHour.length > 0 && (
          <div className="glass chart-panel anim-fade-up delay-5">
            <div className="chart-title"><span>P&L by Hour</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byHour} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                <XAxis dataKey="hour" {...axisProps} tickFormatter={h => `${h}:00`}/>
                <YAxis {...axisProps}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)"/>
                <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }}/>
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {data.byHour.map((e, i) => (
                    <Cell key={i} fill={e.pnl >= 0 ? 'rgba(251,191,36,0.55)' : 'rgba(248,113,113,0.55)'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Symbol Table */}
        <div className="glass chart-panel anim-fade-up delay-5">
          <div className="chart-title"><span>Performance by Symbol</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.78rem' }}>
              <thead><tr><th>Symbol</th><th>Trades</th><th>Win %</th><th>Net P&L</th></tr></thead>
              <tbody>
                {(data.bySymbol || []).map(s => (
                  <tr key={s.symbol}>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.symbol}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <div className="progress-track" style={{ width: 50 }}><div className="progress-fill" style={{ width: `${s.winRate}%` }}/></div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem' }}>{s.winRate}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: s.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {s.pnl >= 0 ? '+' : ''}${Math.abs(s.pnl).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Setup Table */}
        <div className="glass chart-panel anim-fade-up delay-6">
          <div className="chart-title"><span>Performance by Setup</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.78rem' }}>
              <thead><tr><th>Setup</th><th>Trades</th><th>Win %</th><th>Net P&L</th></tr></thead>
              <tbody>
                {(data.bySetup || []).map(s => (
                  <tr key={s.setup}>
                    <td style={{ color: 'var(--warn)', fontWeight: 600 }}>{s.setup}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <div className="progress-track" style={{ width: 50 }}><div className="progress-fill" style={{ width: `${s.winRate}%`, background: 'linear-gradient(90deg, var(--warn), #f59e0b)' }}/></div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem' }}>{s.winRate}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: s.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {s.pnl >= 0 ? '+' : ''}${Math.abs(s.pnl).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
