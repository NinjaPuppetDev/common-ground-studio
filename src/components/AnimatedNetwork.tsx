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

      const isDark = document.documentElement.classList.contains('dark');

      const nodes = nodesRef.current;
      const safeWidth = width > 0 ? width : 1;
      const safeHeight = height > 0 ? height : 1;
      const safeMx = Number.isFinite(mouseX) ? mouseX : safeWidth / 2;
      const safeMy = Number.isFinite(mouseY) ? mouseY : safeHeight / 2;

      // Update node positions with parallax influence
      for (const node of nodes) {
        // Apply parallax offset from mouse
        const rawDx = (safeMx / safeWidth - 0.5) * 2;
        const rawDy = (safeMy / safeHeight - 0.5) * 2;
        const parallaxX = Number.isFinite(rawDx) ? rawDx * 8 : 0;
        const parallaxY = Number.isFinite(rawDy) ? rawDy * 8 : 0;

        node.x += Number.isFinite(node.vx) ? node.vx : 0;
        node.y += Number.isFinite(node.vy) ? node.vy : 0;

        // Boundary wrap
        if (node.x < -20) node.x = safeWidth + 20;
        if (node.x > safeWidth + 20) node.x = -20;
        if (node.y < -20) node.y = safeHeight + 20;
        if (node.y > safeHeight + 20) node.y = -20;

        const px = Number.isFinite(node.x + parallaxX) ? node.x + parallaxX : safeWidth / 2;
        const py = Number.isFinite(node.y + parallaxY) ? node.y + parallaxY : safeHeight / 2;
        const nodeRadius = Number.isFinite(node.radius) && node.radius > 0 ? node.radius : 2;

        // Draw connections
        for (const other of nodes) {
          if (other === node) continue;
          const ox = Number.isFinite(other.x + parallaxX) ? other.x + parallaxX : safeWidth / 2;
          const oy = Number.isFinite(other.y + parallaxY) ? other.y + parallaxY : safeHeight / 2;
          const dist = Math.hypot(px - ox, py - oy);
          if (Number.isFinite(dist) && dist < 160) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(ox, oy);
            if (isDark) {
              ctx.strokeStyle = `rgba(120, 160, 255, ${0.04 * (1 - dist / 160)})`;
            } else {
              ctx.strokeStyle = `rgba(37, 99, 235, ${0.08 * (1 - dist / 160)})`;
            }
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Draw glow around node type nodes
        if (node.type === 'node') {
          const outerRadius = nodeRadius * 6;
          if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(outerRadius) && outerRadius > 0) {
            try {
              const gradient = ctx.createRadialGradient(px, py, 0, px, py, outerRadius);
              if (isDark) {
                gradient.addColorStop(0, `rgba(59, 130, 246, ${0.06 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`);
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
              } else {
                gradient.addColorStop(0, `rgba(37, 99, 235, ${0.08 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`);
                gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
              }
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(px, py, outerRadius, 0, Math.PI * 2);
              ctx.fill();
            } catch {
              // Ignore canvas gradient error fallback
            }
          }
        }

        // Draw node
        if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(nodeRadius) && nodeRadius > 0) {
          ctx.beginPath();
          ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
          if (isDark) {
            ctx.fillStyle = node.type === 'node'
              ? `rgba(120, 160, 255, ${0.5 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`
              : `rgba(120, 160, 255, ${0.2 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`;
          } else {
            ctx.fillStyle = node.type === 'node'
              ? `rgba(37, 99, 235, ${0.65 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`
              : `rgba(79, 70, 229, ${0.35 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`;
          }
          ctx.fill();
        }

        // Draw label for main nodes
        if (node.label && Number.isFinite(px) && Number.isFinite(py)) {
          ctx.font = '9px "JetBrains Mono", monospace';
          if (isDark) {
            ctx.fillStyle = `rgba(200, 215, 255, ${0.35 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`;
          } else {
            ctx.fillStyle = `rgba(30, 41, 59, ${0.55 * (Number.isFinite(node.opacity) ? node.opacity : 0.5)})`;
          }
          ctx.textAlign = 'center';
          ctx.fillText(node.label, px, py + nodeRadius + 12);
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
