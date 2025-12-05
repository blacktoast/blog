import { Context, Next } from "hono";
import {
  generateUserHash,
  generateCookieValue,
  parseCookie,
} from "../utils/hash.js";
import type { UserHash } from "../types/reactions.js";

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";
    const acceptLanguage = c.req.header("Accept-Language") || "unknown";
    const timezone = c.req.header("Time-Zone") || "UTC";

    // Parse existing cookies
    const cookies = parseCookie(c.req.header("Cookie") ?? "");
    let rxid = cookies.rxid;

    // Generate new rxid if not exists
    if (!rxid) {
      rxid = await generateCookieValue();
      c.header(
        "Set-Cookie",
        `rxid=${rxid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
      ); // 30 days
    }

    // Generate user hash
    const userHash = await generateUserHash(ip, userAgent, acceptLanguage, timezone);

    // Store in context for later use
    c.set("userHash", {
      hash: userHash,
      cookieValue: rxid,
    } as UserHash);

    await next();
  };
}
