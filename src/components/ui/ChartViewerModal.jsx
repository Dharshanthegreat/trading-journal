import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ZoomIn, ZoomOut, RotateCcw, Maximize2,
  Download, ChevronLeft, ChevronRight
} from 'lucide-react';

export const ChartViewerModal = ({
  images = [],
  initialIndex = 0,
  onClose,
  symbol = '',
  tradeType = ''
}) => {
  const imageList = Array.isArray(images) ? images : (images ? [images] : []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const currentUrl = imageList[currentIndex] || '';

  // Reset zoom & pan when image changes
  const resetView = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [currentIndex, resetView]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft') {
        if (imageList.length > 1) {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
        }
      } else if (e.key === 'ArrowRight') {
        if (imageList.length > 1) {
          setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((prev) => Math.min(+(prev + 0.25).toFixed(2), 4));
      } else if (e.key === '-') {
        setZoomLevel((prev) => {
          const next = Math.max(+(prev - 0.25).toFixed(2), 0.75);
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === 'r' || e.key === 'R' || e.key === '0') {
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageList.length, onClose, resetView]);

  // Non-passive Wheel zoom event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoomLevel((prev) => {
        const next = Math.min(Math.max(+(prev + delta).toFixed(2), 0.75), 4);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Zoom control handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(+(prev + 0.25).toFixed(2), 4));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(+(prev - 0.25).toFixed(2), 0.75);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const toggle1to1 = () => {
    if (zoomLevel === 2) {
      resetView();
    } else {
      setZoomLevel(2);
    }
  };

  // Drag / Pan handling
  const handleMouseDown = (e) => {
    if (e.button !== 0 || zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Download image
  const handleDownload = () => {
    if (!currentUrl) return;
    const a = document.createElement('a');
    a.href = currentUrl;
    a.download = `${symbol || 'chart'}_trade_screenshot_${currentIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!currentUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 11, 0.96)',
          backdropFilter: 'blur(16px)',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          overflow: 'hidden'
        }}
        onClick={onClose}
      >
        {/* Top Floating Bar */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          style={{
            height: 60,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 18, 26, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title & Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {tradeType && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: tradeType.toLowerCase() === 'long' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                  color: tradeType.toLowerCase() === 'long' ? '#34d399' : '#f87171',
                  border: `1px solid ${tradeType.toLowerCase() === 'long' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`
                }}
              >
                {tradeType}
              </span>
            )}
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f3f4f6', fontFamily: 'JetBrains Mono, sans-serif' }}>
              {symbol ? `${symbol} Chart View` : 'Trade Chart Screenshot'}
            </span>
            {imageList.length > 1 && (
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#9ca3af', fontWeight: 600 }}>
                {currentIndex + 1} / {imageList.length}
              </span>
            )}
          </div>

          {/* Center Toolbar (Zoom & View controls) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 10px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              title="Zoom Out (-)"
              style={{
                background: 'transparent',
                border: 'none',
                color: zoomLevel <= 0.75 ? '#4b5563' : '#d1d5db',
                padding: '6px',
                borderRadius: '50%',
                cursor: zoomLevel <= 0.75 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomOut size={16} />
            </button>

            <span
              onClick={resetView}
              title="Click to reset zoom (100%)"
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#60a5fa',
                minWidth: 46,
                textAlign: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              title="Zoom In (+)"
              style={{
                background: 'transparent',
                border: 'none',
                color: zoomLevel >= 4 ? '#4b5563' : '#d1d5db',
                padding: '6px',
                borderRadius: '50%',
                cursor: zoomLevel >= 4 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomIn size={16} />
            </button>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <button
              onClick={resetView}
              title="Reset View (R)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#d1d5db',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={toggle1to1}
              title={zoomLevel === 2 ? "Fit to Screen" : "200% Original Resolution"}
              style={{
                background: zoomLevel === 2 ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                border: 'none',
                color: zoomLevel === 2 ? '#60a5fa' : '#d1d5db',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={15} />
            </button>
          </div>

          {/* Right Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDownload}
              title="Download image"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e5e7eb',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={14} /> Save
            </button>

            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>

        {/* Main Interactive Image Area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            backgroundImage: `
              radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 48px 48px, 48px 48px',
            backgroundColor: '#07090e'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={toggle1to1}
        >
          {/* Previous / Next Arrow Controls */}
          {imageList.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1))}
                style={{
                  position: 'absolute',
                  left: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 20, 30, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={() => setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0))}
                style={{
                  position: 'absolute',
                  right: 24,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 20, 30, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease'
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* High Definition Rendered Image Container */}
          <div
            key={currentIndex}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '92vw',
              maxHeight: '82vh',
              willChange: 'transform'
            }}
          >
            <img
              src={currentUrl}
              alt="Trading Chart Screenshot"
              draggable={false}
              style={{
                maxWidth: '92vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                imageRendering: 'high-quality',
                WebkitFontSmoothing: 'antialiased',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* Hint Overlay at bottom when zoom = 1 */}
          {zoomLevel === 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: imageList.length > 1 ? 80 : 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                padding: '6px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.7rem',
                color: '#9ca3af',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Scroll / Click + to zoom</span>
              <span>•</span>
              <span>Double-click for 200%</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChartViewerModal;
