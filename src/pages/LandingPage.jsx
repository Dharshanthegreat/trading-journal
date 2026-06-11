import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, TrendingUp, Shield, Clock, Globe, ArrowRight, 
  Lock, Activity, Layers, Server, Star, ChevronRight, 
  CheckCircle, MessageSquare, Menu, X, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════
   1. INTERACTIVE BACKGROUND (Cursor Particle Engine)
   ═══════════════════════════════════════════════════════ */
const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const particleCount = Math.min(60, Math.floor((width * height) / 25000));
    const mouse = { x: -1000, y: -1000, radius: 150 };

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;
        this.radius = Math.random() * 1.5 + 1;
        this.alpha = Math.random() * 0.4 + 0.1;
        this.color = Math.random() > 0.7 ? 'rgba(96, 165, 250, ' : 'rgba(251, 191, 36, ';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          this.x -= Math.cos(angle) * force * 0.6;
          this.y -= Math.sin(angle) * force * 0.6;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.alpha + ')';
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (130 - dist) / 130 * 0.08;
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />;
};

/* ═══════════════════════════════════════════════════════
   2. THREE.JS 4D WEBGL GLOBE (Morphing Dot-Matrix Globe)
   ═══════════════════════════════════════════════════════ */
const WebGL4DGlobe = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    
    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group to hold globe and rotate
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 4. Generate 4D Morphing Sphere coordinates
    const particleCount = 750;
    const radius = 62;
    const pointsGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const blueColor = new THREE.Color('#3b82f6');
    const goldColor = new THREE.Color('#fbbf24');
    const purpleColor = new THREE.Color('#a78bfa');

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci spiral sphere distribution
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Color mapping based on polar angle to look holographic
      const ratio = y / radius; // -1 to 1
      let c = blueColor;
      if (ratio > 0.4) c = goldColor;
      else if (ratio < -0.4) c = purpleColor;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom points material
    const pointsMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    const globePoints = new THREE.Points(pointsGeom, pointsMat);
    globeGroup.add(globePoints);

    // 5. Orbital HUD Rings
    const ringGeom1 = new THREE.RingGeometry(radius + 10, radius + 10.5, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.1 });
    const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    globeGroup.add(ring1);

    const ringGeom2 = new THREE.RingGeometry(radius + 18, radius + 18.3, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.08 });
    const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    globeGroup.add(ring2);

    // 6. Live Trade Arcs (Quadratic Bezier paths)
    const activeArcs = [];
    const maxArcs = 4;

    const createBezierArc = () => {
      // Pick random initial index coords
      const startIdx = Math.floor(Math.random() * particleCount);
      let endIdx = Math.floor(Math.random() * particleCount);
      while (startIdx === endIdx) endIdx = Math.floor(Math.random() * particleCount);

      const pStart = new THREE.Vector3(
        initialPositions[startIdx * 3],
        initialPositions[startIdx * 3 + 1],
        initialPositions[startIdx * 3 + 2]
      );

      const pEnd = new THREE.Vector3(
        initialPositions[endIdx * 3],
        initialPositions[endIdx * 3 + 1],
        initialPositions[endIdx * 3 + 2]
      );

      // Interpolate control point outward to form 3D arc
      const pMid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
      const length = pStart.distanceTo(pEnd);
      pMid.normalize().multiplyScalar(radius + length * 0.45); // push control point outward

      const curve = new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);
      const points = curve.getPoints(32);
      const geom = new THREE.BufferGeometry().setFromPoints(points);

      const isBlue = Math.random() > 0.5;
      const mat = new THREE.LineBasicMaterial({
        color: isBlue ? 0x60a5fa : 0xfbbf24,
        transparent: true,
        opacity: 0.22,
      });

      const arcLine = new THREE.Line(geom, mat);
      globeGroup.add(arcLine);

      // Glowing pulse sphere traveling along arc
      const pulseGeom = new THREE.SphereGeometry(1.2, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: isBlue ? 0x60a5fa : 0xfbbf24,
        transparent: true,
        opacity: 0.95
      });
      const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
      globeGroup.add(pulseMesh);

      return {
        line: arcLine,
        pulse: pulseMesh,
        curve,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012
      };
    };

    for (let i = 0; i < maxArcs; i++) {
      activeArcs.push(createBezierArc());
    }

    // 7. Mouse lerp variables for smooth camera rotate
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      // Normalized coords -0.5 to 0.5
      mouse.targetX = ((e.clientX - rect.left) / width) - 0.5;
      mouse.targetY = ((e.clientY - rect.top) / height) - 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // 8. Animation loop
    let clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slow Y rotation
      globeGroup.rotation.y = elapsed * 0.08;
      globeGroup.rotation.x = 0.25; // fixed base tilt

      // Lerp camera target rotations
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 120;
      camera.position.y = -mouse.y * 120 + 20;
      camera.lookAt(scene.position);

      // ── 4D Coordinate Morphing ──
      // Warps point-cloud coordinates over a 4th dimension (simulated via elapsed time sine wave)
      const posAttr = pointsGeom.attributes.position;
      const positionsArr = posAttr.array;
      const morphTime = elapsed * 1.5;

      for (let i = 0; i < particleCount; i++) {
        const xInit = initialPositions[i * 3];
        const yInit = initialPositions[i * 3 + 1];
        const zInit = initialPositions[i * 3 + 2];

        // 4D math breathing warp factor unique to each node
        const wFactor = Math.sin(morphTime + i * 0.065) * 3.8;
        
        // Offset coordinates outward/inward along normal vector
        positionsArr[i * 3] = xInit + (xInit / radius) * wFactor;
        positionsArr[i * 3 + 1] = yInit + (yInit / radius) * wFactor;
        positionsArr[i * 3 + 2] = zInit + (zInit / radius) * wFactor;
      }
      posAttr.needsUpdate = true;

      // Update active trade arcs progress
      activeArcs.forEach((arc, idx) => {
        arc.progress += arc.speed;

        if (arc.progress >= 1) {
          // Dispose resources and recreate
          globeGroup.remove(arc.line);
          globeGroup.remove(arc.pulse);
          arc.line.geometry.dispose();
          arc.line.material.dispose();
          arc.pulse.geometry.dispose();
          arc.pulse.material.dispose();

          activeArcs[idx] = createBezierArc();
          return;
        }

        // Get coordinates along bezier path and update pulse sphere mesh
        const point = arc.curve.getPointAt(arc.progress);
        arc.pulse.position.copy(point);
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup resources to prevent memory leaks
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose active arcs
      activeArcs.forEach(arc => {
        globeGroup.remove(arc.line);
        globeGroup.remove(arc.pulse);
        arc.line.geometry.dispose();
        arc.line.material.dispose();
        arc.pulse.geometry.dispose();
        arc.pulse.material.dispose();
      });

      // Dispose globe meshes
      globeGroup.remove(globePoints);
      pointsGeom.dispose();
      pointsMat.dispose();

      globeGroup.remove(ring1);
      ringGeom1.dispose();
      ringMat1.dispose();

      globeGroup.remove(ring2);
      ringGeom2.dispose();
      ringMat2.dispose();

      scene.remove(globeGroup);
      renderer.dispose();
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', aspectRatio: '1/1', display: 'block' }} />;
};

/* ═══════════════════════════════════════════════════════
   3. THREE.JS 3D PARALLAX CHART (3D Candlestick Engine)
   ═══════════════════════════════════════════════════════ */
const WebGLHolographicChart = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = 280;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 5, 120);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const chartGroup = new THREE.Group();
    scene.add(chartGroup);

    // 4. Generate 3D Candlestick data points
    const candleCount = 22;
    const spacing = 4.8;
    const meshCandles = [];

    let currentPrice = 12;

    const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.8 });
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4b5563, transparent: true, opacity: 0.4 });

    const generateCandles = () => {
      for (let i = 0; i < candleCount; i++) {
        const change = (Math.random() - 0.48) * 8;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * 3;
        const low = Math.min(open, close) - Math.random() * 3;

        const colorType = close >= open ? 'blue' : 'gold';
        const activeMat = colorType === 'blue' ? blueMat : goldMat;

        // X coordinate centering candles around zero axis
        const x = (i - candleCount / 2) * spacing;

        // Wick 3D Cylinder geometry
        const wickHeight = high - low;
        const wickGeom = new THREE.CylinderGeometry(0.1, 0.1, wickHeight, 4);
        const wickMesh = new THREE.Mesh(wickGeom, activeMat);
        // Position wick at median point
        wickMesh.position.set(x, (high + low) / 2, 0);
        chartGroup.add(wickMesh);

        // Body 3D Box geometry
        const bodyHeight = Math.max(0.6, Math.abs(close - open));
        const bodyGeom = new THREE.BoxGeometry(2.2, bodyHeight, 2.2);
        const bodyMesh = new THREE.Mesh(bodyGeom, activeMat);
        bodyMesh.position.set(x, (open + close) / 2, 0);
        chartGroup.add(bodyMesh);

        meshCandles.push({
          open, close, high, low, x,
          wick: wickMesh,
          body: bodyMesh,
          material: activeMat,
          colorType
        });

        currentPrice = close;
      }
    };

    generateCandles();

    // 5. Draw neon tubes for Moving Averages (MA)
    const maPoints = [];
    const maPoints2 = [];

    meshCandles.forEach((c, idx) => {
      // Basic smooth average computations
      const start = Math.max(0, idx - 4);
      const avg = meshCandles.slice(start, idx + 1).reduce((acc, val) => acc + val.close, 0) / (idx - start + 1);
      
      maPoints.push(new THREE.Vector3(c.x, avg, 2.5));
      maPoints2.push(new THREE.Vector3(c.x, avg - 2, -2.5));
    });

    const maCurve = new THREE.CatmullRomCurve3(maPoints);
    const maGeom = new THREE.TubeGeometry(maCurve, 64, 0.35, 8, false);
    const maMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 });
    const maTube = new THREE.Mesh(maGeom, maMat);
    chartGroup.add(maTube);

    const maCurve2 = new THREE.CatmullRomCurve3(maPoints2);
    const maGeom2 = new THREE.TubeGeometry(maCurve2, 64, 0.25, 8, false);
    const maMat2 = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6 });
    const maTube2 = new THREE.Mesh(maGeom2, maMat2);
    chartGroup.add(maTube2);

    // 6. Draw 3D coordinate grid plane
    const gridHelper = new THREE.GridHelper(spacing * candleCount + 10, 16, 0x4b5563, 0x1f2937);
    gridHelper.position.y = -18;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    chartGroup.add(gridHelper);

    // 7. Parallax logic (Mouse movements tilt perspective)
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.targetX = ((e.clientX - rect.left) / width) - 0.5;
      mouse.targetY = ((e.clientY - rect.top) / height) - 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // 8. Animation loop
    let animationFrameId;

    const animate = () => {
      // Interpolate rotation targets for heavy inertial sway
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Slight 3D perspective rotation tilt
      chartGroup.rotation.y = mouse.x * 0.6;
      chartGroup.rotation.x = -mouse.y * 0.4 + 0.05;

      // Minor real-time oscillation to MA tube to show active flow
      const elapsed = Date.now() * 0.002;
      maTube.scale.y = 1 + Math.sin(elapsed) * 0.012;
      maTube2.scale.y = 1 + Math.cos(elapsed) * 0.015;

      // Live tick fluctuate on last candle
      const last = meshCandles[meshCandles.length - 1];
      const tick = (Math.random() - 0.5) * 0.55;
      last.close = Math.max(last.low + 0.5, Math.min(last.high - 0.5, last.close + tick));
      
      const newHeight = Math.max(0.6, Math.abs(last.close - last.open));
      last.body.scale.y = newHeight / Math.max(0.6, Math.abs(last.close - last.open));
      last.body.position.y = (last.open + last.close) / 2;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose tube MAs
      chartGroup.remove(maTube);
      maGeom.dispose();
      maMat.dispose();

      chartGroup.remove(maTube2);
      maGeom2.dispose();
      maMat2.dispose();

      // Dispose candles
      meshCandles.forEach(c => {
        chartGroup.remove(c.wick);
        c.wick.geometry.dispose();
        
        chartGroup.remove(c.body);
        c.body.geometry.dispose();
      });

      blueMat.dispose();
      goldMat.dispose();
      lineMat.dispose();

      chartGroup.remove(gridHelper);
      gridHelper.geometry.dispose();
      gridHelper.material.dispose();

      scene.remove(chartGroup);
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '280px', display: 'block' }} />;
};

/* ═══════════════════════════════════════════════════════
   4. MAIN FUTURISTIC LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Success reviews index carousel
  const [reviewIdx, setReviewIdx] = useState(0);

  const reviews = [
    {
      name: "Marcus Sterling",
      account: "$200,000 Prop Challenge",
      text: "This platform's MT5 integration is incredibly smooth. I synced my challenge account in seconds, and the real-time analytics helped me optimize my risk parameters. Passed phase 2 inside 9 days!",
      stars: 5,
      avatar: "MS",
    },
    {
      name: "Aisha Vance",
      account: "Live Account ($50k Deposit)",
      text: "The low spreads are legitimate. Trading spreads on majors are frequently at zero, and my first two payouts were processed and settled in less than 4 hours. Absolute game changer.",
      stars: 5,
      avatar: "AV",
    },
    {
      name: "Kenji Sato",
      account: "$100,000 Prop Account",
      text: "I was skeptical about web connection speeds, but the direct API linkage mirrors my trades instantly. Best-in-class risk parameters dashboard. Apple-level execution on the UI.",
      stars: 5,
      avatar: "KS",
    },
  ];

  const handleCtaClick = () => {
    if (user) {
      navigate('/mt5-connect');
    } else {
      navigate('/settings'); // Redirect to login/signup settings component
    }
  };

  return (
    <div className="lp-body">
      {/* ── Visual Backdrop ─────────────────────────── */}
      <div className="lp-grid-bg" />
      <div className="lp-scanline" />

      {/* Radial lighting gradients */}
      <div className="lp-glow-radial" style={{ top: '-150px', left: '10%', width: '500px', height: '500px', background: 'rgba(59, 130, 246, 0.12)' }} />
      <div className="lp-glow-radial" style={{ top: '30%', right: '5%', width: '600px', height: '600px', background: 'rgba(251, 191, 36, 0.08)' }} />
      <div className="lp-glow-radial" style={{ bottom: '10%', left: '5%', width: '550px', height: '550px', background: 'rgba(192, 132, 252, 0.07)' }} />

      {/* Cursor interactive particle canvas */}
      <InteractiveBackground />

      {/* ── NAVIGATION ──────────────────────────────── */}
      <nav className="lp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-icon">
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>Trading Journal</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="lp-nav-desktop-links">
          <a href="#features" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 500 }}>Features</a>
          <a href="#statistics" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 500 }}>Statistics</a>
          <a href="#reviews" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 500 }}>Reviews</a>
          {user ? (
            <Link to="/" className="lp-btn-neon-blue" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.75rem' }}>
              Launch Dashboard <ArrowUpRight size={14} />
            </Link>
          ) : (
            <Link to="/settings" className="lp-btn-neon-blue" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '0.75rem' }}>
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'none' }}
          className="lp-nav-mobile-btn"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div 
            className="lp-glass" 
            style={{
              position: 'absolute', top: '80px', left: '20px', right: '20px',
              padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
              zIndex: 200, border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.9rem', color: '#fff', textDecoration: 'none' }}>Features</a>
            <a href="#statistics" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.9rem', color: '#fff', textDecoration: 'none' }}>Statistics</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '0.9rem', color: '#fff', textDecoration: 'none' }}>Reviews</a>
            <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
            {user ? (
              <Link to="/" className="lp-btn-neon-blue" style={{ width: '100%', justifyContent: 'center' }}>
                Launch Dashboard <ArrowUpRight size={14} />
              </Link>
            ) : (
              <Link to="/settings" className="lp-btn-neon-blue" style={{ width: '100%', justifyContent: 'center' }}>
                Sign In
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Style overrides to force responsive navbar display */}
      <style>{`
        @media (max-width: 768px) {
          .lp-nav-desktop-links { display: none !important; }
          .lp-nav-mobile-btn { display: block !important; }
        }
      `}</style>

      {/* ── HERO SECTION ───────────────────────────── */}
      <section className="lp-section-padding" style={{ paddingTop: '160px', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          
          {/* Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '0.72rem', fontWeight: 600, color: '#60a5fa',
              letterSpacing: '0.5px', alignSelf: 'flex-start'
            }}>
              <Server size={12} /> DUAL-CORE INTEGRATION PROTOCOL
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 800,
              letterSpacing: '-1px', lineHeight: 1.15, margin: 0,
              color: '#ffffff'
            }}>
              Trade Smarter.<br />
              <span className="lp-text-gradient-blue-gold">Scale Faster.</span>
            </h1>

            <p style={{
              fontSize: '1rem', color: 'rgba(156, 163, 175, 0.8)',
              lineHeight: 1.6, margin: 0, maxWidth: '480px'
            }}>
              Access Prop Firm Challenges and Real Trading Accounts with instant mirror execution and advanced performance analytics via direct MT5 integration.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button onClick={handleCtaClick} className="lp-btn-neon-blue">
                Start Challenge <ArrowRight size={16} />
              </button>
              <button onClick={handleCtaClick} className="lp-btn-neon-gold">
                Open Real Account
              </button>
            </div>

            {/* Trust Badges */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#60a5fa" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>Secured Assets</span>
                  <span style={{ fontSize: '0.58rem', color: 'rgba(156, 163, 175, 0.6)' }}>AES-256 Protocol</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#fbbf24" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>Instant Payouts</span>
                  <span style={{ fontSize: '0.58rem', color: 'rgba(156, 163, 175, 0.6)' }}>Within 4 Hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Globe & Hologram Overlay Column */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <WebGL4DGlobe />

            {/* Floating Glassmorphic Dashboard Card */}
            <div 
              className="lp-glass lp-float-anim lp-glow-border"
              style={{
                position: 'absolute',
                bottom: '10%',
                left: '-5%',
                width: '240px',
                padding: '20px',
                zIndex: 10,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={14} color="#60a5fa" />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.8)' }}>MT5 HOLOGRAPH</span>
                </div>
                <span className="badge badge-profit" style={{ padding: '2px 6px', fontSize: '0.55rem' }}>STABLE</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(156, 163, 175, 0.6)' }}>EST. CONNECTION LATENCY</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#fff' }}>1.2 ms</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(156, 163, 175, 0.6)' }}>LIVE VOLUME INDEX</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#60a5fa' }}>$421,902,401 / SEC</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(156, 163, 175, 0.6)' }}>ACTIVE PROFILES</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#fbbf24' }}>14,921 CONNECTED</div>
                </div>
              </div>
            </div>

            {/* Second Floating elements */}
            <div 
              className="lp-glass lp-float-anim-reverse lp-glow-border"
              style={{
                position: 'absolute',
                top: '15%',
                right: '0%',
                width: '180px',
                padding: '16px',
                zIndex: 10,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CheckCircle size={12} color="#fbbf24" />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>FUNDING VERIFIED</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono' }}>
                $10M+
              </div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(156, 163, 175, 0.6)' }}>
                DISBURSED THIS MONTH
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────── */}
      <section id="features" className="lp-section-padding" style={{ position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          {/* Section title */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px' }}>ENGINEered ADVANTAGE</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.8px', margin: '10px 0 0', color: '#fff' }}>
              Advanced Features for Modern Traders
            </h2>
            <p style={{ color: 'rgba(156, 163, 175, 0.6)', fontSize: '0.88rem', maxWidth: '500px', margin: '12px auto 0', lineHeight: 1.6 }}>
              Unrivaled trade mirroring tech coupled with high-impact capital access and deep institutional pricing models.
            </p>
          </div>

          {/* Interactive Chart Showcase block */}
          <div className="lp-glass lp-glow-border" style={{ padding: '32px', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>WebGL Holographic Chart</h3>
                <span style={{ fontSize: '0.68rem', color: 'rgba(156, 163, 175, 0.6)' }}>Real-time 3D parallax rendering of candlesticks and technical averages</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="badge badge-profit" style={{ padding: '4px 10px', fontSize: '0.6rem' }}>EUR/USD LIVE FEED</span>
                <span className="badge badge-loss" style={{ padding: '4px 10px', fontSize: '0.6rem' }}>ECN CORE SPREADS</span>
              </div>
            </div>
            
            {/* 3D Candlestick Feed */}
            <WebGLHolographicChart />
          </div>

          {/* Grid of features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            
            {/* Feature 1 */}
            <div className="lp-glass lp-feature-card lp-glow-border">
              <div className="lp-feature-icon">
                <Globe size={22} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>MT5 Platform Integration</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.7)', lineHeight: 1.6 }}>
                Link your MetaTrader 5 broker credentials securely via standard TLS 1.3 encryption for automated performance tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="lp-glass lp-feature-card lp-glow-border">
              <div className="lp-feature-icon gold">
                <Zap size={22} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Instant Funding Options</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.7)', lineHeight: 1.6 }}>
                Pass prop challenges and instantly scale accounts up to $200,000 in funded capital. Take your trading to the professional level.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="lp-glass lp-feature-card lp-glow-border">
              <div className="lp-feature-icon">
                <Clock size={22} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Fast Payouts</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.7)', lineHeight: 1.6 }}>
                Request payouts and receive payouts within a 4-hour window directly to your cryptocurrency wallet or bank account.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="lp-glass lp-feature-card lp-glow-border">
              <div className="lp-feature-icon gold">
                <Layers size={22} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Low Spreads</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.7)', lineHeight: 1.6 }}>
                Access raw ECN market feeds. Spreads frequently touch 0.0 pips on major currency pairs, indexes, and commodities.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="lp-glass lp-feature-card lp-glow-border">
              <div className="lp-feature-icon">
                <MessageSquare size={22} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>24/7 Support</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.7)', lineHeight: 1.6 }}>
                Our global technical desk is online 24/7. Open a ticket or contact our support team in real time for immediate assistance.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATISTICS SECTION ──────────────────────── */}
      <section id="statistics" className="lp-section-padding" style={{ position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          {/* Statistics grid */}
          <div className="lp-glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', padding: '48px', border: '1px solid rgba(255,255,255,0.06)' }}>
            
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }} className="lp-stat-box">
              <div className="lp-trust-stat lp-text-gradient-blue-gold">48,291+</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.6)', fontWeight: 600 }}>VERIFIED FUNDED TRADERS</div>
            </div>

            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }} className="lp-stat-box">
              <div className="lp-trust-stat">$142,910,240+</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.6)', fontWeight: 600 }}>TOTAL DISBURSED PAYOUTS</div>
            </div>

            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }} className="lp-stat-box">
              <div className="lp-trust-stat lp-text-gradient-blue-gold">84.6%</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.6)', fontWeight: 600 }}>CHALLENGE PASS EXPECTANCY</div>
            </div>

            <div style={{ textAlign: 'center' }} className="lp-stat-box">
              <div className="lp-trust-stat">1.2ms</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(156, 163, 175, 0.6)', fontWeight: 600 }}>AVERAGE ROUTER LATENCY</div>
            </div>

          </div>
        </div>
      </section>

      {/* Style overrides for statistics borders on small screens */}
      <style>{`
        @media (max-width: 768px) {
          .lp-stat-box { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; }
          .lp-stat-box:last-child { border-bottom: none !important; padding-bottom: 0; }
        }
      `}</style>

      {/* ── TRUST & REVIEWS SECTION ─────────────────── */}
      <section id="reviews" className="lp-section-padding" style={{ position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '2px' }}>PROVEN RESULTS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.8px', margin: '10px 0 0', color: '#fff' }}>
              What Successful Traders Say
            </h2>
          </div>

          {/* Testimonial slider card */}
          <div className="lp-glass lp-glow-border" style={{ padding: '40px', position: 'relative', minHeight: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #60a5fa, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                {reviews[reviewIdx].avatar}
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>{reviews[reviewIdx].name}</h4>
                <span style={{ fontSize: '0.68rem', color: 'rgba(251, 191, 36, 0.8)', fontWeight: 600 }}>{reviews[reviewIdx].account}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px' }}>
                {Array.from({ length: reviews[reviewIdx].stars }).map((_, i) => (
                  <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 28px' }}>
              "{reviews[reviewIdx].text}"
            </p>

            {/* Slider controls */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {reviews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setReviewIdx(idx)}
                  style={{
                    width: '32px', height: '6px', borderRadius: '3px',
                    background: reviewIdx === idx ? '#60a5fa' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s ease'
                  }}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* CTA Footer Block */}
          <div className="lp-glass" style={{ marginTop: '80px', padding: '48px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.15)', background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(10,12,22,0.6) 100%)' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Ready to Scale Your Trading?</h3>
            <p style={{ color: 'rgba(156, 163, 175, 0.7)', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.6 }}>
              Join thousands of funded traders leveraging our high-performance technical dashboard to log, analyze, and scale their trading accounts.
            </p>
            <button onClick={handleCtaClick} className="lp-btn-neon-blue">
              Start Challenges & Live Trading <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="lp-glass" style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(3, 4, 8, 0.95)', padding: '60px 40px 40px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div className="logo-icon" style={{ width: '28px', height: '28px' }}>
                  <Activity size={15} color="#fff" />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Trading Journal</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(156, 163, 175, 0.5)', lineHeight: 1.6 }}>
                Advanced technical journal software and direct brokerage integration frameworks for capital challenges.
              </p>
            </div>

            <div>
              <h5 style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Platform Links</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.72rem' }}>
                <a href="#features" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Integration Details</a>
                <a href="#statistics" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Funded Tiers</a>
                <a href="#reviews" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Success Stories</a>
              </div>
            </div>

            <div>
              <h5 style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Contact Information</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.72rem', color: 'rgba(156, 163, 175, 0.7)' }}>
                <span>Desk: support@tradingjournal.io</span>
                <span>Location: Global Connectivity ECN nodes</span>
                <span>Available: 24/7 technical desk</span>
              </div>
            </div>

            <div>
              <h5 style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Legal & Rules</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.72rem' }}>
                <a href="#terms" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Terms & Conditions</a>
                <a href="#privacy" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Privacy Policy</a>
                <a href="#disclaimer" style={{ color: 'rgba(156, 163, 175, 0.7)', textDecoration: 'none' }}>Risk Disclaimers</a>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.65rem', color: 'rgba(156, 163, 175, 0.4)' }}>
            <span>© {new Date().getFullYear()} Trading Journal. MetaTrader 5 is a trademark of MetaQuotes Ltd.</span>
            <span>All trade connection servers are simulated or mirrored via protected APIs.</span>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
