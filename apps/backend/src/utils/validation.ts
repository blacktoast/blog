import { CONTENT_TYPES, REACTION_TYPES } from "../types/reactions.js";

export function validateContentType(contentType: string): boolean {
  return CONTENT_TYPES.includes(contentType as any);
}

export function validateReactionType(reactionType: string): boolean {
  return REACTION_TYPES.includes(reactionType as any);
}

export function validateSlug(slug: string): boolean {
  // Allow alphanumeric, hyphens, underscores, and Korean characters
  const slugRegex = /^[a-zA-Z0-9가-힣\-_]+$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 200;
}

export function sanitizeInput(input: string): string {
  return input.trim().substring(0, 200);
}