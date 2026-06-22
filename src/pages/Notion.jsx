import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { notion as notionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Plus, Search, Trash2, Sparkles, Cpu, Send, Brain, Info,
  List, RefreshCw, PenTool, Layout, Calendar, AlertCircle, Check, Tag,
  Link, ExternalLink, Copy
} from 'lucide-react';

const EMOJIS = ['📄', '📈', '📓', '💡', '🎯', '🧪', '📝', '📊', '⚡', '🏆', '⚠️', '🧠'];

const TEMPLATES = [
  {
    title: 'Breakout Trade Playbook',
    icon: '📈',
    tags: ['Playbook', 'Breakout'],
    content: `## Breakout Trade Playbook

### 1. Market Context Setup
- **Volume Profile**: High relative volume (RVOL > 1.5).
- **Trend Alignment**: Entry must align with the 4-hour and Daily market structure.
- **Key Trigger Level**: Breakout of the recent 3-day high/low range with a clean daily close.

### 2. Risk Management Protocol
- **Max Sizing**: 1% risk per trade.
- **Stop Loss placement**: Just below the consolidation pivot candle high/low.
- **Take Profit**: 2R (Reward-to-Risk ratio) minimum. Move SL to break-even at 1R profit.

### 3. Checklist Before Clicking Buy/Sell
- [ ] Level is validated on 1H timeframe.
- [ ] No major high-impact news in next 45 minutes.
- [ ] Spread is within normal historical session ranges.`
  },
  {
    title: 'Pre-Market Session Plan',
    icon: '📝',
    tags: ['Daily Plan', 'Setup'],
    content: `## Pre-Market Session Plan

### 1. High-Impact News Check
- Today's releases: 
- Expected volatility periods:

### 2. Priority Watchlist
- **Symbol 1**: 
  - Key levels: Support at ________ | Resistance at ________
  - Scenario A (Bullish): Break and retest of ________
  - Scenario B (Bearish): Rejection at ________
- **Symbol 2**: 

### 3. Psychological Commitments
- I will not force trades in a slow, sideways market.
- I will walk away after 2 consecutive losses.
- I will size down if my confidence is low.`
  },
  {
    title: 'Lessons from Drawdown',
    icon: '💡',
    tags: ['Review', 'Psychology'],
    content: `## Lessons from Recent Drawdown

### 1. Root Causes
- Over-trading during the mid-day session range.
- Moving stop-losses during live trades due to anxiety.
- Revenge trading after a minor loss.

### 2. Preventive Actions
- **Hard Limit**: Maximum 3 trades per day.
- **Platform Lock**: Close terminal if Daily P&L drops below -$150.
- **Wait Rule**: Wait at least 30 minutes between trades to clear emotional bias.`
  }
];

const Notion = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [hoveredDocId, setHoveredDocId] = useState(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('📄');
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Link Modal States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIcon, setLinkIcon] = useState('📓');
  const [linkTagsInput, setLinkTagsInput] = useState('');

  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // DTG AI Chat States
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Auto-save timer reference
  const saveTimeoutRef = useRef(null);

  // Load document list
  const loadDocuments = async (autoSelect = false) => {
    try {
      setLoadingList(true);
      const list = await notionApi.list();
      setDocuments(list);
      
      if (autoSelect && list.length > 0 && !selectedDocId) {
        setSelectedDocId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load document list.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadDocuments(true);
  }, []);

  // Fetch document details when selected ID changes
  useEffect(() => {
    if (!selectedDocId) {
      setActiveDoc(null);
      return;
    }

    const fetchDoc = async () => {
      setLoadingDoc(true);
      setSaveStatus('saved');
      try {
        const doc = await notionApi.get(selectedDocId);
        setActiveDoc(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setIcon(doc.icon || '📄');
        setTags(doc.tags || []);
        setExternalUrl(doc.external_url || '');
        
        // Reset AI messages for new doc
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I am your **NVIDIA AI Co-Writer**. I can review this document (**"${doc.title}"**), help improve your writing, summarize points, or generate pre-market checklist structures. How can I help you refine this note?`
          }
        ]);
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to load active document.');
      } finally {
        setLoadingDoc(false);
      }
    };

    fetchDoc();
  }, [selectedDocId]);

  // Debounced auto-save handler
  const triggerAutoSave = useCallback((updatedTitle, updatedContent, updatedIcon, updatedTags, updatedExternalUrl) => {
    if (!selectedDocId) return;
    
    setSaveStatus('saving');
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updated = await notionApi.update(selectedDocId, {
          title: updatedTitle,
          content: updatedContent,
          icon: updatedIcon,
          tags: updatedTags,
          external_url: updatedExternalUrl
        });
        
        // Update document list tile in sidebar local state immediately
        setDocuments(prev => prev.map(doc => {
          if (doc.id === selectedDocId) {
            return {
              ...doc,
              title: updated.title,
              icon: updated.icon,
              tags: updated.tags,
              external_url: updated.external_url,
              updated_at: updated.updated_at
            };
          }
          return doc;
        }));
        
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1000); // 1-second debounce window
  }, [selectedDocId]);

  // Handle changes in editor fields
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, icon, tags, externalUrl);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, icon, tags, externalUrl);
  };

  const handleIconChange = (newIcon) => {
    setIcon(newIcon);
    triggerAutoSave(title, content, newIcon, tags, externalUrl);
  };

  const handleExternalUrlChange = (e) => {
    const val = e.target.value;
    setExternalUrl(val);
    triggerAutoSave(title, content, icon, tags, val);
  };

  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tag Management
  const handleAddTag = (e) => {
    if (e) e.preventDefault();
    const cleanTag = newTagInput.trim();
    if (!cleanTag || tags.includes(cleanTag)) return;
    
    const updatedTags = [...tags, cleanTag];
    setTags(updatedTags);
    setNewTagInput('');
    triggerAutoSave(title, content, icon, updatedTags, externalUrl);
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    triggerAutoSave(title, content, icon, updatedTags, externalUrl);
  };

  // Create document
  const handleCreateDocument = async (templateData = null) => {
    try {
      const initData = templateData || {
        title: 'Untitled Document',
        content: '',
        icon: '📄',
        tags: []
      };
      
      const newDoc = await notionApi.create(initData);
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDocId(newDoc.id);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to create new document.');
    }
  };

  const handleCreateLinkedPage = async (e) => {
    if (e) e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    
    const parsedTags = linkTagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      const newDoc = await notionApi.create({
        title: linkTitle,
        content: '',
        icon: linkIcon,
        tags: parsedTags,
        external_url: linkUrl
      });
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDocId(newDoc.id);
      
      // Reset Link Modal inputs
      setLinkTitle('');
      setLinkUrl('');
      setLinkIcon('📓');
      setLinkTagsInput('');
      setShowLinkModal(false);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to link Notion page.');
    }
  };

  // Delete document
  const handleDeleteDocument = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    
    try {
      await notionApi.delete(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setActiveDoc(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to delete document.');
    }
  };

  // Clean layout helper for markdown response
  const parseBoldText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatMessageContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line.trim();
      if (!content) return <div key={lineIdx} style={{ height: '8px' }} />;

      if (content.startsWith('### ')) {
        return (
          <h4 key={lineIdx} style={{ fontSize: '0.88rem', fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>
            {parseBoldText(content.slice(4))}
          </h4>
        );
      }
      if (content.startsWith('**') && content.endsWith('**') && content.length > 4) {
        return (
          <h5 key={lineIdx} style={{ fontSize: '0.82rem', fontWeight: 600, margin: '8px 0 4px 0', color: 'var(--text-secondary)' }}>
            {parseBoldText(content.slice(2, -2))}
          </h5>
        );
      }

      const isBulletList = content.startsWith('- ') || content.startsWith('* ');
      const isNumberedList = /^\d+\.\s/.test(content);

      if (isBulletList) {
        return (
          <li key={lineIdx} style={{ marginLeft: '12px', paddingLeft: '4px', fontSize: '0.78rem', lineHeight: '1.5', listStyleType: 'disc', margin: '4px 0' }}>
            {parseBoldText(content.substring(2))}
          </li>
        );
      }

      if (isNumberedList) {
        const match = content.match(/^(\d+\.)\s(.*)/);
        return (
          <div key={lineIdx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', lineHeight: '1.5', margin: '4px 0 4px 6px' }}>
            <strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', minWidth: '18px' }}>{match ? match[1] : ''}</strong>
            <span>{parseBoldText(match ? match[2] : content)}</span>
          </div>
        );
      }

      return (
        <p key={lineIdx} style={{ fontSize: '0.78rem', lineHeight: '1.5', margin: '6px 0' }}>
          {parseBoldText(content)}
        </p>
      );
    });
  };

  // AI Actions Trigger
  const handleAiAction = async (actionType) => {
    if (!selectedDocId || aiLoading) return;

    let aiPrompt = '';
    switch (actionType) {
      case 'summarize':
        aiPrompt = 'Generate a high-level summary of my notes below. Summarize key takeaways, strategies, and psychological commitments cleanly.';
        break;
      case 'checklist':
        aiPrompt = 'Design an actionable pre-market checklist or setup playbook rule checklist based on my document notes. Focus on rules to reduce risk.';
        break;
      case 'improve':
        aiPrompt = 'Improve the writing style of my document. Make the sentences professional, punchy, and grammatically perfect, structured in brief outline form.';
        break;
      default:
        return;
    }

    const userMsg = { role: 'user', content: aiPrompt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setAiLoading(true);

    try {
      const response = await notionApi.aiChat(selectedDocId, newMessages, content);
      setMessages(prev => [...prev, response]);
      
      // If action is summary/improve, give option to append to content
      if (actionType === 'summarize') {
        const formattedSummary = `\n\n---\n### AI Generated Summary\n${response.content.replace(/🤖 \*\*\[NVIDIA Llama-3.1-Nemotron-70B.*\]\*\*\n*/, '')}`;
        setContent(prev => {
          const newVal = prev + formattedSummary;
          triggerAutoSave(title, newVal, icon, tags);
          return newVal;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ **NVIDIA AI Connection Failure**\n\nCould not fetch co-writing suggestions. Verify that your server is active and `NVIDIA_API_KEY` is loaded in your settings.'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Chat send helper
  const handleSendAiMessage = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() || aiLoading || !selectedDocId) return;

    const userMsg = { role: 'user', content: aiInput };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await notionApi.aiChat(selectedDocId, updatedMessages, content);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to retrieve follow-up co-writing advice. Check server logs.'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Scroll to bottom of AI chat log
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Filter documents by search term
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            doc.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [documents, searchQuery]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr 380px',
      gap: 'var(--s4)',
      height: 'calc(100vh - 120px)',
      minHeight: '520px',
      alignItems: 'stretch'
    }}>
      {/* 1. LEFT COLUMN: Page Sidebar */}
      <div className="glass anim-fade-up delay-1" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: 'var(--s4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><FileText size={16} /></span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notion Pages</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => handleCreateDocument()}
              className="btn btn-secondary btn-sm"
              style={{
                width: '24px',
                height: '24px',
                padding: 0,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Create New Blank Document"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              className="btn btn-secondary btn-sm"
              style={{
                width: '24px',
                height: '24px',
                padding: 0,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Link External Notion Page"
            >
              <Link size={14} />
            </button>
          </div>
        </div>

        {/* Sidebar Search */}
        <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--r-sm)',
            padding: '2px 8px'
          }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search documents or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                outline: 'none',
                width: '100%',
                padding: '4px 0'
              }}
            />
          </div>
        </div>

        {/* Document List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s2) var(--s3)' }}>
          {loadingList ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', padding: 'var(--s2)' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '36px', borderRadius: '4px' }} />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div style={{ padding: 'var(--s8) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              No pages found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredDocuments.map(doc => {
                const isSelected = selectedDocId === doc.id;
                const isHovered = hoveredDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--r-sm)',
                      background: isSelected ? 'var(--accent-soft)' : (isHovered ? 'var(--bg-hover)' : 'transparent'),
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                      transition: 'all var(--t-fast)',
                      position: 'relative'
                    }}
                    className="notion-sidebar-row"
                    onMouseEnter={() => setHoveredDocId(doc.id)}
                    onMouseLeave={() => setHoveredDocId(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{doc.icon || '📄'}</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title}
                      </span>
                      {doc.external_url && (
                        <Link size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginLeft: '2px' }} />
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDeleteDocument(doc.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: isHovered ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px'
                      }}
                      className="delete-notion-btn"
                      title="Delete Page"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER COLUMN: Distraction-Free Work Editor */}
      <div className="glass anim-fade-up delay-2" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        position: 'relative'
      }}>
        {!selectedDocId ? (
          /* Editor Empty State: Choose Template */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--s8)',
            textAlign: 'center',
            background: 'var(--bg-primary)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              marginBottom: 'var(--s4)'
            }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Notion Document Workspace</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: '1.4', marginBottom: 'var(--s8)' }}>
              A clean space to write trade ideas, build playbooks, session reviews, or outline guidelines with direct NVIDIA AI writing support.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', width: '100%', maxWidth: '340px' }}>
              <button
                onClick={() => handleCreateDocument()}
                className="btn btn-primary"
                style={{ width: '100%', gap: '8px' }}
              >
                <Plus size={15} /> Create a Blank Page
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Or start with templates</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCreateDocument(tmpl)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{tmpl.icon}</span>
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>{tmpl.title}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Initialize playbook framework</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : loadingDoc ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            color: 'var(--text-muted)'
          }}>
            <RefreshCw size={24} className="spin-anim" />
          </div>
        ) : (
          /* Editor Main Body */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-primary)',
            overflow: 'hidden'
          }}>
            {/* Save Status & AI Quick Action chips */}
            <div style={{
              padding: '8px var(--s5)',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--s2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: saveStatus === 'saving' ? 'var(--accent)' : saveStatus === 'error' ? 'var(--loss)' : 'var(--profit)'
                }}>
                  {saveStatus === 'saving' && (
                    <>
                      <RefreshCw size={10} className="spin-anim" /> Saving changes...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <Check size={10} /> Saved to DB
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertCircle size={10} /> Auto-save failed
                    </>
                  )}
                </span>
              </div>

              {/* AI Quick Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => handleAiAction('improve')}
                  disabled={aiLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.62rem', height: '24px', padding: '2px 8px', gap: '4px', background: 'var(--bg-secondary)' }}
                  title="Rewrite the content professionally"
                >
                  <PenTool size={10} /> Improve Writing
                </button>
                <button
                  onClick={() => handleAiAction('checklist')}
                  disabled={aiLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.62rem', height: '24px', padding: '2px 8px', gap: '4px', background: 'var(--bg-secondary)' }}
                  title="Draft playbook rules outline"
                >
                  <List size={10} /> Draft Playbook
                </button>
                <button
                  onClick={() => handleAiAction('summarize')}
                  disabled={aiLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.62rem', height: '24px', padding: '2px 8px', gap: '4px' }}
                  title="Append document executive summary to notes"
                >
                  <Sparkles size={10} /> Summarize Note
                </button>
              </div>
            </div>

            {/* Document Header (Emoji, Title, Tags) */}
            <div style={{ padding: 'var(--s5) var(--s6) 0 var(--s6)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center' }}>
                {/* Emoji Select Dropdown */}
                <select
                  value={icon}
                  onChange={e => handleIconChange(e.target.value)}
                  style={{
                    fontSize: '1.4rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {EMOJIS.map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>

                {/* Title Input */}
                <input
                  type="text"
                  placeholder="Untitled Document"
                  value={title}
                  onChange={handleTitleChange}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    padding: '4px 0'
                  }}
                />
              </div>

              {/* Tags List */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', color: 'var(--text-muted)', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} />
                </span>

                {tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-mid)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.62rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 1px' }}
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Add Tag input form */}
                <form onSubmit={handleAddTag} style={{ display: 'inline' }}>
                  <input
                    type="text"
                    placeholder="+ Add Tag"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px dashed var(--border-strong)',
                      fontSize: '0.62rem',
                      color: 'var(--text-muted)',
                      outline: 'none',
                      width: '60px',
                      padding: '2px 0'
                    }}
                  />
                </form>
              </div>
            </div>

            {/* Document Content Textarea or External Notion Card */}
            {externalUrl ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* LOW PROFILE LINK BAR */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px var(--s5)', 
                  background: 'var(--bg-tertiary)', 
                  borderBottom: '1px solid var(--border)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }}>Notion Link:</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>{externalUrl}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(externalUrl)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '26px', padding: '0 8px', fontSize: '0.68rem', gap: '4px' }}
                    >
                      {copied ? <Check size={11} style={{ color: 'var(--profit)' }} /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </button>
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ height: '26px', padding: '0 8px', fontSize: '0.68rem', gap: '4px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={11} /> Open Notion
                    </a>
                  </div>
                </div>


                {/* Clean, Premium Placeholder for Linked Notion Page */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--s8)',
                  textAlign: 'center',
                  background: 'var(--bg-primary)'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    marginBottom: 'var(--s4)'
                  }}>
                    <ExternalLink size={20} />
                  </div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Linked to Notion</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.4' }}>
                    This document is synced with an external Notion resource. Use the buttons above to copy the link or open it in your browser.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, padding: 'var(--s4) var(--s6) var(--s6) var(--s6)', display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Start writing trade playbook guidelines, rules, session outlines... Use markdown for headers or checklists (e.g. # Header, - [ ] Item)"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    resize: 'none',
                    outline: 'none',
                    fontSize: '0.8rem',
                    lineHeight: '1.6',
                    color: 'var(--text-secondary)',
                    fontFamily: 'inherit',
                    width: '100%',
                    padding: '10px 0'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. RIGHT COLUMN: NVIDIA Llama AI Workspace Assistant */}
      <div className="glass anim-fade-up delay-3" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: 'var(--s3) var(--s4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Brain size={16} /></span>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>NVIDIA AI Co-Writer</span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Llama-3.1-Nemotron-70B-Instruct</span>
            </div>
          </div>
        </div>

        {/* Selected Document Chat Panel or Empty State */}
        {!selectedDocId ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--s8)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            gap: 'var(--s4)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-glass)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <Info size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Workspace Active</div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Select or create a document from the left sidebar to activate the NVIDIA Llama co-writer module.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Active Document Overview Card */}
            <div style={{
              padding: '10px var(--s4)',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.1rem' }}>{icon}</span>
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Active Document Context</span>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title}
                </strong>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: 'var(--s4)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s4)',
              background: 'var(--bg-primary)'
            }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="anim-fade-in"
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                    display: 'flex',
                    gap: '8px',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--r-sm)',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #a78bfa)' : 'var(--bg-elevated)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {msg.role === 'user' ? (
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#fff' }}>U</span>
                    ) : (
                      <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={10} /></span>
                    )}
                  </div>

                  {/* Msg Box */}
                  <div style={{
                    background: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                    border: '1px solid',
                    borderColor: msg.role === 'user' ? 'var(--border-accent)' : 'var(--border)',
                    borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    padding: '8px 12px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    boxShadow: 'var(--shadow-xs)',
                    lineHeight: '1.4'
                  }}>
                    {msg.role === 'user' ? msg.content : formatMessageContent(msg.content)}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {aiLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={10} /></span>
                  </div>
                  <div className="glass" style={{
                    borderRadius: '12px 12px 12px 0',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)'
                  }}>
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite' }} />
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.2s' }} />
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* AI Suggestion Prompts */}
            {messages.length === 1 && (
              <div style={{
                padding: 'var(--s2) var(--s4)',
                background: 'var(--bg-tertiary)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suggested requests</span>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  <button
                    onClick={() => {
                      setAiInput('Draft a professional trading checklist using these notes');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', padding: '2px 8px', background: 'var(--bg-secondary)', height: '24px' }}
                  >
                    Draft checklist
                  </button>
                  <button
                    onClick={() => {
                      setAiInput('Identify execution risks or logical gaps in this strategy outline');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', padding: '2px 8px', background: 'var(--bg-secondary)', height: '24px' }}
                  >
                    Find strategy risks
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendAiMessage} style={{
              padding: 'var(--s3) var(--s4)',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              gap: 'var(--s3)',
              alignItems: 'center'
            }}>
              <input
                type="text"
                className="input"
                placeholder={aiLoading ? "Co-writer is thinking..." : "Ask DTG AI to draft or review playbooks..."}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                disabled={aiLoading}
                style={{
                  flex: 1,
                  height: '32px',
                  fontSize: '0.75rem',
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-mid)'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={aiLoading || !aiInput.trim()}
                style={{
                  padding: '0 var(--s3)',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--r-md)'
                }}
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        )}
      </div>
      {/* Link Modal */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '420px',
            padding: 'var(--s6)',
            borderRadius: 'var(--r-lg)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Link External Notion Page</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateLinkedPage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Page Title</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Trading Strategy Wiki"
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  style={{ background: 'var(--bg-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Notion Page URL</label>
                <input
                  type="url"
                  className="input"
                  required
                  placeholder="e.g. https://notion.so/my-workspace/..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  style={{ background: 'var(--bg-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Icon</label>
                  <select
                    value={linkIcon}
                    onChange={e => setLinkIcon(e.target.value)}
                    className="input"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    {EMOJIS.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. strategy, wiki, setup"
                    value={linkTagsInput}
                    onChange={e => setLinkTagsInput(e.target.value)}
                    style={{ background: 'var(--bg-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'var(--s2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Link Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notion;
