import React, { useState, useEffect } from 'react';
import { achievements as achievementsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Trophy, Upload, Trash2, Award, Calendar, BadgeCheck, DollarSign, X, AlertTriangle, Eye, ZoomIn, Info
} from 'lucide-react';
import { format } from 'date-fns';

const Achievements = () => {
  const { user } = { user: useAuth().user };
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
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

      await achievementsApi.create(data);
      setShowForm(false);
      setCertFile(null);
      setFormData({
        title: '',
        type: 'passed',
        accountName: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      fetchAchievements();
    } catch (err) {
      setError(err.message || 'Failed to add achievement');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title"><Trophy size={18} style={{ display: 'inline', opacity: 0.6, marginRight: 8, verticalAlign: 'middle' }}/> Achievements Wall</div>
          <div className="page-subtitle">A clean gallery of your prop firm passed challenge certificates, payouts, and reflections from failed accounts</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={user?.isGuest}>
          + Add Achievement
        </button>
      </div>

      {/* Trophy Section Toggles */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s5)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: '320px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Trophy size={32} style={{ opacity: 0.3 }} />
          <div className="empty-title">Trophy Case Empty</div>
          <div className="empty-desc">Upload your first passed certificates or payout receipts to build your trading credentials gallery</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          
          {/* Passed Challenges Case */}
          {passedCerts.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(245,158,11,0.2)', paddingBottom: '6px' }}>
                <BadgeCheck size={16} /> Passed Challenges & Funded Certificates
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}>
                {passedCerts.map(cert => (
                  <div
                    key={cert.id}
                    className="glass glass-hover"
                    onClick={() => setSelectedAchievement(cert)}
                    style={{
                      padding: 'var(--s4)', borderRadius: 'var(--r-lg)',
                      border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.02) 0%, var(--surface) 100%)',
                      display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative'
                    }}
                  >
                    {cert.certificateUrl ? (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#090a0f', border: '1px solid var(--border)' }}>
                        <img src={cert.certificateUrl} alt={cert.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1017', border: '1px dashed rgba(245,158,11,0.2)', color: '#f59e0b', gap: '6px' }}>
                        <Award size={28} style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>No screenshot attached</span>
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cert.title}</h4>
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>{cert.accountName || 'Funded Account'}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Date: {format(new Date(cert.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout Case */}
          {payoutCerts.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--profit)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(52,211,153,0.2)', paddingBottom: '6px' }}>
                <DollarSign size={16} /> Payout Proofs & Certificates
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}>
                {payoutCerts.map(cert => (
                  <div
                    key={cert.id}
                    className="glass glass-hover"
                    onClick={() => setSelectedAchievement(cert)}
                    style={{
                      padding: 'var(--s4)', borderRadius: 'var(--r-lg)',
                      border: '1px solid rgba(52,211,153,0.25)', cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.02) 0%, var(--surface) 100%)',
                      display: 'flex', flexDirection: 'column', gap: '12px'
                    }}
                  >
                    {cert.certificateUrl ? (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#090a0f', border: '1px solid var(--border)' }}>
                        <img src={cert.certificateUrl} alt={cert.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1017', border: '1px dashed rgba(52,211,153,0.2)', color: 'var(--profit)', gap: '6px' }}>
                        <DollarSign size={28} style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>No receipt attached</span>
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{cert.title}</h4>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>
                          ${(cert.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--profit)', fontWeight: 600 }}>{cert.accountName || 'Funded Account'}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Paid on: {format(new Date(cert.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Accounts / Reflections */}
          {failedAccounts.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--s4)', borderBottom: '1px solid rgba(248,113,113,0.2)', paddingBottom: '6px' }}>
                <AlertTriangle size={16} /> Failed Challenge Reflections
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--s5)' }}>
                {failedAccounts.map(cert => (
                  <div
                    key={cert.id}
                    className="glass glass-hover"
                    onClick={() => setSelectedAchievement(cert)}
                    style={{
                      padding: 'var(--s4)', borderRadius: 'var(--r-lg)',
                      border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(248,113,113,0.02) 0%, var(--surface) 100%)',
                      display: 'flex', flexDirection: 'column', gap: '12px'
                    }}
                  >
                    {cert.certificateUrl ? (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#090a0f', border: '1px solid var(--border)' }}>
                        <img src={cert.certificateUrl} alt={cert.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '150px', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1017', border: '1px dashed rgba(248,113,113,0.2)', color: 'var(--loss)', gap: '6px' }}>
                        <AlertTriangle size={28} style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>No screenshot attached</span>
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cert.title}</h4>
                      <span style={{ fontSize: '0.65rem', color: 'var(--loss)', fontWeight: 600 }}>{cert.accountName || 'Failed Account'}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Breached on: {format(new Date(cert.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Add Achievement Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="glass-deep modal-panel" style={{ width: 440 }}>
            <div className="modal-header">
              <div className="modal-title">Record Achievement or Reflection</div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
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
                    <Upload size={13}/>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Save Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Zoom Details Modal */}
      {selectedAchievement && (
        <div className="modal-overlay" onClick={() => setSelectedAchievement(null)}>
          <div className="glass-deep modal-panel" style={{ width: 620, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${
                  selectedAchievement.type === 'passed' ? 'badge-profit' : (selectedAchievement.type === 'failed' ? 'badge-loss' : 'badge-accent')
                }`}>
                  {selectedAchievement.type.toUpperCase()}
                </span>
                <span className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedAchievement.title}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedAchievement(null)}><X size={18}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', overflowY: 'auto', maxHeight: '75vh' }}>
              {selectedAchievement.certificateUrl && (
                <div style={{ width: '100%', maxHeight: '350px', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: '#0e1017' }}>
                  <img src={selectedAchievement.certificateUrl} alt="Certificate Zoom" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="glass-deep" style={{ padding: '10px', borderRadius: 'var(--r-md)' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Firm / Account Code</span>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedAchievement.accountName || '—'}</div>
                </div>
                <div className="glass-deep" style={{ padding: '10px', borderRadius: 'var(--r-md)' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Stamp</span>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{format(new Date(selectedAchievement.date), 'MMMM d, yyyy')}</div>
                </div>
              </div>

              {selectedAchievement.type === 'payout' && (
                <div className="glass-deep" style={{ padding: '12px', borderRadius: 'var(--r-md)', textAlign: 'center', background: 'var(--profit-soft)' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--profit)', textTransform: 'uppercase', fontWeight: 600 }}>Payout Claimed</span>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>
                    ${(selectedAchievement.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Reflection Notes */}
              <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: selectedAchievement.type === 'failed' ? '1px solid rgba(248,113,113,0.2)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                  <Info size={12} /> Notes & Reflection
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {selectedAchievement.notes || 'No reflections logged for this achievement.'}
                </p>
              </div>

              {/* Delete Trigger */}
              {!user?.isGuest && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ fontSize: '0.72rem', gap: '4px' }}
                    onClick={() => setDeleteConfirm(selectedAchievement.id)}
                  >
                    <Trash2 size={12}/> Delete Trophy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Trophy Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-deep modal-panel" style={{ width: 360, padding: 'var(--s8)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ marginBottom: 'var(--s4)' }}>Delete Trophy?</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--s6)', lineHeight: 1.7 }}>
              This will permanently remove this certificate from your Case.
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

export default Achievements;
