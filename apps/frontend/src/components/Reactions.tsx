import { useState, useEffect, useRef } from 'preact/hooks';

interface ReactionsProps {
  contentType: 'blog' | 'pebbles';
  slug: string;
}

export default function Reactions({ contentType, slug }: ReactionsProps) {
  const [count, setCount] = useState(0);
  const [hasReacted, setHasReacted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiUrl = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://backend.btoast.workers.dev';

  useEffect(() => {
    loadReactions();
  }, [contentType, slug]);

  const loadReactions = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/reactions/${contentType}/${slug}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const partyPopper = data.reactions.find((r: any) => r.type === 'party_popper');
      setCount(partyPopper ? partyPopper.count : 0);
      setHasReacted(data.viewer.reactedTo.includes('party_popper'));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load reactions:', error);
      setIsLoading(false);
    }
  };

  const handleClick = async (event: MouseEvent) => {
    if (isLoading || isToggling) return;

    setIsToggling(true);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);

    try {
      const response = await fetch(
        `${apiUrl}/reactions/${contentType}/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            reactionType: 'party_popper',
            action: 'toggle'
          })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const partyPopper = data.reactions.find((r: any) => r.type === 'party_popper');
      const newCount = partyPopper ? partyPopper.count : 0;
      const newHasReacted = data.viewer.reactedTo.includes('party_popper');
      
      setCount(newCount);
      setHasReacted(newHasReacted);

      // Create party animation if user added reaction
      if (newHasReacted) {
        createPartyAnimation(event);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const createPartyAnimation = (event: MouseEvent) => {
    const clickX = event.clientX;
    const clickY = event.clientY;

    const particleCount = 15;
    const emojis = ['🎉', '🎊', '✨', '🌟', '⭐', '💫', '🎆'];
    const gravity = 800;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const spreadAngle = Math.PI * 0.7;
      const baseAngle = -Math.PI / 2;
      const angle = baseAngle + (Math.random() - 0.5) * spreadAngle;
      const speed = 300 + Math.random() * 200;

      let x = 0;
      let y = 0;
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let opacity = 1;
      let rotation = 0;
      const rotationSpeed = (Math.random() - 0.5) * 400;

      particle.style.cssText = `
        position: fixed;
        left: ${clickX}px;
        top: ${clickY}px;
        pointer-events: none;
        z-index: 9999;
        font-size: ${1.2 + Math.random() * 0.5}rem;
        transform: translate(-50%, -50%);
        will-change: transform, opacity;
      `;

      document.body.appendChild(particle);

      const startTime = performance.now();
      const duration = 1000;

      const updatePhysics = () => {
        const elapsed = performance.now() - startTime;
        const dt = 1 / 60;

        if (elapsed > duration) {
          particle.remove();
          return;
        }

        vy += gravity * dt;
        x += vx * dt;
        y += vy * dt;
        rotation += rotationSpeed * dt;

        const progress = elapsed / duration;
        if (progress > 0.7) {
          opacity = 1 - (progress - 0.7) / 0.3;
        }

        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`;
        particle.style.opacity = opacity.toString();

        requestAnimationFrame(updatePhysics);
      };

      requestAnimationFrame(updatePhysics);
    }
  };

  return (
    <div ref={containerRef}>
      <div
        class={`reaction-item ${hasReacted ? 'active' : ''} ${isBouncing ? 'bounce' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={hasReacted ? 'Remove reaction' : 'Add reaction'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="reaction-icon"
        >
          <path d="M5.8 11.3 2 22l10.7-3.79" />
          <path d="M4 3h.01" />
          <path d="M22 8h.01" />
          <path d="M15 2h.01" />
          <path d="M22 20h.01" />
          <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
          <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
          <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
          <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
        </svg>
        <span class="reaction-count">{count}</span>
      </div>

      <style>{`
        .reaction-item {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          cursor: pointer;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .reaction-item:hover {
          transform: scale(1.1);
        }

        .reaction-item:active {
          transform: scale(0.95);
        }

        .reaction-icon {
          color: var(--color-muted);
          opacity: 0.5;
          transition: all 0.25s ease;
        }

        .reaction-item:hover .reaction-icon {
          opacity: 0.8;
        }

        .reaction-item.active .reaction-icon {
          color: var(--color-accent);
          opacity: 1;
          filter: drop-shadow(0 0 4px var(--color-accent));
        }

        .reaction-count {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-muted);
          opacity: 0.6;
          min-width: 1rem;
          transition: all 0.25s ease;
        }

        .reaction-item.active .reaction-count {
          color: var(--color-accent);
          opacity: 1;
        }

        .reaction-item.bounce {
          animation: bounceEffect 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .reaction-item.loading {
          opacity: 0.5;
          pointer-events: none;
        }

        @keyframes bounceEffect {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

