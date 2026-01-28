---
title: SpotlightCard Glass Footer 디자인 스펙
version: 1.0
date_created: 2026-01-29
last_updated: 2026-01-29
tags: [design, ui, glass-morphism, inspiration-page]
---

# Introduction

SpotlightCard 컴포넌트의 footer를 glass-morphism 스타일로 변경하여 이미지 위에 오버레이되는 형태로 구현합니다. 이를 통해 카드 이미지가 더 크게 보이고, 모던한 glassmorphism UI를 적용합니다.

## 1. Purpose & Scope

### Purpose
- 카드 이미지 영역 최대화 (footer가 이미지 위에 오버레이)
- Glass-morphism 효과로 시각적 고급감 부여
- 기존 SpotlightCard의 spotlight 효과와 조화

### Scope
**포함:**
- SpotlightCard 컴포넌트 내부에 glass footer 스타일 통합
- CSS `backdrop-filter` 기반 blur 효과
- 다크/라이트/스프링 테마 대응

**제외:**
- 별도의 GlassSurface 컴포넌트 생성 (SpotlightCard에 통합)
- SVG 필터 기반 고급 displacement 효과

### Target Files
- `apps/frontend/src/components/inspiration/SpotlightCard.tsx`
- `apps/frontend/src/components/inspiration/InspirationGrid.tsx`

## 2. Definitions

| 용어 | 정의 |
|------|------|
| Glass-morphism | 반투명 배경 + blur 효과로 유리 같은 느낌을 주는 UI 스타일 |
| backdrop-filter | 요소 뒤의 영역에 그래픽 효과를 적용하는 CSS 속성 |
| Spotlight Effect | 마우스 위치를 따라다니는 radial gradient 효과 |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: Glass footer는 이미지 위에 `position: absolute`로 하단에 위치
- **REQ-002**: `backdrop-filter: blur(12px)`를 사용한 유리 효과 적용
- **REQ-003**: 라이트/다크/스프링 테마별 적절한 배경색 및 투명도 적용
- **REQ-004**: 기존 spotlight hover 효과와 충돌 없이 작동
- **REQ-005**: 카드 이미지가 footer 영역까지 확장되어 보임

### Constraints

- **CON-001**: `backdrop-filter`를 지원하지 않는 브라우저용 fallback 스타일 제공
- **CON-002**: z-index는 spotlight overlay(10)보다 낮게 설정 (spotlight이 footer 위에도 보이도록)

### Guidelines

- **GUD-001**: 반투명 배경색은 `rgba()` 또는 `color-mix()` 사용
- **GUD-002**: 테마 전환 시 부드러운 transition 적용 (0.3s ease)
- **GUD-003**: inner shadow로 유리 테두리 느낌 강화

## 4. Interfaces & Data Contracts

### SpotlightCard 구조 변경

**기존 구조:**
```
SpotlightCard
└── children (card-content)
    ├── card-image
    │   └── img
    └── card-footer (아래에 별도 영역)
        └── card-origin
```

**변경 후 구조:**
```
SpotlightCard
└── children (card-content)
    ├── card-image (전체 높이)
    │   └── img
    └── card-footer (absolute, 이미지 위 하단 오버레이)
        └── card-origin
```

### CSS 클래스 명세

```css
.card-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;

  /* Glass Effect */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);

  /* Glass Border */
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.2);

  /* Layout */
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  /* Transitions */
  transition: background 0.3s ease;

  /* Layer */
  z-index: 5; /* spotlight ::before (z-index: 10) 보다 낮게 */
}
```

### 테마별 스타일

| 테마 | 배경색 | border 색상 |
|------|--------|-------------|
| light | `rgba(255, 255, 255, 0.25)` | `rgba(255, 255, 255, 0.3)` |
| dark | `rgba(0, 0, 0, 0.35)` | `rgba(255, 255, 255, 0.1)` |
| spring | `rgba(255, 182, 193, 0.2)` | `rgba(255, 255, 255, 0.25)` |

## 5. Acceptance Criteria

- **AC-001**: Given 카드에 마우스를 올리지 않은 상태, When 페이지 로드, Then footer가 이미지 하단에 glass 효과로 오버레이되어 보임
- **AC-002**: Given 카드에 마우스를 올린 상태, When spotlight 효과 활성화, Then spotlight이 glass footer 위에도 표시됨
- **AC-003**: Given 다크 테마 활성화, When 카드 렌더링, Then 다크 테마에 맞는 glass 스타일 적용
- **AC-004**: Given Safari 브라우저, When 카드 렌더링, Then `-webkit-backdrop-filter`로 동일한 효과 표시
- **AC-005**: Given backdrop-filter 미지원 브라우저, When 카드 렌더링, Then fallback 반투명 배경 표시

## 6. Test Automation Strategy

### Manual Testing
1. 라이트/다크/스프링 테마 전환 시 glass 효과 확인
2. 마우스 호버 시 spotlight + glass 조합 확인
3. Safari/Chrome/Firefox 크로스 브라우저 테스트

### Visual Regression
- `/inspiration` 페이지 스크린샷 비교

## 7. Rationale & Context

### 왜 absolute positioning인가?
- 기존 레이아웃: 이미지와 footer가 `flex-direction: column`으로 수직 배치
- 문제: footer가 이미지 높이를 줄임
- 해결: footer를 absolute로 이미지 위에 오버레이하면 이미지가 카드 전체를 차지

### 왜 CSS backdrop-filter인가?
- SVG 필터 대비 성능 우수
- 브라우저 지원률 높음 (Can I Use: 95%+)
- 구현 간단, 유지보수 용이

### z-index 설계
```
z-index: 10 - spotlight ::before (radial gradient)
z-index: 5  - glass footer
z-index: 1  - image
```
이렇게 하면 spotlight 효과가 glass footer 위에도 자연스럽게 표시됩니다.

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: CSS `backdrop-filter` - 최신 브라우저 지원 필요
- **PLT-002**: Preact - 기존 SpotlightCard 컴포넌트 프레임워크

### Browser Support
| 브라우저 | 지원 버전 |
|----------|-----------|
| Chrome | 76+ |
| Firefox | 103+ |
| Safari | 9+ (webkit prefix) |
| Edge | 79+ |

## 9. Examples & Edge Cases

### 변경 전후 비교

**Before:**
```
┌─────────────────────┐
│                     │
│       IMAGE         │
│     (200px)         │
│                     │
├─────────────────────┤
│ domain.com      ▸   │  ← 별도 영역
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│                     │
│       IMAGE         │
│   (전체 카드 높이)   │
│                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Glass overlay
│ domain.com      ▸   │
└─────────────────────┘
```

### Edge Cases

1. **긴 도메인명**: `text-overflow: ellipsis` 적용
2. **이미지 로딩 실패**: glass footer는 유지, placeholder 배경 표시
3. **호버 중 테마 변경**: transition으로 부드럽게 전환

### 구현 코드 예시

```tsx
// InspirationGrid.tsx - 변경될 스타일
const styles = `
  .card-content {
    position: relative;
    height: 100%;
  }

  .card-image {
    height: 220px; /* 기존 200px + footer 영역 */
    overflow: hidden;
    border-radius: 1.5rem;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.75rem 1rem;

    /* Glass Effect */
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px) saturate(1.5);
    -webkit-backdrop-filter: blur(12px) saturate(1.5);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.2);

    border-radius: 0 0 1.5rem 1.5rem;
    z-index: 5;
  }

  :global([data-theme="dark"]) .card-footer {
    background: rgba(0, 0, 0, 0.35);
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  :global([data-theme="spring"]) .card-footer {
    background: rgba(255, 182, 193, 0.2);
  }
`;
```

## 10. Validation Criteria

- [ ] Glass footer가 이미지 위에 오버레이됨
- [ ] backdrop-filter blur 효과 적용됨
- [ ] 라이트/다크/스프링 테마별 적절한 스타일
- [ ] Spotlight hover 효과가 glass 위에도 보임
- [ ] Safari에서 정상 동작 (-webkit- prefix)
- [ ] 카드 border-radius가 footer에도 적용됨

## 11. Related Specifications / Further Reading

- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Glassmorphism CSS Generator](https://hype4.academy/tools/glassmorphism-generator)
- 기존 파일: `apps/frontend/src/components/inspiration/SpotlightCard.tsx`
