export interface ReactionPartyProps {
  contentType: 'blog' | 'pebbles';
  slug: string;
}

export interface ReactionState {
  count: number;
  hasReacted: boolean;
  status: 'loading' | 'idle' | 'toggling';
  isBouncing: boolean;
}

export type ReactionAction =
  | { type: 'LOAD_SUCCESS'; count: number; hasReacted: boolean }
  | { type: 'LOAD_ERROR' }
  | { type: 'TOGGLE_START'; optimisticCount: number; optimisticHasReacted: boolean }
  | { type: 'TOGGLE_SUCCESS'; count: number; hasReacted: boolean }
  | { type: 'TOGGLE_ERROR'; prevCount: number; prevHasReacted: boolean }
  | { type: 'BOUNCE_END' };
