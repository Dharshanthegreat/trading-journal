import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wallet, Award, Activity, AlertTriangle, Trash2, Globe, CalendarDays,
  Coins, ExternalLink, FileText, Edit2, Target, Crosshair, RotateCcw, ShieldAlert, CheckCircle, Info
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
  const [deletedAccounts, setDeletedAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

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
    consistencyRule: '',
    useTrailingDrawdown: false
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
      setAccounts(Array.isArray(data) ? data : []);

      try {
        const deletedData = await accountsApi.getDeleted();
        setDeletedAccounts(Array.isArray(deletedData) ? deletedData : []);
      } catch (delErr) {
        console.error('Failed to load deleted accounts:', delErr);
      }
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

  const handleRestore = async (id) => {
    try {
      await accountsApi.restore(id);
      setRestoreConfirm(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to restore account:', err);
    }
  };

  const handleHardDelete = async (id) => {
    try {
      await accountsApi.hardDelete(id);
      setHardDeleteConfirm(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to permanently delete account:', err);
    }
  };

  const accountsArray = Array.isArray(accounts) ? accounts : [];
  const deletedArray = Array.isArray(deletedAccounts) ? deletedAccounts : [];

  const totalBalance = accountsArray
    .filter(a => a.status === 'Active')
    .reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);

  const activeCount = accountsArray.filter(a => a.status === 'Active').length;
  const passedCount = accountsArray.filter(a => a.status === 'Passed').length;
  const failedCount = accountsArray.filter(a => a.status === 'Failed').length;
  const deletedCount = deletedArray.length;
  
  const filteredAccounts = statusFilter === 'Deleted' ? deletedArray : accountsArray.filter(a => {
    if (statusFilter === 'All') return true;
    return a.status === statusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trading Accounts</div>
          <div className="page-subtitle">Manage and track performance across multiple challenges, live brokerage accounts, and archived records</div>
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
              consistencyRule: '',
              useTrailingDrawdown: false
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
          { label: 'Failed', value: 'Failed', count: failedCount, color: 'var(--loss)', activeBg: 'rgba(248, 113, 113, 0.1)' },
          { label: 'Deleted Accounts', value: 'Deleted', count: deletedCount, color: 'var(--warn)', activeBg: 'rgba(245, 158, 11, 0.12)' },
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

      {/* Deleted Accounts Archive Info Banner */}
      {statusFilter === 'Deleted' && (
        <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--warn-border)', background: 'var(--warn-soft)', display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '0.78rem', color: 'var(--warn)' }}>
          <Info size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Deleted Accounts Archive:</strong> All account configurations, balances, targets, notes, and trade logs are safely stored here. You can restore any deleted account back to your active list at any time.
          </span>
        </div>
      )}

      {/* Accounts List / Empty States */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s4)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '220px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : statusFilter !== 'Deleted' && accountsArray.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Wallet size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">No trading accounts logged</div>
          <div className="empty-desc">Create an account profile to sync prop challenges or live brokerage stats</div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s3)' }}>
          <Wallet size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">No {statusFilter.toLowerCase()} accounts found</div>
          <div className="empty-desc">
            {statusFilter === 'Deleted' ? 'No accounts have been deleted yet.' : `There are no trading accounts with status "${statusFilter}" currently logged.`}
          </div>
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
            const isDeletedView = statusFilter === 'Deleted' || Boolean(acc.deletedAt);

            return (
              <div
                key={acc.id}
                className="account-card-premium"
                style={{
                  borderColor: isDeletedView
                    ? 'var(--warn-border)'
                    : (acc.status === 'Passed' ? 'var(--profit)' : (acc.status === 'Failed' ? 'var(--loss)' : 'var(--border)')),
                  boxShadow: acc.status === 'Passed'
                    ? '0 6px 20px var(--profit-soft)'
                    : (acc.status === 'Failed' ? '0 6px 20px var(--loss-soft)' : 'var(--shadow-sm)')
                }}
              >
                {/* Action buttons (Edit & Delete / Restore & Hard Delete) */}
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                  {isDeletedView ? (
                    <>
                      <button
                        onClick={() => setRestoreConfirm(acc)}
                        className="btn-action-round"
                        title="Restore Account"
                        style={{ color: 'var(--profit)' }}
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        onClick={() => setHardDeleteConfirm(acc)}
                        className="btn-action-round"
                        title="Permanently Erase"
                        style={{ color: 'var(--loss)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditAccount(acc)}
                        className="btn-action-round"
                        title="Edit Account"
                        disabled={user?.isGuest}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(acc)}
                        className="btn-action-round"
                        title="Delete Account"
                        disabled={user?.isGuest}
                      >
                        <Trash2 size={12} className="trash-icon" />
                      </button>
                    </>
                  )}
                </div>

                {/* Account Details Header */}
                <div style={{ paddingRight: '60px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                      {acc.accountName}
                    </h3>
                    <span className={`badge ${
                      isDeletedView ? 'badge-warn' : (acc.status === 'Passed' ? 'badge-profit' : (acc.status === 'Failed' ? 'badge-loss' : 'badge-accent'))
                    }`} style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {isDeletedView ? 'DELETED' : acc.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Type: <strong style={{ color: 'var(--text-secondary)' }}>{acc.accountType}</strong>
                    {acc.deletedAt && (
                      <span style={{ marginLeft: 8, color: 'var(--warn)' }}>• Deleted {formatDate(acc.deletedAt)}</span>
                    )}
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
                {!isDeletedView && (
                  <button
                    onClick={() => navigate(`/dashboard?accountId=${acc.id}`)}
                    className="btn btn-sm btn-primary"
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--text-primary)',
                      color: 'var(--bg-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ View Details on Dashboard
                  </button>
                )}

                {/* Notion Playbook link & AI Audit */}
                {editingLinkId === acc.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="url"
                      className="input"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', flex: 1, height: '30px' }}
                      value={tempLink}
                      onChange={e => setTempLink(e.target.value)}
                      placeholder="https://notion.so/..."
                    />
                    <button className="btn btn-sm btn-primary" style={{ padding: '0 10px', fontSize: '0.7rem' }} onClick={() => saveLink(acc.id)}>Save</button>
                    <button className="btn btn-sm btn-ghost" style={{ padding: '0 8px', fontSize: '0.7rem' }} onClick={() => setEditingLinkId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="notion-link-premium">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Globe size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      {acc.notionLink ? (
                        <a
                          href={acc.notionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.72rem', color: 'var(--text-secondary)', textDecoration: 'none',
                            fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}
                        >
                          Notion Playbook
                        </a>
                      ) : (
                        <span
                          onClick={() => startEditLink(acc)}
                          style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontStyle: 'italic' }}
                        >
                          + Link Notion Playbook
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {acc.notionLink && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => fetchPlaybook(acc)}
                          style={{ fontSize: '0.65rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontWeight: 600 }}
                        >
                          📜 AI Audit ✏️
                        </button>
                      )}
                      <button
                        className="btn-action-round"
                        style={{ width: '22px', height: '22px' }}
                        onClick={() => startEditLink(acc)}
                        title="Edit Notion Link"
                        disabled={user?.isGuest}
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Notes */}
                {editingNotesId === acc.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea
                      className="input"
                      style={{ fontSize: '0.72rem', padding: '6px 8px', minHeight: '60px', resize: 'vertical' }}
                      value={tempNotes}
                      onChange={e => setTempNotes(e.target.value)}
                      placeholder="Add reflections or rules for this account..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button className="btn btn-xs btn-ghost" onClick={() => setEditingNotesId(null)}>Cancel</button>
                      <button className="btn btn-xs btn-primary" onClick={() => saveNotes(acc.id)}>Save Notes</button>
                    </div>
                  </div>
                ) : (
                  <div className="notes-preview-premium">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Account Notes</span>
                      <button
                        className="btn-action-round"
                        style={{ width: '20px', height: '20px' }}
                        onClick={() => startEditNotes(acc)}
                        title="Edit Account Notes"
                        disabled={user?.isGuest}
                      >
                        <Edit2 size={9} />
                      </button>
                    </div>
                    {acc.notes ? (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {acc.notes}
                      </p>
                    ) : (
                      <span
                        onClick={() => startEditNotes(acc)}
                        style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontStyle: 'italic' }}
                      >
                        + Add Account Notes
                      </span>
                    )}
                  </div>
                )}

                {/* Restore / Permanently Delete Action Bar for Deleted View */}
                {isDeletedView && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleRestore(acc.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--profit)', borderColor: 'var(--profit)', fontSize: '0.74rem' }}
                    >
                      <RotateCcw size={13} /> Restore Account
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setHardDeleteConfirm(acc)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.74rem' }}
                    >
                      <Trash2 size={13} /> Delete Permanently
                    </button>
                  </div>
                )}

                {/* Footer Metadata */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
                  <span>Currency: <strong>{acc.currency || 'USD'}</strong></span>
                  <span>Created {formatDate(acc.createdAt)}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ═══ SOFT DELETE CONFIRMATION MODAL ═══ */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-panel glass" style={{ maxWidth: 440, padding: 'var(--s6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--warn)', marginBottom: 'var(--s3)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Move to Deleted Accounts?</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
              Move <strong>"{deleteConfirm.accountName}"</strong> to the Deleted Accounts tab? All account balances, targets, notes, and trade logs will be safely archived and can be restored at any time.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Move to Deleted</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESTORE CONFIRMATION MODAL ═══ */}
      {restoreConfirm && (
        <div className="modal-overlay" onClick={() => setRestoreConfirm(null)}>
          <div className="modal-panel glass" style={{ maxWidth: 440, padding: 'var(--s6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--profit)', marginBottom: 'var(--s3)' }}>
              <RotateCcw size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Restore Account?</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
              Restore <strong>"{restoreConfirm.accountName}"</strong> back to your active accounts list with all stats and trade logs intact?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setRestoreConfirm(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--profit)', borderColor: 'var(--profit)' }} onClick={() => handleRestore(restoreConfirm.id)}>Restore Account</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HARD DELETE CONFIRMATION MODAL ═══ */}
      {hardDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setHardDeleteConfirm(null)}>
          <div className="modal-panel glass" style={{ maxWidth: 440, padding: 'var(--s6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--loss)', marginBottom: 'var(--s3)' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Permanently Delete Account?</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
              Permanently erase <strong>"{hardDeleteConfirm.accountName}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setHardDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleHardDelete(hardDeleteConfirm.id)}>Permanently Erase</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Accounts;
