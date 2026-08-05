import React, { useState, useEffect } from 'react';
import { achievements as achievementsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Trophy, Upload, Trash2, Award, Calendar, BadgeCheck, DollarSign, X, AlertTriangle, Eye, ZoomIn, Info, Maximize2, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animated Count-Up Number Component ---
const AnimatedNumber = ({ value, prefix = '$', decimals = 2, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseFloat(value) || 0;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic function
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easedProgress * endValue);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span>
      {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

// --- Ambient Sparkle Particles Layer ---
const SparkleParticles = ({ type }) => {
  const isPayout = type === 'payout';
  const isPassed = type === 'passed';
  const color = isPayout ? '#34d399' : (isPassed ? '#f59e0b' : '#a78bfa');
  
  const particles = Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    top: `${10 + Math.random() * 80}%`,
    left: `${5 + Math.random() * 90}%`,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{
            opacity: [0, 0.85, 0],
            scale: [0, 1.3, 0.4],
            y: [-10, -35, -60],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

// --- 3D Interactive Tilt Card Component ---
const AnimatedTrophyCard = ({ cert, onClick, safeFormatDate }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y / 14);
    setRotateY(x / 14);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const isPassed = cert.type === 'passed';
  const isPayout = cert.type === 'payout';
  const isFailed = cert.type === 'failed';

  const borderColor = isPassed
    ? 'rgba(245,158,11,0.35)'
    : (isPayout ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)');

  const gradientBg = isPassed
    ? 'linear-gradient(135deg, rgba(245,158,11,0.04) 0%, var(--surface) 100%)'
    : (isPayout ? 'linear-gradient(135deg, rgba(52,211,153,0.04) 0%, var(--surface) 100%)' : 'linear-gradient(135deg, rgba(248,113,113,0.04) 0%, var(--surface) 100%)');

  const glowShadow = isPassed
    ? '0 12px 30px -8px rgba(245, 158, 11, 0.3)'
    : (isPayout ? '0 12px 30px -8px rgba(52, 211, 153, 0.3)' : '0 12px 30px -8px rgba(248, 113, 113, 0.3)');

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 25, scale: 0.94 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } }
      }}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        padding: 'var(--s4)',
        borderRadius: 'var(--r-lg)',
        border: `1px solid ${borderColor}`,
        cursor: 'pointer',
        background: gradientBg,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.4s ease-out, box-shadow 0.3s ease',
        boxShadow: isHovered ? glowShadow : '0 4px 12px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}
    >
      {/* Animated Light Sweep Overlay */}
      <div className="shimmer-overlay" />

      {cert.certificateUrl ? (
        <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#090a0f', border: '1px solid var(--border)', position: 'relative' }}>
          <motion.img
            src={cert.certificateUrl}
            alt={cert.title}
            animate={{ scale: isHovered ? 1.07 : 1 }}
            transition={{ duration: 0.35 }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 60%)',
            opacity: isHovered ? 1 : 0, transition: 'opacity 0.25s ease', display: 'flex', alignItems: 'flex-end', padding: '8px'
          }}>
            <span style={{ fontSize: '0.65rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
              <ZoomIn size={12}/> View Trophy Details
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%', height: '150px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0e1017', border: `1px dashed ${borderColor}`,
          color: isPassed ? '#f59e0b' : (isPayout ? 'var(--profit)' : 'var(--loss)'), gap: '6px'
        }}>
          {isPassed && <Award size={32} style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }} />}
          {isPayout && <DollarSign size={32} style={{ filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.5))' }} />}
          {isFailed && <AlertTriangle size={32} style={{ filter: 'drop-shadow(0 0 10px rgba(248,113,113,0.5))' }} />}
          <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>No screenshot attached</span>
        </div>
      )}

      <div style={{ transform: 'translateZ(12px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{cert.title}</h4>
          {isPayout && (
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>
              ${(cert.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.65rem', color: isPassed ? '#f59e0b' : (isPayout ? 'var(--profit)' : 'var(--loss)'), fontWeight: 600 }}>{cert.accountName || 'Funded Account'}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Date: {safeFormatDate(cert.date, 'MMM d, yyyy')}</span>
      </div>
    </motion.div>
  );
};

const Achievements = () => {
  const { user } = { user: useAuth().user };
  const safeFormatDate = (dateStr, formatPattern = 'MMM d, yyyy') => {
    try {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, formatPattern);
    } catch (e) {
      return dateStr || '—';
    }
  };
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingAchievement, setEditingAchievement] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'passed', // 'passed', 'payout', 'failed'
    accountName: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAchievement(null);
    setCertFile(null);
    setFormData({
      title: '',
      type: 'passed',
      accountName: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setError('');
  };

  const startEditAchievement = (achievement) => {
    setFormData({
      title: achievement.title || '',
      type: achievement.type || 'passed',
      accountName: achievement.accountName || '',
      amount: achievement.amount !== undefined ? String(achievement.amount) : '',
      date: achievement.date ? new Date(achievement.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: achievement.notes || ''
    });
    setCertFile(null);
    setEditingAchievement(achievement);
    setSelectedAchievement(null);
    setShowForm(true);
  };

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const data = await achievementsApi.list();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      setError('Title and Date are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      data.append('accountName', formData.accountName);
      data.append('amount', formData.amount);
      data.append('date', formData.date);
      data.append('notes', formData.notes);
      if (certFile) {
        data.append('certificate', certFile);
      }

      if (editingAchievement) {
        await achievementsApi.update(editingAchievement.id, data);
      } else {
        await achievementsApi.create(data);
      }
      handleCancelForm();
      fetchAchievements();
    } catch (err) {
      setError(err.message || (editingAchievement ? 'Failed to update achievement' : 'Failed to add achievement'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await achievementsApi.delete(id);
      setDeleteConfirm(null);
      setSelectedAchievement(null);
      fetchAchievements();
    } catch (err) {
      console.error('Failed to delete achievement:', err);
    }
  };

  const passedCerts = achievements.filter(a => a.type === 'passed');
  const payoutCerts = achievements.filter(a => a.type === 'payout');
  const failedAccounts = achievements.filter(a => a.type === 'failed');

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">
            <motion.span
              animate={{ rotate: [0, -10, 10, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              style={{ display: 'inline-block' }}
            >
              <Trophy size={20} style={{ display: 'inline', color: '#f59e0b', marginRight: 8, verticalAlign: 'middle' }}/>
            </motion.span>
            Achievements Wall
          </div>
          <div className="page-subtitle">A clean gallery of your prop firm passed challenge certificates, payouts, and reflections from failed accounts</div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(99,102,241,0.4)' }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={user?.isGuest}
          style={{ gap: '6px' }}
        >
          <Sparkles size={14} /> + Add Achievement
        </motion.button>
      </motion.div>

      {/* Trophy Section Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s5)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '320px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass empty-state"
          style={{ padding: 'var(--s12)' }}
        >
          <Trophy size={36} style={{ opacity: 0.3, color: '#f59e0b' }} />
          <div className="empty-title">Trophy Case Empty</div>
          <div className="empty-desc">Upload your first passed certificates or payout receipts to build your trading credentials gallery</div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          
          {/* Passed Challenges Case */}
          {passedCerts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(245,158,11,0.2)', paddingBottom: '6px' }}>
                <BadgeCheck size={16} /> Passed Challenges & Funded Certificates ({passedCerts.length})
              </h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}
              >
                {passedCerts.map(cert => (
                  <AnimatedTrophyCard
                    key={cert.id}
                    cert={cert}
                    onClick={() => setSelectedAchievement(cert)}
                    safeFormatDate={safeFormatDate}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Payout Case */}
          {payoutCerts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--profit)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(52,211,153,0.2)', paddingBottom: '6px' }}>
                <DollarSign size={16} /> Payout Proofs & Certificates ({payoutCerts.length})
              </h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}
              >
                {payoutCerts.map(cert => (
                  <AnimatedTrophyCard
                    key={cert.id}
                    cert={cert}
                    onClick={() => setSelectedAchievement(cert)}
                    safeFormatDate={safeFormatDate}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Failed Accounts / Reflections */}
          {failedAccounts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(248,113,113,0.2)', paddingBottom: '6px' }}>
                <AlertTriangle size={16} /> Failed Challenge Reflections ({failedAccounts.length})
              </h3>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}
              >
                {failedAccounts.map(cert => (
                  <AnimatedTrophyCard
                    key={cert.id}
                    cert={cert}
                    onClick={() => setSelectedAchievement(cert)}
                    safeFormatDate={safeFormatDate}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

        </div>
      )}

      {/* Add / Edit Achievement Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.target === e.currentTarget && handleCancelForm()}
          >
            <motion.div
              className="glass-deep modal-panel"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ width: 460 }}
            >
              <div className="modal-header">
                <div className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {editingAchievement ? 'Edit Achievement / Reflection' : 'Record Achievement or Reflection'}
                </div>
                <button className="modal-close" onClick={handleCancelForm}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-field">
                    <label className="form-label">Type *</label>
                    <select
                      className="input"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="passed">Passed Challenge (Certificate)</option>
                      <option value="payout">Funded Payout (Proof)</option>
                      <option value="failed">Failed Challenge (Reflection)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Title / Event Name *</label>
                    <input
                      required
                      className="input"
                      placeholder="e.g. Passed Apex $50k Account #2"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Account Code / Firm</label>
                    <input
                      className="input"
                      placeholder="e.g. Apex APEX-92834"
                      value={formData.accountName}
                      onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                    <div className="form-field">
                      <label className="form-label">Date *</label>
                      <input
                        className="input"
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Payout Amount ($)</label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        disabled={formData.type !== 'payout'}
                        value={formData.type === 'payout' ? formData.amount : ''}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Certificate Screenshot / Proof</label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                      padding: '10px 12px', border: '1px dashed var(--border-mid)',
                      borderRadius: 'var(--r-md)', cursor: 'pointer',
                      fontSize: '0.75rem', color: 'var(--text-muted)',
                      transition: 'border-color var(--t-fast)', background: 'var(--surface-glass)',
                    }}>
                      <Upload size={14}/>
                      {certFile ? certFile.name : 'Attach Certificate (PNG / JPG)'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCertFile(e.target.files[0])}/>
                    </label>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Reflection Notes & Learnings</label>
                    <textarea
                      className="input"
                      placeholder={formData.type === 'failed' ? "What led to the breach? What rules did you break? What are you changing?" : "Record any notes, payouts stats, or firm rules."}
                      rows={3}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
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
                  <button type="button" className="btn btn-ghost" onClick={handleCancelForm}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Save Achievement'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View / Zoom Details Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              className={`glass-deep modal-panel ${
                selectedAchievement.type === 'passed' ? 'cert-modal-glow-passed' : (selectedAchievement.type === 'payout' ? 'cert-modal-glow-payout' : '')
              }`}
              initial={{ opacity: 0, scale: 0.88, y: 30, rotateX: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{
                width: 620, maxWidth: '95vw', display: 'flex', flexDirection: 'column',
                gap: 'var(--s4)', position: 'relative', overflow: 'hidden',
                background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Sparkle Particles Layer */}
              <SparkleParticles type={selectedAchievement.type} />

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="modal-header"
                style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)', zIndex: 1, marginBottom: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.span
                    whileHover={{ scale: 1.1, rotate: 4 }}
                    className={`badge ${
                      selectedAchievement.type === 'passed' ? 'badge-profit' : (selectedAchievement.type === 'failed' ? 'badge-loss' : 'badge-accent')
                    }`}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', fontWeight: 800, padding: '4px 10px', fontSize: '0.7rem' }}
                  >
                    {selectedAchievement.type === 'passed' && <Award size={13} />}
                    {selectedAchievement.type === 'payout' && <DollarSign size={13} />}
                    {selectedAchievement.type === 'failed' && <AlertTriangle size={13} />}
                    {selectedAchievement.type}
                  </motion.span>
                  <span className="modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{selectedAchievement.title}</span>
                </div>
                <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }} className="modal-close" onClick={() => setSelectedAchievement(null)}>
                  <X size={18}/>
                </motion.button>
              </motion.div>

              {/* Scrollable Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', overflowY: 'auto', maxHeight: '75vh', zIndex: 1, paddingRight: '4px' }}>
                
                {/* Certificate Screenshot Zoomable Preview */}
                {selectedAchievement.certificateUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.12 }}
                    className="cert-image-container"
                    style={{ width: '100%', maxHeight: '350px', cursor: 'zoom-in', background: '#08090d', position: 'relative' }}
                    onClick={() => setZoomedImage(selectedAchievement.certificateUrl)}
                  >
                    <img src={selectedAchievement.certificateUrl} alt="Certificate Zoom" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                    <div style={{
                      position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.78)',
                      backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff', fontSize: '0.68rem', padding: '4px 10px', borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none', fontWeight: 600
                    }}>
                      <Maximize2 size={13} /> Click to Fullscreen
                    </div>
                  </motion.div>
                )}

                {/* Details Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                >
                  <div className="glass-deep" style={{ padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Firm / Account Code</span>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedAchievement.accountName || '—'}</div>
                  </div>
                  <div className="glass-deep" style={{ padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Date Stamp</span>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>{safeFormatDate(selectedAchievement.date, 'MMMM d, yyyy')}</div>
                  </div>
                </motion.div>

                {/* Payout Claimed Section with Animated Number */}
                {selectedAchievement.type === 'payout' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22, type: 'spring' }}
                    className="glass-deep"
                    style={{
                      padding: '16px', borderRadius: 'var(--r-lg)', textAlign: 'center',
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                      border: '1px solid rgba(52,211,153,0.35)',
                      boxShadow: '0 8px 25px -5px rgba(52,211,153,0.22)'
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: 'var(--profit)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={13}/> Payout Claimed & Verified
                    </span>
                    <div style={{ fontWeight: 800, fontSize: '1.85rem', color: 'var(--profit)', fontFamily: 'JetBrains Mono', marginTop: '4px', textShadow: '0 0 20px rgba(52,211,153,0.4)' }}>
                      <AnimatedNumber value={selectedAchievement.amount || 0} />
                    </div>
                  </motion.div>
                )}

                {/* Reflection Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                  className="glass-deep"
                  style={{
                    padding: 'var(--s4)', borderRadius: 'var(--r-lg)',
                    border: selectedAchievement.type === 'failed' ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)',
                    background: selectedAchievement.type === 'failed' ? 'rgba(248,113,113,0.03)' : 'var(--surface-glass)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    <Info size={13} style={{ color: selectedAchievement.type === 'failed' ? 'var(--loss)' : 'var(--accent)' }} /> Notes & Reflection
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {selectedAchievement.notes || 'No reflections logged for this achievement.'}
                  </p>
                </motion.div>

                {/* Action Buttons */}
                {!user?.isGuest && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: '0.75rem', gap: '6px', border: '1px solid var(--border)', padding: '6px 14px' }}
                      onClick={() => startEditAchievement(selectedAchievement)}
                    >
                      Edit Trophy
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: '0.75rem', gap: '6px', padding: '6px 14px' }}
                      onClick={() => setDeleteConfirm(selectedAchievement.id)}
                    >
                      <Trash2 size={13}/> Delete Trophy
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ zIndex: 300, background: 'rgba(0,0,0,0.92)', cursor: 'zoom-out' }}
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.82, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }}
              onClick={e => e.stopPropagation()}
            >
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setZoomedImage(null)}
                style={{
                  position: 'absolute', top: -45, right: 0, background: 'rgba(255,255,255,0.2)',
                  border: 'none', color: '#fff', borderRadius: '50%', width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </motion.button>
              <img
                src={zoomedImage}
                alt="Full Zoom Certificate"
                style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 'var(--r-lg)', boxShadow: '0 0 50px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', objectFit: 'contain' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Trophy Confirmation Modal */}
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
              className="glass-deep modal-panel"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ width: 360, padding: 'var(--s8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-title" style={{ marginBottom: 'var(--s4)', color: 'var(--loss)' }}>Delete Trophy?</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--s6)', lineHeight: 1.7 }}>
                This will permanently remove this certificate from your Case.
              </p>
              <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Achievements;
