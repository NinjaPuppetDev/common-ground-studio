import { useEffect, useRef, useCallback } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  type: 'node' | 'evidence';
  opacity: number;
}

export default function AnimatedNetwork({
  mouseX, mouseY, isVisible,
}: {
  mouseX: number;
  mouseY: number;
  isVisible: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number>(0);

  const initNodes = useCallback((w: number, h: number) => {
    const labels = ['Claims', 'Evidence', 'Position', 'Market', 'Audience', 'Signals', 'Gaps', 'Trust'];
    const nodes: Node[] = [];
    const count = 24;

    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: i < 8 ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
        label: i < 8 ? labels[i] : '',
        type: i < 8 ? 'node' : 'evidence',
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      if (nodesRef.current.length === 0) {
        initNodes(window.innerWidth, window.innerHeight);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const draw = () => {
      if (!ctx || !canvas) return;
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const mx = mouseX;
      const my = mouseY;

      // Update node positions with parallax influence
      for (const node of nodes) {
        // Apply parallax offset from mouse
        const dx = (mx / width - 0.5) * 2;
        const dy = (my / height - 0.5) * 2;
        const parallaxX = dx * 8;
        const parallaxY = dy * 8;

        node.x += node.vx;
        node.y += node.vy;

        // Boundary wrap
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;

        const px = node.x + parallaxX;
        const py = node.y + parallaxY;

        // Draw connections
        for (const other of nodes) {
          if (other === node) continue;
          const ox = other.x + (mx / width - 0.5) * 2 * 8;
          const oy = other.y + (my / height - 0.5) * 2 * 8;
          const dist = Math.hypot(px - ox, py - oy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(ox, oy);
            ctx.strokeStyle = `rgba(120, 160, 255, ${0.03 * (1 - dist / 160)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Draw glow around node type nodes
        if (node.type === 'node') {
          const gradient = ctx.createRadialGradient(px, py, 0, px, py, node.radius * 6);
          gradient.addColorStop(0, `rgba(59, 130, 246, ${0.06 * node.opacity})`);
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(px, py, node.radius * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(px, py, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'node'
          ? `rgba(120, 160, 255, ${0.5 * node.opacity})`
          : `rgba(120, 160, 255, ${0.2 * node.opacity})`;
        ctx.fill();

        // Draw label for main nodes
        if (node.label) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(200, 215, 255, ${0.25 * node.opacity})`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, px, py + node.radius + 12);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [mouseX, mouseY, initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 1s ease' }}
    />
  );
}
