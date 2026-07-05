import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wallet, Award, Activity, AlertTriangle, Trash2, Globe, CalendarDays, Coins, ExternalLink, FileText, Edit2, Target, Crosshair
} from 'lucide-react';

const Accounts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split('T')[0] || dateStr;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  const [accounts, setAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'Simulated',
    balance: '10000',
    currency: 'USD',
    status: 'Active',
    notionLink: '',
    notes: '',
    profitTarget: '',
    maxLossLimit: '',
    consistencyRule: ''
  });
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [tempLink, setTempLink] = useState('');
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [tempNotes, setTempNotes] = useState('');
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [playbookError, setPlaybookError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormData({
      accountName: '',
      accountType: 'Simulated',
      balance: '10000',
      currency: 'USD',
      status: 'Active',
      notionLink: '',
      notes: '',
      profitTarget: '',
      maxLossLimit: '',
      consistencyRule: '',
      useTrailingDrawdown: false
    });
    setError('');
  };

  const startEditAccount = (acc) => {
    setEditingAccount(acc);
    setFormData({
      accountName: acc.accountName,
      accountType: acc.accountType,
      balance: String(acc.startingBalance),
      currency: acc.currency,
      status: acc.status,
      notionLink: acc.notionLink || '',
      notes: acc.notes || '',
      profitTarget: acc.profitTarget ? String(acc.profitTarget) : '',
      maxLossLimit: acc.maxLossLimit ? String(acc.maxLossLimit) : '',
      consistencyRule: acc.consistencyRule ? String(acc.consistencyRule) : '',
      useTrailingDrawdown: acc.useTrailingDrawdown === true
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountName.trim()) {
      setError('Account Name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, {
          accountName: formData.accountName,
          accountType: formData.accountType,
          balance: parseFloat(formData.balance) || 0,
          currency: formData.currency,
          status: formData.status,
          notionLink: formData.notionLink,
          notes: formData.notes,
          profitTarget: parseFloat(formData.profitTarget) || 0,
          maxLossLimit: parseFloat(formData.maxLossLimit) || 0,
          consistencyRule: parseFloat(formData.consistencyRule) || 0,
          useTrailingDrawdown: formData.useTrailingDrawdown === true
        });
      } else {
        await accountsApi.create({
          accountName: formData.accountName,
          accountType: formData.accountType,
          balance: parseFloat(formData.balance) || 0,
          currency: formData.currency,
          status: formData.status,
          notionLink: formData.notionLink,
          notes: formData.notes,
          profitTarget: parseFloat(formData.profitTarget) || 0,
          maxLossLimit: parseFloat(formData.maxLossLimit) || 0,
          consistencyRule: parseFloat(formData.consistencyRule) || 0,
          useTrailingDrawdown: formData.useTrailingDrawdown === true
        });
      }
      handleCloseForm();
      fetchAccounts();
    } catch (err) {
      setError(err.message || `Failed to ${editingAccount ? 'update' : 'create'} account`);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditLink = (acc) => {
    setEditingLinkId(acc.id);
    setTempLink(acc.notionLink || '');
  };

  const saveLink = async (id) => {
    try {
      const account = accounts.find(a => a.id === id);
      if (!account) return;
      await accountsApi.update(id, {
        accountName: account.accountName,
        accountType: account.accountType,
        balance: account.startingBalance,
        currency: account.currency,
        status: account.status,
        notionLink: tempLink.trim(),
        notes: account.notes
      });
      setEditingLinkId(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to update account link:', err);
      setError(err.message || 'Failed to update Notion Link');
    }
  };

  const startEditNotes = (acc) => {
    setEditingNotesId(acc.id);
    setTempNotes(acc.notes || '');
  };

  const saveNotes = async (id) => {
    try {
      const account = accounts.find(a => a.id === id);
      if (!account) return;
      await accountsApi.update(id, {
        accountName: account.accountName,
        accountType: account.accountType,
        balance: account.startingBalance,
        currency: account.currency,
        status: account.status,
        notionLink: account.notionLink,
        notes: tempNotes.trim()
      });
      setEditingNotesId(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to update account notes:', err);
      setError(err.message || 'Failed to update Account Notes');
    }
  };

  const fetchPlaybook = async (acc) => {
    setActivePlaybook({ title: acc.accountName, url: acc.notionLink, summary: '' });
    setLoadingPlaybook(true);
    setPlaybookError('');
    try {
      const { notion } = await import('../services/api');
      const result = await notion.readLink(acc.notionLink);
      setActivePlaybook({ title: acc.accountName, url: acc.notionLink, summary: result.summary });
    } catch (err) {
      console.error('Failed to read Notion playbook:', err);
      setPlaybookError(err.message || 'Failed to read Notion page content. Ensure the link is correct and page is public.');
    } finally {
      setLoadingPlaybook(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await accountsApi.delete(id);
      setDeleteConfirm(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const accountsArray = Array.isArray(accounts) ? accounts : [];
  const totalBalance = accountsArray
    .filter(a => a.status === 'Active')
    .reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);
  const activeCount = accountsArray.filter(a => a.status === 'Active').length;
  const passedCount = accountsArray.filter(a => a.status === 'Passed').length;
  const failedCount = accountsArray.filter(a => a.status === 'Failed').length;
  
  const filteredAccounts = accountsArray.filter(a => {
    if (statusFilter === 'All') return true;
    return a.status === statusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trading Accounts</div>
          <div className="page-subtitle">Manage and track performance across multiple challenges and brokerage accounts</div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setEditingAccount(null);
            setFormData({
              accountName: '',
              accountType: 'Simulated',
              balance: '10000',
              currency: 'USD',
              status: 'Active',
              notionLink: '',
              notes: '',
              profitTarget: '',
              maxLossLimit: '',
              consistencyRule: ''
            });
            setShowForm(true);
          }} 
          disabled={user?.isGuest}
        >
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)' }}>
        <div 
          className="glass stat-card"
          onClick={() => setStatusFilter('All')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'All' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'All' ? '0 0 12px rgba(255, 255, 255, 0.05)' : 'none',
            transform: statusFilter === 'All' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Wallet size={13} /></span> Total Combined Balance
          </div>
          <div className="stat-value" style={{ fontFamily: 'JetBrains Mono', color: totalBalance >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Across {activeCount} active account{activeCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div 
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Active' ? '1px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Active' ? '0 0 12px rgba(59, 130, 246, 0.15)' : 'none',
            transform: statusFilter === 'Active' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Activity size={13} /></span> Active Accounts
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Challenges & Live logs</div>
        </div>

        <div 
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Passed' ? 'All' : 'Passed')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Passed' ? '1px solid var(--profit)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Passed' ? '0 0 12px rgba(52, 211, 153, 0.15)' : 'none',
            transform: statusFilter === 'Passed' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--profit)' }}><Award size={13} /></span> Passed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--profit)' }}>{passedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Funded credentials unlocked</div>
        </div>

        <div 
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Failed' ? 'All' : 'Failed')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Failed' ? '1px solid var(--loss)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Failed' ? '0 0 12px rgba(248, 113, 113, 0.15)' : 'none',
            transform: statusFilter === 'Failed' ? 'translateY(-2px)' : 'none'
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--loss)' }}><AlertTriangle size={13} /></span> Failed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--loss)' }}>{failedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drawdown limit breaches</div>
        </div>
      </div>

      {/* Filter Tabs / Option Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center', 
        background: 'rgba(255,255,255,0.02)', 
        padding: '5px', 
        borderRadius: 'var(--r-lg)', 
        border: '1px solid var(--border-mid)',
        width: 'fit-content',
        alignSelf: 'flex-start',
        marginTop: '-2px'
      }}>
        {[
          { label: 'All Accounts', value: 'All', count: accountsArray.length, color: 'var(--text-primary)', activeBg: 'rgba(255,255,255,0.08)' },
          { label: 'Active', value: 'Active', count: activeCount, color: 'var(--accent)', activeBg: 'rgba(59, 130, 246, 0.1)' },
          { label: 'Passed', value: 'Passed', count: passedCount, color: 'var(--profit)', activeBg: 'rgba(52, 211, 153, 0.1)' },
          { label: 'Failed', value: 'Failed', count: failedCount, color: 'var(--loss)', activeBg: 'rgba(248, 113, 113, 0.1)' }
        ].map(tab => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className="btn btn-sm"
              type="button"
              style={{
                background: isActive ? tab.activeBg : 'transparent',
                color: isActive ? tab.color : 'var(--text-muted)',
                border: isActive ? `1px solid ${tab.color}` : '1px solid transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.72rem',
                padding: '6px 14px',
                borderRadius: 'var(--r-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: isActive ? `0 0 8px ${tab.color}15` : 'none'
              }}
            >
              <span>{tab.label}</span>
              <span style={{ 
                fontSize: '0.62rem', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '1px 5px', 
                borderRadius: '6px',
                color: isActive ? tab.color : 'var(--text-tertiary)',
                border: '1px solid var(--border-mid)'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accounts List / Empty States */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s4)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '220px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : accountsArray.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Wallet size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">No trading accounts logged</div>
          <div className="empty-desc">Create an account profile to sync prop challenges or live brokerage stats</div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s3)' }}>
          <Wallet size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">No {statusFilter.toLowerCase()} accounts found</div>
          <div className="empty-desc">There are no trading accounts with status "{statusFilter}" currently logged.</div>
          <button className="btn btn-sm btn-ghost" onClick={() => setStatusFilter('All')}>Clear Filter</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          <style>{`
            .account-card-premium {
              background: var(--bg-secondary) !important;
              border: 1px solid var(--border) !important;
              box-shadow: var(--shadow-sm) !important;
              backdrop-filter: blur(12px) !important;
              transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
              padding: 24px !important;
              border-radius: 16px !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 18px !important;
              position: relative !important;
            }
            .account-card-premium:hover {
              transform: translateY(-4px) !important;
              border-color: var(--border-mid) !important;
              box-shadow: var(--shadow-md) !important;
              background: var(--bg-hover) !important;
            }
            .account-stat-block-new {
              background: var(--surface-glass) !important;
              border: 1px solid var(--border) !important;
              border-radius: 12px !important;
              padding: 12px 14px !important;
              transition: all 0.2s ease !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              gap: 4px !important;
            }
            .account-stat-block-new:hover {
              background: var(--surface-glass-h) !important;
              border-color: var(--border-mid) !important;
            }
            .btn-action-round {
              width: 28px !important;
              height: 28px !important;
              border-radius: 50% !important;
              background: var(--surface-glass) !important;
              border: 1px solid var(--border) !important;
              color: var(--text-secondary) !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              cursor: pointer !important;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            .btn-action-round:hover {
              background: var(--surface-glass-h) !important;
              border-color: var(--border-mid) !important;
              color: var(--text-primary) !important;
            }
            .btn-action-round:hover .trash-icon {
              color: var(--loss) !important;
            }
            .notion-link-premium {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              padding: 8px 12px !important;
              background: var(--surface-glass) !important;
              border-radius: 10px !important;
              border: 1px solid var(--border) !important;
              transition: all 0.2s ease !important;
            }
            .notion-link-premium:hover {
              background: var(--surface-glass-h) !important;
              border-color: var(--border-mid) !important;
            }
            .notes-preview-premium {
              background: var(--surface-glass) !important;
              border-radius: 10px !important;
              padding: 10px 12px !important;
              border: 1px solid var(--border) !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 6px !important;
            }
          `}</style>
          {filteredAccounts.map(acc => {
            const isProfit = (acc.totalPnL || 0) >= 0;
            return (
              <div
                key={acc.id}
                className="account-card-premium"
                style={{
                  borderColor: acc.status === 'Passed'
                    ? 'var(--profit)'
                    : (acc.status === 'Failed' ? 'var(--loss)' : 'var(--border)'),
                  boxShadow: acc.status === 'Passed'
                    ? '0 6px 20px var(--profit-soft)'
                    : (acc.status === 'Failed' ? '0 6px 20px var(--loss-soft)' : 'var(--shadow-sm)')
                }}
              >
                {/* Action buttons (Edit & Delete) */}
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                  <button
                    onClick={() => startEditAccount(acc)}
                    className="btn-action-round"
                    title="Edit Account"
                    disabled={user?.isGuest}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(acc.id)}
                    className="btn-action-round"
                    title="Delete Account"
                    disabled={user?.isGuest}
                  >
                    <Trash2 size={12} className="trash-icon" />
                  </button>
                </div>

                {/* Account Details Header */}
                <div style={{ paddingRight: '60px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                      {acc.accountName}
                    </h3>
                    <span className={`badge ${
                      acc.status === 'Passed' ? 'badge-profit' : (acc.status === 'Failed' ? 'badge-loss' : 'badge-accent')
                    }`} style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {acc.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Type: <strong style={{ color: 'var(--text-secondary)' }}>{acc.accountType}</strong>
                  </span>
                </div>

                {/* Stats Grid — Balance, Profit Target, Trading Days */}
                <div style={{ display: 'grid', gridTemplateColumns: (acc.profitTarget > 0 || acc.maxLossLimit > 0) ? '1.1fr 1fr 0.9fr' : '1fr 1fr', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '14px' }}>
                  <div className="account-stat-block-new">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <Wallet size={11} style={{ opacity: 0.6 }} /> Balance
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: (acc.currentBalance || 0) >= (acc.startingBalance || 0) ? 'var(--profit)' : 'var(--loss)' }}>
                        ${Math.round(acc.currentBalance || 0).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        / ${(acc.startingBalance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {acc.profitTarget > 0 && (
                    <div className="account-stat-block-new">
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Target size={11} style={{ opacity: 0.6 }} /> Target
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: isProfit ? 'var(--profit)' : 'var(--loss)' }}>
                          ${Math.round(acc.totalPnL || 0).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                          / ${acc.profitTarget.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {(acc.profitTarget > 0 || acc.maxLossLimit > 0) && (
                    <div className="account-stat-block-new">
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <CalendarDays size={11} style={{ opacity: 0.6 }} /> Days
                      </span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--profit)', marginTop: '2px' }}>
                        {acc.tradingDays || 0}
                      </div>
                    </div>
                  )}
                </div>

                {/* Consistency + Progress Bar (only when challenge fields are set) */}
                {(acc.profitTarget > 0 || acc.maxLossLimit > 0) && (() => {
                  const mll = acc.mllValue || ((acc.startingBalance || 0) - (acc.maxLossLimit || 0));
                  const target = acc.targetValue || ((acc.startingBalance || 0) + (acc.profitTarget || 0));
                  const current = acc.currentBalance || 0;
                  const range = target - mll;
                  const progressPct = range > 0 ? Math.max(0, Math.min(100, ((current - mll) / range) * 100)) : 0;
                  const startPct = range > 0 ? Math.max(0, Math.min(100, (((acc.startingBalance || 0) - mll) / range) * 100)) : 0;

                  const isHigher = current >= (acc.startingBalance || 0);
                  const fillLeft = isHigher ? startPct : progressPct;
                  const fillWidth = isHigher ? (progressPct - startPct) : (startPct - progressPct);
                  const fillBackground = isHigher
                    ? 'linear-gradient(90deg, var(--profit-border), var(--profit))'
                    : 'linear-gradient(90deg, var(--loss), var(--loss-border))';

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: acc.consistencyRule > 0 ? '1.1fr 2.9fr' : '1fr', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '14px' }}>
                      {/* Consistency */}
                      {acc.consistencyRule > 0 && (
                        <div className="account-stat-block-new" style={{ justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Consistency</span>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: (acc.consistencyScore || 0) <= acc.consistencyRule ? 'var(--profit)' : 'var(--loss)', marginTop: '2px' }}>
                            {(acc.consistencyScore || 0).toFixed(1)}%
                          </div>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Limit: {acc.consistencyRule}%
                          </span>
                        </div>
                      )}

                      {/* Progress Bar Container */}
                      <div className="progress-bar-container-custom" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '12px 14px' }}>
                        {/* START Label */}
                        <div style={{ position: 'relative', marginBottom: '4px', height: '12px' }}>
                          <span style={{
                            position: 'absolute',
                            left: `${startPct}%`,
                            transform: 'translateX(-50%)',
                            fontSize: '0.52rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.6px',
                            fontWeight: 700
                          }}>START</span>
                        </div>

                        {/* Progress Track */}
                        <div style={{
                          position: 'relative',
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                        }}>
                          {/* Glow fill bar */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: `${fillLeft}%`,
                            width: `${fillWidth}%`,
                            height: '100%',
                            background: fillBackground,
                            borderRadius: '4px',
                            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            boxShadow: `0 0 8px ${isHigher ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }} />

                          {/* Start Tick */}
                          <div style={{
                            position: 'absolute',
                            top: '-2px',
                            left: `${startPct}%`,
                            transform: 'translateX(-50%)',
                            width: '2px',
                            height: '10px',
                            background: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: '1px'
                          }} />

                          {/* Current position marker */}
                          <div style={{
                            position: 'absolute',
                            top: '-3px',
                            left: `${progressPct}%`,
                            transform: 'translateX(-50%)',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: isHigher ? 'var(--profit)' : 'var(--loss)',
                            border: '2.5px solid #0f1115',
                            boxShadow: `0 0 6px ${isHigher ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                            transition: 'left 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                          }} />
                        </div>

                        {/* Limits labels */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--loss)' }}>
                              ${Math.round(mll).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginTop: '1px' }}>
                              {acc.useTrailingDrawdown ? 'MLL (Trailing)' : 'MLL'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--profit)' }}>
                              ${Math.round(target).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginTop: '1px' }}>TARGET</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Performance Metrics Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trades Synced</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{acc.tradesCount || 0} trades</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Return</span>
                    <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', color: isProfit ? 'var(--profit)' : 'var(--loss)', fontSize: '0.78rem' }}>
                      {isProfit ? '+' : ''}${(acc.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => navigate(`/dashboard?accountId=${acc.id}`)}
                  className="btn btn-sm btn-primary"
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '10px',
                    marginTop: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Activity size={12} /> View Details on Dashboard
                </button>

                {/* Notion Page Link Integration */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                  {acc.notionLink ? (
                    <div className="notion-link-premium">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                        <Globe size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <a href={acc.notionLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={acc.notionLink}>
                          Notion Playbook
                        </a>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => fetchPlaybook(acc)} className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', fontSize: '0.62rem', height: '22px', display: 'flex', alignItems: 'center', gap: '2px', borderRadius: '6px' }}>
                          <FileText size={10} /> AI Audit
                        </button>
                        <button onClick={() => startEditLink(acc)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center' }} title="Edit Link">
                          ✏️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {editingLinkId === acc.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            className="input"
                            style={{ fontSize: '0.7rem', padding: '2px 6px', height: '24px', flex: 1 }}
                            placeholder="Paste Notion link..."
                            value={tempLink}
                            onChange={e => setTempLink(e.target.value)}
                          />
                          <button onClick={() => saveLink(acc.id)} className="btn btn-primary" style={{ padding: '0 8px', fontSize: '0.65rem', height: '24px' }}>
                            Save
                          </button>
                          <button onClick={() => setEditingLinkId(null)} className="btn btn-ghost" style={{ padding: '0 6px', fontSize: '0.65rem', height: '24px' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingLinkId(acc.id); setTempLink(''); }} className="btn btn-sm btn-ghost" style={{ width: '100%', padding: '6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                          + Link Notion Workspace
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Notes Integration */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                  {editingNotesId === acc.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        className="input"
                        style={{ fontSize: '0.7rem', padding: '8px', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-tertiary)', border: '1px solid var(--border-strong)', borderRadius: '10px', width: '100%' }}
                        placeholder="Add account rules, notes, strategy..."
                        value={tempNotes}
                        onChange={e => setTempNotes(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <button onClick={() => saveNotes(acc.id)} className="btn btn-primary" style={{ padding: '2px 10px', fontSize: '0.65rem', height: '24px' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingNotesId(null)} className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.65rem', height: '24px' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : acc.notes ? (
                    <div className="notes-preview-premium">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Notes</span>
                        <button 
                          onClick={() => startEditNotes(acc)} 
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7, padding: 0, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center' }} 
                          title="Edit Notes"
                        >
                          ✏️
                        </button>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {acc.notes}
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEditNotes(acc)} 
                      className="btn btn-sm btn-ghost" 
                      style={{ width: '100%', padding: '6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}
                    >
                      + Add Account Notes
                    </button>
                  )}
                </div>

                {/* Footer Metadata */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Coins size={11} style={{ opacity: 0.6 }} /> {acc.currency}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <CalendarDays size={11} style={{ opacity: 0.6 }} /> {formatDate(acc.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Account Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseForm()}>
          <div className="glass-deep modal-panel" style={{ width: 420 }}>
            <div className="modal-header">
              <div className="modal-title">{editingAccount ? 'Edit Account Profile' : 'Create Account Profile'}</div>
              <button className="modal-close" onClick={handleCloseForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-field">
                  <label className="form-label">Account Name *</label>
                  <input
                    required
                    className="input"
                    placeholder="e.g. Apex $50k Challenge #1"
                    value={formData.accountName}
                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Account Type</label>
                  <select
                    className="input"
                    value={formData.accountType}
                    onChange={e => setFormData({ ...formData, accountType: e.target.value })}
                  >
                    <option value="Simulated">Simulation Challenge</option>
                    <option value="Live">Live Brokerage</option>
                    <option value="Prop Challenge">Prop Firm Evaluation</option>
                    <option value="Prop Funded">Prop Firm Funded Account</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Starting Balance ($)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="50000"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Notion Page Link (Optional)</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="e.g. https://notion.so/my-playbook"
                    value={formData.notionLink}
                    onChange={e => setFormData({ ...formData, notionLink: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="input"
                    style={{ minHeight: '60px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.78rem' }}
                    placeholder="e.g. Trading plan, rules, daily limits..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Challenge / Prop Firm Settings */}
                {formData.accountType !== 'Live' && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', marginTop: 'var(--s2)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--s3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={13} style={{ color: 'var(--accent)' }} />
                      Challenge / Prop Firm Rules
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s3)' }}>
                      <div className="form-field">
                        <label className="form-label">Profit Target ($)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 1250"
                          value={formData.profitTarget}
                          onChange={e => setFormData({ ...formData, profitTarget: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Max Loss Limit ($)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 1500"
                          value={formData.maxLossLimit}
                          onChange={e => setFormData({ ...formData, maxLossLimit: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Consistency (%)</label>
                        <input
                          className="input"
                          type="number"
                          placeholder="e.g. 30"
                          value={formData.consistencyRule}
                          onChange={e => setFormData({ ...formData, consistencyRule: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        id="useTrailingDrawdown"
                        checked={formData.useTrailingDrawdown || false}
                        onChange={e => setFormData({ ...formData, useTrailingDrawdown: e.target.checked })}
                        style={{
                          width: '14px',
                          height: '14px',
                          accentColor: 'var(--accent)',
                          cursor: 'pointer',
                          margin: 0
                        }}
                      />
                      <label htmlFor="useTrailingDrawdown" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                        Use Trailing Drawdown (Apex/prop-firm style dynamic MLL floor)
                      </label>
                    </div>

                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Leave blank or 0 to disable. Profit Target = profit needed to pass. Max Loss = max drawdown from starting balance (trails dynamically if Trailing Drawdown is checked). Consistency = max % of total profit from a single day.
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                  <div className="form-field">
                    <label className="form-label">Currency</label>
                    <select
                      className="input"
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Status</label>
                    <select
                      className="input"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '8px 12px', borderRadius: 'var(--r-md)',
                  background: 'var(--loss-soft)', border: '1px solid var(--loss-border)',
                  fontSize: '0.72rem', color: 'var(--loss)', marginTop: 'var(--s4)'
                }}>
                  {error}
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 'var(--s6)' }}>
                <button type="button" className="btn btn-ghost" onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (editingAccount ? 'Saving...' : 'Creating...') : (editingAccount ? 'Save Changes' : '+ Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="glass-deep modal-panel" style={{ width: 380, padding: 'var(--s8)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ marginBottom: 'var(--s4)' }}>Delete Account?</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--s6)', lineHeight: 1.7 }}>
              This will permanently remove this account profile from your dashboard. Associated trades will be untagged but not deleted.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
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
                  Account: {activePlaybook.title}
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

export default Accounts;
