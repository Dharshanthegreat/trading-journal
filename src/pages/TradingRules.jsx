import React, { useState, useEffect, useCallback } from 'react';
import { rules as rulesApi, accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ListTodo, Plus, X, Trash2, Edit2, Check, CheckCircle, AlertTriangle, Shield, Play, Ban, RefreshCw, Percent
} from 'lucide-react';


const TradingRules = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ruleTextInput, setRuleTextInput] = useState('');
  
  // Inline edit state
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editTextInput, setEditTextInput] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch accounts list
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data || []);
      // Pre-select first active account if available, otherwise 'All'
      const active = (data || []).find(a => a.status === 'Active');
      if (active) {
        setSelectedAccountId(String(active.id));
      } else if (data && data.length > 0) {
        setSelectedAccountId(String(data[0].id));
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, []);

  // Fetch rules list
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedAccountId !== 'All' ? { accountId: selectedAccountId } : {};
      const data = await rulesApi.list(params);
      setRules(data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Flash message helpers
  const triggerSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const triggerError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  // Add Rule Handler
  const handleAddRule = async (e) => {
    if (e) e.preventDefault();
    if (!ruleTextInput.trim()) {
      triggerError('Rule description cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      const accountVal = selectedAccountId === 'All' ? null : parseInt(selectedAccountId);
      const newRule = await rulesApi.create({
        ruleText: ruleTextInput.trim(),
        accountId: accountVal,
        isActive: true
      });
      setRules(prev => [newRule, ...prev]);
      setRuleTextInput('');
      triggerSuccess('Trading rule added successfully.');
    } catch (err) {
      triggerError(err.message || 'Failed to create trading rule.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Rule Status (Active / Inactive)
  const handleToggleRule = async (rule) => {
    try {
      const updated = await rulesApi.update(rule.id, {
        isActive: !rule.isActive
      });
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      triggerSuccess(`Rule marked as ${updated.isActive ? 'active' : 'inactive'}.`);
    } catch (err) {
      triggerError(err.message || 'Failed to update rule status.');
    }
  };

  // Start Editing Rule
  const startEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setEditTextInput(rule.ruleText);
  };

  // Save Edited Rule
  const handleSaveEdit = async (id) => {
    if (!editTextInput.trim()) {
      triggerError('Rule description cannot be empty.');
      return;
    }

    try {
      const updated = await rulesApi.update(id, {
        ruleText: editTextInput.trim()
      });
      setRules(prev => prev.map(r => r.id === id ? updated : r));
      setEditingRuleId(null);
      triggerSuccess('Trading rule updated.');
    } catch (err) {
      triggerError(err.message || 'Failed to save rule modifications.');
    }
  };

  // Delete Rule Handler
  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trading rule?')) return;
    try {
      await rulesApi.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
      triggerSuccess('Trading rule removed.');
    } catch (err) {
      triggerError(err.message || 'Failed to delete rule.');
    }
  };


  // Metrics calculations
  const totalCount = rules.length;
  const activeCount = rules.filter(r => r.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const complianceRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  // Selected account detail
  const currentAccount = accounts.find(a => String(a.id) === String(selectedAccountId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ListTodo size={24} style={{ color: 'var(--accent)' }} />
            Trading Rules Playbook
          </div>
          <div className="page-subtitle">Define, track, and adhere to account-specific trading constraints and risk limits</div>
        </div>

        {/* Account Selector filter */}
        <div className="tz-filter-btn" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '4px 12px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginRight: '6px' }}>Active Account:</span>
          <select 
            value={selectedAccountId} 
            onChange={e => setSelectedAccountId(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Accounts (Global Rules)</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} ({acc.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--s4)' }} className="rules-kpi-grid">
        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><ListTodo size={13} /></span> Total Rules
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{totalCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rules logged for workspace</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--profit)' }}><CheckCircle size={13} /></span> Active Rules
          </div>
          <div className="stat-value" style={{ color: 'var(--profit)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Currently enforced constraints</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--text-muted)' }}><Ban size={13} /></span> Inactive Rules
          </div>
          <div className="stat-value" style={{ color: 'var(--text-tertiary)' }}>{inactiveCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Archived or disabled rules</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Percent size={13} /></span> Playbook Compliance
          </div>
          <div className="stat-value" style={{ color: complianceRate >= 80 ? 'var(--profit)' : (complianceRate >= 50 ? 'var(--warn)' : 'var(--loss)') }}>
            {complianceRate}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rule adherence index</div>
        </div>

        <div className="glass stat-card">
          <div className="stat-label">
            <span style={{ color: 'var(--warn)' }}><Shield size={13} /></span> Account Status
          </div>
          <div className="stat-value" style={{ fontSize: '0.9rem', paddingTop: '6px', color: currentAccount?.status === 'Failed' ? 'var(--loss)' : 'var(--text-secondary)' }}>
            {currentAccount ? `${currentAccount.accountType} (${currentAccount.status})` : 'No Account Selected'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {currentAccount ? `Balance: $${(currentAccount.currentBalance || currentAccount.startingBalance || 0).toLocaleString()}` : 'Select an account above'}
          </div>
        </div>
      </div>

      {/* Notification banners */}
      {success && (
        <div className="anim-fade-in" style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--profit-soft)', border: '1px solid var(--profit-border)', color: 'var(--profit)', fontSize: '0.75rem', fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="anim-fade-in" style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', color: 'var(--loss)', fontSize: '0.75rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Rule management list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        
        {/* Rules container */}
        <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Rules List {selectedAccountId !== 'All' ? `for ${currentAccount?.accountName || ''}` : '(Global View)'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={fetchRules} title="Reload rules">
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Add Rule Inline Form */}
          <form onSubmit={handleAddRule} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              className="input"
              style={{
                flex: 1,
                fontSize: '0.78rem',
                height: '36px',
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-mid)'
              }}
              placeholder="e.g. Stop trading for the day after 2 consecutive stop-outs..."
              value={ruleTextInput}
              onChange={e => setRuleTextInput(e.target.value)}
              disabled={submitting}
            />
            <button 
              className="btn btn-primary" 
              type="submit" 
              style={{ height: '36px', padding: '0 var(--s4)', display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={submitting || !ruleTextInput.trim()}
            >
              <Plus size={15} /> Add Rule
            </button>
          </form>

          {/* Rule checklist renderer */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 0' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '36px', borderRadius: 'var(--r-md)' }} />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <ListTodo size={28} style={{ opacity: 0.25, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No rules defined yet</div>
              <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>Use the form above to add constraints for this account.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rules.map((rule, idx) => {
                const isEditing = editingRuleId === rule.id;
                return (
                  <div
                    key={rule.id}
                    className="glass-deep"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--border)',
                      opacity: rule.isActive ? 1 : 0.6,
                      background: rule.isActive ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '16px' }}>
                      {/* Interactive checkmark toggle */}
                      <button
                        onClick={() => handleToggleRule(rule)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          color: rule.isActive ? 'var(--profit)' : 'var(--text-tertiary)',
                          transition: 'color var(--t-fast)'
                        }}
                        title={rule.isActive ? "Click to deactivate rule" : "Click to activate rule"}
                      >
                        {rule.isActive ? (
                          <CheckCircle size={18} fill="rgba(52,211,153,0.15)" />
                        ) : (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-strong)' }} />
                        )}
                      </button>

                      {/* Rule Text / Input */}
                      {isEditing ? (
                        <input
                          className="input"
                          style={{
                            flex: 1,
                            fontSize: '0.78rem',
                            padding: '2px 8px',
                            height: '28px',
                            background: 'var(--bg-secondary)',
                            borderColor: 'var(--accent)'
                          }}
                          value={editTextInput}
                          onChange={e => setEditTextInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(rule.id)}
                          autoFocus
                        />
                      ) : (
                        <span 
                          style={{ 
                            fontSize: '0.78rem', 
                            color: rule.isActive ? 'var(--text-secondary)' : 'var(--text-muted)',
                            textDecoration: rule.isActive ? 'none' : 'line-through',
                            lineHeight: 1.4
                          }}
                        >
                          <strong>{idx + 1}.</strong> {rule.ruleText}
                          {selectedAccountId === 'All' && rule.accountId && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: '4px', marginLeft: '8px', border: '1px solid var(--border-accent)' }}>
                              Account #{rule.accountId}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Action buttons (Edit, Delete, Save) */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(rule.id)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0 6px', height: '24px', fontSize: '0.65rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0 4px', height: '24px', fontSize: '0.65rem' }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditRule(rule)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                            title="Modify rule description"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                            title="Remove rule"
                          >
                            <Trash2 size={12} className="trash-icon" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TradingRules;
