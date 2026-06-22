import React, { useState, useEffect, useRef, useMemo } from 'react';
import { stoic as stoicApi } from '../services/api';
import {
  Shield, Brain, Sparkles, Send, Cpu, Trash2, Info, RefreshCw,
  Eye, Check, List, HelpCircle, ArrowRight, BookOpen, Clock
} from 'lucide-react';

const Stoic = () => {
  // Quotes
  const [quotes, setQuotes] = useState([]);
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);

  // Dichotomy of Control Journal
  const [situation, setSituation] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pastReframes, setPastReframes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // DTG Stoic AI Chat
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Error handling
  const [error, setError] = useState(null);

  // Fetch quotes and history on mount
  useEffect(() => {
    const init = async () => {
      try {
        setError(null);
        setLoadingHistory(true);
        
        const qList = await stoicApi.getQuotes();
        setQuotes(qList);
        // Set a random quote initially
        if (qList.length > 0) {
          setActiveQuoteIdx(Math.floor(Math.random() * qList.length));
        }

        const history = await stoicApi.getReframes();
        setPastReframes(history);

        // Initial welcome message
        setMessages([
          {
            role: 'assistant',
            content: `Welcome to the **Stoic Mindset Sanctuary**. I am your **Stoic Trading Mentor** powered by **NVIDIA Llama-3.1-Nemotron-70B**.\n\nHere we apply the wisdom of Marcus Aurelius, Seneca, and Epictetus to trading discipline. How are you feeling today? Share your trading frustrations, or ask for guidance on dealing with drawdowns, fear, or revenge trading.`
          }
        ]);
      } catch (err) {
        console.error(err);
        setError('Failed to load Stoic resources. Please make sure the server is active.');
      } finally {
        setLoadingHistory(false);
      }
    };

    init();
  }, []);

  // Cycle Quote
  const handleNextQuote = () => {
    if (quotes.length > 0) {
      setActiveQuoteIdx((prev) => (prev + 1) % quotes.length);
    }
  };

  // Dichotomy Analyzer Action
  const handleAnalyzeSituation = async (e) => {
    if (e) e.preventDefault();
    const cleanSituation = situation.trim();
    if (!cleanSituation || analyzing) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Step 1: Call NVIDIA AI to split into Control vs Out of Control
      const result = await stoicApi.analyzeSituation(cleanSituation);
      
      // Step 2: Save to Database
      const saved = await stoicApi.createReframe({
        situation: cleanSituation,
        in_control: result.in_control || 'N/A',
        out_of_control: result.out_of_control || 'N/A',
        stoic_reframe: result.stoic_reframe || 'N/A'
      });

      // Step 3: Prepend to history state
      setPastReframes((prev) => [saved, ...prev]);
      setSituation('');
    } catch (err) {
      console.error(err);
      setError('AI Reframing failed. Verify your server connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Delete History Reframe
  const handleDeleteReframe = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Delete this reframe entry from your mindset diary?')) return;

    try {
      await stoicApi.deleteReframe(id);
      setPastReframes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete reframe.');
    }
  };

  // Stoic AI Mentor Chat Send
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: aiInput };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await stoicApi.chat(updatedMessages);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ **NVIDIA AI Stoic Channel Interrupted**\n\nFailed to retrieve Stoic counsel. Check server logs and environment variables.'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Scroll bottom of AI chat log
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Clean Markdown formatter
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

  const activeQuote = quotes[activeQuoteIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', height: 'calc(100vh - 120px)', minHeight: '520px' }}>
      
      {/* 1. TOP HERO: Stoic Quote Card */}
      {activeQuote && (
        <div className="glass anim-fade-up delay-1" style={{
          padding: 'var(--s4) var(--s6)',
          borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 'var(--s5)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                color: 'var(--accent)',
                fontSize: '0.58rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'var(--accent-soft)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                Stoic Axiom of the day
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>— {activeQuote.author}</span>
            </div>
            <p style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              fontStyle: 'italic',
              margin: '0 0 6px 0'
            }}>
              “{activeQuote.quote}”
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ color: 'var(--accent)' }}><Sparkles size={11} /></span>
              <strong>Trading Reframe:</strong> {activeQuote.translation}
            </p>
          </div>
          <button
            onClick={handleNextQuote}
            className="btn btn-secondary"
            style={{
              padding: '8px var(--s3)',
              fontSize: '0.7rem',
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px'
            }}
          >
            <RefreshCw size={11} /> Cycle Quote
          </button>
        </div>
      )}

      {/* 2. BOTTOM MAIN: Two-Column Dashboard */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1.2fr 380px',
        gap: 'var(--s4)',
        alignItems: 'stretch',
        overflow: 'hidden'
      }}>
        {/* LEFT PANEL: Dichotomy Control Journal */}
        <div className="glass anim-fade-up delay-2" style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)'
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--s4)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)'
          }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Shield size={16} /></span>
            <div>
              <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Dichotomy of Control Journal</h2>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Separate what is in your power from what is not to cultivate calm</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            
            {/* Situation Input Form */}
            <div style={{
              padding: 'var(--s4)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)'
            }}>
              <form onSubmit={handleAnalyzeSituation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    What frustrating trading event just happened?
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="e.g. I got stopped out early because of a spread spike, and then the price immediately went to hit what would have been my profit target."
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-mid)',
                      fontSize: '0.78rem',
                      lineHeight: '1.4'
                    }}
                    disabled={analyzing}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={analyzing || !situation.trim()}
                    style={{ gap: '6px', padding: '6px var(--s4)', fontSize: '0.72rem', height: '30px' }}
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw size={11} className="spin-anim" /> Reframing Mindset...
                      </>
                    ) : (
                      <>
                        <Brain size={11} /> Analyze Control
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '10px var(--s4)',
                background: 'rgba(248, 113, 113, 0.08)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                borderRadius: 'var(--r-md)',
                color: 'var(--loss)',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Info size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Past Reframings Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '4px'
              }}>
                Mindset Diary & dichotomy logs
              </div>

              {loadingHistory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--r-md)' }} />
                  ))}
                </div>
              ) : pastReframes.length === 0 ? (
                <div style={{
                  padding: 'var(--s8) 0',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}>
                  No reframing logs saved yet. Submit a situation above to begin your Stoic analysis.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  {pastReframes.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: 'var(--s4)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--s3)',
                        position: 'relative'
                      }}
                      className="stoic-history-card"
                    >
                      <button
                        onClick={(e) => handleDeleteReframe(item.id, e)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="delete-reframe-btn"
                        title="Delete Entry"
                      >
                        <Trash2 size={12} />
                      </button>

                      {/* Situation */}
                      <div>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Frustrating Event</span>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, margin: '2px 0 0 0', paddingRight: '20px' }}>
                          {item.situation}
                        </p>
                      </div>

                      {/* Dichotomy Split Columns */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.12)', padding: 'var(--s3)', borderRadius: 'var(--r-sm)' }}>
                          <span style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>In Your Control</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {formatMessageContent(item.in_control)}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(248, 113, 113, 0.04)', border: '1px solid rgba(248, 113, 113, 0.12)', padding: 'var(--s3)', borderRadius: 'var(--r-sm)' }}>
                          <span style={{ fontSize: '0.55rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Out of Your Control</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {formatMessageContent(item.out_of_control)}
                          </div>
                        </div>
                      </div>

                      {/* Stoic Reframe Guidance */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s3)' }}>
                        <span style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <Brain size={10} /> Stoic Guidance
                        </span>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4', margin: 0 }}>
                          {item.stoic_reframe}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: Stoic Mentor AI Chat */}
        <div className="glass anim-fade-up delay-3" style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)'
        }}>
          {/* Header */}
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
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>NVIDIA Stoic Mentor</span>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Llama-3.1-Nemotron-70B-Instruct</span>
              </div>
            </div>
          </div>

          {/* Chat Messages Log */}
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

                {/* Msg Content Box */}
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

            {/* AI Typing Indicator */}
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

          {/* Quick Prompt Chips */}
          {messages.length === 1 && (
            <div style={{
              padding: 'var(--s2) var(--s4)',
              background: 'var(--bg-tertiary)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suggested queries</span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  onClick={() => setAiInput('I am in a severe drawdown and feel anxious')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', padding: '2px 8px', background: 'var(--bg-secondary)', height: '24px' }}
                >
                  Drawdown relief
                </button>
                <button
                  onClick={() => setAiInput('I just revenge traded. How can I regain emotional calm?')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', padding: '2px 8px', background: 'var(--bg-secondary)', height: '24px' }}
                >
                  Handle revenge trading
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSendMessage} style={{
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
              placeholder={aiLoading ? "Sage is reflecting..." : "Discuss greed, fear, or rules with Seneca..."}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
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
      </div>

    </div>
  );
};

export default Stoic;
