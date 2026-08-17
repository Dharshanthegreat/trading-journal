import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Printer, X, Calendar, Filter, CheckCircle2,
  Sparkles, Image as ImageIcon, Layers, LayoutList, Eye,
  Moon, Sun, TrendingUp, TrendingDown, HelpCircle, User,
  Database, Tag, Award, CheckSquare, Square, DollarSign,
  Scale, PieChart, ShieldCheck
} from 'lucide-react';
import { useTrades } from '../../contexts/TradeContext';

export const NotionTradesPdfModal = ({
  isOpen,
  onClose,
  trades = [],
  accounts = [],
  user = null
}) => {
  const { trades: contextTrades } = useTrades();

  // Combine props trades with context trades as robust fallback
  const effectiveTrades = useMemo(() => {
    if (Array.isArray(trades) && trades.length > 0) return trades;
    if (Array.isArray(contextTrades) && contextTrades.length > 0) return contextTrades;
    return [];
  }, [trades, contextTrades]);

  // Filter States
  const [dateRange, setDateRange] = useState('all'); // 'all', '30days', 'month', 'year'
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('all'); // 'all', 'Long', 'Short'
  const [resultFilter, setResultFilter] = useState('all'); // 'all', 'win', 'loss', 'be'
  const [layoutMode, setLayoutMode] = useState('full'); // 'full', 'table', 'cards'
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'light', 'dark'
  const [searchQuery, setSearchQuery] = useState('');

  const printableRef = useRef(null);

  // Map accounts by ID for fast lookup
  const accountMap = useMemo(() => {
    const map = {};
    if (Array.isArray(accounts)) {
      accounts.forEach(acc => {
        if (acc && acc.id) {
          map[acc.id] = acc.accountName || acc.account_name || `Account #${acc.id}`;
        }
      });
    }
    return map;
  }, [accounts]);

  const accountObjMap = useMemo(() => {
    const map = {};
    if (Array.isArray(accounts)) {
      accounts.forEach(acc => {
        if (acc && acc.id) {
          map[acc.id] = acc;
        }
      });
    }
    return map;
  }, [accounts]);

  // Async image resolver to guarantee 100% of images from IndexedDB & objects are populated
  const [resolvedTradeImages, setResolvedTradeImages] = useState({});

  useEffect(() => {
    let isMounted = true;
    const resolveImages = async () => {
      const map = {};
      for (const t of effectiveTrades) {
        const idKey = t.id || t.backupId || Math.random();
        const urls = [];

        if (t.imageUrl) urls.push(t.imageUrl);
        if (Array.isArray(t.imageUrls)) {
          t.imageUrls.forEach(u => { if (u && !urls.includes(u)) urls.push(u); });
        }
        if (t.chartUrl && !urls.includes(t.chartUrl)) urls.push(t.chartUrl);
        if (t.chart && typeof t.chart === 'string' && !urls.includes(t.chart)) urls.push(t.chart);
        if (Array.isArray(t.images)) {
          t.images.forEach(img => {
            const url = typeof img === 'string' ? img : (img.url || img.src);
            if (url && !urls.includes(url)) urls.push(url);
          });
        }

        // If imageKeys exist, pull base64 from IndexedDB via localDb
        if (t.imageKeys && Array.isArray(t.imageKeys) && t.imageKeys.length > 0) {
          try {
            const { getLocalImage } = await import('../../services/localDb');
            if (typeof getLocalImage === 'function') {
              const fetched = await Promise.all(t.imageKeys.map(k => getLocalImage(k)));
              fetched.forEach(u => {
                if (u && !urls.includes(u)) urls.push(u);
              });
            }
          } catch (e) {
            // ignore
          }
        }
        map[idKey] = urls;
      }
      if (isMounted) {
        setResolvedTradeImages(map);
      }
    };

    if (effectiveTrades && effectiveTrades.length > 0) {
      resolveImages();
    }
  }, [effectiveTrades]);

  // Filter Trades
  const filteredTrades = useMemo(() => {
    if (!Array.isArray(effectiveTrades)) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return effectiveTrades.filter(t => {
      // 1. Account Filter
      if (selectedAccount !== 'all') {
        const accId = t.accountId || t.account_id;
        const selectedAccObj = accountObjMap[selectedAccount];
        const selectedAccName = selectedAccObj ? (selectedAccObj.accountName || selectedAccObj.account_name || '') : '';
        const tradeAccName = t.accountName || t.account_name || (accId ? accountMap[accId] : '') || '';

        const isMatchId = accId !== undefined && accId !== null && String(accId) === String(selectedAccount);
        const isMatchName = selectedAccName && tradeAccName && selectedAccName.trim().toLowerCase() === tradeAccName.trim().toLowerCase();
        const isDefaultFallback = (!accId || String(accId) === '1' || String(accId) === '0') && (String(selectedAccount) === '1' || (accounts.length > 0 && accounts[0] && String(accounts[0].id) === String(selectedAccount)));

        if (!isMatchId && !isMatchName && !isDefaultFallback) {
          return false;
        }
      }

      // 2. Type Filter
      const tType = t.type || t.direction || 'Long';
      if (tradeTypeFilter !== 'all' && tType.toLowerCase() !== tradeTypeFilter.toLowerCase()) {
        return false;
      }

      // 3. Result Filter
      const pnlNum = parseFloat(t.pnl || t.netPnl) || 0;
      if (resultFilter === 'win' && pnlNum <= 0) return false;
      if (resultFilter === 'loss' && pnlNum >= 0) return false;
      if (resultFilter === 'be' && pnlNum !== 0) return false;

      // 4. Date Range Filter
      const dateStr = t.entryTime || t.entry_time || t.date || t.createdAt;
      if (dateStr) {
        const tDate = new Date(dateStr);
        if (!isNaN(tDate.getTime())) {
          if (dateRange === '30days') {
            const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30) return false;
          } else if (dateRange === 'month') {
            if (tDate.getFullYear() !== currentYear || tDate.getMonth() !== currentMonth) {
              return false;
            }
          } else if (dateRange === 'year') {
            if (tDate.getFullYear() !== currentYear) return false;
          }
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sym = (t.symbol || '').toLowerCase();
        const setup = (t.setup || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        if (!sym.includes(q) && !setup.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

    });
  }, [effectiveTrades, selectedAccount, tradeTypeFilter, resultFilter, dateRange, searchQuery, accountObjMap, accountMap]);

  // Executive Summary Statistics
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let breakEvens = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalRR = 0;
    let rrCount = 0;

    filteredTrades.forEach(t => {
      const pnl = parseFloat(t.pnl || t.netPnl) || 0;
      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else if (pnl < 0) {
        losses++;
        grossLoss += Math.abs(pnl);
      } else {
        breakEvens++;
      }

      const rr = parseFloat(t.riskRewardRatio) || 0;
      if (rr > 0) {
        totalRR += rr;
        rrCount++;
      }
    });

    const totalCount = filteredTrades.length;
    const winRate = totalCount > 0 ? ((wins / totalCount) * 100).toFixed(1) : '0.0';
    const netPnl = grossProfit - grossLoss;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const avgRR = rrCount > 0 ? (totalRR / rrCount).toFixed(2) : '1:0.0';

    return {
      totalCount,
      wins,
      losses,
      breakEvens,
      winRate,
      grossProfit,
      grossLoss,
      netPnl,
      profitFactor,
      avgWin,
      avgLoss,
      avgRR
    };
  }, [filteredTrades]);

  // Print PDF Trigger
  const handlePrint = () => {
    // Add print active helper class
    document.body.classList.add('is-printing-notion-pdf');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('is-printing-notion-pdf');
      }, 500);
    }, 100);
  };

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AnimatePresence>
      <div className="notion-modal-overlay">
        <motion.div
          className="notion-modal-container glass-deep"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top Modal Controls Header */}
          <div className="notion-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="notion-icon-badge">📓</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notion Template Trades PDF Exporter
                </h3>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Customize your journal view, preview Notion formatting, and print/save to high-res PDF.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                title="Toggle Notion Theme Preview"
                style={{ fontSize: '0.72rem', gap: '4px' }}
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
                {theme === 'light' ? 'Light Theme' : 'Dark Theme'}
              </button>

              <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ gap: '6px', fontWeight: 600 }}>
                <Printer size={14} /> Print / Save as PDF
              </button>

              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Filter Toolbar */}
          <div className="notion-modal-toolbar">
            {/* Filter: Date Range */}
            <div className="notion-filter-item">
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Date Range</label>
              <select
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 6px' }}
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Filter: Account */}
            <div className="notion-filter-item">
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Account</label>
              <select
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 6px' }}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="all">All Accounts ({accounts.length})</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName || acc.account_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Side */}
            <div className="notion-filter-item">
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Direction</label>
              <select
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 6px' }}
                value={tradeTypeFilter}
                onChange={(e) => setTradeTypeFilter(e.target.value)}
              >
                <option value="all">Long & Short</option>
                <option value="Long">Long Only</option>
                <option value="Short">Short Only</option>
              </select>
            </div>

            {/* Filter: Result */}
            <div className="notion-filter-item">
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Result</label>
              <select
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 6px' }}
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
              >
                <option value="all">All Results</option>
                <option value="win">Wins Only</option>
                <option value="loss">Losses Only</option>
                <option value="be">Break-Even Only</option>
              </select>
            </div>

            {/* Layout Mode */}
            <div className="notion-filter-item">
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Layout Format</label>
              <select
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 6px' }}
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value)}
              >
                <option value="full">Full Journal (Summary + Table + Cards)</option>
                <option value="table">Notion Table Only</option>
                <option value="cards">Notion Trade Cards Only</option>
              </select>
            </div>

            {/* Toggle Screenshots */}
            <div className="notion-filter-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '14px' }}>
              <input
                type="checkbox"
                id="notion-screenshots-toggle"
                checked={includeScreenshots}
                onChange={(e) => setIncludeScreenshots(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="notion-screenshots-toggle" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
                Include Screenshots
              </label>
            </div>

            {/* Search filter */}
            <div className="notion-filter-item" style={{ flexGrow: 1, minWidth: 140 }}>
              <label className="form-label" style={{ fontSize: '0.62rem', margin: 0 }}>Search Symbol / Notes</label>
              <input
                className="input"
                style={{ height: 28, fontSize: '0.7rem', padding: '2px 8px' }}
                placeholder="Search BTC, EURUSD, Breakout..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Printable Notion PDF Document Area */}
          <div className="notion-modal-body scrollbar-thin">
            <div
              id="notion-pdf-printable-area"
              ref={printableRef}
              className={`notion-pdf-paper ${theme === 'dark' ? 'notion-dark-theme' : 'notion-light-theme'}`}
            >
              {/* Cover Gradient Banner */}
              <div className="notion-cover-banner">
                <div className="notion-cover-pattern"></div>
              </div>

              {/* Document Content Header */}
              <div className="notion-doc-header">
                <div className="notion-page-icon">📓</div>
                <h1 className="notion-page-title">Trading Journal — Master Database</h1>

                {/* Notion Property Metadata Block */}
                <div className="notion-doc-properties">
                  <div className="notion-prop-row">
                    <span className="notion-prop-label"><User size={12} /> Trader / Author:</span>
                    <span className="notion-prop-val">{user?.displayName || user?.email || 'Master Trader'}</span>
                  </div>
                  <div className="notion-prop-row">
                    <span className="notion-prop-label"><Calendar size={12} /> Export Date:</span>
                    <span className="notion-prop-val">{todayStr}</span>
                  </div>
                  <div className="notion-prop-row">
                    <span className="notion-prop-label"><Database size={12} /> Total Records:</span>
                    <span className="notion-prop-val">{filteredTrades.length} Trades</span>
                  </div>
                  <div className="notion-prop-row">
                    <span className="notion-prop-label"><Filter size={12} /> Account View:</span>
                    <span className="notion-prop-val">
                      {selectedAccount === 'all' ? 'All Accounts' : (accountMap[selectedAccount] || 'Selected Account')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Callout Box */}
              {(layoutMode === 'full' || layoutMode === 'table') && (
                <div className="notion-callout notion-summary-box">
                  <div className="notion-callout-icon">💡</div>
                  <div className="notion-callout-content" style={{ width: '100%' }}>
                    <div className="notion-callout-title">Executive Performance Summary</div>
                    <div className="notion-stats-grid">
                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Net P&L</span>
                        <span className={`notion-stat-val ${stats.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Win Rate</span>
                        <span className="notion-stat-val">
                          {stats.winRate}% <span className="notion-subtext">({stats.wins}W / {stats.losses}L / {stats.breakEvens}BE)</span>
                        </span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Profit Factor</span>
                        <span className="notion-stat-val">{stats.profitFactor}</span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Avg Risk:Reward</span>
                        <span className="notion-stat-val">1:{stats.avgRR}</span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Gross Profit</span>
                        <span className="notion-stat-val text-profit">+${stats.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Gross Loss</span>
                        <span className="notion-stat-val text-loss">-${stats.grossLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Avg Win / Loss</span>
                        <span className="notion-stat-val font-mono">
                          +${stats.avgWin.toFixed(0)} / -${stats.avgLoss.toFixed(0)}
                        </span>
                      </div>

                      <div className="notion-stat-card">
                        <span className="notion-stat-label">Total Trades</span>
                        <span className="notion-stat-val">{stats.totalCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Notion Database Table View */}
              {(layoutMode === 'full' || layoutMode === 'table') && (
                <div className="notion-section">
                  <div className="notion-section-header">
                    <span className="notion-section-icon">📋</span>
                    <h2 className="notion-section-title">Master Trades Database Table</h2>
                    <span className="notion-badge notion-badge-gray">{filteredTrades.length} entries</span>
                  </div>

                  {filteredTrades.length === 0 ? (
                    <div className="notion-empty-state">No trades match your active filter criteria.</div>
                  ) : (
                    <div className="notion-table-wrapper">
                      <table className="notion-table">
                        <thead>
                          <tr>
                            <th>SYMBOL</th>
                            <th>DATE</th>
                            <th>SIDE</th>
                            <th>RESULT</th>
                            <th>ACCOUNT</th>
                            <th>ENTRY / EXIT</th>
                            <th>NET P&L</th>
                            <th>R:R</th>
                            <th>SETUP</th>
                            <th>PSYCHOLOGY</th>
                            <th>GRADE</th>
                            <th>NOTES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTrades.map((t, idx) => {
                            const pnlNum = parseFloat(t.pnl || t.netPnl) || 0;
                            const isWin = pnlNum > 0;
                            const isLoss = pnlNum < 0;
                            const tType = t.type || t.direction || 'Long';
                            const dateStr = t.entryTime || t.entry_time || t.date || '';
                            const formattedDate = dateStr
                              ? new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                              : '—';
                            const accName = accountMap[t.accountId || t.account_id] || (t.accountName || 'Default Account');
                            const emotions = Array.isArray(t.emotionTags) ? t.emotionTags : (typeof t.emotionTags === 'string' ? JSON.parse(t.emotionTags || '[]') : []);

                            return (
                              <tr key={t.id || idx}>
                                <td className="font-mono font-bold">{t.symbol || '—'}</td>
                                <td className="notion-cell-subtext">{formattedDate}</td>
                                <td>
                                  <span className={`notion-tag ${tType.toLowerCase() === 'long' ? 'notion-tag-green' : 'notion-tag-red'}`}>
                                    {tType.toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  <span className={`notion-tag ${isWin ? 'notion-tag-green' : isLoss ? 'notion-tag-red' : 'notion-tag-gray'}`}>
                                    {isWin ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                                  </span>
                                </td>
                                <td className="notion-cell-subtext">{accName}</td>
                                <td className="font-mono notion-cell-subtext">
                                  {t.entryPrice || 0} / {t.exitPrice || 0}
                                </td>
                                <td className={`font-mono font-bold ${pnlNum >= 0 ? 'text-profit' : 'text-loss'}`}>
                                  {pnlNum >= 0 ? '+' : ''}${pnlNum.toFixed(2)}
                                </td>
                                <td className="font-mono notion-cell-subtext">
                                  {t.riskRewardRatio ? `1:${t.riskRewardRatio}` : '—'}
                                </td>
                                <td>
                                  {t.setup ? (
                                    <span className="notion-tag notion-tag-blue">{t.setup}</span>
                                  ) : '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                    {emotions.length > 0 ? emotions.slice(0, 2).map((emo, eIdx) => (
                                      <span key={eIdx} className="notion-tag notion-tag-purple">{emo}</span>
                                    )) : '—'}
                                  </div>
                                </td>
                                <td>
                                  {t.grade ? (
                                    <span className="notion-tag notion-tag-yellow">{t.grade}</span>
                                  ) : '—'}
                                </td>
                                <td className="notion-cell-notes" title={t.notes}>
                                  {t.notes ? (t.notes.length > 40 ? t.notes.slice(0, 38) + '...' : t.notes) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Individual Trade Journal Log Pages (Exact Image 2 Template Format) */}
              {(layoutMode === 'full' || layoutMode === 'cards') && (
                <div className="notion-section" style={{ marginTop: '36px' }}>
                  <div className="notion-section-header">
                    <span className="notion-section-icon">🚏</span>
                    <h2 className="notion-section-title">Individual Trade Journal Log Pages</h2>
                    <span className="notion-badge notion-badge-gray">{filteredTrades.length} detailed logs</span>
                  </div>

                  <div className="notion-cards-container">
                    {filteredTrades.map((t, idx) => {
                      const idKey = t.id || t.backupId || idx;
                      const pnlNum = parseFloat(t.pnl || t.netPnl) || 0;
                      const isWin = pnlNum > 0;
                      const isLoss = pnlNum < 0;
                      const tType = t.type || t.direction || 'Long';
                      const dateStr = t.entryTime || t.entry_time || t.date || '';
                      
                      // Format date e.g. (30/6/2026) or (30/06/2026 19:14)
                      let formattedDateStr = '—';
                      if (dateStr) {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                          formattedDateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }

                      const accName = accountMap[t.accountId || t.account_id] || (t.accountName || 'Main Account');
                      const emotions = Array.isArray(t.emotionTags) ? t.emotionTags : (typeof t.emotionTags === 'string' ? JSON.parse(t.emotionTags || '[]') : []);
                      const rules = typeof t.rulesChecklist === 'object' && t.rulesChecklist !== null ? t.rulesChecklist : {};

                      // Retrieve resolved images for this trade
                      const imgUrls = resolvedTradeImages[idKey] || [];

                      // Split trade notes into bullet points
                      const notesRaw = t.notes || '';
                      const notesList = notesRaw
                        .split('\n')
                        .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
                        .filter(Boolean);

                      return (
                        <div key={idKey} className="notion-trade-card image2-style-card page-break-avoid">
                          {/* 1.) Title Header (Image 2 style) */}
                          <h2 className="image2-trade-title">
                            {idx + 1}.) {t.symbol || 'Trade'}
                          </h2>

                          {/* Date Line: Date: (30/6/2026) */}
                          <div className="image2-trade-date">
                            Date: ({formattedDateStr})
                          </div>

                          {/* Result Line: Profit : $420.60 or Loss : 98 */}
                          <div className={`image2-trade-result ${isWin ? 'text-profit' : isLoss ? 'text-loss' : ''}`}>
                            {isWin ? 'Profit' : isLoss ? 'Loss' : 'Break-Even'} : {pnlNum >= 0 ? `$${pnlNum.toFixed(2)}` : `$${Math.abs(pnlNum).toFixed(2)}`}
                          </div>

                          {/* Trade Setup Line: Trade Setup : New York session */}
                          <div className="image2-trade-setup">
                            Trade Setup : <span className="image2-setup-highlight">{t.setup || 'Standard Execution'}</span>
                          </div>

                          {/* Section: Trade Analysis */}
                          <div className="image2-section">
                            <div className="image2-section-heading">Trade Analysis</div>
                            <ul className="image2-bullet-list">
                              {notesList.length > 0 ? (
                                notesList.map((noteLine, nIdx) => (
                                  <li key={nIdx}>• {noteLine}</li>
                                ))
                              ) : (
                                <li>• Took the trade based on setup strategy and market structure confluence.</li>
                              )}
                            </ul>
                          </div>

                          {/* Section: Emotion */}
                          <div className="image2-section">
                            <div className="image2-section-heading">Emotion</div>
                            <ul className="image2-bullet-list image2-emotion-list">
                              {emotions.length > 0 ? (
                                emotions.map((emo, eIdx) => (
                                  <li key={eIdx}>• <span className="image2-emotion-tag">{emo}</span></li>
                                ))
                              ) : (
                                <li>• Normal</li>
                              )}
                            </ul>
                          </div>

                          {/* Section: FORECASTING & Execution Details */}
                          <div className="image2-section">
                            <div className="image2-section-heading">FORECASTING & EXECUTION DETAILS</div>
                            <div className="image2-forecasting-grid">
                              <div>Time frame - <span className="font-bold">{t.timeframe || t.tf || '5 min'}</span></div>
                              <div>Side / Type : <span className="font-bold">{tType}</span></div>
                              <div>Entry Price : <span className="font-mono">{t.entryPrice || 0}</span></div>
                              <div>Exit Price : <span className="font-mono">{t.exitPrice || 0}</span></div>
                              <div>Stop Loss : <span className="font-mono">{t.stopLoss || 0}</span></div>
                              <div>Take Profit : <span className="font-mono">{t.takeProfit || 0}</span></div>
                              <div>Position Size : <span className="font-mono">{t.lotSize || 0} Lots</span></div>
                              <div>Risk : Reward : <span className="font-mono">1:{t.riskRewardRatio || '0.0'}</span></div>
                              <div>Grade : <span className="font-bold">{t.grade || 'A'}</span></div>
                              <div>Account : <span className="font-bold">{accName}</span></div>
                            </div>
                          </div>

                          {/* Rules Compliance Section if available */}
                          {Object.keys(rules).length > 0 && (
                            <div className="image2-section">
                              <div className="image2-section-heading">Trading Plan Compliance</div>
                              <ul className="image2-bullet-list">
                                {Object.entries(rules).map(([ruleName, isChecked], rIdx) => (
                                  <li key={rIdx} style={{ color: isChecked ? '#34d399' : '#fca5a5' }}>
                                    • {isChecked ? '☑' : '☒'} {ruleName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* High-Resolution Full-Width Chart Screenshots */}
                          {includeScreenshots && imgUrls.length > 0 && (
                            <div className="image2-fullwidth-images-container">
                              {imgUrls.map((url, imgIdx) => (
                                <div key={imgIdx} className="image2-fullwidth-image-frame">
                                  <img src={url} alt={`${t.symbol} Chart Screenshot ${imgIdx + 1}`} />
                                  <div className="image2-image-caption">
                                    Figure {imgIdx + 1}: {t.symbol} — {tType} Chart Screenshot & Technical Analysis
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notion Page Footer */}
              <div className="notion-footer">
                <div>Generated via Trading Journal • Notion Template Backup Export</div>
                <div>{todayStr} • Confidential Trading Data</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
