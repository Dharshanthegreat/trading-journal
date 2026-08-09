import React from 'react';

/**
 * Clean legacy robot prefix tags like 🤖 **[AI Weekly Analysis Fallback]**
 */
const cleanRawText = (text) => {
  if (!text) return '';
  return text
    .replace(/^🤖\s*\*\*\[.*?\]\*\*\s*/gi, '')
    .replace(/^🤖\s*\[.*?\]\s*/gi, '')
    .trim();
};

/**
 * Parse inline markdown tokens: **bold**, +$100, -$50
 */
const parseInline = (text) => {
  if (!text) return null;

  // Split by ** delimiters
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);

      // Positive PnL badge
      if (/^\+?\$[\d,]+(\.\d{2})?$/.test(boldContent) && !boldContent.includes('-')) {
        return (
          <strong key={index} style={{ color: 'var(--profit)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {boldContent}
          </strong>
        );
      }
      // Negative PnL badge
      if (/^-\$[\d,]+(\.\d{2})?$/.test(boldContent)) {
        return (
          <strong key={index} style={{ color: 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {boldContent}
          </strong>
        );
      }

      return (
        <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {boldContent}
        </strong>
      );
    }

    return part;
  });
};

/**
 * High-performance, rich AI Text / Markdown Formatter component
 */
export const FormattedAiText = ({ text, style = {} }) => {
  if (!text) return null;

  const cleaned = cleanRawText(text);
  const lines = cleaned.split('\n');

  const blocks = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'list', items: [...currentList] });
      currentList = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Bullet points (- or * )
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2).trim();
      currentList.push(itemText);
    } else {
      flushList();

      // Heading (### Heading or **Title**:)
      if (trimmed.startsWith('### ')) {
        blocks.push({ type: 'heading', text: trimmed.slice(4).trim() });
      } else if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
        const headerText = trimmed.replace(/\*/g, '').replace(/:$/, '').trim();
        blocks.push({ type: 'section-title', text: headerText });
      } else {
        blocks.push({ type: 'paragraph', text: trimmed });
      }
    }
  });
  flushList();

  return (
    <div
      className="formatted-ai-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '0.84rem',
        lineHeight: 1.65,
        color: 'var(--text-secondary)',
        ...style
      }}
    >
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div
              key={idx}
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                marginTop: idx > 0 ? '6px' : 0,
                marginBottom: '2px'
              }}
            >
              {parseInline(block.text)}
            </div>
          );
        }

        if (block.type === 'section-title') {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginTop: idx > 0 ? '8px' : 0,
                paddingBottom: '4px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <span>{parseInline(block.text)}</span>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingLeft: '2px',
                margin: '2px 0'
              }}
            >
              {block.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    lineHeight: 1.55
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: '7px',
                      flexShrink: 0,
                      opacity: 0.8
                    }}
                  />
                  <div style={{ flex: 1 }}>{parseInline(item)}</div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={idx} style={{ margin: 0 }}>
            {parseInline(block.text)}
          </div>
        );
      })}
    </div>
  );
};

export default FormattedAiText;
