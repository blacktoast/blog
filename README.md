# Retto's Blog

Astro 기반의 정적 블로그 사이트입니다. Cloudflare Workers에 배포되며, MDX와 Markdown을 지원합니다.

## 기술 스택

### 핵심 프레임워크

- **[Astro](https://astro.build/)** `^5.15.7` - 정적 사이트 생성기
- **[TypeScript](https://www.typescriptlang.org/)** `^5.9.3` - 타입 안정성

### 스타일링

- **[Tailwind CSS](https://tailwindcss.com/)** `^4.1.17` - 유틸리티 기반 CSS 프레임워크
- **[@tailwindcss/typography](https://tailwindcss.com/docs/plugins/typography)** - 타이포그래피 플러그인

### 애니메이션

- **[Motion](https://motion.dev/)** `^12.23.24` - 웹 애니메이션 라이브러리

### 배포 및 호스팅

- **[Cloudflare Workers](https://workers.cloudflare.com/)** - 엣지 컴퓨팅 플랫폼
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** `^4.48.0` - Cloudflare Workers 개발 도구

### 콘텐츠 처리

- **[@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/)** - MDX 지원
- **[Shiki](https://shiki.matsu.io/)** - 코드 하이라이팅
- **[remark-toc](https://github.com/remarkjs/remark-toc)** - 목차 자동 생성
- **[remark-breaks](https://github.com/remarkjs/remark-breaks)** - 줄바꿈 처리

### 기타

- **[Astro Icon](https://www.astroicon.dev/)** - 아이콘 컴포넌트
- **[Sharp](https://sharp.pixelplumbing.com/)** - 이미지 처리
- **[Satori](https://github.com/vercel/satori)** - OG 이미지 생성
- **[Biome](https://biomejs.dev/)** - 린터 및 포매터

## 사전 요구사항

- **Node.js** 18.x 이상
- **Yarn** 4.11.0 (패키지 매니저)
- **Bun** (스크립트 실행용, 선택사항)

## 설치

```bash
# 의존성 설치
yarn install
```

## 개발

### 로컬 개발 서버 실행

```bash
yarn dev
```

개발 서버는 기본적으로 `http://localhost:4321`에서 실행됩니다.

### 빌드

```bash
yarn build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

### 프리뷰

```bash
yarn preview
```

빌드된 사이트를 로컬에서 미리볼 수 있습니다.

## 스크립트

### 콘텐츠 동기화

```bash
yarn sync
```

`script/main.ts`를 실행하여 콘텐츠를 동기화합니다. (Bun 사용)
`.env` 파일에 환경 변수를 설정할 수 있습니다.

### 테스트

```bash
yarn test
```

Bun을 사용하여 테스트를 실행합니다.

### 배포

```bash
yarn deploy
```

프로덕션 빌드를 생성하고 Cloudflare Workers에 배포합니다.

## 환경 변수

### Cloudflare Workers 환경 변수

Cloudflare Workers의 환경 변수는 Wrangler CLI를 통해 설정하거나, Cloudflare 대시보드에서 설정할 수 있습니다.

#### 로컬 개발용 환경 변수

로컬 개발 시 `.dev.vars` 파일을 프로젝트 루트에 생성하여 환경 변수를 설정할 수 있습니다:

```bash
# .dev.vars
# Cloudflare Workers 환경 변수 예시
# KV_NAMESPACE_ID=your-kv-namespace-id
# R2_BUCKET_NAME=your-r2-bucket-name
```

#### Wrangler 설정

`wrangler.jsonc` 파일에서 기본 설정을 관리합니다:

```jsonc
{
  "main": "worker/index.ts",
  "name": "blog",
  "compatibility_date": "2025-11-14",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist",
  },
  "observability": {
    "enabled": true,
  },
}
```

### 환경 변수 설정 방법

1. **로컬 개발**: `.dev.vars` 파일 생성
2. **프로덕션**: Cloudflare 대시보드에서 설정하거나 `wrangler secret put` 명령어 사용

```bash
# 환경 변수 설정 예시
npx wrangler secret put YOUR_SECRET_NAME
```

## 프로젝트 구조

```
.
├── public/              # 정적 파일 (이미지, 폰트 등)
├── src/
│   ├── assets/         # 소스 이미지
│   ├── components/     # Astro 컴포넌트
│   ├── content/        # 콘텐츠 파일 (blog, log, pebbles)
│   ├── layouts/        # 레이아웃 컴포넌트
│   ├── pages/          # 페이지 라우트
│   ├── styles/         # 전역 스타일
│   └── config.ts       # 사이트 설정
├── script/             # 콘텐츠 동기화 스크립트
├── worker/             # Cloudflare Workers 엔트리 포인트
├── astro.config.mjs    # Astro 설정
├── wrangler.jsonc      # Wrangler 설정
└── package.json        # 프로젝트 의존성
```

## 주요 기능

- 📝 **MDX 및 Markdown 지원** - 콘텐츠 작성
- 🎨 **다크 모드** - 테마 전환
- 📱 **반응형 디자인** - 모바일 최적화
- 🎯 **SEO 최적화** - 메타 태그 및 sitemap 자동 생성
- 📊 **RSS 피드** - 블로그 구독 지원
- 🖼️ **OG 이미지 자동 생성** - 소셜 미디어 공유 최적화
- ⚡ **엣지 배포** - Cloudflare Workers를 통한 빠른 로딩

## 라이선스

이 프로젝트는 개인 블로그 프로젝트입니다.
