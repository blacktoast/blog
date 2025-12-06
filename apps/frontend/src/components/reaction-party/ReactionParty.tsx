import { useRef } from 'preact/hooks';
import type { ReactionPartyProps } from './types';
import { useReactionParty } from './useReactionParty';
import { createPartyAnimation } from './partyAnimation';

export default function ReactionParty({ contentType, slug }: ReactionPartyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, toggle } = useReactionParty({ contentType, slug });

  const handleClick = (event: MouseEvent) => {
    toggle(() => createPartyAnimation(event));
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
