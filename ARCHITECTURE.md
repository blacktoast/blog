# Architecture Overview

이 문서는 Haedal Blog 프로젝트의 전체 아키텍처를 설명합니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [모노레포 구조](#모노레포-구조)
- [시스템 아키텍처](#시스템-아키텍처)
- [데이터 흐름](#데이터-흐름)
- [배포 아키텍처](#배포-아키텍처)
- [개발 워크플로우](#개발-워크플로우)

---

## 프로젝트 개요

Haedal Blog는 **Astro** 기반의 정적 사이트 생성기와 **Hono** API 서버로 구성된 모노레포 블로그 플랫폼입니다. Cloudflare Workers에 배포되어 전 세계 엣지에서 빠른 응답을 제공합니다.

### 핵심 특징

- **정적 사이트 생성**: Astro를 통한 빌드 타임 HTML 생성
- **Islands Architecture**: 필요한 곳에만 JavaScript (Preact)
- **콘텐츠 동기화**: 외부 마크다운 소스에서 자동 콘텐츠 가져오기
- **반응 시스템**: D1 데이터베이스 기반 사용자 반응 기능
- **다중 환경**: main/personal 두 개의 배포 환경 지원

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Astro | 5.15.7 | 정적 사이트 생성기 |
| Preact | 10.28.0 | 경량 반응형 컴포넌트 |
| Tailwind CSS | 4.1.17 | 유틸리티 기반 스타일링 |
| TypeScript | 5.9.3 | 타입 안전성 |
| MDX | - | 마크다운 + JSX |
| Shiki | - | 코드 신택스 하이라이팅 |
| KaTeX | 0.16.25 | 수학 수식 렌더링 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Hono | 4.10.7 | 경량 웹 프레임워크 |
| Cloudflare D1 | - | SQLite 기반 데이터베이스 |
| Cloudflare Workers | - | 서버리스 컴퓨팅 |

### 빌드/배포

| 도구 | 버전 | 용도 |
|------|------|------|
| pnpm | 10.24.0 | 패키지 관리자 |
| Wrangler | 4.48.0 | Cloudflare 배포 CLI |
| Bun | - | 스크립트 런타임 |

---

## 모노레포 구조

```
blog/
├── apps/
│   ├── frontend/              # Astro 정적 사이트
│   │   ├── src/
│   │   │   ├── components/    # UI 컴포넌트
│   │   │   ├── content/       # 마크다운 콘텐츠
│   │   │   ├── layouts/       # 페이지 레이아웃
│   │   │   ├── pages/         # 라우트 정의
│   │   │   └── styles/        # 전역 스타일
│   │   ├── script/            # 콘텐츠 동기화 스크립트
│   │   ├── public/            # 정적 자산
│   │   └── worker/            # Cloudflare Worker 진입점
│   │
│   └── backend/               # Hono API 서버
│       ├── src/
│       │   ├── routes/        # API 라우트
│       │   ├── middleware/    # 미들웨어
│       │   ├── types/         # 타입 정의
│       │   └── utils/         # 유틸리티
│       └── migrations/        # D1 마이그레이션
│
├── package.json               # 루트 워크스페이스 설정
├── pnpm-workspace.yaml        # pnpm 워크스페이스 정의
├── CLAUDE.md                  # Claude AI 개발 가이드
└── ARCHITECTURE.md            # 이 문서
```

### 워크스페이스 설정

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
```

각 앱은 독립적인 `package.json`을 가지며, 루트에서 통합 명령을 실행할 수 있습니다.

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │   Frontend Worker   │       │   Backend Worker    │         │
│  │   (Astro Static)    │       │   (Hono API)        │         │
│  │                     │       │                     │         │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │         │
│  │  │ Static Assets │  │       │  │ Reactions API │  │         │
│  │  │  - HTML       │  │       │  └───────┬───────┘  │         │
│  │  │  - CSS        │  │       │          │          │         │
│  │  │  - JS         │  │       │  ┌───────▼───────┐  │         │
│  │  │  - Images     │  │       │  │   D1 SQLite   │  │         │
│  │  └───────────────┘  │       │  └───────────────┘  │         │
│  └─────────────────────┘       └─────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                          사용자 브라우저                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Preact Islands                        │   │
│  │  - ReactionParty (반응 버튼)                             │   │
│  │  - Header (모바일 메뉴)                                  │   │
│  │  - DynamicProgressBar (TOC)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 컴포넌트 상호작용

1. **정적 콘텐츠 제공**: Cloudflare Workers가 빌드된 HTML/CSS/JS 제공
2. **클라이언트 하이드레이션**: Preact 컴포넌트가 필요한 곳에서만 활성화
3. **API 호출**: 반응 시스템이 Backend Worker의 API 호출
4. **데이터 저장**: D1 데이터베이스에 반응 데이터 영구 저장

---

## 데이터 흐름

### 콘텐츠 동기화 파이프라인

```
외부 마크다운 소스
        │
        ▼
┌───────────────────┐
│ collectMarkdownFiles │ ← 파일 수집 (재귀)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ loadNoteDocument  │ ← 프론트매터 파싱
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ processEmbeddedImages │ ← 이미지 WebP 변환
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ rewriteNoteBody   │ ← [[wiki-link]] → [markdown](link)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 파일 출력         │ → src/content/{blog,pebbles,log}/
└───────────────────┘
```

### 콘텐츠 컬렉션

| 컬렉션 | 경로 | 용도 |
|--------|------|------|
| **blog** | `src/content/blog/` | 전체 블로그 포스트 |
| **pebbles** | `src/content/pebbles/` | 짧은 메모/TIL |
| **log** | `src/content/log/` | 일일 로그 (날씨 포함) |

### 반응 시스템 데이터 흐름

```
사용자 클릭
    │
    ▼
┌─────────────────┐
│ ReactionParty   │ ← Preact 컴포넌트
│ (낙관적 업데이트) │
└────────┬────────┘
         │ POST /reactions/:contentType/:slug
         ▼
┌─────────────────┐
│ CORS 미들웨어   │ ← Origin 검증
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth 미들웨어   │ ← 브라우저 지문 해싱
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiting   │ ← 5분/10요청
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ D1 트랜잭션     │ ← 원자적 업데이트
│ - reaction_events │
│ - content_reactions │
└────────┬────────┘
         │
         ▼
    JSON 응답
```

---

## 배포 아키텍처

### 다중 환경 배포

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐   ┌───────────────────────┐     │
│  │      main 환경        │   │    personal 환경      │     │
│  │  haedal.blog          │   │  personal.haedal.blog │     │
│  │                       │   │                       │     │
│  │  - 공개 블로그        │   │  - 공개 + 개인 콘텐츠 │     │
│  │  - 일반 콘텐츠        │   │  - 개인 태그 표시     │     │
│  │  - PUBLIC_TYPE=main   │   │  - PUBLIC_TYPE=personal│     │
│  └───────────────────────┘   └───────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐                                  │
│  │    Backend Worker     │                                  │
│  │    (공유)             │                                  │
│  │                       │                                  │
│  │  - /reactions API     │                                  │
│  │  - D1 데이터베이스    │                                  │
│  └───────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 배포 명령어

```bash
# Frontend 배포
pnpm deploy              # main 환경 (haedal.blog)
pnpm deploy:personal     # personal 환경 (personal.haedal.blog)

# Backend 배포
cd apps/backend
pnpm deploy              # backend 워커
```

### 캐싱 전략

| 자산 유형 | 캐시 설정 | 설명 |
|----------|----------|------|
| HTML | No cache | 항상 최신 콘텐츠 |
| CSS/JS | 1년 (hash) | 파일명에 해시 포함 |
| OG 이미지 | 1년 | 불변 캐시 |
| 폰트 | 1년 | 정적 자산 |

---

## 개발 워크플로우

### 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. Frontend 개발 서버 (http://localhost:4321)
pnpm dev

# 3. Backend 개발 서버 (별도 터미널)
pnpm dev:backend

# 4. 콘텐츠 동기화 (필요시)
pnpm sync
```

### 콘텐츠 작성 워크플로우

```
1. 외부 마크다운 소스에서 글 작성
   └─ published: true 설정

2. pnpm sync 실행
   ├─ 마크다운 파싱
   ├─ 이미지 WebP 변환
   ├─ wiki-link 변환
   └─ src/content/ 에 출력

3. pnpm dev로 로컬 확인

4. git push로 배포
```

### 디렉토리별 역할 요약

| 디렉토리 | 역할 | 주요 기술 |
|----------|------|----------|
| `apps/frontend/src/pages/` | URL 라우팅 | Astro |
| `apps/frontend/src/components/` | UI 컴포넌트 | Astro + Preact |
| `apps/frontend/src/content/` | 마크다운 콘텐츠 | Zod 스키마 |
| `apps/frontend/script/` | 콘텐츠 동기화 | Bun + TypeScript |
| `apps/backend/src/routes/` | API 엔드포인트 | Hono |
| `apps/backend/migrations/` | DB 스키마 | SQL |

---

## 추가 문서

- [Frontend 아키텍처](./apps/frontend/ARCHITECTURE.md)
- [Backend 아키텍처](./apps/backend/ARCHITECTURE.md)
- [개발 가이드](./CLAUDE.md)
