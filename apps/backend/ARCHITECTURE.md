# Backend Architecture

이 문서는 Haedal Blog Backend API의 상세 아키텍처를 설명합니다.

## 목차

- [개요](#개요)
- [디렉토리 구조](#디렉토리-구조)
- [API 엔드포인트](#api-엔드포인트)
- [데이터베이스 설계](#데이터베이스-설계)
- [미들웨어 시스템](#미들웨어-시스템)
- [보안 설계](#보안-설계)
- [데이터 흐름](#데이터-흐름)
- [배포 및 운영](#배포-및-운영)

---

## 개요

Backend는 **Hono** 프레임워크를 사용한 경량 API 서버입니다. Cloudflare Workers에서 실행되며, D1 SQLite 데이터베이스를 사용하여 사용자 반응(reactions) 데이터를 저장합니다.

### 핵심 설계 원칙

1. **Serverless-First**: Cloudflare Workers에 최적화
2. **Minimal Dependencies**: Hono만 사용하는 경량 구조
3. **Atomic Operations**: D1 batch로 데이터 일관성 보장
4. **Privacy-Preserving**: 브라우저 지문 해싱으로 익명성 유지

---

## 디렉토리 구조

```
apps/backend/
├── src/
│   ├── index.ts                    # 애플리케이션 진입점
│   │
│   ├── routes/
│   │   └── reactions.ts            # 반응 API 라우트 (핵심 비즈니스 로직)
│   │
│   ├── middleware/
│   │   ├── cors.ts                 # CORS 처리
│   │   └── auth.ts                 # 사용자 식별 + 쿠키 관리
│   │
│   ├── types/
│   │   └── reactions.ts            # TypeScript 타입 + 상수
│   │
│   └── utils/
│       ├── validation.ts           # 입력 검증
│       └── hash.ts                 # SHA-256 해싱 + 쿠키 유틸
│
├── migrations/
│   └── 001_create_reactions.sql    # D1 스키마 마이그레이션
│
├── wrangler.jsonc                  # Cloudflare Workers 설정
├── tsconfig.json                   # TypeScript 설정
└── package.json                    # 의존성
```

### 파일별 역할

| 파일 | 크기 | 역할 |
|------|------|------|
| `index.ts` | ~20줄 | 앱 초기화, 라우트 마운트 |
| `routes/reactions.ts` | ~200줄 | 반응 CRUD 로직, Rate limiting |
| `middleware/cors.ts` | ~50줄 | Origin 검증, CORS 헤더 |
| `middleware/auth.ts` | ~80줄 | 사용자 해시 생성, 쿠키 관리 |
| `utils/validation.ts` | ~40줄 | 입력값 검증 함수 |
| `utils/hash.ts` | ~60줄 | SHA-256 해싱, 쿠키 파싱 |
| `types/reactions.ts` | ~50줄 | 타입 정의, 상수 |

---

## API 엔드포인트

### 엔드포인트 목록

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/` | API 상태 및 버전 정보 |
| `GET` | `/reactions/:contentType/:slug` | 콘텐츠의 반응 조회 |
| `POST` | `/reactions/:contentType/:slug` | 반응 토글/추가/제거 |

### GET /

```typescript
// Response
{
  "message": "Reactions API",
  "version": "1.0.0",
  "endpoints": {
    "GET /reactions/:contentType/:slug": "Get reactions for content",
    "POST /reactions/:contentType/:slug": "Toggle reaction"
  }
}
```

### GET /reactions/:contentType/:slug

콘텐츠에 대한 모든 반응과 현재 사용자의 반응 상태를 반환합니다.

```typescript
// Request
GET /reactions/blog/my-first-post

// Response
{
  "reactions": [
    { "type": "party_popper", "count": 42 }
  ],
  "viewer": {
    "reactedTo": ["party_popper"]  // 현재 사용자가 반응한 목록
  }
}
```

**파라미터:**
- `contentType`: `blog` | `pebbles`
- `slug`: 콘텐츠 식별자 (URL-safe 문자열)

### POST /reactions/:contentType/:slug

사용자의 반응을 토글, 추가, 또는 제거합니다.

```typescript
// Request
POST /reactions/blog/my-first-post
Content-Type: application/json

{
  "reactionType": "party_popper",
  "action": "toggle"  // "toggle" | "add" | "remove"
}

// Response (성공)
{
  "reactions": [
    { "type": "party_popper", "count": 43 }
  ],
  "viewer": {
    "reactedTo": ["party_popper"]
  }
}

// Response (Rate limit 초과)
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retryAfter": 300
}
```

**Rate Limiting:**
- 5분 윈도우당 10개 요청
- IP 기반 제한

---

## 데이터베이스 설계

### ERD

```
┌─────────────────────────────────────────────────────────────────┐
│                       content_reactions                          │
├─────────────────────────────────────────────────────────────────┤
│ content_type  TEXT     NOT NULL  ─┐                             │
│ slug          TEXT     NOT NULL  ─┴─ PRIMARY KEY                │
│ reactions     TEXT     NOT NULL      (JSON 배열)                │
│ created_at    DATETIME                                          │
│ updated_at    DATETIME                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N (논리적)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        reaction_events                           │
├─────────────────────────────────────────────────────────────────┤
│ content_type   TEXT    NOT NULL  ─┐                             │
│ slug           TEXT    NOT NULL  ─┤                             │
│ reaction_type  TEXT    NOT NULL  ─┼─ PRIMARY KEY                │
│ user_hash      TEXT    NOT NULL  ─┘                             │
│ created_at     DATETIME                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 테이블 설명

#### content_reactions

콘텐츠별 누적 반응 통계를 저장합니다.

```sql
CREATE TABLE content_reactions (
    content_type TEXT NOT NULL,      -- 'blog' | 'pebbles'
    slug TEXT NOT NULL,               -- 포스트 식별자
    reactions TEXT NOT NULL,          -- JSON: [{"type":"party_popper","count":5}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_type, slug)
);
```

**reactions JSON 형식:**
```json
[
  { "type": "party_popper", "count": 42 }
]
```

#### reaction_events

개별 사용자의 반응 이벤트를 저장합니다. 1인 1표 시스템의 핵심입니다.

```sql
CREATE TABLE reaction_events (
    content_type TEXT NOT NULL,
    slug TEXT NOT NULL,
    reaction_type TEXT NOT NULL,     -- 'party_popper'
    user_hash TEXT NOT NULL,         -- SHA-256 해시
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_type, slug, reaction_type, user_hash)
);
```

**복합 기본 키의 의미:**
- 같은 사용자가 같은 콘텐츠의 같은 반응 타입에 중복 투표 불가
- 다른 반응 타입에는 별도로 투표 가능

### 인덱스

```sql
-- 사용자별 반응 조회 최적화
CREATE INDEX idx_reaction_events_user_hash
    ON reaction_events(user_hash);

-- 콘텐츠별 반응 조회 최적화
CREATE INDEX idx_content_reactions_type_slug
    ON content_reactions(content_type, slug);
```

---

## 미들웨어 시스템

### 미들웨어 실행 순서

```
요청 도착
    │
    ▼
┌─────────────────┐
│ CORS 미들웨어   │ ← Origin 검증, preflight 처리
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth 미들웨어   │ ← 사용자 해시 생성, 쿠키 설정
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiting   │ ← POST 요청만 (5분/10요청)
└────────┬────────┘
         │
         ▼
    라우트 핸들러
```

### CORS 미들웨어

```typescript
// middleware/cors.ts

const ALLOWED_ORIGINS = [
  "https://www.haedal.blog",
  "https://haedal.blog",
  "https://www.headal.site",
  "https://headal.site",
  "http://localhost:4321",           // 로컬 개발
  "https://personal.haedal.blog",
  "https://www.personal.haedal.blog"
];

export function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header("Origin");

  // Preflight 요청 처리
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Origin 검증
  if (ALLOWED_ORIGINS.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
  }

  return next();
}
```

### Auth 미들웨어

```typescript
// middleware/auth.ts

export async function authMiddleware(c: Context, next: Next) {
  // 1. 클라이언트 정보 수집
  const ip = c.req.header("CF-Connecting-IP")
            || c.req.header("X-Forwarded-For")
            || "unknown";
  const userAgent = c.req.header("User-Agent") || "unknown";
  const acceptLanguage = c.req.header("Accept-Language") || "unknown";
  const timezone = c.req.header("X-Timezone") || "unknown";

  // 2. 사용자 해시 생성
  const userHash = await generateUserHash(ip, userAgent, acceptLanguage, timezone);

  // 3. 기존 쿠키 확인 또는 새로 생성
  const cookies = parseCookie(c.req.header("Cookie") || "");
  let cookieValue = cookies["rxid"];

  if (!cookieValue) {
    cookieValue = await generateCookieValue();
    c.header("Set-Cookie",
      `rxid=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );
  }

  // 4. Context에 사용자 정보 저장
  c.set("userHash", userHash);
  c.set("cookieValue", cookieValue);

  return next();
}
```

### Rate Limiting

```typescript
// routes/reactions.ts (POST 핸들러 내부)

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;  // 5분
  const maxRequests = 10;

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;  // Rate limit 초과
  }

  entry.count++;
  return true;
}
```

---

## 보안 설계

### 위협 모델 및 대응

| 위협 | 대응 |
|------|------|
| CSRF | SameSite=Lax 쿠키, CORS 검증 |
| XSS | HttpOnly 쿠키 |
| DDoS | Rate limiting (5분/10요청) |
| 중복 투표 | 브라우저 지문 해싱 |
| SQL Injection | 파라미터 바인딩 (D1) |
| 입력 조작 | 정규식 기반 검증 |

### 사용자 식별 시스템

```
사용자 브라우저
    │
    │ CF-Connecting-IP
    │ User-Agent
    │ Accept-Language
    │ X-Timezone
    │
    ▼
┌─────────────────────────────────────────────────┐
│ SHA-256 해싱                                     │
│ hash = SHA256(ip:userAgent:language:timezone)  │
└────────────────────────┬────────────────────────┘
                         │
                         ▼
              익명화된 user_hash 저장
```

**특징:**
- 개인 식별 정보 저장 안함
- 같은 브라우저/네트워크에서는 동일 해시
- VPN/브라우저 변경 시 다른 해시 (의도적)

### 입력 검증

```typescript
// utils/validation.ts

// 콘텐츠 타입 검증
export function validateContentType(contentType: string): boolean {
  return ["blog", "pebbles"].includes(contentType);
}

// 반응 타입 검증
export function validateReactionType(reactionType: string): boolean {
  return ["party_popper"].includes(reactionType);
}

// 슬러그 검증 (한글 지원)
export function validateSlug(slug: string): boolean {
  const pattern = /^[a-zA-Z0-9가-힣\-_]+$/;
  return pattern.test(slug) && slug.length >= 1 && slug.length <= 200;
}

// 입력 정제
export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 200);
}
```

---

## 데이터 흐름

### GET 요청 흐름

```
GET /reactions/blog/my-post
         │
         ▼
┌─────────────────────────┐
│ 입력 검증               │
│ - contentType 유효?     │
│ - slug 유효?            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ D1 쿼리                 │
│ SELECT * FROM           │
│ content_reactions       │
│ WHERE content_type = ?  │
│ AND slug = ?            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 사용자 반응 조회        │
│ SELECT reaction_type    │
│ FROM reaction_events    │
│ WHERE user_hash = ?     │
│ AND content_type = ?    │
│ AND slug = ?            │
└───────────┬─────────────┘
            │
            ▼
     JSON 응답 반환
```

### POST 요청 흐름 (토글)

```
POST /reactions/blog/my-post
{ "reactionType": "party_popper", "action": "toggle" }
         │
         ▼
┌─────────────────────────┐
│ Rate Limit 체크         │
│ 5분/10요청 초과?        │
└───────────┬─────────────┘
            │ OK
            ▼
┌─────────────────────────┐
│ 기존 반응 확인          │
│ SELECT FROM             │
│ reaction_events         │
│ WHERE user_hash = ?     │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
 반응 있음      반응 없음
    │               │
    ▼               ▼
┌─────────┐   ┌─────────┐
│ 삭제    │   │ 삽입    │
│ DELETE  │   │ INSERT  │
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────┐
│ 카운트 재계산           │
│ SELECT COUNT(*)         │
│ FROM reaction_events    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ content_reactions       │
│ 업데이트                │
│ INSERT OR REPLACE       │
└───────────┬─────────────┘
            │
            ▼
     JSON 응답 반환
```

### 원자적 트랜잭션

```typescript
// D1 batch로 원자성 보장
await c.env.haedal_db.batch([
  // 1. 이벤트 삽입/삭제
  db.prepare("INSERT INTO reaction_events ...").bind(...),

  // 2. 카운트 업데이트
  db.prepare("INSERT OR REPLACE INTO content_reactions ...").bind(...),
]);
```

---

## 배포 및 운영

### Wrangler 설정

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "backend",
  "main": "src/index.ts",
  "compatibility_date": "2025-12-05",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "FRONTEND_URL": "https://www.haedal.blog",
    "ENVIRONMENT": "production"
  },

  "env": {
    "development": {
      "vars": {
        "FRONTEND_URL": "http://localhost:4321",
        "ENVIRONMENT": "development"
      }
    }
  },

  "d1_databases": [
    {
      "binding": "haedal_db",
      "database_name": "haedal-db",
      "database_id": "147846a7-b714-49aa-8fd3-c2462325ffb4",
      "remote": true
    }
  ]
}
```

### 배포 명령어

```bash
# 개발 서버 실행
pnpm dev

# 프로덕션 배포
pnpm deploy

# 타입 생성
pnpm cf-typegen
```

### D1 마이그레이션

```bash
# 마이그레이션 실행
wrangler d1 migrations apply haedal-db

# 로컬 DB에 적용
wrangler d1 migrations apply haedal-db --local

# 원격 DB에 적용 (프로덕션)
wrangler d1 migrations apply haedal-db --remote
```

### 모니터링

Cloudflare Dashboard에서 확인 가능:
- 요청 수
- 오류율
- 레이턴시
- D1 쿼리 통계

---

## 확장 가이드

### 새 반응 타입 추가

1. **타입 정의 업데이트**
```typescript
// types/reactions.ts
export const REACTION_TYPES = ["party_popper", "heart", "fire"] as const;
```

2. **검증 함수는 자동 업데이트됨**
```typescript
export function validateReactionType(type: string): boolean {
  return REACTION_TYPES.includes(type as any);
}
```

### 새 콘텐츠 타입 추가

1. **타입 정의 업데이트**
```typescript
// types/reactions.ts
export const CONTENT_TYPES = ["blog", "pebbles", "log"] as const;
```

2. **Frontend와 스키마 동기화 필요**

### 성능 최적화 포인트

1. **캐싱 추가**
```typescript
// KV 또는 Cache API 활용
const cacheKey = `reactions:${contentType}:${slug}`;
const cached = await c.env.CACHE.get(cacheKey);
if (cached) return c.json(JSON.parse(cached));
```

2. **배치 조회**
```typescript
// 여러 콘텐츠의 반응을 한 번에 조회
GET /reactions/batch?ids=blog/a,blog/b,pebbles/c
```

---

## 관련 문서

- [루트 아키텍처](../../ARCHITECTURE.md)
- [Frontend 아키텍처](../frontend/ARCHITECTURE.md)
- [개발 가이드](../../CLAUDE.md)
