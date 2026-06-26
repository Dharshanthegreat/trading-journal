import React, { useState, useEffect } from 'react';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wallet, Award, Activity, AlertTriangle, Trash2, Globe, CalendarDays, Coins, ExternalLink, FileText, Edit2
} from 'lucide-react';

const Accounts = () => {
  const { user } = useAuth();
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
    notionLink: ''
  });
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [tempLink, setTempLink] = useState('');
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
      notionLink: ''
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
      notionLink: acc.notionLink || ''
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
          notionLink: formData.notionLink
        });
      } else {
        await accountsApi.create({
          accountName: formData.accountName,
          accountType: formData.accountType,
          balance: parseFloat(formData.balance) || 0,
          currency: formData.currency,
          status: formData.status,
          notionLink: formData.notionLink
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
        notionLink: tempLink.trim()
      });
      setEditingLinkId(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to update account link:', err);
      setError(err.message || 'Failed to update Notion Link');
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
              notionLink: ''
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--s5)' }}>
          {filteredAccounts.map(acc => {
            const isProfit = (acc.totalPnL || 0) >= 0;
            return (
              <div
                key={acc.id}
                className="glass glass-hover"
                style={{
                  padding: 'var(--s5)',
                  borderRadius: 'var(--r-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--s3.5)',
                  position: 'relative',
                  border: acc.status === 'Passed' ? '1px solid rgba(52,211,153,0.3)' : (acc.status === 'Failed' ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)')
                }}
              >
                {/* Action buttons (Edit & Delete) */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                  <button
                    onClick={() => startEditAccount(acc)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', opacity: 0.7, padding: 2, display: 'flex', alignItems: 'center'
                    }}
                    title="Edit Account"
                    disabled={user?.isGuest}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(acc.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', opacity: 0.7, padding: 2, display: 'flex', alignItems: 'center'
                    }}
                    title="Delete Account"
                    disabled={user?.isGuest}
                  >
                    <Trash2 size={12} className="trash-icon" />
                  </button>
                </div>

                {/* Account Details Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {acc.accountName}
                    </h3>
                    <span className={`badge ${
                      acc.status === 'Passed' ? 'badge-profit' : (acc.status === 'Failed' ? 'badge-loss' : 'badge-accent')
                    }`} style={{ fontSize: '0.58rem', padding: '1px 6px' }}>
                      {acc.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                    Type: <strong style={{ color: 'var(--text-secondary)' }}>{acc.accountType}</strong>
                  </span>
                </div>

                {/* Balance Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Starting Balance</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
                      ${(acc.startingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: (acc.currentBalance || 0) >= (acc.startingBalance || 0) ? 'var(--profit)' : 'var(--loss)' }}>
                      ${(acc.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>Trades Synced</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{acc.tradesCount || 0} trades</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>Total Return</span>
                    <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', color: isProfit ? 'var(--profit)' : 'var(--loss)' }}>
                      {isProfit ? '+' : ''}${(acc.totalPnL || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Notion Page Link Integration */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  {acc.notionLink ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                        <Globe size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <a href={acc.notionLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={acc.notionLink}>
                          Notion Playbook
                        </a>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => fetchPlaybook(acc)} className="btn btn-sm btn-ghost" style={{ padding: '2px 4px', fontSize: '0.6rem', height: '20px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <FileText size={10} /> AI
                        </button>
                        <button onClick={() => startEditLink(acc)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center' }} title="Edit Link">
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
                            style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px', flex: 1 }}
                            placeholder="Paste Notion link..."
                            value={tempLink}
                            onChange={e => setTempLink(e.target.value)}
                          />
                          <button onClick={() => saveLink(acc.id)} className="btn btn-primary" style={{ padding: '0 6px', fontSize: '0.6rem', height: '22px' }}>
                            Save
                          </button>
                          <button onClick={() => setEditingLinkId(null)} className="btn btn-ghost" style={{ padding: '0 4px', fontSize: '0.6rem', height: '22px' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingLinkId(acc.id); setTempLink(''); }} className="btn btn-sm btn-ghost" style={{ width: '100%', padding: '4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px dashed var(--border-mid)', borderRadius: 'var(--r-md)' }}>
                          + Link Notion Workspace
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={11} /> {acc.currency}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={11} /> Since {acc.createdAt ? acc.createdAt.split(' ')[0] : '—'}</span>
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
