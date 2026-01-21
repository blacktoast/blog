# Frontend Architecture

이 문서는 Haedal Blog Frontend의 상세 아키텍처를 설명합니다.

## 목차

- [개요](#개요)
- [디렉토리 구조](#디렉토리-구조)
- [페이지 라우팅](#페이지-라우팅)
- [컴포넌트 시스템](#컴포넌트-시스템)
- [콘텐츠 시스템](#콘텐츠-시스템)
- [스타일링 시스템](#스타일링-시스템)
- [콘텐츠 동기화](#콘텐츠-동기화)
- [빌드 및 배포](#빌드-및-배포)

---

## 개요

Frontend는 **Astro 5**를 기반으로 한 정적 사이트 생성기입니다. Islands Architecture를 활용하여 대부분의 콘텐츠는 정적 HTML로 제공하고, 상호작용이 필요한 부분만 Preact로 하이드레이션합니다.

### 핵심 설계 원칙

1. **Zero JavaScript by Default**: 정적 콘텐츠는 JS 없이 렌더링
2. **Progressive Enhancement**: 필요한 곳에만 상호작용 추가
3. **Content-First**: 마크다운 기반 콘텐츠 관리
4. **Edge-Optimized**: Cloudflare Workers에 최적화된 배포

---

## 디렉토리 구조

```
apps/frontend/
├── src/
│   ├── assets/                    # 이미지 자산
│   │   ├── blog-image/            # 블로그 포스트 이미지
│   │   ├── pebble-image/          # 펄 이미지
│   │   ├── log-image/             # 로그 이미지
│   │   └── icons/                 # SVG 아이콘
│   │
│   ├── components/                # UI 컴포넌트 (35개+)
│   │   ├── *.astro                # 정적 Astro 컴포넌트
│   │   └── reaction-party/        # Preact 반응 시스템
│   │       ├── ReactionParty.tsx  # 메인 컴포넌트
│   │       ├── useReactionParty.ts # 상태 관리 훅
│   │       ├── partyAnimation.ts  # 파티클 물리
│   │       └── types.ts           # 타입 정의
│   │
│   ├── content/                   # 마크다운 콘텐츠
│   │   ├── blog/                  # 블로그 포스트 (*.md, *.mdx)
│   │   ├── pebbles/               # 짧은 메모
│   │   └── log/                   # 일일 로그
│   │
│   ├── layouts/                   # 페이지 레이아웃
│   │   ├── Layout.astro           # 기본 레이아웃
│   │   └── BlogPost.astro         # 포스트 레이아웃
│   │
│   ├── pages/                     # 라우트 정의
│   │   ├── index.astro            # 홈페이지
│   │   ├── about.astro            # 소개
│   │   ├── blog/                  # 블로그 라우트
│   │   ├── pebbles/               # 펄 라우트
│   │   └── log/                   # 로그 라우트
│   │
│   ├── styles/                    # 전역 스타일
│   │   ├── global.css             # Tailwind + 테마 변수
│   │   └── typography.css         # 프로즈 스타일
│   │
│   ├── config.ts                  # 사이트 설정
│   ├── constants.ts               # 상수 정의
│   └── content.config.ts          # 콘텐츠 스키마
│
├── script/                        # 콘텐츠 동기화 (Bun)
│   ├── main.ts                    # 진입점 (624줄)
│   ├── parse-blog.ts              # 블로그 파싱
│   ├── parse-log.ts               # 로그 파싱
│   ├── parse-image.ts             # 이미지 처리
│   └── utils/                     # 유틸리티
│
├── public/                        # 정적 자산
│   ├── fonts/                     # 웹폰트
│   └── toggle-theme.js            # 테마 토글
│
├── worker/                        # Cloudflare Worker
│   └── index.ts                   # 진입점
│
├── astro.config.mjs               # Astro 설정
├── tsconfig.json                  # TypeScript 설정
└── wrangler.jsonc                 # Cloudflare 설정
```

---

## 페이지 라우팅

### 라우트 맵

| URL 패턴 | 파일 | 설명 |
|----------|------|------|
| `/` | `index.astro` | 홈페이지 (다국어 제목 회전) |
| `/about` | `about.astro` | 소개 페이지 |
| `/writing` | `writing.astro` | "작성 중" 플레이스홀더 |
| `/blog` | `blog/[...page].astro` | 블로그 목록 (페이지네이션) |
| `/blog/:slug` | `blog/[...slug]/index.astro` | 개별 포스트 |
| `/blog/og/:slug.png` | `blog/og/[...slug].png.ts` | OG 이미지 생성 |
| `/pebbles` | `pebbles/[...page].astro` | 펄 목록 |
| `/pebbles/:slug` | `pebbles/[...slug].astro` | 개별 펄 |
| `/log` | `log/index.astro` | 최근 30개 로그 |
| `/log/:year` | `log/[year]/index.astro` | 연도별 로그 |
| `/log/:year/:month` | `log/[year]/[month]/index.astro` | 월별 로그 |
| `/rss.xml` | `rss.xml.js` | RSS 피드 |

### 동적 라우팅 패턴

```typescript
// blog/[...page].astro - 페이지네이션
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection("blog");
  return paginate(posts, { pageSize: 10 });
}

// blog/[...slug]/index.astro - 개별 포스트
export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}
```

### 홈페이지 다국어 제목

```typescript
// index.astro - 5가지 언어 회전
const titles = [
  { text: "Growing Giant", font: "HomeHello" },    // English
  { text: "成長する巨人", font: "NotoSerifJP" },    // Japanese
  { text: "成长中的巨人", font: "NotoSerifSC" },    // Chinese
  { text: "Grandir Géant", font: "DMSerifDisplay" }, // French
  { text: "Voksende Kjempe", font: "DMSerifDisplay" }, // Norwegian
];
// 5초마다 자동 전환
```

---

## 컴포넌트 시스템

### Astro 정적 컴포넌트

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `Layout` | `layouts/Layout.astro` | HTML 구조, 메타태그, 테마 |
| `BlogPost` | `layouts/BlogPost.astro` | 포스트 레이아웃, TOC |
| `Header` | `components/Header.astro` | 네비게이션, 모바일 메뉴 |
| `Footer` | `components/Footer.astro` | 저작권 정보 |
| `BaseHead` | `components/BaseHead.astro` | SEO 메타태그 |
| `FormattedDate` | `components/FormattedDate.astro` | 날짜 포맷팅 |
| `LogEntry` | `components/LogEntry.astro` | 로그 엔트리 (날씨 파싱) |
| `DynamicProgressBar` | `components/DynamicProgressBar.astro` | 진행률 + TOC 드롭다운 |

### Preact 반응형 컴포넌트

#### ReactionParty 시스템

```
components/reaction-party/
├── ReactionParty.tsx      # 메인 UI 컴포넌트
├── useReactionParty.ts    # 상태 관리 커스텀 훅
├── partyAnimation.ts      # 파티클 물리 애니메이션
├── types.ts               # TypeScript 타입 정의
└── index.ts               # 공개 API
```

**상태 머신:**
```typescript
type State =
  | { phase: "LOADING" }
  | { phase: "IDLE"; reactions: Reaction[]; userReacted: string[] }
  | { phase: "TOGGLE_START"; reactions: Reaction[]; userReacted: string[] }
  | { phase: "TOGGLE_SUCCESS"; reactions: Reaction[]; userReacted: string[] }
  | { phase: "ERROR"; message: string };
```

**파티클 물리:**
```typescript
// 중력 시뮬레이션
const gravity = 800; // px/s²
const friction = 0.98;

// 각 파티클: 다양한 각도 + 속도
for (let i = 0; i < 12; i++) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 200 + Math.random() * 300;
  particles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.0,
  });
}
```

### DynamicProgressBar 컴포넌트

**기능:**
- 스크롤 진행률 원형 표시
- "Dynamic Island" 스타일 TOC
- 활성 섹션 자동 추적
- 클릭으로 확장/축소
- 헤더 가시성 기반 표시/숨김

```astro
<!-- 사용 예시 -->
<DynamicProgressBar headings={headings} />
```

### Header 모바일 메뉴

```typescript
// motion 라이브러리로 애니메이션
import { animate } from "motion";

// 메뉴 열기
animate(menu, {
  height: [0, targetHeight],
  opacity: [0, 1],
}, {
  duration: 0.3,
  easing: [0.4, 0, 0.2, 1],
});
```

---

## 콘텐츠 시스템

### 콘텐츠 컬렉션 스키마

```typescript
// content.config.ts

// 블로그 스키마
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    heroImage: image().optional(),
  }),
});

// 펄 스키마
const pebbles = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// 로그 스키마
const log = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    weather: z.string().optional(),  // "[Korea]: morning-Sunny 15°C|..."
  }),
});
```

### 마크다운 처리 파이프라인

```
원본 마크다운
    │
    ▼
┌─────────────────────┐
│ remark-breaks       │ ← 줄바꿈 처리
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ remark-toc          │ ← 목차 자동 생성
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ remark-math         │ ← LaTeX 수식 파싱
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ rehype-katex        │ ← KaTeX 렌더링
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Shiki               │ ← 코드 하이라이팅
│ - min-light (light) │
│ - night-owl (dark)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Transformers        │ ← 코드 어노테이션
│ - highlight         │    // [!code highlight]
│ - word-highlight    │    // [!code word:xxx]
│ - diff              │    // [!code ++] / [!code --]
└─────────────────────┘
```

### OG 이미지 생성

```typescript
// blog/og/[...slug].png.ts
import satori from "satori";

export const GET: APIRoute = async ({ params }) => {
  const post = await getEntry("blog", params.slug);

  const svg = await satori(
    <OGTemplate title={post.data.title} />,
    {
      width: 1200,
      height: 630,
      fonts: [/* 폰트 로드 */],
    }
  );

  // SVG → PNG 변환
  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000",
    },
  });
};
```

---

## 스타일링 시스템

### Tailwind CSS v4 설정

```javascript
// astro.config.mjs
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### 테마 시스템

```css
/* global.css */

/* 라이트 테마 (Summer Sea) */
:root {
  --background: #e0f7fa;
  --foreground: #1d3557;
  --accent: #0288d1;
  --muted: #457b9d;
  --border: rgba(29, 53, 87, 0.15);
}

/* 다크 테마 (Haedal) */
html[data-theme="dark"] {
  --background: #0b1421;
  --foreground: #f6f7fb;
  --accent: #f9a826;
  --muted: rgba(236, 242, 255, 0.75);
  --border: rgba(255, 255, 255, 0.06);
}
```

### 배경 그래디언트

```css
body {
  background:
    radial-gradient(ellipse at 30% 20%, var(--bg-gradient-1) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, var(--bg-gradient-2) 0%, transparent 50%),
    linear-gradient(180deg, var(--bg-base) 0%, var(--bg-end) 100%);
  background-attachment: fixed;
}
```

### 프로즈 스타일

```css
/* typography.css */
.app-prose {
  @apply prose prose-slate dark:prose-invert;

  /* 링크 스타일 */
  a {
    @apply text-accent decoration-dashed underline-offset-4;
  }

  /* 코드 블록 */
  pre {
    @apply bg-muted/20 border border-border;
  }

  /* 이미지 */
  img {
    @apply border border-border mx-auto;
  }
}
```

### 커스텀 유틸리티

```css
@utility max-w-app {
  @apply max-w-3xl;
}

.active-nav {
  @apply underline decoration-wavy;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  /* 스크린 리더 전용 */
}
```

---

## 콘텐츠 동기화

### 동기화 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                    콘텐츠 동기화 시스템                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  환경 변수 설정                                                 │
│  ├─ PATH_ROOT: 소스 루트 디렉토리                               │
│  ├─ PATH_BLOG: 블로그 소스 경로                                 │
│  └─ PATH_LOG: 로그 소스 경로                                    │
│                                                                 │
│          ▼                                                      │
│                                                                 │
│  ┌─────────────────┐                                            │
│  │ 파일 수집       │ collectMarkdownFiles()                     │
│  │ (.md, .mdx)     │                                            │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ 문서 파싱       │ loadNoteDocument()                         │
│  │ - 프론트매터    │ - parseFrontmatter()                       │
│  │ - 메타데이터    │ - extractTitle/Tags/Date()                 │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ 발행 필터링     │ published: true 만 처리                    │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ 이미지 처리     │ processEmbeddedImages()                    │
│  │ - WebP 변환     │ - sharp (quality: 80)                      │
│  │ - 리사이즈      │ - ![[img|300]] 지원                        │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ 링크 변환       │ rewriteNoteBody()                          │
│  │ [[wiki-link]]   │ → [text](url)                              │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ 파일 출력       │ src/content/{blog,pebbles,log}/            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Wiki-Link 해석

```typescript
// 링크 해석 우선순위
1. blogReferenceMap    → /blog/{slug}
2. sourceReferenceMap  → /blog/{slug} (발행됨) or /writing (미발행)
3. pebbleReferenceMap  → /pebbles/{slug}
4. rootDir 검색        → 재귀 검색 + 캐싱
5. 폴백                → /writing
```

### 이미지 처리

```typescript
// ![[image.jpg|300]] 형식 지원

// 지원 확장자
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp",
                    ".tiff", ".webp", ".svg", ".avif"];

// 출력 구조
// 블로그: src/assets/blog-image/{slug}/1.webp
// 로그:   src/assets/log-image/{YYYY-MM-DD}/1.webp
// 펄:    src/assets/pebble-image/{slug}/1.webp
```

---

## 빌드 및 배포

### 빌드 설정

```javascript
// astro.config.mjs
export default defineConfig({
  site: "https://headal.site/",
  adapter: cloudflare(),
  integrations: [mdx(), sitemap(), icon(), preact()],
});
```

### Wrangler 설정

```jsonc
// wrangler.jsonc
{
  "main": "worker/index.ts",
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist"
  },
  "env": {
    "main": {
      "name": "blog",
      "vars": { "PUBLIC_TYPE": "main" },
      "routes": [{ "pattern": "haedal.blog" }]
    },
    "personal": {
      "name": "personal-blog",
      "vars": { "PUBLIC_TYPE": "personal" },
      "routes": [{ "pattern": "personal.haedal.blog" }]
    }
  }
}
```

### 배포 명령어

```bash
# 개발
pnpm dev                # http://localhost:4321

# 빌드
pnpm build              # dist/ 생성

# 배포
pnpm deploy             # main 환경
pnpm deploy:personal    # personal 환경

# 콘텐츠 동기화 + 커밋 + 푸시
pnpm doc:update
```

### 환경별 콘텐츠 필터링

```typescript
// PUBLIC_TYPE 환경 변수로 분기
const isPersonal = import.meta.env.PUBLIC_TYPE === "personal";

// 펄 필터링
const pebbles = isPersonal
  ? allPebbles
  : allPebbles.filter((p) => !PERSONAL_TAGS.includes(p.data.tags[0]));
```

---

## 성능 최적화

### Islands Architecture

```astro
<!-- 정적 콘텐츠 (JS 없음) -->
<Header />
<article>{content}</article>

<!-- 상호작용 필요 (Preact 하이드레이션) -->
<ReactionParty client:load contentType="blog" slug={slug} />
```

### 폰트 최적화

```html
<!-- 중요 폰트: preload -->
<link rel="preload" href="/fonts/SUIT.woff2" as="font" crossorigin />

<!-- 다국어 폰트: 조건부 로드 -->
<link rel="preload" href="/fonts/NotoSerifJP.woff2" as="font" crossorigin />
```

### 이미지 최적화

- WebP 변환 (quality: 80)
- 자동 리사이즈
- Astro Image 컴포넌트 활용

### 캐싱 전략

| 자산 | 캐시 설정 |
|------|----------|
| HTML | No cache |
| CSS/JS | 1년 (hash 기반) |
| OG 이미지 | 1년 (불변) |
| 폰트 | 1년 |

---

## 관련 문서

- [루트 아키텍처](../../ARCHITECTURE.md)
- [Backend 아키텍처](../backend/ARCHITECTURE.md)
- [개발 가이드](../../CLAUDE.md)
