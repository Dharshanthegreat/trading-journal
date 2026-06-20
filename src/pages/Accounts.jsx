import React, { useState, useEffect } from 'react';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wallet, Award, Activity, AlertTriangle, Trash2, Globe, CalendarDays, Coins
} from 'lucide-react';

const Accounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'Simulated',
    balance: '10000',
    currency: 'USD',
    status: 'Active'
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountName.trim()) {
      setError('Account Name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await accountsApi.create({
        accountName: formData.accountName,
        accountType: formData.accountType,
        balance: parseFloat(formData.balance) || 0,
        currency: formData.currency,
        status: formData.status
      });
      setShowForm(false);
      setFormData({
        accountName: '',
        accountType: 'Simulated',
        balance: '10000',
        currency: 'USD',
        status: 'Active'
      });
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
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

  const totalBalance = accounts.reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);
  const activeCount = accounts.filter(a => a.status === 'Active').length;
  const passedCount = accounts.filter(a => a.status === 'Passed').length;
  const failedCount = accounts.filter(a => a.status === 'Failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trading Accounts</div>
          <div className="page-subtitle">Manage and track performance across multiple challenges and brokerage accounts</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={user?.isGuest}>
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)' }}>
        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Wallet size={13} /></span> Total Combined Balance
          </div>
          <div className="stat-value" style={{ fontFamily: 'JetBrains Mono', color: totalBalance >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Across {accounts.length} accounts</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Activity size={13} /></span> Active Accounts
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Challenges & Live logs</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--profit)' }}><Award size={13} /></span> Passed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--profit)' }}>{passedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Funded credentials unlocked</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--loss)' }}><AlertTriangle size={13} /></span> Failed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--loss)' }}>{failedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drawdown limit breaches</div>
        </div>
      </div>

      {/* Accounts List Empty State */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s4)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '220px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Wallet size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">No trading accounts logged</div>
          <div className="empty-desc">Create an account profile to sync prop challenges or live brokerage stats</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--s5)' }}>
          {accounts.map(acc => {
            const isProfit = acc.totalPnL >= 0;
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
                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirm(acc.id)}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', opacity: 0.7
                  }}
                  title="Delete Account"
                  disabled={user?.isGuest}
                >
                  <Trash2 size={13} className="trash-icon" />
                </button>

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
                      ${acc.startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: acc.currentBalance >= acc.startingBalance ? 'var(--profit)' : 'var(--loss)' }}>
                      ${acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>Trades Synced</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{acc.tradesCount} trades</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>Total Return</span>
                    <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', color: isProfit ? 'var(--profit)' : 'var(--loss)' }}>
                      {isProfit ? '+' : ''}${acc.totalPnL.toFixed(2)}
                    </span>
                  </div>
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

      {/* Add Account Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="glass-deep modal-panel" style={{ width: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Create Account Profile</div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : '+ Create Account'}
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
    </div>
  );
};

export default Accounts;
