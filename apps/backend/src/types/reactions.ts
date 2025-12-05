export interface Reaction {
  type: "party_popper";
  count: number;
}

export interface ReactionResponse {
  reactions: Reaction[];
  viewer: {
    reactedTo: string[];
  };
}

export interface ToggleRequest {
  reactionType: "party_popper";
  action?: "toggle" | "add" | "remove";
}

export interface UserHash {
  hash: string;
  cookieValue: string;
}

export interface ReactionEvent {
  content_type: string;
  slug: string;
  reaction_type: string;
  user_hash: string;
}

export interface ContentReaction {
  content_type: string;
  slug: string;
  reactions: string; // JSON string
  created_at: string;
  updated_at: string;
}

export const CONTENT_TYPES = ['blog', 'pebbles'] as const;
export const REACTION_TYPES = ['party_popper'] as const;