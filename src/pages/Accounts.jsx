import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, X, Wallet, Award, Activity, AlertTriangle, Trash2, Globe, CalendarDays,
  Coins, ExternalLink, FileText, Edit2, Target, Crosshair, RotateCcw, ShieldAlert, CheckCircle, Info, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animated Count-Up Balance Component ---
const AnimatedBalance = ({ value, prefix = '$', decimals = 2, duration = 900 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseFloat(value) || 0;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easedProgress * endValue);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [value, duration]);

  const pnlNum = parseFloat(value) || 0;
  const isNegative = pnlNum < 0;

  return (
    <span>
      {isNegative ? '-$' : prefix}{Math.abs(displayValue).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

// --- Interactive 3D Tilt Account Card Component ---
const AccountCard = ({
  acc, isDeletedView, statusFilter, startEditAccount, setDeleteConfirm, setRestoreConfirm,
  setHardDeleteConfirm, startEditNotes, editingNotesId, setEditingNotesId, tempNotes,
  setTempNotes, saveNotes, handleRestore, navigate, formatDate
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y / 24);
    setRotateY(x / 24);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const isProfit = (acc.totalPnL || 0) >= 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 25, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } }
      }}
      whileHover={{ y: -5 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="account-card-premium"
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out, box-shadow 0.3s ease',
        borderColor: isDeletedView
          ? 'var(--warn-border)'
          : ((acc.status || '').toLowerCase() === 'passed' ? 'var(--profit)' : ((acc.status || '').toLowerCase() === 'failed' ? 'var(--loss)' : 'var(--border)')),
        boxShadow: isHovered
          ? (acc.status === 'Passed' ? '0 12px 30px rgba(52, 211, 153, 0.25)' : (acc.status === 'Failed' ? '0 12px 30px rgba(248, 113, 113, 0.25)' : '0 12px 30px rgba(99, 102, 241, 0.2)'))
          : (acc.status === 'Passed' ? '0 6px 20px var(--profit-soft)' : (acc.status === 'Failed' ? '0 6px 20px var(--loss-soft)' : 'var(--shadow-sm)'))
      }}
    >
      {/* Action buttons (Edit & Delete / Restore & Hard Delete) */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', gap: '8px', alignItems: 'center', zIndex: 2
      }}>
        {isDeletedView ? (
          <>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRestoreConfirm(acc)}
              className="btn-action-round"
              title="Restore Account"
              style={{ color: 'var(--profit)' }}
            >
              <RotateCcw size={13} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setHardDeleteConfirm(acc)}
              className="btn-action-round"
              title="Permanently Erase"
              style={{ color: 'var(--loss)' }}
            >
              <Trash2 size={13} />
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => startEditAccount(acc)}
              className="btn-action-round"
              title="Edit Account"
            >
              <Edit2 size={12} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDeleteConfirm(acc)}
              className="btn-action-round"
              title="Delete Account"
            >
              <Trash2 size={12} className="trash-icon" />
            </motion.button>
          </>
        )}
      </div>

      {/* Account Details Header */}
      <div style={{ paddingRight: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            {acc.accountName}
          </h3>
          <motion.span
            whileHover={{ scale: 1.1 }}
            className={`badge ${
              isDeletedView ? 'badge-warn' : ((acc.status || '').toLowerCase() === 'passed' ? 'badge-profit' : ((acc.status || '').toLowerCase() === 'failed' ? 'badge-loss' : 'badge-accent'))
            }`}
            style={{ fontSize: '0.62rem', padding: '3px 9px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            {isDeletedView ? 'DELETED' : acc.status}
          </motion.span>
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
          <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
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
            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
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
            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
              <CalendarDays size={11} style={{ opacity: 0.6 }} /> Days
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--profit)', marginTop: '2px' }}>
              {acc.tradingDays || 0}
            </div>
          </div>
        )}
      </div>

      {/* Consistency + Progress Bar */}
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
                <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Consistency</span>
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
                {/* Glow fill bar with spring animation */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillWidth}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 0.8, 0.25, 1], delay: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${fillLeft}%`,
                    height: '100%',
                    background: fillBackground,
                    borderRadius: '4px',
                    boxShadow: `0 0 10px ${isHigher ? 'rgba(52, 211, 153, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                  }}
                />

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
                <motion.div
                  initial={{ left: `${startPct}%` }}
                  animate={{ left: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 0.8, 0.25, 1], delay: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isHigher ? 'var(--profit)' : 'var(--loss)',
                    border: '2.5px solid #0f1115',
                    boxShadow: `0 0 8px ${isHigher ? 'rgba(52, 211, 153, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
                  }}
                />
              </div>

              {/* Limits labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--loss)' }}>
                    ${Math.round(mll).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginTop: '1px' }}>
                    {acc.useTrailingDrawdown ? 'MLL (Trailing)' : 'MLL (Static)'}
                  </div>
                </div>
                {acc.dailyLossLimit > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#3b82f6' }}>
                      ${Math.round(acc.dailyLossLimit).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginTop: '1px' }}>DAILY LOSS</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--profit)' }}>
                    ${Math.round(target).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginTop: '1px' }}>TARGET</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Performance Metrics Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Trades Synced</span>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{acc.tradesCount || 0} trades</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total Return</span>
          <span style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', color: isProfit ? 'var(--profit)' : 'var(--loss)', fontSize: '0.82rem' }}>
            {isProfit ? '+' : ''}${(acc.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* View Details Button */}
      {!isDeletedView && (
        <motion.button
          whileHover={{ scale: 1.025, boxShadow: '0 6px 20px rgba(255,255,255,0.15)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/dashboard?accountId=${acc.id}`)}
          className="btn btn-sm btn-primary"
          style={{
            width: '100%',
            padding: '9px',
            fontSize: '0.74rem',
            fontWeight: 800,
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
        </motion.button>
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
            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>Account Notes</span>
            <button
              className="btn-action-round"
              style={{ width: '20px', height: '20px' }}
              onClick={() => startEditNotes(acc)}
              title="Edit Account Notes"
            >
              <Edit2 size={9} />
            </button>
          </div>
          {acc.notes ? (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
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
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-sm btn-primary"
            onClick={() => handleRestore(acc.id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--profit)', borderColor: 'var(--profit)', fontSize: '0.74rem' }}
          >
            <RotateCcw size={13} /> Restore Account
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-sm btn-danger"
            onClick={() => setHardDeleteConfirm(acc)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.74rem' }}
          >
            <Trash2 size={13} /> Delete Permanently
          </motion.button>
        </div>
      )}

      {/* Footer Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
        <span>Currency: <strong>{acc.currency || 'USD'}</strong></span>
        <span>Created {formatDate(acc.createdAt)}</span>
      </div>

    </motion.div>
  );
};

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
    dailyLossLimit: '',
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
      dailyLossLimit: '',
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
      dailyLossLimit: acc.dailyLossLimit ? String(acc.dailyLossLimit) : '',
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
          dailyLossLimit: parseFloat(formData.dailyLossLimit) || 0,
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
          dailyLossLimit: parseFloat(formData.dailyLossLimit) || 0,
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
    .filter(a => (a.status || '').toLowerCase() === 'active')
    .reduce((acc, curr) => acc + (curr.currentBalance || 0), 0);

  const activeCount = accountsArray.filter(a => (a.status || '').toLowerCase() === 'active').length;
  const passedCount = accountsArray.filter(a => (a.status || '').toLowerCase() === 'passed').length;
  const failedCount = accountsArray.filter(a => (a.status || '').toLowerCase() === 'failed').length;
  const deletedCount = deletedArray.length;
  
  const filteredAccounts = statusFilter === 'Deleted' ? deletedArray : accountsArray.filter(a => {
    if (statusFilter === 'All') return true;
    return (a.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)', paddingBottom: '60px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trading Accounts</div>
          <div className="page-subtitle">Manage and track performance across multiple challenges, live brokerage accounts, and archived records</div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(99,102,241,0.4)' }}
          whileTap={{ scale: 0.95 }}
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
              dailyLossLimit: '',
              consistencyRule: '',
              useTrailingDrawdown: false
            });
            setShowForm(true);
          }} 
          style={{ gap: '6px' }}
        >
          <Sparkles size={14} /> + Add Account
        </motion.button>
      </motion.div>

      {/* KPI Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)' }}
      >
        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.02, translateY: -3 }}
          className="glass stat-card"
          onClick={() => setStatusFilter('All')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'All' ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'All' ? '0 0 15px rgba(255, 255, 255, 0.08)' : 'none',
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Wallet size={13} /></span> Total Combined Balance
          </div>
          <div className="stat-value" style={{ fontFamily: 'JetBrains Mono', color: totalBalance >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            <AnimatedBalance value={totalBalance} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Across {activeCount} active account{activeCount !== 1 ? 's' : ''}
          </div>
        </motion.div>

        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.02, translateY: -3 }}
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Active' ? '1px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Active' ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none',
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--accent)' }}><Activity size={13} /></span> Active Accounts
          </div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Challenges & Live logs</div>
        </motion.div>

        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.02, translateY: -3 }}
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Passed' ? 'All' : 'Passed')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Passed' ? '1px solid var(--profit)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Passed' ? '0 0 15px rgba(52, 211, 153, 0.25)' : 'none',
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--profit)' }}><Award size={13} /></span> Passed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--profit)' }}>{passedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Funded credentials unlocked</div>
        </motion.div>

        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ scale: 1.02, translateY: -3 }}
          className="glass stat-card"
          onClick={() => setStatusFilter(statusFilter === 'Failed' ? 'All' : 'Failed')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'Failed' ? '1px solid var(--loss)' : '1px solid var(--border)',
            boxShadow: statusFilter === 'Failed' ? '0 0 15px rgba(248, 113, 113, 0.25)' : 'none',
          }}
        >
          <div className="stat-label">
            <span style={{ color: 'var(--loss)' }}><AlertTriangle size={13} /></span> Failed Challenges
          </div>
          <div className="stat-value" style={{ color: 'var(--loss)' }}>{failedCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drawdown limit breaches</div>
        </motion.div>
      </motion.div>

      {/* Filter Tabs / Option Pills */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        style={{ 
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
        }}
      >
        {[
          { label: 'All Accounts', value: 'All', count: accountsArray.length, color: 'var(--text-primary)', activeBg: 'rgba(255,255,255,0.08)' },
          { label: 'Active', value: 'Active', count: activeCount, color: 'var(--accent)', activeBg: 'rgba(59, 130, 246, 0.1)' },
          { label: 'Passed', value: 'Passed', count: passedCount, color: 'var(--profit)', activeBg: 'rgba(52, 211, 153, 0.1)' },
          { label: 'Failed', value: 'Failed', count: failedCount, color: 'var(--loss)', activeBg: 'rgba(248, 113, 113, 0.1)' },
          { label: 'Deleted Accounts', value: 'Deleted', count: deletedCount, color: 'var(--warn)', activeBg: 'rgba(245, 158, 11, 0.12)' },
        ].map(tab => {
          const isActive = statusFilter === tab.value;
          return (
            <motion.button
              key={tab.value}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
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
                boxShadow: isActive ? `0 0 10px ${tab.color}20` : 'none'
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
            </motion.button>
          );
        })}
      </motion.div>

      {/* Accounts List / Empty States */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s4)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '220px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : statusFilter !== 'Deleted' && accountsArray.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Wallet size={36} style={{ opacity: 0.3, color: 'var(--accent)' }} />
          <div className="empty-title">No trading accounts logged</div>
          <div className="empty-desc">Create an account profile to sync prop challenges or live brokerage stats</div>
        </motion.div>
      ) : filteredAccounts.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass empty-state" style={{ padding: 'var(--s12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s3)' }}>
          <Wallet size={36} style={{ opacity: 0.3, color: 'var(--accent)' }} />
          <div className="empty-title">No {statusFilter.toLowerCase()} accounts found</div>
          <div className="empty-desc">
            {statusFilter === 'Deleted' ? 'No accounts have been deleted yet.' : `There are no trading accounts with status "${statusFilter}" currently logged.`}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => setStatusFilter('All')}>Clear Filter</button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}
        >
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
              border-color: var(--border-mid) !important;
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
          {filteredAccounts.map(acc => (
            <AccountCard
              key={acc.id}
              acc={acc}
              isDeletedView={statusFilter === 'Deleted' || Boolean(acc.deletedAt)}
              statusFilter={statusFilter}
              startEditAccount={startEditAccount}
              setDeleteConfirm={setDeleteConfirm}
              setRestoreConfirm={setRestoreConfirm}
              setHardDeleteConfirm={setHardDeleteConfirm}
              startEditNotes={startEditNotes}
              editingNotesId={editingNotesId}
              setEditingNotesId={setEditingNotesId}
              tempNotes={tempNotes}
              setTempNotes={setTempNotes}
              saveNotes={saveNotes}
              handleRestore={handleRestore}
              navigate={navigate}
              formatDate={formatDate}
            />
          ))}
        </motion.div>
      )}

      {/* ═══ ADD / EDIT ACCOUNT FORM MODAL ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseForm}
          >
            <motion.div
              className="glass-deep modal-panel"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ width: 450, padding: 'var(--s8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ marginBottom: 'var(--s6)' }}>
                <div className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {editingAccount ? 'Edit Account' : 'Add Trading Account'}
                </div>
                <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }} className="modal-close" onClick={handleCloseForm}>
                  <X size={18} />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  <div className="form-field">
                    <label className="form-label">Account Name *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Apex 50k #1"
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
                      <option value="Forex">Forex</option>
                      <option value="Futures">Futures</option>
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
                  {formData.accountType !== 'Live' && formData.accountType !== 'Forex' && formData.accountType !== 'Futures' && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', marginTop: 'var(--s2)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--s3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={13} style={{ color: 'var(--accent)' }} />
                        Challenge / Prop Firm Rules
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
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
                            placeholder="e.g. 1000"
                            value={formData.maxLossLimit}
                            onChange={e => setFormData({ ...formData, maxLossLimit: e.target.value })}
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Daily Loss Limit ($)</label>
                          <input
                            className="input"
                            type="number"
                            placeholder="e.g. 500"
                            value={formData.dailyLossLimit}
                            onChange={e => setFormData({ ...formData, dailyLossLimit: e.target.value })}
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Consistency (%)</label>
                          <input
                            className="input"
                            type="number"
                            placeholder="e.g. 40"
                            value={formData.consistencyRule}
                            onChange={e => setFormData({ ...formData, consistencyRule: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="form-field" style={{ marginTop: '12px' }}>
                        <label className="form-label">Drawdown Calculation Type</label>
                        <select
                          className="input"
                          value={formData.useTrailingDrawdown ? 'trailing' : 'static'}
                          onChange={e => setFormData({ ...formData, useTrailingDrawdown: e.target.value === 'trailing' })}
                        >
                          <option value="static">🔒 Static Drawdown (FTMO / Funding Pips — Fixed Floor)</option>
                          <option value="trailing">📈 Trailing Drawdown (Apex / Topstep — Dynamic Peak Floor)</option>
                        </select>
                      </div>

                      <div style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-secondary)',
                        marginTop: '8px',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        lineHeight: 1.4
                      }}>
                        {formData.useTrailingDrawdown ? (
                          <span>📈 <strong>Trailing Drawdown:</strong> Your Minimum Loss Level (MLL) trails upward dynamically as peak account equity increases until it reaches starting balance.</span>
                        ) : (
                          <span>🔒 <strong>Static Drawdown:</strong> Your Minimum Loss Level (MLL) remains permanently fixed at <strong>${Math.max(0, (parseFloat(formData.balance) || 0) - (parseFloat(formData.maxLossLimit) || 0)).toLocaleString()}</strong> (Starting Balance - Max Loss Limit).</span>
                        )}
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
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (editingAccount ? 'Saving...' : 'Creating...') : (editingAccount ? 'Save Changes' : '+ Create Account')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SOFT DELETE CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="modal-panel glass"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ maxWidth: 440, padding: 'var(--s6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--warn)', marginBottom: 'var(--s3)' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Move to Deleted Accounts?</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
                Move <strong>"{deleteConfirm.accountName}"</strong> to the Deleted Accounts tab? All account balances, targets, notes, and trade logs will be safely archived and can be restored at any time.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>
                  Move to Deleted
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ RESTORE CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {restoreConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={() => setRestoreConfirm(null)}
          >
            <motion.div
              className="modal-panel glass"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ maxWidth: 440, padding: 'var(--s6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--profit)', marginBottom: 'var(--s3)' }}>
                <RotateCcw size={24} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Restore Account?</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
                Restore <strong>"{restoreConfirm.accountName}"</strong> back to your active accounts list with all stats and trade logs intact?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={() => setRestoreConfirm(null)}>Cancel</button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  style={{ background: 'var(--profit)', borderColor: 'var(--profit)' }}
                  onClick={() => handleRestore(restoreConfirm.id)}
                >
                  Restore Account
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HARD DELETE CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {hardDeleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={() => setHardDeleteConfirm(null)}
          >
            <motion.div
              className="modal-panel glass"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ maxWidth: 440, padding: 'var(--s6)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--loss)', marginBottom: 'var(--s3)' }}>
                <ShieldAlert size={24} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Permanently Delete Account?</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s5)' }}>
                Permanently erase <strong>"{hardDeleteConfirm.accountName}"</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-ghost" onClick={() => setHardDeleteConfirm(null)}>Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-danger" onClick={() => handleHardDelete(hardDeleteConfirm.id)}>
                  Permanently Erase
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Accounts;
