import { useEffect, useRef } from 'react';

interface Props {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  className?: string;
  animate?: boolean;
  onClick?: (x: number, y: number, w: number, h: number) => void;
  onMove?: (x: number, y: number, w: number, h: number) => void;
}

export default function CanvasView({ draw, className, animate = true, onClick, onMove }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const renderRef = useRef<(() => void) | null>(null);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let w = 0;
    let h = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, performance.now());
    };
    renderRef.current = render;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    if (animate) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderRef.current = null;
    };
  }, [animate]);

  useEffect(() => {
    if (!animate) renderRef.current?.();
  }, [animate, draw]);

  const handler =
    (cb?: Props['onClick']) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cb) return;
      const r = e.currentTarget.getBoundingClientRect();
      cb(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    };

  return <canvas ref={ref} className={className} onClick={handler(onClick)} onMouseMove={handler(onMove)} />;
}
