type CloudflareEnv = Record<string, unknown>;

type CloudflareExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?: () => void;
};

const astroWorker = (await import("../dist/_worker.js/index.js"))
  .default as {
  fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: CloudflareExecutionContext
  ): Promise<Response>;
};

function normalizeSegment(segment: string): string {
  try {
    const decoded = decodeURIComponent(segment);
    const normalized = decoded.normalize("NFC");
    if (decoded === normalized) {
      return segment;
    }
    return encodeURIComponent(normalized);
  } catch {
    return segment;
  }
}

function normalizePathname(pathname: string): string {
  const segments = pathname.split("/");
  let didMutate = false;

  for (let i = 1; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment) {
      continue;
    }
    const normalizedSegment = normalizeSegment(segment);
    if (normalizedSegment !== segment) {
      segments[i] = normalizedSegment;
      didMutate = true;
    }
  }

  return didMutate ? segments.join("/") : pathname;
}

function normalizeRequest(request: Request): Request {
  const originalUrl = new URL(request.url);
  const normalizedPathname = normalizePathname(originalUrl.pathname);

  if (normalizedPathname === originalUrl.pathname) {
    return request;
  }

  const normalizedUrl = new URL(originalUrl);
  normalizedUrl.pathname = normalizedPathname;
  return new Request(normalizedUrl.toString(), request);
}

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: CloudflareExecutionContext
  ): Promise<Response> {
    const normalizedRequest = normalizeRequest(request);
    return astroWorker.fetch(normalizedRequest, env, ctx);
  },
};
