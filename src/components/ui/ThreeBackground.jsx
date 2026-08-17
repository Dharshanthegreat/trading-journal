import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, and Renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Parent group for smooth rotation & mouse parallax
    const parentGroup = new THREE.Group();
    scene.add(parentGroup);

    // 3. Primary Crimson Red Wireframe Torus Knot Mesh
    const torusGeo = new THREE.TorusKnotGeometry(8, 2.5, 140, 32, 2, 3);
    const wireframeRedMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Cyberpunk crimson red
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const torusRedMesh = new THREE.Mesh(torusGeo, wireframeRedMat);
    parentGroup.add(torusRedMesh);

    // 4. Secondary Cyan/Neon Blue Accent Wireframe Overlay
    const wireframeCyanMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan electric blue
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const torusCyanMesh = new THREE.Mesh(torusGeo, wireframeCyanMat);
    torusCyanMesh.scale.set(1.03, 1.03, 1.03);
    torusCyanMesh.rotation.y = Math.PI / 8;
    parentGroup.add(torusCyanMesh);

    // 5. Floating Dust Particles in 3D Space
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 65;
      particlePositions[i + 1] = (Math.random() - 0.5) * 65;
      particlePositions[i + 2] = (Math.random() - 0.5) * 45;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.28,
      transparent: true,
      opacity: 0.45,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    parentGroup.add(particlePoints);

    // 6. Interactive Mouse Parallax
    let targetX = 0;
    let targetY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.0007;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.0007;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Window Resize Handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 8. Continuous Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth continuous multi-axis rotation
      torusRedMesh.rotation.x += 0.0022;
      torusRedMesh.rotation.y += 0.0035;
      torusRedMesh.rotation.z += 0.0012;

      torusCyanMesh.rotation.x += 0.0026;
      torusCyanMesh.rotation.y += 0.0031;

      particlePoints.rotation.y += 0.0006;

      // Mouse Parallax Easing
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      parentGroup.rotation.y = targetX * 1.4;
      parentGroup.rotation.x = -targetY * 1.4;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resource Cleanup on Unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      torusGeo.dispose();
      wireframeRedMat.dispose();
      wireframeCyanMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, rgba(18, 12, 28, 0.45) 0%, rgba(8, 9, 13, 0.96) 100%)',
      }}
    />
  );
};

export default ThreeBackground;
