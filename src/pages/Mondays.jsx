import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  CalendarDays, Image as ImageIcon, Brain, NotebookPen, 
  X, ZoomIn, Calendar, TrendingUp, TrendingDown, 
  Award, Zap, AlertTriangle, CheckCircle, Save,
  Plus, Upload, ShieldCheck
} from 'lucide-react';
import { formatInNewYork, toNewYorkDatetimeString, parseNewYorkDatetimeToDate } from '../utils/timezone';

const SETUPS = ['FVG', 'SMT', 'OB', 'BB', 'IRL-ERL', 'ERL-IRL'];

const EMOTION_COLORS = {
  Calm: '#818cf8', Confident: '#34d399', Anxious: '#fbbf24',
  Fearful: '#fca5a5', Greedy: '#f97316', FOMO: '#f87171',
  Disciplined: '#60a5fa', Revenge: '#ef4444',
};

const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'FOMO', 'Disciplined', 'Revenge'];

// Helper to generate the last 12 Mondays
const getRecentMondays = () => {
  const dates = [];
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Find the most recent Monday
  const diff = (day === 0 ? -6 : 1) - day;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() + diff);
  
  // Generate 12 Mondays backwards
  for (let i = 0; i < 12; i++) {
    const mon = new Date(lastMonday);
    mon.setDate(lastMonday.getDate() - i * 7);
    dates.push(mon);
  }
  return dates;
};

const Mondays = () => {
  const { trades, fetchTrades, addTrade, updateTrade } = useTrades();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('charts');
  const [lightbox, setLightbox] = useState(null);
  const [selectedMonday, setSelectedMonday] = useState('All');

  // Psychology log states for specific Monday
  const [psychRating, setPsychRating] = useState(5);
  const [psychMood, setPsychMood] = useState('Neutral');
  const [psychPrepDone, setPsychPrepDone] = useState(true);
  const [psychRulesAdhered, setPsychRulesAdhered] = useState(true);
  const [psychReflections, setPsychReflections] = useState('');
  const [psychSaveMessage, setPsychSaveMessage] = useState('');

  const recentMondays = useMemo(() => getRecentMondays(), []);

  // Load psychology log for selectedMonday
  useEffect(() => {
    if (selectedMonday !== 'All') {
      const key = `tz_monday_psych_${user?.id || 'guest'}_${selectedMonday}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPsychRating(parsed.rating !== undefined ? parsed.rating : 5);
          setPsychMood(parsed.mood || 'Neutral');
          setPsychPrepDone(parsed.prepDone !== undefined ? parsed.prepDone : true);
          setPsychRulesAdhered(parsed.rulesAdhered !== undefined ? parsed.rulesAdhered : true);
          setPsychReflections(parsed.reflections || '');
        } catch (e) {
          console.error(e);
        }
      } else {
        setPsychRating(5);
        setPsychMood('Neutral');
        setPsychPrepDone(true);
        setPsychRulesAdhered(true);
        setPsychReflections('');
      }
      setPsychSaveMessage('');
    }
  }, [selectedMonday, user]);

  const savePsychLog = () => {
    if (selectedMonday === 'All') return;
    const key = `tz_monday_psych_${user?.id || 'guest'}_${selectedMonday}`;
    const data = {
      rating: psychRating,
      mood: psychMood,
      prepDone: psychPrepDone,
      rulesAdhered: psychRulesAdhered,
      reflections: psychReflections,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(data));
    setPsychSaveMessage('Psychology log saved! ✓');
    setTimeout(() => setPsychSaveMessage(''), 3000);
  };
  
  // Add Chart modal states
  const [showAddChart, setShowAddChart] = useState(false);
  const [addMode, setAddMode] = useState('new'); // Set default to 'new' since we've removed 'existing'
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [chartFile, setChartFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Helper to get default Monday datetime at 9:30 AM NY Time
  const getDefaultMondayDatetime = () => {
    const date = new Date();
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = (day === 0 ? -6 : 1) - day; // diff to Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(9, 30, 0, 0); // Default to NY Market Open 9:30 AM
    return toNewYorkDatetimeString(monday);
  };

  const [newTradeData, setNewTradeData] = useState({
    symbol: '',
    type: 'Long',
    pnl: '',
    entryTime: '',
    setup: '',
    notes: '',
    emotionTags: [],
    fomoLevel: 5,
    confidenceLevel: 5,
  });

  // Reset entry time when modal is opened
  useEffect(() => {
    if (showAddChart) {
      setNewTradeData(prev => ({
        ...prev,
        entryTime: getDefaultMondayDatetime()
      }));
    }
  }, [showAddChart]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setChartFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setChartFile(null);
      setImagePreview(null);
    }
  };

  const handleExistingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTradeId) {
      setErrorMsg('Please select a Monday trade.');
      return;
    }
    if (!chartFile) {
      setErrorMsg('Please select a chart file.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    
    try {
      const trade = mondayTrades.find(t => String(t.id) === String(selectedTradeId));
      if (!trade) {
        throw new Error('Selected trade not found.');
      }
      
      const tradeData = {
        symbol: trade.symbol,
        type: trade.type || 'Long',
        entryPrice: trade.entryPrice !== undefined && trade.entryPrice !== null ? parseFloat(trade.entryPrice) : 0,
        exitPrice: trade.exitPrice !== undefined && trade.exitPrice !== null ? parseFloat(trade.exitPrice) : 0,
        lotSize: trade.lotSize !== undefined && trade.lotSize !== null ? parseFloat(trade.lotSize) : 0,
        stopLoss: trade.stopLoss !== undefined && trade.stopLoss !== null ? parseFloat(trade.stopLoss) : 0,
        takeProfit: trade.takeProfit !== undefined && trade.takeProfit !== null ? parseFloat(trade.takeProfit) : 0,
        pnl: trade.pnl !== undefined && trade.pnl !== null ? parseFloat(trade.pnl) : 0,
        entryTime: trade.entryTime ? new Date(trade.entryTime).toISOString() : new Date().toISOString(),
        exitTime: trade.exitTime ? new Date(trade.exitTime).toISOString() : '',
        setup: trade.setup || '',
        grade: trade.grade || 'B',
        notes: trade.notes || '',
        tags: Array.isArray(trade.tags) ? trade.tags : [],
        emotionTags: Array.isArray(trade.emotionTags) ? trade.emotionTags : [],
        fomoLevel: parseInt(trade.fomoLevel) || 5,
        confidenceLevel: parseInt(trade.confidenceLevel) || 5,
        accountId: trade.accountId || null,
        notionLink: trade.notionLink || '',
      };
      
      await updateTrade(trade.id, tradeData, [chartFile], trade.imageUrls || []);
      
      setShowAddChart(false);
      setSelectedTradeId('');
      setChartFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to attach chart.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewSubmit = async (e) => {
    e.preventDefault();
    if (!newTradeData.symbol) {
      setErrorMsg('Please enter a symbol.');
      return;
    }
    if (!chartFile) {
      setErrorMsg('Please select a chart file.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    
    try {
      const entryTimeDate = newTradeData.entryTime ? parseNewYorkDatetimeToDate(newTradeData.entryTime) : new Date();
      
      const tradeData = {
        symbol: newTradeData.symbol.toUpperCase(),
        type: newTradeData.type || 'Long',
        entryPrice: 0,
        exitPrice: 0,
        lotSize: 0,
        stopLoss: 0,
        takeProfit: 0,
        pnl: parseFloat(newTradeData.pnl) || 0,
        entryTime: entryTimeDate ? entryTimeDate.toISOString() : new Date().toISOString(),
        exitTime: '',
        setup: newTradeData.setup || '',
        grade: 'B',
        notes: newTradeData.notes || '',
        tags: ['Monday-Only'],
        emotionTags: newTradeData.emotionTags || [],
        fomoLevel: parseInt(newTradeData.fomoLevel) || 5,
        confidenceLevel: parseInt(newTradeData.confidenceLevel) || 5,
        accountId: null,
        notionLink: '',
      };
      
      await addTrade(tradeData, [chartFile]);
      
      setShowAddChart(false);
      setNewTradeData({
        symbol: '',
        type: 'Long',
        pnl: '',
        entryTime: getDefaultMondayDatetime(),
        setup: '',
        notes: '',
        emotionTags: [],
        fomoLevel: 5,
        confidenceLevel: 5,
      });
      setChartFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create new Monday trade.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Notes states
  const [notesText, setNotesText] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved'
 
  // Fetch trades on component load
  useEffect(() => {
    fetchTrades({ limit: 1000 });
  }, [fetchTrades]);
 
  // Load notes from LocalStorage when selectedMonday changes
  useEffect(() => {
    const key = selectedMonday === 'All' 
      ? 'tz_monday_notes' 
      : `tz_monday_notes_${user?.id || 'guest'}_${selectedMonday}`;
    const savedNotes = localStorage.getItem(key);
    setNotesText(savedNotes || '');
    setSaveStatus('');
  }, [selectedMonday, user]);
 
  // Filter trades for Monday (incorporating selectedMonday)
  const mondayTrades = useMemo(() => {
    return (trades || []).filter(t => {
      const entryDate = t.entryTime || t.entry_time;
      if (!entryDate) return false;
      const isMonday = formatInNewYork(entryDate, 'EEEE') === 'Monday';
      if (!isMonday) return false;
      if (selectedMonday !== 'All') {
        return formatInNewYork(entryDate, 'yyyy-MM-dd') === selectedMonday;
      }
      return true;
    });
  }, [trades, selectedMonday]);
 
  // Filter Monday trades with charts
  const mondayCharts = useMemo(() => {
    return mondayTrades.filter(t => t.imageUrl);
  }, [mondayTrades]);
 
  // Monday trades formatted for dropdown select (no-chart trades first)
  const dropdownTrades = useMemo(() => {
    const noCharts = mondayTrades.filter(t => !t.imageUrl);
    const withCharts = mondayTrades.filter(t => t.imageUrl);
    return [...noCharts, ...withCharts];
  }, [mondayTrades]);
 
  // Handle note change with auto-save
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotesText(val);
    setSaveStatus('saving');
    
    const key = selectedMonday === 'All' 
      ? 'tz_monday_notes' 
      : `tz_monday_notes_${user?.id || 'guest'}_${selectedMonday}`;
    localStorage.setItem(key, val);
    
    // Fake a brief saving animation state
    setTimeout(() => {
      setSaveStatus('saved');
    }, 600);
  };
 
  // Trigger manual save indicator clear
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Psychology Statistics
  const stats = useMemo(() => {
    if (mondayTrades.length === 0) return null;

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalFomo = 0;
    let totalConfidence = 0;
    let fomoCount = 0;
    let confidenceCount = 0;
    let totalDisciplineScore = 0;
    let revengeCount = 0;
    let fomoCost = 0;

    const tagCounts = {};

    mondayTrades.forEach(t => {
      const pnl = parseFloat(t.pnl) || 0;
      totalPnL += pnl;

      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;

      // FOMO and Confidence
      const f = parseFloat(t.fomoLevel);
      const c = parseFloat(t.confidenceLevel);

      const validFomo = !isNaN(f) ? f : 5;
      const validConf = !isNaN(c) ? c : 5;

      totalFomo += validFomo;
      fomoCount++;

      totalConfidence += validConf;
      confidenceCount++;

      // Discipline score formula: ((10 - f) / 9 + (c - 1) / 9) / 2 * 100
      const fomoScore = (10 - validFomo) / 9;
      const confidenceScore = (validConf - 1) / 9;
      totalDisciplineScore += ((fomoScore + confidenceScore) / 2) * 100;

      // Emotion tags count
      if (t.emotionTags && Array.isArray(t.emotionTags)) {
        t.emotionTags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          if (tag === 'Revenge') revengeCount++;
        });
      }

      // FOMO Cost (FOMO >= 7)
      if (validFomo >= 7 && pnl < 0) {
        fomoCost += pnl;
      }
    });

    const avgFomo = fomoCount > 0 ? (totalFomo / fomoCount).toFixed(1) : '—';
    const avgConfidence = confidenceCount > 0 ? (totalConfidence / confidenceCount).toFixed(1) : '—';
    const disciplineScore = mondayTrades.length > 0 ? Math.round(totalDisciplineScore / mondayTrades.length) : 0;
    const winRate = mondayTrades.length > 0 ? ((wins / mondayTrades.length) * 100).toFixed(1) : '0';

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      winRate,
      totalPnL,
      avgFomo,
      avgConfidence,
      disciplineScore,
      revengeCount,
      fomoCost: Math.abs(fomoCost),
      topTags,
      totalTrades: mondayTrades.length,
      wins,
      losses
    };
  }, [mondayTrades]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <div style={{ 
            background: 'var(--accent-soft)', 
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--r-md)', 
            padding: '8px', 
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="page-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Monday's Dashboard</div>
            <div className="page-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Dedicated planning, review, and psychology metrics for Monday trading sessions.
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="glass" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          {[
            { id: 'charts', label: 'Charts', icon: <ImageIcon size={14} /> },
            { id: 'psychology', label: 'Psychology', icon: <Brain size={14} /> },
            { id: 'notes', label: 'Notes', icon: <NotebookPen size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monday Dates Calendar Deck */}
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Calendar size={13} style={{ color: 'var(--accent)' }} /> Select Monday Date
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedMonday('All')}
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 16px',
              borderRadius: 'var(--r-md)',
              background: selectedMonday === 'All' ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
              border: selectedMonday === 'All' ? '1px solid var(--accent)' : '1px solid var(--border-mid)',
              color: selectedMonday === 'All' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              minWidth: '80px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.8 }}>View</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>All</span>
          </button>

          {recentMondays.map(date => {
            const dateStr = formatInNewYork(date.toISOString(), 'yyyy-MM-dd');
            const displayDay = formatInNewYork(date.toISOString(), 'MMM d');
            const isSelected = selectedMonday === dateStr;
            // Query original unfiltered trades to get correct P&L for this day
            const dayPnL = (trades || []).filter(t => {
              const entryTime = t.entryTime || t.entry_time;
              return entryTime && formatInNewYork(entryTime, 'yyyy-MM-dd') === dateStr;
            }).reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
            
            const hasTrades = (trades || []).some(t => {
              const entryTime = t.entryTime || t.entry_time;
              return entryTime && formatInNewYork(entryTime, 'yyyy-MM-dd') === dateStr;
            });

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedMonday(dateStr)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: 'var(--r-md)',
                  background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-mid)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  minWidth: '90px',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.52rem', textTransform: 'uppercase', opacity: 0.7 }}>Monday</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, margin: '2px 0' }}>{displayDay}</span>
                {hasTrades ? (
                  <span style={{ 
                    fontSize: '0.62rem', 
                    fontWeight: 700, 
                    color: isSelected ? '#ffffff' : (dayPnL >= 0 ? 'var(--profit)' : 'var(--loss)') 
                  }}>
                    {dayPnL >= 0 ? '+' : ''}${Math.round(dayPnL)}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.55rem', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>No trades</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'charts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {mondayCharts.length} Monday playbook chart{mondayCharts.length !== 1 ? 's' : ''}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddChart(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer'
              }}
            >
              <Plus size={12} /> Add Monday Chart
            </button>
          </div>

          {mondayCharts.length === 0 ? (
            <div className="glass empty-state" style={{ padding: 'var(--s12)', textAlign: 'center' }}>
              <ImageIcon size={36} style={{ opacity: 0.25, marginBottom: 'var(--s4)' }}/>
              <div className="empty-title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>No Monday charts uploaded</div>
              <div className="empty-desc" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', maxWidth: 400, margin: '8px auto 0' }}>
                Attach chart screenshots to trades logged on Mondays to construct your Monday playbook library.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddChart(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 'var(--r-md)',
                  cursor: 'pointer',
                  margin: 'var(--s6) auto 0'
                }}
              >
                <Plus size={14} /> Upload First Chart
              </button>
            </div>
          ) : (
            <div className="chart-gallery-grid">
              {mondayCharts.map(trade => (
                <div key={trade.id} className="glass chart-thumb" onClick={() => setLightbox(trade)}>
                  <img src={trade.imageUrl} alt={`${trade.symbol} Monday chart`} />
                  <div className="chart-thumb-overlay">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 2 }}>{trade.symbol}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10}/>
                          {trade.entryTime ? formatInNewYork(trade.entryTime, 'MMM d, yyyy') : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <span className={`badge ${parseFloat(trade.pnl) >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                          {parseFloat(trade.pnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(trade.pnl)).toFixed(2)}
                        </span>
                        <ZoomIn size={14} style={{ color: 'rgba(255,255,255,0.7)' }}/>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'psychology' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {selectedMonday === 'All' && !stats ? (
            <div className="glass empty-state" style={{ padding: 'var(--s12)', textAlign: 'center' }}>
              <Brain size={36} style={{ opacity: 0.25, marginBottom: 'var(--s4)' }}/>
              <div className="empty-title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>No statistics available</div>
              <div className="empty-desc" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', maxWidth: 400, margin: '8px auto 0' }}>
                Log trades executed on Mondays in your journal to compile psychological and mindset reports.
              </div>
            </div>
          ) : (
            <>
              {/* KPIs & Metrics Section (Only if stats is not null) */}
              {stats ? (
                <>
                  {/* KPIs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
                    <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monday P&L</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {stats.totalPnL >= 0 ? '+' : '-'}${Math.abs(stats.totalPnL).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        Across {stats.totalTrades} Monday trades
                      </div>
                    </div>

                    <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win Rate</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>
                        {stats.winRate}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {stats.wins} Wins · {stats.losses} Losses
                      </div>
                    </div>

                    <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discipline Index</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.disciplineScore >= 70 ? 'var(--profit)' : stats.disciplineScore >= 40 ? 'var(--warn)' : 'var(--loss)' }}>
                        {stats.disciplineScore}/100
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        Mindset execution index
                      </div>
                    </div>

                    <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenge Trades</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.revengeCount > 0 ? 'var(--loss)' : 'var(--profit)' }}>
                        {stats.revengeCount}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        Logged on Mondays
                      </div>
                    </div>
                  </div>

                  {/* Psychology Metrics & Dials */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)', '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
                    {/* Mental Averages */}
                    <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)', margin: 0, color: 'var(--text-primary)' }}>
                        Mindset Averages
                      </h3>
                      
                      {/* FOMO Progress Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={12} style={{ color: 'var(--loss)' }}/> Average FOMO Level
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{stats.avgFomo} / 10</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${parseFloat(stats.avgFomo) * 10}%`, 
                            height: '100%', 
                            background: parseFloat(stats.avgFomo) >= 7 ? 'var(--loss)' : parseFloat(stats.avgFomo) >= 4 ? 'var(--warn)' : 'var(--profit)',
                            boxShadow: '0 0 6px rgba(239, 68, 68, 0.2)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          Lower is better (1-3: Disciplined entry)
                        </div>
                      </div>

                      {/* Confidence Progress Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={12} style={{ color: 'var(--profit)' }}/> Average Confidence Level
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{stats.avgConfidence} / 10</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${parseFloat(stats.avgConfidence) * 10}%`, 
                            height: '100%', 
                            background: parseFloat(stats.avgConfidence) >= 7 ? 'var(--profit)' : parseFloat(stats.avgConfidence) >= 4 ? 'var(--warn)' : 'var(--loss)',
                            boxShadow: '0 0 6px rgba(52, 211, 153, 0.2)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          Higher is better (7-10: Decisive execution)
                        </div>
                      </div>

                      {/* FOMO Cost Card */}
                      <div style={{ 
                        marginTop: 'auto',
                        padding: '10px 14px', 
                        background: stats.fomoCost > 0 ? 'var(--loss-soft)' : 'var(--profit-soft)', 
                        border: `1px solid ${stats.fomoCost > 0 ? 'var(--loss-border)' : 'var(--profit-border)'}`,
                        borderRadius: 'var(--r-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        {stats.fomoCost > 0 ? (
                          <>
                            <AlertTriangle size={16} style={{ color: 'var(--loss)', flexShrink: 0 }} />
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              Monday FOMO Cost: <strong style={{ color: 'var(--loss)' }}>-${stats.fomoCost.toFixed(2)}</strong> lost on high FOMO trades (FOMO &gt;= 7).
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              Zero FOMO costs incurred! You did not trade impulsively on Mondays.
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Top Emotions & Mindsets */}
                    <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)', margin: 0, color: 'var(--text-primary)' }}>
                        Monday Emotional States
                      </h3>

                      {stats.topTags.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 'var(--s4) 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          No emotion tags logged for Monday trades yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', justifyContent: 'center', flex: 1 }}>
                          {stats.topTags.map(([tag, count]) => {
                            const color = EMOTION_COLORS[tag] || 'var(--accent)';
                            const pct = Math.round((count / stats.totalTrades) * 100);
                            return (
                              <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="badge" style={{ 
                                  background: `${color}15`, 
                                  border: `1px solid ${color}40`, 
                                  color: color, 
                                  fontSize: '0.68rem',
                                  width: '90px',
                                  textAlign: 'center'
                                }}>
                                  {tag}
                                </span>
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', minWidth: '42px', textAlign: 'right' }}>
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Monday Trades */}
                  <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Monday Trade History
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Symbol</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>FOMO</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600 }}>Confidence</th>
                            <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mondayTrades.slice(0, 5).map(trade => (
                            <tr key={trade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>
                                {trade.entryTime ? formatInNewYork(trade.entryTime, 'MMM d, yyyy') : '—'}
                              </td>
                              <td style={{ padding: '10px 4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {trade.symbol}
                              </td>
                              <td style={{ padding: '10px 4px' }}>
                                <span className={`badge ${trade.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.55rem', padding: '1px 6px' }}>
                                  {trade.type}
                                </span>
                              </td>
                              <td style={{ padding: '10px 4px', color: (trade.fomoLevel || 5) >= 7 ? 'var(--loss)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                                {trade.fomoLevel || 5}/10
                              </td>
                              <td style={{ padding: '10px 4px', color: (trade.confidenceLevel || 5) >= 7 ? 'var(--profit)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                                {trade.confidenceLevel || 5}/10
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono', color: parseFloat(trade.pnl) >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                                {parseFloat(trade.pnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(trade.pnl)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass" style={{ padding: 'var(--s5)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  No trade metrics or charts recorded for this Monday. You can log practice trades on the Charts tab or complete the mindset log below.
                </div>
              )}

              {/* Specific Monday Mindset Log Entry Form */}
              {selectedMonday !== 'All' && (
                <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Brain size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Monday Mindset & Psychology Journal ({selectedMonday})
                      </span>
                    </div>
                    {psychSaveMessage && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--profit)', fontWeight: 600 }}>
                        {psychSaveMessage}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {/* Left Column: Metrics selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-field">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span>Mindset / Focus Rating</span>
                          <strong style={{ color: 'var(--accent)' }}>{psychRating}/10</strong>
                        </label>
                        <input 
                          type="range" 
                          min="1" 
                          max="10" 
                          value={psychRating} 
                          onChange={e => setPsychRating(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>1 - Distracted / Stressed</span>
                          <span>10 - Optimal Focus / Zen</span>
                        </span>
                      </div>

                      <div className="form-field">
                        <label className="form-label">Primary Emotion / Mood State</label>
                        <select 
                          className="input"
                          value={psychMood}
                          onChange={e => setPsychMood(e.target.value)}
                          style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        >
                          <option value="Neutral">Neutral 😐</option>
                          <option value="Calm">Calm / Patient 🧘</option>
                          <option value="Confident">Confident / Decisive 😎</option>
                          <option value="Anxious">Anxious / Hesitant 😰</option>
                          <option value="Fearful">Fearful / Risk-Averse 😨</option>
                          <option value="Greedy">Greedy / Over-leveraged 🤑</option>
                          <option value="FOMO">FOMO / Impulsive 🚀</option>
                          <option value="Disciplined">Disciplined / Rule-Adherent 🛡️</option>
                          <option value="Revenge">Revenge / Tilted 😡</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Column: Checklists */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={psychPrepDone}
                          onChange={e => setPsychPrepDone(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span>Completed Pre-Market Prep & Plan</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={psychRulesAdhered}
                          onChange={e => setPsychRulesAdhered(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span>Strictly Adhered to Risk & Setup Rules</span>
                      </label>
                      
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', lineHeight: 1.4, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                        <span>Logs are stored persistently on this browser to monitor emotional patterns on Mondays.</span>
                      </div>
                    </div>
                  </div>

                  {/* Textarea Reflections */}
                  <div className="form-field">
                    <label className="form-label">Reflections / Lessons Learned / Mindset Notes</label>
                    <textarea 
                      className="input"
                      rows={4}
                      value={psychReflections}
                      onChange={e => setPsychReflections(e.target.value)}
                      placeholder="How was your discipline? Did you follow your sizing limits? Write down lessons learned today..."
                      style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={savePsychLog} 
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      <Save size={12} /> Save Mindset Log
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Monday Notes & Reflections</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                Write down checklists, rules, and reflections specifically for trading on Mondays.
              </p>
            </div>
            {saveStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: saveStatus === 'saved' ? 'var(--profit)' : 'var(--text-tertiary)' }}>
                {saveStatus === 'saving' ? (
                  <>
                    <span className="status-dot live" style={{ background: 'var(--warn)', animation: 'pulse-glow 1s infinite' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={12} style={{ color: 'var(--profit)' }}/>
                    Saved ✓
                  </>
                )}
              </div>
            )}
          </div>

          <textarea
            className="input"
            rows={15}
            value={notesText}
            onChange={handleNotesChange}
            placeholder="Type your Monday trading rules, weekly preparation, levels to watch, or reflections here..."
            style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--r-md)',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              resize: 'vertical',
              width: '100%',
              minHeight: '300px'
            }}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="modal-overlay" style={{ padding: 'var(--s8)' }} onClick={() => setLightbox(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close glass" onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -40, right: 0, padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)' }}>
              <X size={16}/> <span style={{ fontSize: '0.72rem', marginLeft: 4 }}>Close</span>
            </button>
            <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
              <img src={lightbox.imageUrl} alt={lightbox.symbol}
                style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', borderRadius: 'var(--r-lg)' }}/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s4) var(--s2) var(--s2)', borderTop: '1px solid var(--border)', marginTop: 'var(--s4)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginBottom: 4 }}>{lightbox.symbol}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lightbox.entryTime ? formatInNewYork(lightbox.entryTime, 'MMMM d, yyyy HH:mm') : ''}
                    {lightbox.setup && ` · ${lightbox.setup}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                  <span className={`badge ${lightbox.type === 'Long' ? 'badge-profit' : 'badge-loss'}`}>{lightbox.type}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'JetBrains Mono', color: parseFloat(lightbox.pnl) >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    {parseFloat(lightbox.pnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(lightbox.pnl)).toFixed(2)}
                  </span>
                </div>
              </div>
              {lightbox.notes && (
                <div style={{ padding: 'var(--s3) var(--s2)', fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.7, fontStyle: 'italic', borderTop: '1px solid var(--border)' }}>
                  "{lightbox.notes}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddChart && (
        <div className="modal-overlay" onClick={() => setShowAddChart(false)}>
          <div className="glass-deep modal-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} style={{ color: 'var(--accent)' }}/>
                <span>Add Monday Chart</span>
              </div>
              <button className="modal-close" onClick={() => setShowAddChart(false)}><X size={18}/></button>
            </div>

            <form onSubmit={handleNewSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                {errorMsg && (
                  <div style={{ color: 'var(--loss)', fontSize: '0.75rem', fontWeight: 600, padding: '8px 12px', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', borderRadius: 'var(--r-md)' }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                  <div className="form-field">
                    <label className="form-label">Symbol *</label>
                    <input
                      required
                      className="input"
                      placeholder="EURUSD"
                      value={newTradeData.symbol}
                      onChange={e => setNewTradeData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Direction *</label>
                    <select
                      className="input"
                      value={newTradeData.type}
                      onChange={e => setNewTradeData(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Long">Long ↑</option>
                      <option value="Short">Short ↓</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                  <div className="form-field">
                    <label className="form-label">Net P&L ($) *</label>
                    <input
                      required
                      className="input"
                      type="number"
                      step="any"
                      placeholder="150.00"
                      value={newTradeData.pnl}
                      onChange={e => setNewTradeData(prev => ({ ...prev, pnl: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Entry Time *</label>
                    <input
                      required
                      className="input"
                      type="datetime-local"
                      value={newTradeData.entryTime}
                      onChange={e => setNewTradeData(prev => ({ ...prev, entryTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Setup</label>
                  <select
                    className="input"
                    value={newTradeData.setup}
                    onChange={e => setNewTradeData(prev => ({ ...prev, setup: e.target.value }))}
                  >
                    <option value="">— Select Setup —</option>
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="input"
                    placeholder="Trade reflections or setup notes..."
                    rows={2}
                    value={newTradeData.notes}
                    onChange={e => setNewTradeData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {/* Psychology options for Monday Chart */}
                <div className="form-field full">
                  <label className="form-label">Emotional State / Mood</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
                    {EMOTIONS.map(e => {
                      const hasTag = newTradeData.emotionTags.includes(e);
                      return (
                        <button 
                          key={e} 
                          type="button" 
                          onClick={() => {
                            setNewTradeData(prev => ({
                              ...prev,
                              emotionTags: hasTag 
                                ? prev.emotionTags.filter(x => x !== e)
                                : [...prev.emotionTags, e]
                            }));
                          }}
                          className={`btn btn-sm ${hasTag ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.68rem', padding: '3px 8px', height: '24px' }}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span>FOMO Level</span>
                      <strong style={{ color: 'var(--loss)' }}>{newTradeData.fomoLevel}/10</strong>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={newTradeData.fomoLevel} 
                      onChange={e => setNewTradeData(prev => ({ ...prev, fomoLevel: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span>Confidence Level</span>
                      <strong style={{ color: 'var(--profit)' }}>{newTradeData.confidenceLevel}/10</strong>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={newTradeData.confidenceLevel} 
                      onChange={e => setNewTradeData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                </div>

                <div className="form-field full">
                  <label className="form-label">Chart Screenshot *</label>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s2)',
                    padding: '20px', border: '1px dashed var(--border-mid)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    transition: 'border-color var(--t-fast)', background: 'var(--surface-glass)',
                    textAlign: 'center'
                  }}>
                    <Upload size={20} style={{ opacity: 0.6 }}/>
                    {chartFile ? (
                      <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{chartFile.name}</div>
                    ) : (
                      <div>Click to select or drag chart image here (PNG, JPG, WEBP)</div>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} required={!chartFile}/>
                  </label>
                  {imagePreview && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>

                {addMode === 'new' && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', lineHeight: 1.4, padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                    <span>Logged trades are marked as <strong>Monday-Only</strong> and excluded from your main journal metrics.</span>
                  </div>
                )}

                <div className="form-actions" style={{ marginTop: 'var(--s2)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddChart(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Add Chart'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mondays;
