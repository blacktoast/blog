import { Hono } from "hono";
import type { Context, Next } from "hono";
import { corsMiddleware } from "../middleware/cors.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  validateContentType,
  validateReactionType,
  validateSlug,
} from "../utils/validation.js";
import type {
  ReactionResponse,
  ToggleRequest,
  UserHash,
  Reaction,
} from "../types/reactions.js";

interface Env {
  haedal_db: D1Database;
}

interface Variables {
  userHash: UserHash;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply middleware
app.use("*", corsMiddleware());
app.use("*", authMiddleware());

// Simple rate limiting (in-memory for demo)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxRequests = 100;

    const current = rateLimitMap.get(ip);
    if (!current || now > current.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      current.count++;
      if (current.count > maxRequests) {
        return c.json({ error: "Too many requests" }, 429);
      }
    }

    await next();
  };
}

// GET /reactions/:contentType/:slug
app.get("/:contentType/:slug", async (c) => {
  const contentType = c.req.param("contentType");
  const rawSlug = c.req.param("slug");
  const userHash = c.get("userHash");

  // Decode URL-encoded slug test?
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }

  // Validate inputs
  if (!validateContentType(contentType)) {
    return c.json({ error: "Invalid content type" }, 400);
  }

  if (!validateSlug(rawSlug)) {
    return c.json({ error: "Invalid slug" }, 400);
  }

  try {
    // Get content reactions
    const contentReaction = await c.env.haedal_db
      .prepare(
        "SELECT reactions FROM content_reactions WHERE content_type = ? AND slug = ?"
      )
      .bind(contentType, slug)
      .first();

    // Get user's reactions
    const userReactions = await c.env.haedal_db
      .prepare(
        "SELECT reaction_type FROM reaction_events WHERE content_type = ? AND slug = ? AND user_hash = ?"
      )
      .bind(contentType, slug, userHash.hash)
      .all();

    const reactions = contentReaction
      ? JSON.parse(contentReaction.reactions as string)
      : [];

    const reactedTo = (userReactions.results as { reaction_type: string }[]).map((r) => r.reaction_type);

    const response: ReactionResponse = {
      reactions,
      viewer: { reactedTo },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /reactions/:contentType/:slug
app.post("/:contentType/:slug", rateLimitMiddleware(), async (c) => {
  const contentType = c.req.param("contentType");
  const rawSlug = c.req.param("slug");
  const userHash = c.get("userHash");
  

  // Decode URL-encoded slug
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }

  // Validate inputs
  if (!validateContentType(contentType)) {
    return c.json({ error: "Invalid content type" }, 400);
  }

  if (!validateSlug(rawSlug)) {
    return c.json({ error: "Invalid slug" }, 400);
  }

  const body = (await c.req.json()) as ToggleRequest;
  const { reactionType, action = "toggle" } = body;

  if (!validateReactionType(reactionType)) {
    return c.json({ error: "Invalid reaction type" }, 400);
  }

  try {
    // Use D1 batch for atomic operations
    const results = await c.env.haedal_db.batch([
      // Check if user already reacted
      c.env.haedal_db
        .prepare(
          "SELECT 1 FROM reaction_events WHERE content_type = ? AND slug = ? AND reaction_type = ? AND user_hash = ?"
        )
        .bind(contentType, slug, reactionType, userHash.hash),
      // Get current reactions
      c.env.haedal_db
        .prepare(
          "SELECT reactions FROM content_reactions WHERE content_type = ? AND slug = ?"
        )
        .bind(contentType, slug),
    ]);

    const hasReacted = results[0].results.length > 0;
    const contentResult = results[1].results[0] as { reactions?: string } | undefined;
    const currentReactions = contentResult?.reactions
      ? JSON.parse(contentResult.reactions)
      : [];

    let shouldAdd = false;
    let shouldRemove = false;

    if (action === "toggle") {
      shouldAdd = !hasReacted;
      shouldRemove = hasReacted;
    } else if (action === "add") {
      shouldAdd = !hasReacted;
    } else if (action === "remove") {
      shouldRemove = hasReacted;
    }

    const operations: D1PreparedStatement[] = [];
    let updatedReactions: Reaction[] = [...currentReactions];

    if (shouldAdd) {
      // Add reaction event
      operations.push(
        c.env.haedal_db
          .prepare(
            "INSERT INTO reaction_events (content_type, slug, reaction_type, user_hash) VALUES (?, ?, ?, ?)"
          )
          .bind(contentType, slug, reactionType, userHash.hash)
      );

      // Update count
      const existingReaction = updatedReactions.find(
        (r) => r.type === reactionType
      );
      if (existingReaction) {
        existingReaction.count++;
      } else {
        updatedReactions.push({ type: reactionType, count: 1 });
      }
    }

    if (shouldRemove) {
      // Remove reaction event
      operations.push(
        c.env.haedal_db
          .prepare(
            "DELETE FROM reaction_events WHERE content_type = ? AND slug = ? AND reaction_type = ? AND user_hash = ?"
          )
          .bind(contentType, slug, reactionType, userHash.hash)
      );

      // Update count
      const existingReaction = updatedReactions.find(
        (r) => r.type === reactionType
      );
      if (existingReaction) {
        existingReaction.count--;
        if (existingReaction.count <= 0) {
          updatedReactions = updatedReactions.filter(
            (r) => r.type !== reactionType
          );
        }
      }
    }

    // Update content reactions
    if (updatedReactions.length > 0) {
      operations.push(
        c.env.haedal_db
          .prepare(
            `
          INSERT INTO content_reactions (content_type, slug, reactions, updated_at) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(content_type, slug) DO UPDATE SET 
          reactions = excluded.reactions,
          updated_at = excluded.updated_at
        `
          )
          .bind(contentType, slug, JSON.stringify(updatedReactions))
      );
    } else {
      // Remove entry if no reactions left
      operations.push(
        c.env.haedal_db
          .prepare(
            "DELETE FROM content_reactions WHERE content_type = ? AND slug = ?"
          )
          .bind(contentType, slug)
      );
    }

    if (operations.length > 0) {
      await c.env.haedal_db.batch(operations);
    }

    // Return updated state
    const response: ReactionResponse = {
      reactions: updatedReactions,
      viewer: {
        reactedTo: shouldAdd ? [reactionType] : [],
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
