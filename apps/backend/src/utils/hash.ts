// Web Crypto API helper for SHA-256 hashing (Cloudflare Workers compatible)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateUserHash(ip: string, userAgent: string, acceptLanguage: string, timezone: string): Promise<string> {
  const data = `${ip}:${userAgent}:${acceptLanguage}:${timezone}`;
  return sha256(data);
}

export async function generateCookieValue(): Promise<string> {
  const hash = await sha256(Date.now().toString() + Math.random().toString());
  return hash.substring(0, 32);
}

export function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}