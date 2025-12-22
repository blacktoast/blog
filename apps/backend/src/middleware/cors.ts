import { Context, Next } from "hono";

const ALLOWED_ORIGINS = [
  "https://www.haedal.blog",
  "https://haedal.blog",
  "https://www.headal.site",
  "https://headal.site",
  "http://localhost:4321",
  "https://personal.haedal.blog",
  "https://www.personal.haedal.blog",
];

export function corsMiddleware() {
  return async (c: Context, next: Next) => {
    const origin = c.req.header("Origin");

    // Handle preflight requests
    if (c.req.method === "OPTIONS") {
      const headers = getCorsHeaders(origin);
      return new Response(null, {
        status: 200,
        headers: {
          ...headers,
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Add CORS headers to all responses
    const headers = getCorsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      c.header(key, value);
    });

    await next();
  };
}

function getCorsHeaders(origin: string | undefined): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cookie",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  return {};
}
