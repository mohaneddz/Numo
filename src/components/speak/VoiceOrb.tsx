import { useEffect, useRef } from 'react';

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceOrbProps {
  state: VoiceOrbState;
  /** Live audio amplitude, 0-1. Drives how far the shell is pushed out. */
  level: number;
  size?: number;
  /** Honours the app's reduced-motion setting by holding the sphere still. */
  reducedMotion?: boolean;
}

/** Dots on the shell. Enough to read as a surface, few enough to stay at 60fps. */
const PARTICLE_COUNT = 900;

const STATE_COLORS: Record<VoiceOrbState, { r: number; g: number; b: number }> = {
  idle: { r: 100, g: 116, b: 139 },
  listening: { r: 34, g: 211, b: 238 },
  thinking: { r: 139, g: 92, b: 246 },
  speaking: { r: 52, g: 211, b: 153 },
};

interface Particle {
  x: number;
  y: number;
  z: number;
  /** Per-particle phase, so the surface ripples instead of pulsing as one. */
  phase: number;
}

/**
 * Distributes points evenly over a sphere.
 *
 * Random spherical angles bunch points at the poles; the Fibonacci spiral keeps
 * the spacing even, which is what makes the shell read as a solid surface.
 */
function buildSphere(count: number): Particle[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const particles: Particle[] = [];

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;

    particles.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      phase: (index % 97) / 97,
    });
  }

  return particles;
}

/**
 * The speaking companion, drawn as a sphere of points that reacts to audio.
 *
 * It reflects who currently holds the turn: the shell expands with the
 * learner's voice while listening, churns while the reply is being generated,
 * and pulses steadily while the companion speaks.
 */
export function VoiceOrb({ state, level, size = 280, reducedMotion = false }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(buildSphere(PARTICLE_COUNT));
  const frameRef = useRef<number | null>(null);
  // Read inside the animation loop so a change does not restart it.
  const stateRef = useRef(state);
  const levelRef = useRef(level);
  const smoothedRef = useRef(0);

  stateRef.current = state;
  levelRef.current = level;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    context.scale(pixelRatio, pixelRatio);

    const center = size / 2;
    const baseRadius = size * 0.32;
    let rotation = 0;
    let time = 0;

    const render = () => {
      const currentState = stateRef.current;
      const color = STATE_COLORS[currentState];

      // Ease toward the incoming level so the shell breathes rather than jitters.
      smoothedRef.current += (levelRef.current - smoothedRef.current) * 0.15;
      const energy = smoothedRef.current;

      if (!reducedMotion) {
        rotation += currentState === 'thinking' ? 0.012 : 0.004;
        time += 0.02;
      }

      context.clearRect(0, 0, size, size);

      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);

      // A steady pulse while speaking, since there is no mic level to follow.
      const pulse =
        currentState === 'speaking' ? 0.12 + Math.sin(time * 3) * 0.06 : energy * 0.45;

      for (const particle of particlesRef.current) {
        const ripple = reducedMotion
          ? 0
          : Math.sin(time * 2 + particle.phase * Math.PI * 2) * 0.03;
        const radius = baseRadius * (1 + pulse + ripple);

        // Rotate around the vertical axis.
        const x = particle.x * cos - particle.z * sin;
        const z = particle.x * sin + particle.z * cos;
        const y = particle.y;

        // Perspective: nearer points sit further out and draw brighter.
        const depth = 1 / (2.2 - z);
        const screenX = center + x * radius * depth * 2.2;
        const screenY = center + y * radius * depth * 2.2;

        const nearness = (z + 1) / 2;
        const alpha = 0.12 + nearness * 0.75;
        const dotSize = 0.6 + nearness * 1.5;

        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        context.beginPath();
        context.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
        context.fill();
      }

      // Inner glow, brightening with the same energy driving the shell.
      const glow = context.createRadialGradient(center, center, 0, center, center, baseRadius * 1.6);
      glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.16 + pulse * 0.3})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, size, size);

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reducedMotion, size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Speaking companion, ${state}`}
      style={{ width: size, height: size }}
      className="select-none"
    />
  );
}
