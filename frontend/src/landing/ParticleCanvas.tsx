/**
 * ParticleCanvas – WebGL-powered particle system using Three.js
 * Handles: particle birth, emblem assembly, India map, AI scatter.
 * Runs entirely off the main thread via requestAnimationFrame.
 */
import React, { useEffect, useRef, memo } from "react";
import * as THREE from "three";
import type { LandingPhase } from "./useCinematicSequence";

interface Props {
  phase: LandingPhase;
  phaseProgress: number;
  mouseX: number;
  mouseY: number;
}

// ─── Ashoka Chakra spokes (24) + outer ring ───────────────────────────────────
function generateEmblemPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const layer = Math.floor(t * 4);
    let x = 0, y = 0, z = 0;
    if (layer === 0) {
      // Outer ring
      const angle = t * Math.PI * 2 * 24;
      const r = 1.6 + Math.sin(angle * 24) * 0.04;
      x = Math.cos(t * Math.PI * 2) * r;
      y = Math.sin(t * Math.PI * 2) * r;
    } else if (layer === 1) {
      // Spokes
      const spoke = Math.floor(t * 4 * 24);
      const spokeAngle = (spoke / 24) * Math.PI * 2;
      const dist = (t * 4 - Math.floor(t * 4)) * 1.5;
      x = Math.cos(spokeAngle) * dist;
      y = Math.sin(spokeAngle) * dist;
    } else if (layer === 2) {
      // Inner ring
      const r2 = 0.35;
      x = Math.cos(t * Math.PI * 2 * 3) * r2;
      y = Math.sin(t * Math.PI * 2 * 3) * r2;
    } else {
      // Lion silhouette approximation (top arc)
      const angle = (t * 4 - 3) * Math.PI - Math.PI / 2;
      x = Math.cos(angle) * 0.55 * (1 + Math.abs(Math.sin(angle * 3)) * 0.2);
      y = 1.2 + Math.sin(angle) * 0.4;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.01;
  }
  return positions;
}

// ─── Simplified India outline (lat/lng approximation mapped to -1..1) ─────────
function generateIndiaMapPoints(count: number): Float32Array {
  // Key border points of India (normalized, approximate)
  const keyPoints = [
    [0.1, 0.9], [0.35, 0.95], [0.6, 0.85], [0.75, 0.7], [0.8, 0.5],
    [0.75, 0.3], [0.65, 0.1], [0.5, -0.1], [0.3, -0.3], [0.1, -0.2],
    [-0.05, 0.05], [-0.2, 0.25], [-0.15, 0.5], [-0.1, 0.7], [0.1, 0.9],
  ];
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = (i / count) * (keyPoints.length - 1);
    const idx = Math.floor(t);
    const frac = t - idx;
    const a = keyPoints[Math.min(idx, keyPoints.length - 1)];
    const b = keyPoints[Math.min(idx + 1, keyPoints.length - 1)];
    const nx = a[0] + (b[0] - a[0]) * frac + (Math.random() - 0.5) * 0.05;
    const ny = a[1] + (b[1] - a[1]) * frac + (Math.random() - 0.5) * 0.05;
    positions[i * 3] = nx * 2.2;
    positions[i * 3 + 1] = ny * 2.2;
    positions[i * 3 + 2] = 0;
    // Interior fill points
    if (i % 3 === 0) {
      positions[i * 3] = (Math.random() - 0.3) * 2.2;
      positions[i * 3 + 1] = (Math.random() - 0.2) * 3.5;
    }
  }
  return positions;
}

// ─── Random scatter (initial state) ──────────────────────────────────────────
function generateScatterPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const PARTICLE_COUNT = 4000;

const ParticleCanvas: React.FC<Props> = memo(({ phase, phaseProgress, mouseX, mouseY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const scatterRef = useRef<Float32Array | null>(null);
  const emblemRef = useRef<Float32Array | null>(null);
  const mapRef = useRef<Float32Array | null>(null);
  const frameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  // Extra: per-particle size offset for glow/trail effect
  const sizeOffsetRef = useRef<Float32Array | null>(null);

  // ─── Init Three.js ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.z = 6;
    cameraRef.current = camera;

    // Pre-generate target positions
    const scatter = generateScatterPoints(PARTICLE_COUNT);
    const emblem = generateEmblemPoints(PARTICLE_COUNT);
    const map = generateIndiaMapPoints(PARTICLE_COUNT);
    scatterRef.current = scatter;
    emblemRef.current = emblem;
    mapRef.current = map;

    // Start from scatter
    const current = new Float32Array(scatter);
    currentPositionsRef.current = current;

    // Per-particle random size offset for organic glow variation
    const sizeOffsets = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sizeOffsets[i] = Math.random() * Math.PI * 2; // phase offset
    }
    sizeOffsetRef.current = sizeOffsets;

    // Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(current, 3));

    // Colors
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors[i * 3] = 0.84;
      colors[i * 3 + 1] = 0.65;
      colors[i * 3 + 2] = 0.12;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Sizes — vary per particle for depth illusion
    const sizes = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sizes[i] = 0.018 + Math.random() * 0.022; // 0.018–0.04 range
    }
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    particlesRef.current = points;

    // Resize handler
    const onResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // ─── Keep live refs for phase/progress/mouse (avoids stale closure) ──────
  const phaseRef = useRef(phase);
  const phaseProgressRef = useRef(phaseProgress);
  const mouseXRef = useRef(mouseX);
  const mouseYRef = useRef(mouseY);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { phaseProgressRef.current = phaseProgress; }, [phaseProgress]);
  useEffect(() => { mouseXRef.current = mouseX; }, [mouseX]);
  useEffect(() => { mouseYRef.current = mouseY; }, [mouseY]);

  // ─── Animate each frame ────────────────────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const particles = particlesRef.current;
    if (!renderer || !scene || !camera || !particles) return;

    const material = particles.material as THREE.PointsMaterial;
    const geometry = particles.geometry;
    const posAttr  = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const sizeAttr  = geometry.getAttribute("size") as THREE.BufferAttribute;
    const current  = currentPositionsRef.current!;
    const sizeOff  = sizeOffsetRef.current!;

    // Slow cinematic dolly target values
    let dollyCamZ  = 6;   // current interpolated camera Z
    let dollyAngle = 0;   // for slight orbital yaw

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();

      const animPhase    = phaseRef.current;
      const animProgress = phaseProgressRef.current;
      const mx = mouseXRef.current;
      const my = mouseYRef.current;

      // ── Cinematic camera ──────────────────────────────────────────────────
      // Slow dolly: pull back slightly during title, zoom in on transition
      const targetCamZ =
        animPhase === "gov_reveal"       ? 7.5 :
        animPhase === "ministry_reveal"  ? 7.0 :
        animPhase === "emblem_assembly"  ? 6.2 :
        animPhase === "flag_sweep"       ? 6.0 :
        animPhase === "india_map"        ? 5.5 :
        animPhase === "network_lines"    ? 5.8 :
        animPhase === "ai_scan"          ? 5.4 :
        animPhase === "title_reveal"     ? 6.5 :
        animPhase === "portal_transition"? 6.5 - animProgress * 3.5 :
        6.0;

      dollyCamZ += (targetCamZ - dollyCamZ) * 0.025; // smooth lerp

      // Very slow orbital yaw for depth
      dollyAngle += 0.0004;

      // Mouse parallax + orbital yaw combined
      const targetCamX = mx * 0.7 + Math.sin(dollyAngle) * 0.15;
      const targetCamY = -my * 0.45 + Math.sin(dollyAngle * 0.7) * 0.08;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.position.z += (dollyCamZ  - camera.position.z) * 0.04;
      camera.lookAt(scene.position);

      // ── Target positions per phase ───────────────────────────────────────
      let target: Float32Array | null = null;
      let targetOpacity = 1;

      switch (animPhase) {
        case "idle":
          target = scatterRef.current; targetOpacity = 0; break;
        case "particle_birth":
          target = scatterRef.current; targetOpacity = animProgress * 0.85; break;
        case "gov_reveal":
          // Particles slowly drift — loosely held scatter, low opacity background
          target = scatterRef.current; targetOpacity = 0.35; break;
        case "ministry_reveal":
          // Start pulling toward emblem
          target = emblemRef.current; targetOpacity = 0.4; break;
        case "emblem_assembly":
          target = emblemRef.current; targetOpacity = 1.0; break;
        case "flag_sweep":
          target = emblemRef.current; targetOpacity = 0.9; break;
        case "india_map":
        case "network_lines":
          target = mapRef.current; targetOpacity = 1.0; break;
        case "ai_scan":
          target = mapRef.current; targetOpacity = 0.95; break;
        case "title_reveal":
          target = emblemRef.current; targetOpacity = 0.65; break;
        case "portal_transition":
          target = emblemRef.current;
          targetOpacity = Math.max(0, 1 - animProgress * 1.6); break;
        case "complete":
          targetOpacity = 0; break;
        default:
          target = scatterRef.current;
      }

      material.opacity += (targetOpacity - material.opacity) * 0.055;

      // ── Particle position interpolation ──────────────────────────────────
      if (target) {
        // Faster convergence for emblem, slower drift for gov/ministry
        const speed =
          animPhase === "emblem_assembly" ? 0.045 :
          animPhase === "gov_reveal"      ? 0.008 :
          animPhase === "ministry_reveal" ? 0.015 :
          0.022;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
          current[ix] += (target[ix] - current[ix]) * speed;
          current[iy] += (target[iy] - current[iy]) * speed;
          current[iz] += (target[iz] - current[iz]) * speed;
        }
      }

      // ── Color shifts ──────────────────────────────────────────────────────
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

        if (animPhase === "flag_sweep") {
          // Premium silk colours — richer saffron, warm white, deep green
          const sweep = (animProgress * 3.2 - (current[iy] + 2.2) * 0.28 + 1.1) * 0.5;
          if (sweep < 0.33) {
            // Deep saffron — #C8520E normalised
            colorAttr.array[ix] = 0.78; colorAttr.array[iy] = 0.32; colorAttr.array[iz] = 0.055;
          } else if (sweep < 0.66) {
            // Warm ivory white
            colorAttr.array[ix] = 1.0; colorAttr.array[iy] = 0.98; colorAttr.array[iz] = 0.92;
          } else {
            // Rich Indian green — #0A6E1E normalised
            colorAttr.array[ix] = 0.04; colorAttr.array[iy] = 0.43; colorAttr.array[iz] = 0.12;
          }
        } else if (animPhase === "india_map" || animPhase === "network_lines") {
          // Cyan data flow with wave
          const flow = (t * 0.7 + i * 0.0012) % 1;
          colorAttr.array[ix] = 0.06 + flow * 0.25;
          colorAttr.array[iy] = 0.68 + flow * 0.28;
          colorAttr.array[iz] = 0.88 + flow * 0.1;
        } else if (animPhase === "ai_scan") {
          // Amber scan pulse
          const scan = Math.sin(t * 2.2 + i * 0.0018) * 0.5 + 0.5;
          colorAttr.array[ix] = 0.88 + scan * 0.12;
          colorAttr.array[iy] = 0.55 + scan * 0.25;
          colorAttr.array[iz] = 0.05;
        } else if (animPhase === "gov_reveal" || animPhase === "ministry_reveal") {
          // Deep gold — more bronze for engraved metallic feel
          const bronze = Math.sin(t * 1.5 + i * 0.008) * 0.03;
          colorAttr.array[ix] = 0.72 + bronze;
          colorAttr.array[iy] = 0.52 + bronze;
          colorAttr.array[iz] = 0.08;
        } else {
          // Default gold with subtle sparkle
          const spark = Math.sin(t * 2.8 + sizeOff[i]) * 0.06;
          colorAttr.array[ix] = 0.84 + spark;
          colorAttr.array[iy] = 0.65 + spark * 0.7;
          colorAttr.array[iz] = 0.12;
        }
      }

      // ── Size pulsing — glow / light trail effect ──────────────────────────
      if (sizeAttr) {
        const sArr = sizeAttr.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          // Base size + sinusoidal pulse offset per particle → organic glow
          const base = 0.018 + ((i * 17) % 100) * 0.00022;
          const pulse = Math.sin(t * 2.5 + sizeOff[i]) * 0.008;
          // Extra size boost during emblem & title (bloom illusion)
          const boost =
            (animPhase === "emblem_assembly" || animPhase === "title_reveal") ? 0.006 : 0;
          sArr[i] = Math.max(0.008, base + pulse + boost);
        }
        sizeAttr.needsUpdate = true;
      }

      // ── Rotation ──────────────────────────────────────────────────────────
      if (["emblem_assembly","flag_sweep","title_reveal","gov_reveal"].includes(animPhase)) {
        particles.rotation.z += 0.0006;
        particles.rotation.y += 0.0001; // very subtle y-axis for depth
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
});

ParticleCanvas.displayName = "ParticleCanvas";
export default ParticleCanvas;
