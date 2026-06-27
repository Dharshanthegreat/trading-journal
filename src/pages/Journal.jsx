import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { accounts as accountsApi, rules as rulesApi, ai as aiApi } from '../services/api';
import { format } from 'date-fns';
import {
  Plus, X, Search, Trash2,
  ArrowUpRight, ArrowDownRight,
  Upload, FileText, Share2, Copy, Check, ExternalLink, ZoomIn, Globe, Shield, ListTodo
} from 'lucide-react';

const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'FOMO', 'Disciplined', 'Revenge'];
const SETUPS = ['FVG', 'SMT', 'OB', 'BB', 'IRL-ERL', 'ERL-IRL'];

import { toNewYorkDatetimeString, parseNewYorkDatetimeToDate, formatInNewYork, toNewYorkDateString } from '../utils/timezone';

const defaultForm = () => ({
  symbol: '', type: 'Long', entryPrice: '', exitPrice: '', lotSize: '',
  stopLoss: '', takeProfit: '', pnl: '',
  entryTime: toNewYorkDatetimeString(new Date()), exitTime: '',
  setup: '', notes: '', tags: '', emotionTags: [],
  fomoLevel: 5, confidenceLevel: 5, grade: 'B',
  accountId: '',
  notionLink: '',
  riskRewardRatio: '',
});

const Journal = () => {
  const { trades, loading, addTrade, updateTrade, deleteTrade, fetchTrades, shareTrade, unshareTrade } = useTrades();
  const manuallyEditedRef = useRef({});
  const [autoFeatures, setAutoFeatures] = useState(true);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    manuallyEditedRef.current[field] = true;
    setAutoFeatures(false);
  };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultForm());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [saving, setSaving] = useState(false);
  const [chartFiles, setChartFiles] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [formError, setFormError] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [modalTab, setModalTab] = useState('metrics');
  const [accountRules, setAccountRules] = useState([]);

  const [accounts, setAccounts] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [extractingNotion, setExtractingNotion] = useState(false);
  const [notionMessage, setNotionMessage] = useState('');
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [playbookError, setPlaybookError] = useState('');

  const setNYMarketOpenTime = (field) => {
    const currentVal = formData[field];
    let datePart = '';
    if (currentVal && currentVal.includes('T')) {
      datePart = currentVal.split('T')[0];
    } else {
      datePart = toNewYorkDateString(new Date());
    }
    setFormData(prev => ({
      ...prev,
      [field]: `${datePart}T09:30`
    }));
    manuallyEditedRef.current[field] = true;
    setAutoFeatures(false);
  };

  const handleSetBreakeven = () => {
    setFormData(prev => ({
      ...prev,
      pnl: '0.00',
      exitPrice: prev.entryPrice || prev.exitPrice || '0.00'
    }));
    manuallyEditedRef.current.pnl = true;
    manuallyEditedRef.current.exitPrice = true;
    setAutoFeatures(false);
  };


  const populateFallbackValues = () => {
    const symbol = (formData.symbol || '').toUpperCase().trim();
    let mock = { entry: '18910.50', exit: '18952.75', sl: '18880.00', tp: '18970.00', pnl: '1690.00' }; // Default Index fallback

    if (symbol.includes('XAU') || symbol.includes('GOLD')) {
      mock = { entry: '2382.40', exit: '2394.10', sl: '2375.00', tp: '2400.00', pnl: '1170.00' };
    } else if (symbol.includes('JPY')) {
      mock = { entry: '158.42', exit: '159.28', sl: '157.80', tp: '160.20', pnl: '860.00' };
    } else if (
      symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('USD') || 
      symbol.includes('AUD') || symbol.includes('CAD') || symbol.includes('CHF') || 
      symbol.includes('NZD')
    ) {
      mock = { entry: '1.08520', exit: '1.08870', sl: '1.08220', tp: '1.09320', pnl: '250.00' };
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      mock = { entry: '64250.00', exit: '65120.00', sl: '63800.00', tp: '66500.00', pnl: '870.00' };
    }
    
    const now = new Date();
    const entryStr = toNewYorkDatetimeString(new Date(now.getTime() - 45 * 60000));
    const exitStr = toNewYorkDatetimeString(now);
    
    setFormData(prev => {
      const nextData = { ...prev };
      if (!manuallyEditedRef.current.entryPrice && (!prev.entryPrice || parseFloat(prev.entryPrice) === 0)) {
        nextData.entryPrice = mock.entry;
      }
      if (!manuallyEditedRef.current.exitPrice && (!prev.exitPrice || parseFloat(prev.exitPrice) === 0)) {
        nextData.exitPrice = mock.exit;
      }
      if (!manuallyEditedRef.current.stopLoss && (!prev.stopLoss || parseFloat(prev.stopLoss) === 0)) {
        nextData.stopLoss = mock.sl;
      }
      if (!manuallyEditedRef.current.takeProfit && (!prev.takeProfit || parseFloat(prev.takeProfit) === 0)) {
        nextData.takeProfit = mock.tp;
      }
      if (!manuallyEditedRef.current.entryTime && !prev.entryTime) {
        nextData.entryTime = entryStr;
      }
      if (!manuallyEditedRef.current.exitTime && !prev.exitTime) {
        nextData.exitTime = exitStr;
      }
      if (!manuallyEditedRef.current.pnl && (!prev.pnl || parseFloat(prev.pnl) === 0)) {
        nextData.pnl = mock.pnl;
      }
      return nextData;
    });
  };

  const performOcrAndPopulate = async (file) => {
    setOcrLoading(true);
    setOcrMessage('Analyzing image with Gemini Vision AI...');
    try {
      const formDataObj = new FormData();
      formDataObj.append('chart', file);
      
      const parsedData = await aiApi.analyzeChart(formDataObj);
      
      setFormData(prev => {
        const nextData = { ...prev };
        
        if (parsedData.symbol && !manuallyEditedRef.current.symbol) {
          nextData.symbol = parsedData.symbol.toUpperCase();
        }
        if (parsedData.type && !manuallyEditedRef.current.type) {
          const normalizedType = (parsedData.type.toLowerCase().includes('sell') || parsedData.type.toLowerCase().includes('short')) ? 'Short' : 'Long';
          nextData.type = normalizedType;
        }
        if (parsedData.lotSize !== undefined && parsedData.lotSize !== null && !manuallyEditedRef.current.lotSize) {
          nextData.lotSize = String(parsedData.lotSize);
        }
        if (parsedData.entryPrice !== undefined && parsedData.entryPrice !== null && !manuallyEditedRef.current.entryPrice) {
          nextData.entryPrice = String(parsedData.entryPrice);
        }
        if (parsedData.exitPrice !== undefined && parsedData.exitPrice !== null && !manuallyEditedRef.current.exitPrice) {
          nextData.exitPrice = String(parsedData.exitPrice);
        }
        if (parsedData.stopLoss !== undefined && parsedData.stopLoss !== null && !manuallyEditedRef.current.stopLoss) {
          nextData.stopLoss = String(parsedData.stopLoss);
        }
        if (parsedData.takeProfit !== undefined && parsedData.takeProfit !== null && !manuallyEditedRef.current.takeProfit) {
          nextData.takeProfit = String(parsedData.takeProfit);
        }
        if (parsedData.entryTime && !manuallyEditedRef.current.entryTime) {
          nextData.entryTime = parsedData.entryTime;
        }
        if (parsedData.exitTime && !manuallyEditedRef.current.exitTime) {
          nextData.exitTime = parsedData.exitTime;
        }
        if (parsedData.pnl !== undefined && parsedData.pnl !== null && !manuallyEditedRef.current.pnl) {
          nextData.pnl = String(parsedData.pnl);
        }
        return nextData;
      });
      setOcrMessage('Successfully extracted trade metrics!');
    } catch (err) {
      console.error('OCR Extraction failed:', err);
      setOcrMessage(err.message || 'AI Auto-fill failed. Check API key settings.');
    } finally {
      setOcrLoading(false);
      setTimeout(() => setOcrMessage(''), 5000);
    }
  };

  const extractNotionLink = async () => {
    if (!formData.notionLink.trim()) {
      alert('Please enter a valid Notion Link first.');
      return;
    }
    setExtractingNotion(true);
    setNotionMessage('AI Agent reading Notion page...');
    try {
      const { notion } = await import('../services/api');
      const result = await notion.readLink(formData.notionLink);
      setFormData(prev => ({
        ...prev,
        notes: prev.notes
          ? `${prev.notes}\n\n--- 📓 AI Playbook Checklist ---\n${result.summary}`
          : `--- 📓 AI Playbook Checklist ---\n${result.summary}`
      }));
      setNotionMessage('Successfully imported playbook rules into notes!');
    } catch (err) {
      console.error('Failed to parse Notion link:', err);
      setNotionMessage('Failed to extract: ensure link is correct & page public.');
    } finally {
      setExtractingNotion(false);
      setTimeout(() => setNotionMessage(''), 4000);
    }
  };

  const fetchPlaybook = async (trade) => {
    if (!trade.notionLink) return;
    setActivePlaybook({ title: `${trade.symbol} Trade Setup`, url: trade.notionLink, summary: '' });
    setLoadingPlaybook(true);
    setPlaybookError('');
    try {
      const { notion } = await import('../services/api');
      const result = await notion.readLink(trade.notionLink);
      setActivePlaybook({ title: `${trade.symbol} Trade Setup`, url: trade.notionLink, summary: result.summary });
    } catch (err) {
      console.error('Failed to read Notion playbook:', err);
      setPlaybookError(err.message || 'Failed to read Notion page content. Ensure the link is correct and page is public.');
    } finally {
      setLoadingPlaybook(false);
    }
  };


  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setChartFiles(prev => [...prev, ...files]);
    if (autoFeatures) {
      await performOcrAndPopulate(files[0]);
    }
  };

  const startEditTrade = (trade) => {
    setExistingImages(trade.imageUrls || []);
    setFormData({
      symbol: trade.symbol || '',
      type: trade.type || 'Long',
      entryPrice: trade.entryPrice !== undefined ? String(trade.entryPrice) : '',
      exitPrice: trade.exitPrice !== undefined ? String(trade.exitPrice) : '',
      lotSize: trade.lotSize !== undefined ? String(trade.lotSize) : '',
      stopLoss: trade.stopLoss !== undefined ? String(trade.stopLoss) : '',
      takeProfit: trade.takeProfit !== undefined ? String(trade.takeProfit) : '',
      pnl: trade.pnl !== undefined ? String(trade.pnl) : '',
      entryTime: trade.entryTime ? toNewYorkDatetimeString(trade.entryTime) : '',
      exitTime: trade.exitTime ? toNewYorkDatetimeString(trade.exitTime) : '',
      setup: trade.setup || '',
      notes: trade.notes || '',
      tags: (trade.tags || []).join(', '),
      emotionTags: trade.emotionTags || [],
      fomoLevel: trade.fomoLevel || 5,
      confidenceLevel: trade.confidenceLevel || 5,
      grade: trade.grade || 'B',
      accountId: trade.accountId || '',
      notionLink: trade.notionLink || '',
      riskRewardRatio: trade.riskRewardRatio !== undefined ? String(trade.riskRewardRatio) : '',
    });
    manuallyEditedRef.current = {};
    setAutoFeatures(true);
    setEditingTrade(trade);
    setSelectedTrade(null);
    setModalTab('metrics');
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData(defaultForm());
    setChartFiles([]);
    setEditingTrade(null);
    setExistingImages([]);
    setFormError('');
    setModalTab('metrics');
    manuallyEditedRef.current = {};
    setAutoFeatures(true);
  };

  useEffect(() => {
    fetchTrades({ limit: 200 });
    accountsApi.list().then(setAccounts).catch(console.error);
  }, [fetchTrades]);

  // Load active rules for selected account in modal
  useEffect(() => {
    if (!formData.accountId) {
      setAccountRules([]);
      return;
    }
    const loadRules = async () => {
      try {
        const data = await rulesApi.list({ accountId: formData.accountId });
        setAccountRules((data || []).filter(r => r.isActive));
      } catch (err) {
        console.error('Failed to load rules for account in modal:', err);
      }
    };
    loadRules();
  }, [formData.accountId]);

  // Auto-calculate risk reward ratio (R/R) based on entry, stop loss, and take profit (or exit price)
  useEffect(() => {
    if (manuallyEditedRef.current.riskRewardRatio) return;
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp = parseFloat(formData.takeProfit || formData.exitPrice || 0);

    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && entry !== sl) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        const rr = (reward / risk).toFixed(2);
        setFormData(prev => ({ ...prev, riskRewardRatio: rr }));
      }
    } else {
      setFormData(prev => ({ ...prev, riskRewardRatio: '' }));
    }
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.exitPrice, formData.type]);

  // Sync selectedTrade state if trades are updated in the background/context
  const currentSelectedTrade = useMemo(() => {
    if (!selectedTrade) return null;
    return trades.find(t => t.id === selectedTrade.id) || selectedTrade;
  }, [trades, selectedTrade]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [selectedTrade]);

  const handleShare = async () => {
    if (!currentSelectedTrade) return;
    try {
      const token = await shareTrade(currentSelectedTrade.id);
      setSelectedTrade(prev => prev ? { ...prev, shareToken: token } : null);
    } catch (err) {
      console.error('Failed to share trade:', err);
    }
  };

  const handleUnshare = async () => {
    if (!currentSelectedTrade) return;
    try {
      await unshareTrade(currentSelectedTrade.id);
      setSelectedTrade(prev => prev ? { ...prev, shareToken: null } : null);
    } catch (err) {
      console.error('Failed to unshare trade:', err);
    }
  };

  const filtered = useMemo(() => {
    return trades.filter(t => {
      // Exclude mock trades created specifically on the Monday's page
      if (t.tags && t.tags.includes('Monday-Only')) return false;

      const q = search.toLowerCase();
      const matchSearch = !q || t.symbol?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) || t.setup?.toLowerCase().includes(q);
      
      const acc = accounts.find(a => String(a.id) === String(t.accountId || 1));
      const startingBalance = acc ? (acc.startingBalance || 10000.0) : 10000.0;
      const threshold = startingBalance * 0.001;

      const matchType = filterType === 'All' || t.type === filterType ||
        (filterType === 'Win' && t.pnl > threshold) ||
        (filterType === 'Loss' && t.pnl < -threshold);
      
      const matchAccount = filterAccount === 'All' || 
        String(t.accountId) === String(filterAccount) ||
        (!t.accountId && String(filterAccount) === '1');
        
      return matchSearch && matchType && matchAccount;
    });
  }, [trades, search, filterType, filterAccount, accounts]);

  const toggleEmotion = (e) => {
    setFormData(prev => ({
      ...prev,
      emotionTags: prev.emotionTags.includes(e)
        ? prev.emotionTags.filter(x => x !== e)
        : [...prev.emotionTags, e]
    }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const entryTimeParsed = formData.entryTime ? parseNewYorkDatetimeToDate(formData.entryTime) : null;
      const exitTimeParsed = formData.exitTime ? parseNewYorkDatetimeToDate(formData.exitTime) : null;

      const tradeData = {
        symbol: formData.symbol,
        type: formData.type,
        entryPrice: parseFloat(formData.entryPrice) || 0,
        exitPrice: parseFloat(formData.exitPrice) || 0,
        lotSize: parseFloat(formData.lotSize) || 0,
        stopLoss: parseFloat(formData.stopLoss) || 0,
        takeProfit: parseFloat(formData.takeProfit) || 0,
        pnl: parseFloat(formData.pnl) || 0,
        entryTime: entryTimeParsed && !isNaN(entryTimeParsed.getTime()) ? entryTimeParsed.toISOString() : new Date().toISOString(),
        exitTime: exitTimeParsed && !isNaN(exitTimeParsed.getTime()) ? exitTimeParsed.toISOString() : '',
        setup: formData.setup,
        grade: formData.grade,
        notes: formData.notes,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        emotionTags: formData.emotionTags,
        fomoLevel: formData.fomoLevel,
        confidenceLevel: formData.confidenceLevel,
        accountId: formData.accountId || null,
        notionLink: formData.notionLink,
        riskRewardRatio: parseFloat(formData.riskRewardRatio) || 0
      };

      if (editingTrade) {
        await updateTrade(editingTrade.id, tradeData, chartFiles, existingImages);
      } else {
        await addTrade(tradeData, chartFiles);
      }
      setShowForm(false);
      setFormData(defaultForm());
      setChartFiles([]);
      setEditingTrade(null);
      setExistingImages([]);
      manuallyEditedRef.current = {};
      setAutoFeatures(true);
      setFormError('');
    } catch (err) {
      console.error('Failed to save trade:', err);
      setFormError(err?.message || 'Failed to save trade. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    await deleteTrade(id);
    setDeleteConfirm(null);
  };

  const totalPnL = filtered.reduce((a, t) => a + (t.pnl || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trade Journal</div>
          <div className="page-subtitle">{filtered.length} trades · Net P&L: <span style={{ color: totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toFixed(2)}</span></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15}/> Add Trade
        </button>
      </div>

      <div className="journal-toolbar" style={{ marginBottom: 0 }}>
        <div className="journal-filters">
          <div className="search-box">
            <Search size={13} className="search-icon"/>
            <input className="input" placeholder="Search symbol, notes..." style={{ paddingLeft: '2rem', width: 240 }} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
            {['All', 'Long', 'Short', 'Win', 'Loss'].map(f => (
              <button key={f} onClick={() => setFilterType(f)} className={`btn btn-sm ${filterType === f ? 'btn-primary' : 'btn-ghost'}`}>
                {f}
              </button>
            ))}
            
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0 4px 0 12px' }}>Account:</span>
            <select
              className="input"
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              style={{
                fontSize: '0.72rem',
                height: '30px',
                padding: '0 24px 0 8px',
                width: '180px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-mid)',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <option value="All">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.accountName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Date</th><th>Symbol</th><th>Dir.</th><th>Entry</th><th>Exit</th>
                <th>Lot</th><th>R/R</th><th>Setup</th><th>P&L</th><th>Grade</th><th>Notes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && !trades.length ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(12)].map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }}/></td>))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <FileText size={28} style={{ opacity: 0.3 }}/>
                      <div className="empty-title">No trades found</div>
                      <div className="empty-desc">Add your first trade or import from MT5</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTrade(t)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {t.entryTime ? formatInNewYork(t.entryTime, 'MMM d, yy HH:mm') : '—'}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>
                      {t.symbol}
                      <div style={{ fontSize: '0.62rem', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: '2px', textTransform: 'none' }}>
                        {accounts.find(a => String(a.id) === String(t.accountId || 1))?.accountName || 'Default Account'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`}>
                        {t.type === 'Long' ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                        {t.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>{t.entryPrice || '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>{t.exitPrice || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.lotSize || '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t.riskRewardRatio ? `${t.riskRewardRatio} R` : '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.setup || '—'}</td>
                    <td style={{
                      fontWeight: 700, fontSize: '0.82rem', fontFamily: 'JetBrains Mono',
                      color: (() => {
                        const acc = accounts.find(a => String(a.id) === String(t.accountId || 1));
                        const startingBalance = acc ? (acc.startingBalance || 10000.0) : 10000.0;
                        const threshold = startingBalance * 0.001;
                        if (Math.abs(t.pnl) <= threshold) return 'var(--warn)';
                        return t.pnl > 0 ? 'var(--profit)' : 'var(--loss)';
                      })(),
                      whiteSpace: 'nowrap'
                    }}>
                      {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                    </td>
                    <td><span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>{t.grade || '—'}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.notes || '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="trade-row-actions">
                        <button className="icon-btn" onClick={() => setDeleteConfirm(t.id)} title="Delete" style={{ color: 'var(--loss)' }}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trade Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancelForm()}>
          <div className="glass-deep modal-panel">
            <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="modal-title">{editingTrade ? 'Edit Trade' : 'Log New Trade'}</div>
                <button type="button" className="modal-close" onClick={handleCancelForm}><X size={18}/></button>
              </div>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('metrics')}
                  className={`btn btn-sm ${modalTab === 'metrics' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: 'var(--r-md)' }}
                >
                  Trade Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('rules')}
                  className={`btn btn-sm ${modalTab === 'rules' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Rules Checklist
                  {accountRules.length > 0 && (
                    <span style={{ fontSize: '0.6rem', background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: '6px', border: '1px solid var(--border-mid)' }}>
                      {accountRules.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              {modalTab === 'metrics' ? (
                <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Symbol *</label>
                  <input required className="input" placeholder="EURUSD" value={formData.symbol} onChange={e => handleFieldChange('symbol', e.target.value.toUpperCase())}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Direction *</label>
                  <select className="input" value={formData.type} onChange={e => handleFieldChange('type', e.target.value)}>
                    <option value="Long">Long ↑</option>
                    <option value="Short">Short ↓</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Entry Price (Auto-OCR)</label>
                  <input className="input" placeholder="0.00" value={formData.entryPrice} onChange={e => handleFieldChange('entryPrice', e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Exit Price (Auto-OCR)</label>
                  <input className="input" placeholder="0.00" value={formData.exitPrice} onChange={e => handleFieldChange('exitPrice', e.target.value)}/>
                </div>

                <div className="form-field">
                  <label className="form-label">Lot Size</label>
                  <input className="input" type="number" step="any" placeholder="0.10" value={formData.lotSize} onChange={e => handleFieldChange('lotSize', e.target.value)}/>
                </div>
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Net P&L ($) *</label>
                    <button
                      type="button"
                      onClick={handleSetBreakeven}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'Inter, sans-serif',
                        padding: 0,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'color var(--t-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover, #a78bfa)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                    >
                      ⚖️ Set Breakeven
                    </button>
                  </div>
                  <input required className="input" type="number" step="any" placeholder="250.00" value={formData.pnl} onChange={e => handleFieldChange('pnl', e.target.value)}/>
                </div>

                <div className="form-field">
                  <label className="form-label">Stop Loss</label>
                  <input className="input" type="number" step="any" placeholder="0.00" value={formData.stopLoss} onChange={e => handleFieldChange('stopLoss', e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Take Profit</label>
                  <input className="input" type="number" step="any" placeholder="0.00" value={formData.takeProfit} onChange={e => handleFieldChange('takeProfit', e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Risk/Reward Ratio (R/R)</label>
                  <input className="input" type="number" step="any" placeholder="2.00" value={formData.riskRewardRatio} onChange={e => handleFieldChange('riskRewardRatio', e.target.value)}/>
                </div>

                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Entry Time (Auto-OCR)</label>
                    <button
                      type="button"
                      onClick={() => setNYMarketOpenTime('entryTime')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'Inter, sans-serif',
                        padding: 0,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'color var(--t-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover, #a78bfa)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                    >
                      🇺🇸 Set 9:30 AM NY
                    </button>
                  </div>
                  <input className="input" type="datetime-local" value={formData.entryTime} onChange={e => handleFieldChange('entryTime', e.target.value)}/>
                </div>
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Exit Time (Auto-OCR)</label>
                    <button
                      type="button"
                      onClick={() => setNYMarketOpenTime('exitTime')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'Inter, sans-serif',
                        padding: 0,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'color var(--t-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover, #a78bfa)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
                    >
                      🇺🇸 Set 9:30 AM NY
                    </button>
                  </div>
                  <input className="input" type="datetime-local" value={formData.exitTime} onChange={e => handleFieldChange('exitTime', e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Setup</label>
                  <select className="input" value={formData.setup} onChange={e => handleFieldChange('setup', e.target.value)}>
                    <option value="">— Select —</option>
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Trade Grade</label>
                  <select className="input" value={formData.grade} onChange={e => handleFieldChange('grade', e.target.value)}>
                    {['A+', 'A', 'B', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Trading Account</label>
                  <select className="input" value={formData.accountId} onChange={e => handleFieldChange('accountId', e.target.value)}>
                    <option value="">— Select Account —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.accountName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field full">
                  <label className="form-label">Notion Strategy / Checklist Link</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="input"
                      type="url"
                      style={{ flex: 1 }}
                      placeholder="e.g. https://notion.so/my-strategy-setup"
                      value={formData.notionLink}
                      onChange={e => handleFieldChange('notionLink', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={extractNotionLink}
                      disabled={extractingNotion}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}
                    >
                      {extractingNotion ? 'Reading...' : 'Extract Setup via AI'}
                    </button>
                  </div>
                  {notionMessage && (
                    <div style={{ fontSize: '0.68rem', color: notionMessage.includes('Failed') ? 'var(--loss)' : 'var(--accent)', marginTop: '4px', fontWeight: 600 }}>
                      ⚡ {notionMessage}
                    </div>
                  )}
                </div>

                <div className="form-field full">
                  <label className="form-label">Emotional State</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
                    {EMOTIONS.map(e => (
                      <button key={e} type="button" onClick={() => toggleEmotion(e)}
                        className={`btn btn-sm ${formData.emotionTags.includes(e) ? 'btn-primary' : 'btn-ghost'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">FOMO Level: <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{formData.fomoLevel}/10</span></label>
                  <input type="range" className="slider" min="1" max="10" value={formData.fomoLevel} onChange={e => handleFieldChange('fomoLevel', +e.target.value)}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Confidence: <span style={{ color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>{formData.confidenceLevel}/10</span></label>
                  <input type="range" className="slider" min="1" max="10" value={formData.confidenceLevel} onChange={e => handleFieldChange('confidenceLevel', +e.target.value)}/>
                </div>

                <div className="form-field full">
                  <label className="form-label">Journal Notes</label>
                  <textarea className="input" placeholder="What happened? What did you do well? What to improve?" rows={3} value={formData.notes} onChange={e => handleFieldChange('notes', e.target.value)}/>
                </div>

                <div className="form-field">
                  <label className="form-label">Tags (comma separated)</label>
                  <input className="input" placeholder="london session, breakout" value={formData.tags} onChange={e => handleFieldChange('tags', e.target.value)}/>
                </div>

                <div className="form-field full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Chart Screenshots</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={autoFeatures}
                        onChange={e => setAutoFeatures(e.target.checked)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      Auto-fill from image (OCR)
                    </label>
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                    padding: '8px 12px', border: '1px dashed var(--border-mid)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    transition: 'border-color var(--t-fast)', background: 'var(--surface-glass)',
                  }}>
                    <Upload size={13}/>
                    Attach PNG / JPG (Select multiple)
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange}/>
                  </label>
                  
                  {/* Current screenshots to retain (only shown when editing) */}
                  {editingTrade && existingImages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Screenshots:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
                        {existingImages.map((url, idx) => (
                          <div key={idx} style={{
                            position: 'relative', display: 'inline-flex', alignItems: 'center',
                            gap: '6px', padding: '4px 8px', background: 'rgba(167, 139, 250, 0.08)',
                            borderRadius: 'var(--r-md)', border: '1px solid rgba(167, 139, 250, 0.2)',
                            fontSize: '0.7rem'
                          }}>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent)' }}>
                              Screenshot {idx + 1}
                            </span>
                            <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))} style={{
                              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                              padding: 2, display: 'flex', alignItems: 'center'
                            }}>
                              <X size={12} style={{ color: 'var(--loss)' }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {chartFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginTop: '8px' }}>
                      {chartFiles.map((file, idx) => (
                        <div key={idx} style={{
                          position: 'relative', display: 'inline-flex', alignItems: 'center',
                          gap: '6px', padding: '4px 8px', background: 'var(--bg-secondary)',
                          borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)',
                          fontSize: '0.7rem'
                        }}>
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <button type="button" onClick={() => setChartFiles(prev => prev.filter((_, i) => i !== idx))} style={{
                            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                            padding: 2, display: 'flex', alignItems: 'center'
                          }}>
                            <X size={12} style={{ color: 'var(--loss)' }}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {ocrMessage && (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                    background: 'rgba(255, 107, 0, 0.08)',
                    border: '1px solid rgba(255, 107, 0, 0.25)',
                    color: '#ff6b00',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '10px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <span className="spin-anim" style={{ display: 'inline-block' }}>⚡</span>
                    {ocrMessage}
                  </div>
                )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0', minHeight: '300px' }}>
                  <div className="glass-deep" style={{ padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)', background: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Shield size={14} style={{ color: 'var(--warn)' }} />
                      Active Account Constraints
                    </span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      Confirm that your execution adhered to the rules configured for this account.
                    </p>
                  </div>

                  {accountRules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ListTodo size={28} style={{ opacity: 0.25 }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No active rules configured</div>
                      <div style={{ fontSize: '0.68rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>
                        {formData.accountId ? 'There are no active constraints for this account. Configure rules in the Trading Rules playbook page.' : 'Select a Trading Account on the Trade Metrics tab to review its rules.'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {accountRules.map((rule, idx) => (
                        <div
                          key={rule.id}
                          className="glass-deep"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: 'var(--r-md)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`rule-check-${rule.id}`}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                              accentColor: 'var(--profit)'
                            }}
                          />
                          <label
                            htmlFor={`rule-check-${rule.id}`}
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              userSelect: 'none',
                              lineHeight: 1.4
                            }}
                          >
                            <strong>{idx + 1}.</strong> {rule.ruleText}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginTop: '4px'
                }}>
                  ⚠️ {formError}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={handleCancelForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingTrade ? 'Save Changes' : '+ Log Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trade Details & Share Modal */}
      {currentSelectedTrade && (
        <div className="modal-overlay" onClick={() => setSelectedTrade(null)}>
          <div className="glass-deep modal-panel" style={{ width: 840, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <span className={`badge ${currentSelectedTrade.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                  {currentSelectedTrade.type}
                </span>
                <span className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{currentSelectedTrade.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {currentSelectedTrade.entryTime ? formatInNewYork(currentSelectedTrade.entryTime, 'MMM d, yyyy HH:mm') : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => startEditTrade(currentSelectedTrade)}
                  style={{ gap: '4px', padding: '4px 8px', fontSize: '0.72rem', height: 28 }}
                >
                  Edit Trade
                </button>
                <button className="modal-close" onClick={() => setSelectedTrade(null)} style={{ margin: 0 }}><X size={18}/></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--s6)', overflowY: 'auto', maxHeight: '70vh', paddingRight: 'var(--s2)' }}>
              {/* Left Column: Stats and Screenshot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)' }}>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Net Return</div>
                    <div style={{ fontWeight: 800, color: currentSelectedTrade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', fontSize: '1.1rem', marginTop: 2 }}>
                      {currentSelectedTrade.pnl >= 0 ? '+' : ''}${Math.abs(currentSelectedTrade.pnl).toFixed(2)}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Entry Price</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.entryPrice || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Exit Price</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.exitPrice || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Volume</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.lotSize || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                      {currentSelectedTrade.tags && currentSelectedTrade.tags.length > 0 ? (
                        currentSelectedTrade.tags.map((tag, tagIdx) => (
                          <span key={tagIdx} style={{ fontSize: '0.62rem', background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.2)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px' }}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screenshot Chart */}
                {currentSelectedTrade.imageUrls && currentSelectedTrade.imageUrls.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: '#0e1017', border: '1px solid var(--border)', aspectRatio: '16/10' }}>
                      <img src={currentSelectedTrade.imageUrls[activeImageIdx]} alt="Trade Chart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setZoomImage(currentSelectedTrade.imageUrls[activeImageIdx])} className="btn btn-sm" style={{ position: 'absolute', right: 8, bottom: 8, background: '#ffffff', padding: '4px 8px', fontSize: '0.68rem', gap: '4px', color: '#000000', border: '1px solid rgba(0,0,0,0.15)', fontWeight: 600 }}>
                        <ZoomIn size={12}/> View Chart
                      </button>
                    </div>
                    {currentSelectedTrade.imageUrls.length > 1 && (
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: 4 }}>
                        {currentSelectedTrade.imageUrls.map((url, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActiveImageIdx(idx)}
                            style={{
                              width: 60, height: 40, borderRadius: 'var(--r-sm)', overflow: 'hidden',
                              border: activeImageIdx === idx ? '2px solid var(--accent)' : '1px solid var(--border-mid)',
                              cursor: 'pointer', opacity: activeImageIdx === idx ? 1 : 0.6,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <img src={url} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, borderRadius: 'var(--r-lg)', border: '1px dashed var(--border)', color: 'var(--text-tertiary)', gap: 'var(--s2)' }}>
                    <FileText size={24} style={{ opacity: 0.2 }}/>
                    <span style={{ fontSize: '0.72rem' }}>No screenshot uploaded for this trade</span>
                  </div>
                )}

                {/* Notes */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--s2)', fontWeight: 600 }}>Notes</div>
                  <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {currentSelectedTrade.notes || 'No notes logged.'}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters, Emotions & Sharing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
                {/* Parameters */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--s3)', fontWeight: 600 }}>Parameters</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {[
                      { label: 'Setup / Strategy', value: currentSelectedTrade.setup || '—' },
                      { label: 'Grade', value: <span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>{currentSelectedTrade.grade || '—'}</span> },
                      { label: 'Stop Loss', value: currentSelectedTrade.stopLoss || '—' },
                      { label: 'Take Profit', value: currentSelectedTrade.takeProfit || '—' },
                      { label: 'Risk/Reward Ratio (R/R)', value: currentSelectedTrade.riskRewardRatio ? `${currentSelectedTrade.riskRewardRatio} R` : '—' },
                      { label: 'Exit Time', value: currentSelectedTrade.exitTime ? formatInNewYork(currentSelectedTrade.exitTime, 'MMM d, HH:mm') : '—' },
                      { label: 'Trading Account', value: accounts.find(a => a.id === currentSelectedTrade.accountId)?.accountName || '—' },
                      {
                        label: 'Notion Playbook',
                        value: currentSelectedTrade.notionLink ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <a href={currentSelectedTrade.notionLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              View <ExternalLink size={10} />
                            </a>
                            <button onClick={() => fetchPlaybook(currentSelectedTrade)} className="btn btn-sm btn-ghost" style={{ padding: '1px 4px', fontSize: '0.6rem', height: '18px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              AI
                            </button>
                          </div>
                        ) : '—'
                      }
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingBottom: 'var(--s1.5)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Psychology & Tags */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--s3.5)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Psychology & Tags</div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>FOMO Level</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{currentSelectedTrade.fomoLevel}/10</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${currentSelectedTrade.fomoLevel * 10}%`, background: 'var(--accent)', borderRadius: 2 }}/>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Confidence Level</span>
                      <span style={{ fontWeight: 700, color: 'var(--profit)' }}>{currentSelectedTrade.confidenceLevel}/10</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${currentSelectedTrade.confidenceLevel * 10}%`, background: 'var(--profit)', borderRadius: 2 }}/>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>Emotions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {currentSelectedTrade.emotionTags && currentSelectedTrade.emotionTags.length > 0 ? (
                        currentSelectedTrade.emotionTags.map(tag => (
                          <span key={tag} className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>{tag}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sharing Dashboard */}
                <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(135deg, rgba(167,139,250,0.02) 0%, var(--surface) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                    <Share2 size={13} style={{ color: 'var(--accent)' }}/>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>Share Trade</span>
                  </div>

                  {currentSelectedTrade.shareToken ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <input
                          readOnly
                          className="input"
                          style={{ fontSize: '0.72rem', height: 32, flex: 1, textOverflow: 'ellipsis', background: 'rgba(0,0,0,0.2)' }}
                          value={`${window.location.origin}/shared/trade/${currentSelectedTrade.shareToken}`}
                          onClick={e => e.target.select()}
                        />
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ height: 32, width: 36, padding: 0 }}
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${window.location.origin}/shared/trade/${currentSelectedTrade.shareToken}`);
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          }}
                          title="Copy to Clipboard"
                        >
                          {copySuccess ? <Check size={14} style={{ color: 'var(--profit)' }}/> : <Copy size={14}/>}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <a
                          href={`/shared/trade/${currentSelectedTrade.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: '0.72rem', flex: 1, gap: '4px', height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          View Public Page <ExternalLink size={11}/>
                        </a>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: '0.72rem', flex: 1, height: 30 }}
                          onClick={handleUnshare}
                        >
                          Make Private
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--s3)' }}>
                        Generate a secure public link to share this trade report with others. You can revoke it at any time.
                      </p>
                      <button className="btn btn-sm btn-primary" style={{ width: '100%', fontSize: '0.72rem', height: 32 }} onClick={handleShare}>
                        Create Shareable Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom View */}
      {zoomImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5,6,8,0.95)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000, padding: 'var(--s8)'
        }} onClick={() => setZoomImage(null)}>
          <button style={{
            position: 'absolute', top: 20, right: 20, background: 'var(--surface-glass)',
            border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }} onClick={() => setZoomImage(null)}>
            <X size={20}/>
          </button>
          <img
            src={zoomImage}
            alt="Zoomed chart screenshot"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--r-lg)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-deep modal-panel" style={{ width: 380, padding: 'var(--s8)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ marginBottom: 'var(--s4)' }}>Delete Trade?</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--s6)', lineHeight: 1.7 }}>
              This will permanently remove this trade from your journal.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => confirmDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Notion Playbook Modal */}
      {activePlaybook && (
        <div className="modal-overlay" onClick={() => setActivePlaybook(null)}>
          <div className="glass-deep modal-panel" style={{ width: 500, maxWidth: '90vw', padding: 'var(--s6)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: 'var(--s4)' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} style={{ color: 'var(--accent)' }} />
                <span>AI Playbook Audit</span>
              </div>
              <button className="modal-close" onClick={() => setActivePlaybook(null)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                  {activePlaybook.title}
                </h4>
                {activePlaybook.url && (
                  <a href={activePlaybook.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {activePlaybook.url.length > 50 ? `${activePlaybook.url.substring(0, 50)}...` : activePlaybook.url} <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div style={{
                minHeight: '160px',
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--s4)',
                fontSize: '0.78rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                overflowY: 'auto',
                maxHeight: '350px'
              }}>
                {loadingPlaybook ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '10px' }}>
                    <span className="spin-anim" style={{ display: 'inline-block', fontSize: '1.5rem' }}>⚡</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Agent scraping & reading Notion page...</span>
                  </div>
                ) : playbookError ? (
                  <div style={{ color: 'var(--loss)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 700 }}>Extraction Failed</div>
                    <div>{playbookError}</div>
                  </div>
                ) : (
                  <div className="markdown-body" style={{ whiteSpace: 'pre-wrap' }}>
                    {activePlaybook.summary}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s5)' }}>
              <button className="btn btn-ghost" onClick={() => setActivePlaybook(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
