import { useEffect, useRef } from 'react';

type Props = {
  /** Any CSS colour that resolves to rgb — read once per mount. */
  color?: string;
  count?: number;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  alpha: number;
  phase: number;
};

/**
 * Drifting embers behind the ranking podium.
 *
 * One canvas, not N animated DOM nodes: forty absolutely-positioned motion
 * spans would each get their own compositor layer and tank the frame rate on a
 * phone. Under `prefers-reduced-motion` this renders a static gradient instead
 * of animating, matching the global rule already in index.css.
 */
export function EmberField({ color, count = 34, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve the requested colour to an "r, g, b" triple by letting the
    // browser do it: canvas needs numbers, and the theme hands us var()s.
    const probe = document.createElement('span');
    probe.style.color = color ?? 'var(--hof-accent)';
    probe.style.display = 'none';
    canvas.parentElement?.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const rgb = resolved.match(/\d+/g)?.slice(0, 3).join(', ') ?? '232, 200, 112';

    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: Particle[] = [];

    function size() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      const n = width < 420 ? Math.round(count * 0.6) : count;
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.8,
        vy: 0.14 + Math.random() * 0.38,
        drift: (Math.random() - 0.5) * 0.24,
        alpha: 0.14 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function paintStatic() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${(p.alpha * 0.7).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.drift + Math.sin(t / 1400 + p.phase) * 0.16;

        if (p.y < -6) {
          p.y = height + 6;
          p.x = Math.random() * width;
        }
        if (p.x < -6) p.x = width + 6;
        if (p.x > width + 6) p.x = -6;

        // Embers fade as they rise.
        const fade = p.alpha * (0.3 + 0.7 * (p.y / Math.max(height, 1)));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${fade.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(frame);
    }

    size();
    seed();

    if (reduce) {
      paintStatic();
    } else {
      raf = window.requestAnimationFrame(frame);
    }

    let resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        size();
        seed();
        if (reduce) paintStatic();
      }, 160);
    }

    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [color, count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
