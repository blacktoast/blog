import { useReducer, useEffect, useRef } from 'preact/hooks';

interface ReactionsProps {
  contentType: 'blog' | 'pebbles';
  slug: string;
}

// State & Action types
interface ReactionState {
  count: number;
  hasReacted: boolean;
  status: 'loading' | 'idle' | 'toggling';
  isBouncing: boolean;
}

type ReactionAction =
  | { type: 'LOAD_SUCCESS'; count: number; hasReacted: boolean }
  | { type: 'LOAD_ERROR' }
  | { type: 'TOGGLE_START'; optimisticCount: number; optimisticHasReacted: boolean }
  | { type: 'TOGGLE_SUCCESS'; count: number; hasReacted: boolean }
  | { type: 'TOGGLE_ERROR'; prevCount: number; prevHasReacted: boolean }
  | { type: 'BOUNCE_END' };

const initialState: ReactionState = {
  count: 0,
  hasReacted: false,
  status: 'loading',
  isBouncing: false,
};

function reactionReducer(state: ReactionState, action: ReactionAction): ReactionState {
  switch (action.type) {
    case 'LOAD_SUCCESS':
      return { ...state, count: action.count, hasReacted: action.hasReacted, status: 'idle' };
    case 'LOAD_ERROR':
      return { ...state, status: 'idle' };
    case 'TOGGLE_START':
      return {
        ...state,
        count: action.optimisticCount,
        hasReacted: action.optimisticHasReacted,
        status: 'toggling',
        isBouncing: true,
      };
    case 'TOGGLE_SUCCESS':
      return { ...state, count: action.count, hasReacted: action.hasReacted, status: 'idle' };
    case 'TOGGLE_ERROR':
      return { ...state, count: action.prevCount, hasReacted: action.prevHasReacted, status: 'idle' };
    case 'BOUNCE_END':
      return { ...state, isBouncing: false };
    default:
      return state;
  }
}

// Helper to extract party_popper data from API response
function parseReactionData(data: any): { count: number; hasReacted: boolean } {
  const partyPopper = data.reactions.find((r: any) => r.type === 'party_popper');
  return {
    count: partyPopper?.count ?? 0,
    hasReacted: data.viewer.reactedTo.includes('party_popper'),
  };
}

export default function Reactions({ contentType, slug }: ReactionsProps) {
  const [state, dispatch] = useReducer(reactionReducer, initialState);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiUrl = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'https://backend.btoast.workers.dev';

  useEffect(() => {
    const loadReactions = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/reactions/${contentType}/${slug}`,
          { credentials: 'include' }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        dispatch({ type: 'LOAD_SUCCESS', ...parseReactionData(data) });
      } catch (error) {
        console.error('Failed to load reactions:', error);
        dispatch({ type: 'LOAD_ERROR' });
      }
    };
    loadReactions();
  }, [contentType, slug, apiUrl]);

  const handleClick = async (event: MouseEvent) => {
    if (state.status !== 'idle') return;

    const prevCount = state.count;
    const prevHasReacted = state.hasReacted;
    const optimisticHasReacted = !state.hasReacted;
    const optimisticCount = optimisticHasReacted ? state.count + 1 : Math.max(0, state.count - 1);

    dispatch({ type: 'TOGGLE_START', optimisticCount, optimisticHasReacted });
    setTimeout(() => dispatch({ type: 'BOUNCE_END' }), 300);

    if (optimisticHasReacted) {
      createPartyAnimation(event);
    }

    try {
      const response = await fetch(
        `${apiUrl}/reactions/${contentType}/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reactionType: 'party_popper', action: 'toggle' })
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      dispatch({ type: 'TOGGLE_SUCCESS', ...parseReactionData(data) });
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      dispatch({ type: 'TOGGLE_ERROR', prevCount, prevHasReacted });
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
        class={`reaction-item ${state.hasReacted ? 'active' : ''} ${state.isBouncing ? 'bounce' : ''} ${state.status === 'loading' ? 'loading' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={state.hasReacted ? 'Remove reaction' : 'Add reaction'}
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
        <span class="reaction-count">{state.count}</span>
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

