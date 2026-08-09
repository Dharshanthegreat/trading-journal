import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Sparkles, Tag } from 'lucide-react';

const DEFAULT_SETUPS = ['FVG', 'SMT', 'OB', 'BB', 'IRL-ERL', 'ERL-IRL'];

export const CustomSetupInput = ({
  value = '',
  onChange,
  options = DEFAULT_SETUPS,
  placeholder = 'e.g. OB, FVG, or type custom...',
  label = 'Setup / Strategy'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (opt) => {
    onChange(opt);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div className="form-field" style={{ position: 'relative' }} ref={containerRef}>
      {label && <label className="form-label">{label}</label>}

      {/* Input container with chevron toggle */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          style={{ paddingRight: 32 }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            position: 'absolute',
            right: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {/* Quick Select Preset Pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '8px'
        }}
      >
        {options.map((opt) => {
          const isSelected = value.trim().toLowerCase() === opt.toLowerCase();
          return (
            <motion.button
              key={opt}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectOption(opt)}
              style={{
                fontSize: '0.68rem',
                fontWeight: isSelected ? 700 : 600,
                padding: '3px 9px',
                borderRadius: '6px',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-mid)',
                background: isSelected ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              {isSelected && <Check size={11} />}
              {opt}
            </motion.button>
          );
        })}
      </div>

      {/* Custom Glassmorphic Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'rgba(15, 19, 28, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              overflow: 'hidden',
              padding: '6px'
            }}
          >
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '6px 8px 4px 8px', letterSpacing: '0.04em' }}>
              Standard Setups
            </div>

            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = value.trim().toLowerCase() === opt.toLowerCase();
                  return (
                    <div
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        background: isSelected ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag size={13} style={{ opacity: 0.6 }} />
                        {opt}
                      </span>
                      {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Custom setup: "<strong style={{ color: 'var(--text-primary)' }}>{value}</strong>"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSetupInput;
