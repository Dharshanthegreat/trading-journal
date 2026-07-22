import React, { useState, useEffect, useRef, useMemo } from 'react';
import { stoic as stoicApi } from '../services/api';
import {
  Shield, Brain, Sparkles, Send, Cpu, Trash2, Info, RefreshCw,
  Eye, Check, List, HelpCircle, ArrowRight, BookOpen, Clock
} from 'lucide-react';

const DEFAULT_STOIC_QUOTES = [
  // Marcus Aurelius
  { id: 1, author: 'Marcus Aurelius', quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.', translation: 'You cannot control the market trend, but you have 100% control over your entry rules, lot sizing, and exit discipline.' },
  { id: 2, author: 'Marcus Aurelius', quote: 'The impediment to action advances action. What stands in the way becomes the way.', translation: 'A stop-out is not a failure; it provides crucial market structure data to refine your next setup.' },
  { id: 3, author: 'Marcus Aurelius', quote: 'Waste no more time arguing about what a good man should be. Be one.', translation: 'Stop searching for magic indicators. Focus on executing your pre-market playbook with absolute discipline.' },
  { id: 4, author: 'Marcus Aurelius', quote: 'The happiness of your life depends upon the quality of your thoughts.', translation: 'Replace panic and FOMO with rational risk calculations. Calm thinking yields consistent performance.' },
  { id: 5, author: 'Marcus Aurelius', quote: 'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.', translation: 'Ignore Twitter and Discord trade calls. Base your decisions strictly on your validated edge.' },
  { id: 6, author: 'Marcus Aurelius', quote: 'Accept the things to which fate binds you, and love the people with whom fate brings you together.', translation: 'Accept the risk of a trade before taking it. Once entered, let your stop-loss and take-profit run undisturbed.' },
  { id: 7, author: 'Marcus Aurelius', quote: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.', translation: 'Profitability does not require complex algorithms. Simplicity and risk control are all you need.' },
  { id: 8, author: 'Marcus Aurelius', quote: 'When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy.', translation: 'Approach each trading day with gratitude and patience, not desperate urgency to recover past losses.' },
  { id: 9, author: 'Marcus Aurelius', quote: 'The best revenge is to be unlike him who performed the injury.', translation: 'Never revenge trade after a loss. Walk away from the terminal to protect your remaining capital.' },
  { id: 10, author: 'Marcus Aurelius', quote: 'Reject your sense of injury and the injury itself disappears.', translation: 'A loss is just a business expense. Disconnect your self-worth from individual trade outcomes.' },
  { id: 11, author: 'Marcus Aurelius', quote: 'If it is not right do not do it; if it is not true do not say it.', translation: 'If a setup does not meet 100% of your criteria, do not click buy or sell.' },
  { id: 12, author: 'Marcus Aurelius', quote: 'Loss is nothing else but change, and change is Nature’s delight.', translation: 'Market volatility is natural. Adapt to shifting trends rather than fighting price direction.' },
  { id: 13, author: 'Marcus Aurelius', quote: 'Look back over the past, with its changing empires that rose and fell, and you can foresee the future, too.', translation: 'Historical chart patterns repeat because human psychology remains unchanged. Trust backtested statistics.' },
  { id: 14, author: 'Marcus Aurelius', quote: 'Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason.', translation: 'Do not fear potential drawdowns. Your risk management rules will keep your account safe.' },
  { id: 15, author: 'Marcus Aurelius', quote: 'Because a thing seems difficult for you, do not think it impossible for any man to accomplish.', translation: 'Professional risk mastery is achievable with consistent habit building and daily trade logging.' },

  // Seneca
  { id: 16, author: 'Seneca', quote: 'We suffer more often in imagination than in reality.', translation: 'Stop catastrophizing missed setups or temporary floating drawdowns. Focus on reality.' },
  { id: 17, author: 'Seneca', quote: 'No man is more unhappy than he who never faces adversity, for he is not permitted to prove himself.', translation: 'Facing drawdowns with discipline builds the mental fortitude required for long-term trading mastery.' },
  { id: 18, author: 'Seneca', quote: 'Difficulties strengthen the mind, as labor does the body.', translation: 'Overcoming bad streaks by following your rules builds true trader resilience.' },
  { id: 19, author: 'Seneca', quote: 'If a man knows not to which port he sails, no wind is favorable.', translation: 'Define your target risk-to-reward ratio and daily stop limits before entering any trade.' },
  { id: 20, author: 'Seneca', quote: 'True happiness is to enjoy the present, without anxious dependence upon the future.', translation: 'Focus on executing today\'s setup correctly, rather than obsessing over monthly account projections.' },
  { id: 21, author: 'Seneca', quote: 'Associate with people who are likely to improve you.', translation: 'Surround yourself with disciplined traders who value risk management over flashy gain screenshots.' },
  { id: 22, author: 'Seneca', quote: 'He who is brave is free.', translation: 'Courage in trading means pulling the trigger on valid setups without fear, and cutting losses without hesitation.' },
  { id: 23, author: 'Seneca', quote: 'Luck is what happens when preparation meets opportunity.', translation: 'Winning trades are not luck; they are the result of pre-market prep meeting clean price action.' },
  { id: 24, author: 'Seneca', quote: 'It is the power of the mind to be unconquerable.', translation: 'No market crash or spread spike can break your psychological calm if your risk size is small.' },
  { id: 25, author: 'Seneca', quote: 'He suffers more than is necessary, who suffers before it is necessary.', translation: 'Do not stress about a trade while it is active. Let it touch stop loss or take profit automatically.' },
  { id: 26, author: 'Seneca', quote: 'While we wait for life, life passes.', translation: 'Stop waiting for ideal market conditions. Execute valid setups systematically when rules align.' },
  { id: 27, author: 'Seneca', quote: 'Most powerful is he who has himself in his own power.', translation: 'Self-mastery is the ultimate trading edge. Controlling your own actions matters more than predicting price.' },
  { id: 28, author: 'Seneca', quote: 'Begin at once to live, and count each separate day as a separate life.', translation: 'Treat every trading day as a fresh start. Yesterday\'s win or loss has zero bearing on today\'s execution.' },
  { id: 29, author: 'Seneca', quote: 'To be everywhere is to be nowhere.', translation: 'Focus on 1 or 2 core currency pairs or indices. Over-scanning multiple markets dilutes your edge.' },
  { id: 30, author: 'Seneca', quote: 'Silence is a lesson learned through the many sufferings of life.', translation: 'Sit quietly on your hands during low-volume or choppy market sessions.' },

  // Epictetus
  { id: 31, author: 'Epictetus', quote: 'It\'s not what happens to you, but how you react to it that matters.', translation: 'A stop-out is neutral; your emotional reaction to it determines whether you stay profitable.' },
  { id: 32, author: 'Epictetus', quote: 'Wealth consists not in having great possessions, but in having few wants.', translation: 'Wanting fewer trades leads to higher quality setups and fewer unnecessary losses.' },
  { id: 33, author: 'Epictetus', quote: 'First say to yourself what you would be; and then do what you have to do.', translation: 'Decide to be a disciplined professional, then strictly obey your risk rules every day.' },
  { id: 34, author: 'Epictetus', quote: 'Control your passions lest they take vengeance on you.', translation: 'Uncontrolled anger or greed leads to over-leveraging and account liquidation.' },
  { id: 35, author: 'Epictetus', quote: 'No man is free who is not master of himself.', translation: 'You are only truly profitable when you govern your own actions rather than reacting impulsively to charts.' },
  { id: 36, author: 'Epictetus', quote: 'The key is to keep company only with people who uplift you.', translation: 'Share your trading journey with accountable peers who push you toward rule adherence.' },
  { id: 37, author: 'Epictetus', quote: 'If you want to improve, be content to be thought foolish and stupid.', translation: 'Do not care if others laugh at your conservative risk size or early exits. Long-term survival is what counts.' },
  { id: 38, author: 'Epictetus', quote: 'Circumstances do not make the man, they only reveal him to himself.', translation: 'High-volatility news events reveal whether you possess real discipline or just luck.' },
  { id: 39, author: 'Epictetus', quote: 'It is impossible for a man to learn what he thinks he already knows.', translation: 'Remain humble. Always study your trade logs to uncover hidden execution leaks.' },
  { id: 40, author: 'Epictetus', quote: 'Only the educated are free.', translation: 'Deep knowledge of your specific market edge grants you freedom from trading anxiety.' },
  { id: 41, author: 'Epictetus', quote: 'Make the best use of what is in your power, and take the rest as it happens.', translation: 'Manage your risk per trade, then let market probability unfold without interference.' },
  { id: 42, author: 'Epictetus', quote: 'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.', translation: 'Celebrate small, disciplined wins instead of regretting missed profit targets.' },
  { id: 43, author: 'Epictetus', quote: 'Any person capable of angering you becomes your master.', translation: 'If a stop-out makes you angry, you let the market master you. Lower your lot size.' },
  { id: 44, author: 'Epictetus', quote: 'Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.', translation: 'Disregard news noise and random wicks. Focus entirely on risk control.' },
  { id: 45, author: 'Epictetus', quote: 'Know, first, who you are; and then adorn yourself accordingly.', translation: 'Understand your personality type (scalper, swing, day trader) and trade a strategy that fits your nature.' },

  // Zeno & others
  { id: 46, author: 'Zeno of Citium', quote: 'Man conquers the world by conquering himself.', translation: 'Mastering your impulses is the single requirement for sustainable trading success.' },
  { id: 47, author: 'Zeno of Citium', quote: 'Steel your sensibilities, so that life shall hurt you as little as possible.', translation: 'Build mental immunity to drawdowns by keeping risk to 1% or less per trade.' },
  { id: 48, author: 'Zeno of Citium', quote: 'Well-being is attained by little and little, and yet is no little thing.', translation: 'Compound small, consistent gains daily to build monumental trading capital over time.' },
  { id: 49, author: 'Chrysippus', quote: 'The wise man lacks nothing, and yet needs everything; the fool needs nothing, and yet lacks everything.', translation: 'Experienced traders value process over outcome; novice traders gamble for quick cash.' },
  { id: 50, author: 'Musonius Rufus', quote: 'If you accomplish something good with hard work, the labor passes quickly, but the good endures.', translation: 'The effort spent backtesting and journaling daily pays compounding dividends for your career.' },
  { id: 51, author: 'Zeno of Citium', quote: 'We have two ears and one mouth so that we can listen twice as much as we speak.', translation: 'Listen to what price action is showing you, rather than telling the market where it should go.' }
];

const Stoic = () => {
  // Quotes
  const [quotes, setQuotes] = useState(DEFAULT_STOIC_QUOTES);
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);

  // Dichotomy of Control Journal
  const [situation, setSituation] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pastReframes, setPastReframes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);

  // Helper to sync local storage permanently
  const getStoredReframes = () => {
    try {
      const stored = localStorage.getItem('tz_stoic_reframes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveStoredReframes = (list) => {
    try {
      localStorage.setItem('tz_stoic_reframes', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch quotes and history on mount
  useEffect(() => {
    const init = async () => {
      try {
        setError(null);
        setLoadingHistory(true);
        
        let qList = [];
        try {
          qList = await stoicApi.getQuotes();
        } catch (e) {}

        const finalQuotes = (qList && qList.length > 0) ? qList : DEFAULT_STOIC_QUOTES;
        setQuotes(finalQuotes);
        setActiveQuoteIdx(Math.floor(Math.random() * finalQuotes.length));

        let remoteReframes = [];
        try {
          remoteReframes = await stoicApi.getReframes();
        } catch (e) {}

        const localReframes = getStoredReframes();
        const combinedMap = new Map();
        [...(remoteReframes || []), ...localReframes].forEach(item => {
          if (item && item.id) combinedMap.set(item.id, item);
        });
        const finalReframes = Array.from(combinedMap.values()).sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

        setPastReframes(finalReframes);
        saveStoredReframes(finalReframes);
      } catch (err) {
        console.error(err);
        const fallback = getStoredReframes();
        setPastReframes(fallback);
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
      let result = { in_control: '', out_of_control: '', stoic_reframe: '' };
      try {
        result = await stoicApi.analyzeSituation(cleanSituation);
      } catch (err) {
        result = {
          in_control: '- Following pre-market entry rules\n- Your risk management settings (e.g. 1% risk size)\n- Your emotional response to the loss (avoiding revenge trading)\n- Closing the terminal to take a break',
          out_of_control: '- The exact path the price takes after your entry\n- Institutional news spikes or spread widening\n- Quick slippage near your stop loss\n- The behaviors of other market participants',
          stoic_reframe: '“Accept the things to which fate binds you...” — Marcus Aurelius. A stop-out is simply data, not a personal insult. Focus on executing your rules.'
        };
      }

      let saved = null;
      try {
        saved = await stoicApi.createReframe({
          situation: cleanSituation,
          in_control: result.in_control || 'N/A',
          out_of_control: result.out_of_control || 'N/A',
          stoic_reframe: result.stoic_reframe || 'N/A'
        });
      } catch (err) {
        saved = {
          id: Date.now(),
          situation: cleanSituation,
          in_control: result.in_control || 'N/A',
          out_of_control: result.out_of_control || 'N/A',
          stoic_reframe: result.stoic_reframe || 'N/A',
          created_at: new Date().toISOString()
        };
      }

      setPastReframes((prev) => {
        const nextList = [saved, ...prev.filter(item => item.id !== saved.id)];
        saveStoredReframes(nextList);
        return nextList;
      });
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
      stoicApi.deleteReframe(id).catch(() => {});
      setPastReframes((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        saveStoredReframes(updated);
        return updated;
      });
    } catch (err) {
      console.error(err);
      setError('Failed to delete reframe.');
    }
  };

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

      {/* 2. BOTTOM MAIN: Full-Width Dichotomy Journal */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--s4)',
        alignItems: 'stretch',
        overflow: 'hidden'
      }}>
        {/* Dichotomy Control Journal */}
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
      </div>

    </div>
  );
};

export default Stoic;
