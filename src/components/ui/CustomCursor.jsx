import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Position initial cursor far offscreen
    gsap.set([dot, ring], { x: -100, y: -100 });

    const handleMouseMove = (e) => {
      // Show cursor on first movement inside page
      if (!visible) setVisible(true);

      // Animate inner dot positioning wrapper instantly
      gsap.to(dot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0,
        overwrite: 'auto'
      });

      // Animate outer ring positioning wrapper with a premium fluid lag
      gsap.to(ring, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    const handleMouseOver = (e) => {
      // Check if target is an interactive element
      const interactiveEl = e.target.closest('a, button, input, textarea, select, [role="button"], .btn, .hero-btn, .clickable');
      if (interactiveEl) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
      gsap.killTweensOf([dot, ring]);
    };
  }, [visible]);

  return (
    <>
      <div 
        ref={dotRef} 
        className="custom-cursor-dot-wrapper" 
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
      >
        <div className={`custom-cursor-dot-inner ${hovered ? 'hovered' : ''}`} />
      </div>

      <div 
        ref={ringRef} 
        className="custom-cursor-ring-wrapper" 
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
      >
        <div className={`custom-cursor-ring-inner ${hovered ? 'hovered' : ''}`} />
      </div>
    </>
  );
};

export default CustomCursor;
