import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface CelebrationOverlayProps {
  projectName: string;
  amount: number;
  onComplete: () => void;
}

export default function CelebrationOverlay({
  projectName,
  amount,
  onComplete
}: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
      decay: number;

      constructor() {
        this.x = width / 2;
        this.y = height / 2;
        this.size = Math.random() * 8 + 4;
        this.opacity = 1;
        this.decay = Math.random() * 0.015 + 0.008;

        const colors = [
          '#635BFF', // Indigo
          '#8B83FF', // Light purple
          '#10B981', // Emerald
          '#38BDF8', // Sky blue
          '#FBBF24', // Amber
          '#EC4899', // Pink
          '#F43F5E'  // Rose
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Radial explosion speed
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 8 + 4;
        this.speedX = Math.cos(angle) * velocity;
        this.speedY = Math.sin(angle) * velocity;

        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 6 - 3;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.15; // Gravity
        this.rotation += this.rotationSpeed;
        this.opacity -= this.decay;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate((this.rotation * Math.PI) / 180);
        c.globalAlpha = this.opacity;
        c.fillStyle = this.color;
        
        // Randomly draw squares or circles
        if (this.size % 2 === 0) {
          c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    }

    const particles: Particle[] = [];
    // Spawn 150 particles initially
    for (let i = 0; i < 150; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw active particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        if (p.opacity <= 0 || p.y > height + 20) {
          particles.splice(i, 1);
        }
      }

      // If particles left, continue animating, else trigger complete
      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    // Auto-complete callback after 2.8s
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-in fade-in duration-300">
      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Visual content card */}
      <div className="z-10 text-center space-y-4 px-4 select-none animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#10B981] to-[#34D399] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 border border-emerald-400/20 animate-bounce">
          <Sparkles size={28} className="text-white" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            ✦ Spark round success!
          </h1>
          <p className="text-sm text-gray-300 max-w-sm mx-auto font-sans leading-relaxed">
            您已成功为 <span className="text-[#8C84FF] font-extrabold">{projectName}</span> 注入支持了 <span className="text-emerald-400 font-extrabold">{amount} TON</span>。
          </p>
        </div>
        <div className="inline-block px-3 py-1 bg-[#10B981]/15 border border-[#10B981]/25 rounded-full text-[10px] font-mono font-bold text-[#10B981] tracking-wider uppercase animate-pulse">
          Autonomous contract locking pending...
        </div>
      </div>
    </div>
  );
}
