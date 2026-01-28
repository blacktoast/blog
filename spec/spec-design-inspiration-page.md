---
title: 영감(Inspiration) 페이지 디자인 명세서
version: 1.0
date_created: 2026-01-27
last_updated: 2026-01-27
tags: [design, frontend, page, preact, component]
---

# Introduction

블로그에 "영감" 페이지를 추가하여 사용자가 영감을 받은 웹사이트들을 시각적으로 매력적인 카드 형태로 전시합니다. 각 카드는 마우스 움직임에 반응하는 스포트라이트 효과를 가지며, GIF 프리뷰를 통해 사이트의 분위기를 보여줍니다.

## 1. Purpose & Scope

### 목적
- 영감을 받은 웹사이트들을 수집하고 전시하는 전용 페이지 제공
- 인터랙티브한 스포트라이트 카드 UI로 시각적 매력 극대화
- 헤더 네비게이션에 쉬운 접근성 제공

### 범위

**포함:**
- `/inspiration` 라우트의 Astro 페이지
- Preact 기반 SpotlightCard 컴포넌트
- 헤더에 lightbulb 아이콘 네비게이션 추가
- 다크/라이트/스프링 테마 지원

**제외:**
- 백엔드 API 연동 (정적 데이터 사용)
- 카드 필터링/검색 기능
- 동적 데이터 수정 기능

### 대상 사용자
- 블로그 방문자
- 블로그 운영자 (데이터 관리)

### 가정
- GIF 파일은 `/public/inspiration/` 디렉토리에 사전 배치
- 데이터는 컴포넌트 내부에 하드코딩
- 기존 테마 시스템(light, dark, spring) 활용

## 2. Definitions

| 용어 | 설명 |
|------|------|
| SpotlightCard | 마우스 위치를 추적하여 동적 조명 효과를 생성하는 카드 컴포넌트 |
| GIF Preview | 사이트의 동적 모습을 보여주는 애니메이션 이미지 |
| Origin | URL에서 scheme, www, 경로 파라미터를 제외한 도메인 부분 (예: `example.com`) |
| Preact | React와 API 호환되는 경량 프레임워크, 프로젝트에서 인터랙티브 컴포넌트에 사용 |

## 3. Requirements, Constraints & Guidelines

### 기능 요구사항

- **REQ-001**: `/inspiration` 라우트에 접근 가능한 Astro 페이지를 생성한다
- **REQ-002**: 페이지는 SpotlightCard 컴포넌트를 사용하여 영감 사이트 목록을 그리드 형태로 표시한다
- **REQ-003**: 각 카드는 마우스 움직임에 따라 스포트라이트 효과를 표시한다
- **REQ-004**: 카드의 GIF 이미지가 카드의 대부분 영역을 차지한다
- **REQ-005**: 카드 하단 우측에 사이트 링크를 origin 형태로 표시한다 (예: `github.com`)
- **REQ-006**: 헤더에 `lucide:lightbulb` 아이콘으로 영감 페이지 링크를 추가한다
- **REQ-007**: 카드 클릭 시 해당 사이트가 새 탭에서 열린다

### UI 요구사항

- **UI-001**: 카드는 반응형 그리드 레이아웃으로 배치한다 (모바일 1열, 태블릿 2열, 데스크톱 3열)
- **UI-002**: 카드의 기본 스타일은 제공된 SpotlightCard CSS를 기반으로 하되, 프로젝트 테마에 맞게 조정한다
- **UI-003**: 스포트라이트 효과는 마우스 진입 시 부드럽게 나타나고 (transition 0.5s), 호버 시 opacity 0.6
- **UI-004**: 카드 테두리는 `border-radius: 1.5rem`을 사용한다
- **UI-005**: GIF 이미지는 카드 상단 영역을 채우며, 하단에 origin 링크 표시 영역을 둔다

### 테마 요구사항

- **THM-001**: 라이트 테마에서 카드 배경색은 프로젝트의 `--background` 변수를 사용한다
- **THM-002**: 다크 테마에서 카드 배경색은 `#111` 또는 프로젝트의 다크 배경색을 사용한다
- **THM-003**: 스프링 테마에서 스포트라이트 색상은 `rgba(255, 143, 163, 0.25)` (핑크 계열)를 사용한다
- **THM-004**: 테두리 색상은 프로젝트의 `--border` CSS 변수를 활용한다

### 제약사항

- **CON-001**: Preact를 사용하여 컴포넌트를 구현한다 (React가 아님)
- **CON-002**: `preact/hooks`에서 `useRef`를 import한다
- **CON-003**: Astro Islands Architecture를 활용하여 클라이언트 사이드 인터랙션을 처리한다
- **CON-004**: 기존 프로젝트의 Tailwind CSS v4 및 테마 시스템과 호환되어야 한다
- **CON-005**: GIF 파일 크기는 각 30MB 이하를 권장한다

### 가이드라인

- **GUD-001**: 스포트라이트 효과는 CSS 변수와 `::before` 의사 요소를 활용하여 구현한다
- **GUD-002**: `client:visible` 디렉티브를 사용하여 뷰포트 진입 시에만 컴포넌트를 하이드레이션한다
- **GUD-003**: 링크 표시 시 `new URL(url).hostname.replace('www.', '')`으로 origin을 추출한다
- **GUD-004**: 이미지 로딩 전 스켈레톤 또는 placeholder를 고려한다

### 패턴

- **PAT-001**: 기존 `ReactionParty.tsx` 컴포넌트의 테마 감지 패턴을 참고하여 테마별 스타일 적용
- **PAT-002**: 기존 `Header.astro`의 아이콘 배치 패턴을 따라 헤더에 아이콘 추가

## 4. Interfaces & Data Contracts

### 영감 데이터 인터페이스

```typescript
interface InspirationItem {
  /** 사이트 전체 URL */
  url: string;
  /** GIF 파일 경로 (public/inspiration/ 기준) */
  gifPath: string;
  /** 선택적: 사이트 이름 (툴팁용) */
  name?: string;
}
```

### 컴포넌트 데이터 예시

```typescript
const inspirations: InspirationItem[] = [
  {
    url: "https://stripe.com",
    gifPath: "/inspiration/stripe.gif",
    name: "Stripe"
  },
  {
    url: "https://linear.app",
    gifPath: "/inspiration/linear.gif",
    name: "Linear"
  }
];
```

### SpotlightCard Props

```typescript
interface SpotlightCardProps {
  /** 카드 내부 콘텐츠 */
  children: preact.ComponentChildren;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 스포트라이트 색상 (기본값: 테마에 따라 결정) */
  spotlightColor?: string;
  /** 카드 클릭 시 이동할 URL */
  href?: string;
}
```

### 헤더 수정 위치

`Header.astro` 파일의 아이콘 버튼들 영역에 다음과 같이 추가:

```astro
<a href="/inspiration" class="p-2 text-inherit no-underline transition-colors duration-200 hover:text-accent focus-visible:text-accent" aria-label="영감">
  <Icon name="lucide:lightbulb" class="w-6 h-6" />
</a>
```

## 5. Acceptance Criteria

- **AC-001**: Given 사용자가 `/inspiration` URL에 접근할 때, When 페이지가 로드되면, Then 영감 카드 그리드가 표시된다
- **AC-002**: Given 사용자가 카드 위에 마우스를 올렸을 때, When 마우스가 움직이면, Then 스포트라이트 효과가 마우스 위치를 따라 이동한다
- **AC-003**: Given 사용자가 카드를 클릭할 때, When 클릭 이벤트가 발생하면, Then 해당 사이트가 새 탭에서 열린다
- **AC-004**: Given 헤더가 표시될 때, When 사용자가 헤더를 확인하면, Then lightbulb 아이콘이 보이고 클릭 시 `/inspiration`으로 이동한다
- **AC-005**: Given 카드에 URL이 표시될 때, When 렌더링되면, Then `www.`와 경로 파라미터가 제거된 origin만 표시된다 (예: `https://www.github.com/user` → `github.com`)
- **AC-006**: Given 다크 테마가 활성화될 때, When 영감 페이지를 볼 때, Then 카드가 다크 테마 스타일로 렌더링된다
- **AC-007**: Given 스프링 테마가 활성화될 때, When 영감 페이지를 볼 때, Then 핑크 계열 스포트라이트 색상이 적용된다
- **AC-008**: Given 모바일 기기에서 접근할 때, When 페이지가 로드되면, Then 카드가 1열로 표시되고 터치 인터랙션이 동작한다

## 6. Test Automation Strategy

### 테스트 레벨

- **Unit**: SpotlightCard 컴포넌트의 마우스 이벤트 핸들링
- **Visual**: 각 테마별 스타일 스냅샷 테스트
- **E2E**: 페이지 네비게이션 및 카드 클릭 동작

### 수동 테스트 체크리스트

- [ ] `/inspiration` 페이지 접근 가능
- [ ] 카드 호버 시 스포트라이트 효과 확인
- [ ] 카드 클릭 시 새 탭 열림 확인
- [ ] 헤더 lightbulb 아이콘 동작 확인
- [ ] 라이트/다크/스프링 테마별 스타일 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] Origin 표시 형식 확인

## 7. Rationale & Context

### 스포트라이트 효과

CSS 변수와 `radial-gradient`를 활용한 스포트라이트 효과는:
- JavaScript로 실시간 마우스 위치를 CSS 변수에 반영
- `::before` 의사 요소로 오버레이 그라데이션 생성
- 성능 최적화를 위해 `pointer-events: none`으로 이벤트 버블링 방지

### Preact 선택

프로젝트가 이미 Preact를 사용하고 있으므로 (ReactionParty.tsx 참조) 일관성을 위해 Preact로 구현합니다. React 대비 번들 크기가 작고 Astro와의 통합이 원활합니다.

### 하드코딩 데이터

Content Collection 대신 컴포넌트 내 하드코딩을 선택한 이유:
- 데이터 변경 빈도가 낮음
- 빠른 구현 가능
- 추후 필요시 Content Collection으로 마이그레이션 용이

## 8. Dependencies & External Integrations

### 기술 플랫폼 의존성

- **PLT-001**: Astro 5.x - 페이지 라우팅 및 Islands Architecture
- **PLT-002**: Preact - 인터랙티브 컴포넌트
- **PLT-003**: Tailwind CSS v4 - 스타일링
- **PLT-004**: astro-icon - Lucide 아이콘

### 프로젝트 내부 의존성

- **INT-001**: `Layout.astro` - 페이지 레이아웃
- **INT-002**: `Header.astro` - 헤더 컴포넌트 (수정 필요)
- **INT-003**: `global.css` - 테마 CSS 변수

### 에셋 의존성

- **AST-001**: GIF 이미지 파일들 (`/public/inspiration/*.gif`)
- **AST-002**: Lucide lightbulb 아이콘 (`lucide:lightbulb`)

## 9. Examples & Edge Cases

### Origin 추출 예시

```typescript
// URL -> 표시될 Origin
"https://www.github.com/user/repo" -> "github.com"
"https://stripe.com/docs" -> "stripe.com"
"http://localhost:3000/test" -> "localhost:3000"
"https://sub.domain.com" -> "sub.domain.com"
```

### 테마별 스포트라이트 색상

```typescript
const getSpotlightColor = (theme: string) => {
  switch (theme) {
    case 'dark':
      return 'rgba(249, 168, 38, 0.25)'; // 골드
    case 'spring':
      return 'rgba(255, 143, 163, 0.25)'; // 핑크
    default:
      return 'rgba(2, 136, 209, 0.25)'; // 블루
  }
};
```

### Edge Cases

1. **GIF 로딩 실패**: placeholder 이미지 또는 에러 상태 표시
2. **매우 긴 도메인**: `text-overflow: ellipsis`로 처리
3. **GIF가 없는 항목**: 정적 스크린샷 이미지로 대체 가능

## 10. Validation Criteria

- [ ] `/inspiration` 라우트가 404 없이 접근 가능
- [ ] SpotlightCard 컴포넌트가 정상 렌더링
- [ ] 마우스 이벤트가 정상 동작
- [ ] 세 가지 테마 모두에서 스타일 정상 적용
- [ ] 헤더에 lightbulb 아이콘 표시 및 동작
- [ ] 반응형 레이아웃 정상 동작
- [ ] Origin 표시 형식 정확성
- [ ] 새 탭 열기 동작 정상

## 11. Related Specifications / Further Reading

### 프로젝트 참고 파일

- `/apps/frontend/src/components/reaction-party/ReactionParty.tsx` - Preact 컴포넌트 패턴
- `/apps/frontend/src/components/Header.astro` - 헤더 구조
- `/apps/frontend/src/styles/global.css` - 테마 CSS 변수
- `/apps/frontend/src/pages/about.astro` - 단순 페이지 구조

### 외부 참고 자료

- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks/)
- [Radial Gradient CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient)

---

## 파일 구조 (예상)

```
apps/frontend/src/
├── components/
│   └── inspiration/
│       ├── SpotlightCard.tsx      # Preact 스포트라이트 카드
│       └── InspirationGrid.tsx    # 영감 그리드 + 데이터
├── pages/
│   └── inspiration.astro          # 영감 페이지
└── ...

public/
└── inspiration/
    ├── stripe.gif
    ├── linear.gif
    └── ...
```
