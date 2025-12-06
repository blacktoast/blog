import { useReducer, useEffect } from 'preact/hooks';
import type { ReactionState, ReactionAction, ReactionPartyProps } from './types';

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

function parseReactionData(data: any): { count: number; hasReacted: boolean } {
  const partyPopper = data.reactions.find((r: any) => r.type === 'party_popper');
  return {
    count: partyPopper?.count ?? 0,
    hasReacted: data.viewer.reactedTo.includes('party_popper'),
  };
}

function getApiUrl(): string {
  if (typeof window === 'undefined') return 'https://backend.btoast.workers.dev';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:8787' : 'https://backend.btoast.workers.dev';
}

export function useReactionParty({ contentType, slug }: ReactionPartyProps) {
  const [state, dispatch] = useReducer(reactionReducer, initialState);
  const apiUrl = getApiUrl();

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

  const toggle = async (onSuccess?: () => void) => {
    if (state.status !== 'idle') return;

    const prevCount = state.count;
    const prevHasReacted = state.hasReacted;
    const optimisticHasReacted = !state.hasReacted;
    const optimisticCount = optimisticHasReacted ? state.count + 1 : Math.max(0, state.count - 1);

    dispatch({ type: 'TOGGLE_START', optimisticCount, optimisticHasReacted });
    setTimeout(() => dispatch({ type: 'BOUNCE_END' }), 300);

    if (optimisticHasReacted) {
      onSuccess?.();
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

  return { state, toggle };
}
