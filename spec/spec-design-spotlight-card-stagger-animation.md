---
title: SpotlightCard Stagger 등장 애니메이션 명세서
version: 1.0
date_created: 2026-02-01
last_updated: 2026-02-01
tags: [design, frontend, animation, css, preact, component]
---

# Introduction

영감(Inspiration) 페이지의 SpotlightCard들이 LightRays 점등 후 순차적으로 fade-in + scale 효과로 등장하도록 하는 stagger 애니메이션을 구현합니다. CSS-only 방식으로 의존성 없이 구현하며, 기존 조명 모드 시퀀스와 자연스럽게 연동됩니다.

## 1. Purpose & Scope

### 목적
- LightRays 점등 후 SpotlightCard들이 순차적으로 등장하여 시각적 시퀀스 완성
- 영화적인 조명 연출 효과로 사용자 경험 향상
- CSS-only 구현으로 추가 의존성 없이 성능 최적화

### 범위

**포함:**
- SpotlightCard 초기 숨김 상태 설정
- CSS 기반 stagger 애니메이션 구현
- `body.light-rays-visible` 클래스를 트리거로 활용
- InspirationGrid에서 각 카드에 인덱스 전달

**제외:**
- JavaScript 애니메이션 라이브러리 (Framer Motion, GSAP 등)
- 카드 호버/틸트 효과 수정 (기존 유지)
- 조명 모드 해제 시 퇴장 애니메이션

### 대상 사용자
- 영감 페이지 방문자

### 가정
- `body.light-rays-visible` 클래스가 LightRays 점등 완료 후 추가됨
- 제목 "靈感" 플리커링은 0.45s 딜레이 후 시작
- 카드 개수는 최대 10개 이내 (stagger 시간 고려)

## 2. Definitions

| 용어 | 설명 |
|------|------|
| Stagger Animation | 여러 요소가 일정 간격(delay)을 두고 순차적으로 애니메이션되는 기법 |
| CSS Custom Property | `--index`와 같은 CSS 변수로, JavaScript에서 동적으로 설정 가능 |
| `light-rays-visible` | LightRays 점등 애니메이션 완료 후 body에 추가되는 클래스 |
| card-reveal | 카드가 숨김에서 보임 상태로 전환되는 애니메이션 이름 |
| forwards | 애니메이션 종료 후 최종 상태를 유지하는 fill-mode |

## 3. Requirements, Constraints & Guidelines

### 기능 요구사항

- **REQ-001**: SpotlightCard는 초기에 `opacity: 0` 상태로 숨겨져야 한다
- **REQ-002**: `body.light-rays-visible` 클래스 추가 시 카드 등장 애니메이션이 시작된다
- **REQ-003**: 각 카드는 `--index` 값에 따라 순차적으로 등장한다 (stagger)
- **REQ-004**: 애니메이션은 fade-in, translateY, scale 효과를 조합한다
- **REQ-005**: 애니메이션 종료 후 카드는 보이는 상태를 유지한다 (`animation-fill-mode: forwards`)

### 타이밍 요구사항

- **TIM-001**: 기본 딜레이는 0.45s (제목 "靈感" 플리커링과 동시 시작)
- **TIM-002**: 각 카드 간 stagger 간격은 0.1s
- **TIM-003**: 개별 카드 애니메이션 duration은 0.5s
- **TIM-004**: 첫 번째 카드와 제목 플리커링이 정확히 동시에 시작

### 타이밍 시퀀스 다이어그램

```
body.light-rays-visible 추가
       ↓
   0ms: LightRays fade-in 시작 (0.3s)
       ↓
 450ms: 제목 "靈感" flickering 시작 + 첫 번째 카드 등장 시작 (동시!)
       ↓
 550ms: 두 번째 카드 등장 (stagger: 0.1s)
       ↓
 650ms: 세 번째 카드 등장
       ↓
   ... 각 카드 0.1s 간격으로 순차 등장
```

### UI 요구사항

- **UI-001**: 카드 초기 상태: `opacity: 0`, `translateY(20px)`, `scale(0.95)`
- **UI-002**: 카드 최종 상태: `opacity: 1`, `translateY(0)`, `scale(1)`
- **UI-003**: perspective는 기존 값(1000px)을 유지하여 3D 효과 일관성 보장
- **UI-004**: 애니메이션 easing은 `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design 표준)

### 제약사항

- **CON-001**: CSS-only 구현 (JavaScript 애니메이션 라이브러리 사용 금지)
- **CON-002**: 기존 SpotlightCard의 호버/틸트 효과를 방해하지 않아야 함
- **CON-003**: 기존 theme 스타일(dark, light, spring)과 호환되어야 함
- **CON-004**: `will-change: transform` 설정으로 GPU 가속 유지

### 가이드라인

- **GUD-001**: CSS 변수 `--index`는 InspirationGrid에서 inline style로 전달
- **GUD-002**: `:global()` 선택자로 body 클래스 감지 (Preact CSS-in-JS)
- **GUD-003**: `calc()` 함수로 동적 딜레이 계산
- **GUD-004**: 초기 숨김 상태는 `.card-spotlight` 기본 스타일에 설정

### 패턴

- **PAT-001**: 제목 neon-flicker-on 애니메이션 패턴 참조 (지연 + forwards)
- **PAT-002**: CSS Custom Property를 활용한 stagger 패턴 (Codepen 참조)

## 4. Interfaces & Data Contracts

### SpotlightCardProps 수정

```typescript
interface SpotlightCardProps {
  children: ComponentChildren;
  className?: string;
  href?: string;
  maxTilt?: number;
  /** CSS 변수 포함 가능한 inline style (stagger index 등) */
  style?: Record<string, string | number>;  // 추가
}
```

### InspirationGrid에서 style 전달

```tsx
{inspirations.map((item, index) => (
  <SpotlightCard
    key={index}
    href={item.url}
    style={{ '--index': index }}  // 인덱스 전달
  >
    {/* ... */}
  </SpotlightCard>
))}
```

### CSS 변수 인터페이스

| 변수 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `--index` | number | 카드의 순서 인덱스 (0부터 시작) | `0`, `1`, `2` |
| `--base-delay` | time | 기본 딜레이 (제목과 동기화) | `0.45s` |
| `--stagger-delay` | time | 카드 간 간격 (상수) | `0.1s` |

### CSS 애니메이션 정의

```css
/* 초기 상태: 숨김 */
.card-spotlight {
  opacity: 0;
  transform: perspective(1000px) translateY(20px) scale(0.95);
}

/* LightRays 점등 후 순차 등장 - 제목 플리커링(0.45s)과 동시 시작 */
:global(body.light-rays-visible) .card-spotlight {
  animation: card-reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: calc(0.45s + var(--index, 0) * 0.1s);
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: perspective(1000px) translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: perspective(1000px) translateY(0) scale(1);
  }
}
```

## 5. Acceptance Criteria

- **AC-001**: Given 영감 페이지 로드 시, When 초기 렌더링되면, Then 모든 SpotlightCard가 보이지 않아야 한다 (`opacity: 0`)
- **AC-002**: Given `body.light-rays-visible` 클래스가 추가될 때, When 0.45s 후, Then 첫 번째 카드가 제목 "靈感"과 동시에 등장하기 시작한다
- **AC-003**: Given 첫 번째 카드 등장 후, When 0.1s 경과하면, Then 두 번째 카드가 등장하기 시작한다
- **AC-004**: Given 카드 애니메이션 진행 시, When 애니메이션되면, Then fade-in + translateY(위로) + scale(커짐) 효과가 동시에 적용된다
- **AC-005**: Given 카드 애니메이션 완료 시, When `forwards` fill-mode로, Then 카드가 `opacity: 1` 상태를 유지한다
- **AC-006**: Given 카드 등장 완료 후, When 마우스 호버하면, Then 기존 spotlight/tilt 효과가 정상 동작한다
- **AC-007**: Given 조명 모드 해제 시, When `light-rays-visible` 클래스 제거되면, Then 카드가 다시 숨겨진다 (초기 상태로 복귀)
- **AC-008**: Given "靈感" 제목 애니메이션과 함께, When 둘 다 실행되면, Then 제목 플리커링과 카드 등장이 시각적으로 조화롭다

## 6. Test Automation Strategy

### 테스트 레벨

- **Visual Regression**: 애니메이션 시작/종료 시점 스크린샷 비교
- **Manual QA**: 애니메이션 타이밍 및 시각적 품질 확인

### 수동 테스트 체크리스트

- [ ] `/inspiration` 페이지 접속 시 카드가 초기에 보이지 않음
- [ ] LightRays 점등 후 카드가 순차적으로 등장
- [ ] 각 카드 간 약 0.1초 간격 확인 (육안)
- [ ] 제목 "靈感" 플리커링과 첫 카드 등장이 거의 동시
- [ ] 카드 등장 애니메이션: fade + scale + 위로 슬라이드 확인
- [ ] 애니메이션 완료 후 카드 호버 효과 정상 동작
- [ ] 떠있는 전구 클릭 시 카드가 다시 숨겨짐
- [ ] 다크/라이트/스프링 테마에서 모두 정상 동작

### 브라우저 호환성 테스트

- [ ] Chrome (최신)
- [ ] Firefox (최신)
- [ ] Safari (최신)
- [ ] Edge (최신)
- [ ] iOS Safari
- [ ] Android Chrome

## 7. Rationale & Context

### CSS-only 선택 이유

1. **의존성 최소화**: Framer Motion, GSAP 등 추가 라이브러리 불필요
2. **성능**: CSS 애니메이션은 브라우저 최적화 + GPU 가속 활용
3. **일관성**: 기존 제목 neon-flicker-on도 CSS 애니메이션 사용
4. **유지보수**: 스타일과 애니메이션이 한 곳에서 관리됨

### Stagger 구현 방식 선택

**선택: CSS Custom Property + calc()**

- `animation-delay: calc(0.3s + var(--index) * 0.1s)`
- 장점: 카드 개수가 늘어나도 코드 수정 불필요
- 장점: JavaScript 없이 순수 CSS로 동작
- 장점: 런타임 오버헤드 최소화

**대안 (미선택):**
- nth-child 선택자: 하드코딩 필요, 유지보수 어려움
- JavaScript IntersectionObserver: 불필요한 복잡성
- Web Animations API: 브라우저 지원 고려 필요

### 타이밍 설계 근거

| 값 | 근거 |
|---|---|
| 0.45s 기본 딜레이 | 제목 "靈感" neon-flicker-on 딜레이(0.45s)와 정확히 동기화 |
| 0.1s stagger | 너무 빠르면 동시 등장처럼 보임, 너무 느리면 지루함 |
| 0.5s duration | 빠르고 경쾌하면서도 효과가 인지 가능한 길이 |
| cubic-bezier(0.4, 0, 0.2, 1) | Material Design 표준 easing, 자연스러운 감속 |

### Transform 조합 선택

```
translateY(20px) → 0: 아래에서 위로 슬라이드 (주목도)
scale(0.95) → 1: 약간 커지며 등장 (깊이감)
perspective(1000px): 기존 틸트 효과와 일관성
```

## 8. Dependencies & External Integrations

### 내부 의존성

- **INT-001**: `LightModeController.tsx` - `light-rays-visible` 클래스 관리
- **INT-002**: `InspirationGrid.tsx` - 카드 렌더링 및 `--index` 전달
- **INT-003**: `SpotlightCard.tsx` - 애니메이션 CSS 추가

### CSS 클래스 의존성

- **CSS-001**: `body.light-rays-visible` - 애니메이션 트리거 (LightModeController에서 추가)
- **CSS-002**: `.card-spotlight` - 애니메이션 대상 선택자

### 기존 애니메이션과의 관계

```
┌─────────────────────────────────────────────────────────┐
│                    시간축 (Timeline)                     │
├─────────────────────────────────────────────────────────┤
│ 0ms        150ms       300ms       450ms       600ms    │
│  │           │           │           │           │      │
│  ▼           │           │           │           │      │
│ body.light-rays-visible 추가                            │
│  │           │           │           │           │      │
│  └─── LightRays fade-in (0~300ms) ───┘           │      │
│                                      │           │      │
│                                      ▼           │      │
│                          제목 flicker + 카드#0 동시 시작!│
│                          (450ms~)    │           │      │
│                                      └─── 카드#1 (550ms~)│
│                                              카드#2 (650ms~)│
└─────────────────────────────────────────────────────────┘
```

## 9. Examples & Edge Cases

### 카드별 딜레이 계산 예시

```css
/* --index 값에 따른 실제 딜레이 (제목 0.45s와 동기화) */
카드 #0: calc(0.45s + 0 * 0.1s) = 0.45s  ← 제목 "靈感"과 동시!
카드 #1: calc(0.45s + 1 * 0.1s) = 0.55s
카드 #2: calc(0.45s + 2 * 0.1s) = 0.65s
카드 #3: calc(0.45s + 3 * 0.1s) = 0.75s
...
```

### 수정된 SpotlightCard.tsx 예시

```tsx
// Props에 style 추가
interface SpotlightCardProps {
  children: ComponentChildren;
  className?: string;
  href?: string;
  maxTilt?: number;
  style?: Record<string, string | number>;
}

export default function SpotlightCard({
  children,
  className = "",
  href,
  maxTilt = 8,
  style,  // 추가
}: SpotlightCardProps) {
  // ...

  return (
    <>
      <div
        ref={divRef}
        style={style}  // inline style 적용
        // ...
      >
        {children}
      </div>
      {/* ... */}
    </>
  );
}
```

### 수정된 CSS 예시

```css
.card-spotlight {
  /* 기존 스타일 유지 */
  position: relative;
  border-radius: 1.5rem;
  /* ... */

  /* 초기 상태: 숨김 (추가) */
  opacity: 0;
  transform: perspective(1000px) translateY(20px) scale(0.95);

  /* 기존 transform 관련 설정 유지 */
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 0.1s ease-out;
}

/* LightRays 점등 후 순차 등장 - 제목(0.45s)과 동시 시작 (추가) */
:global(body.light-rays-visible) .card-spotlight {
  animation: card-reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: calc(0.45s + var(--index, 0) * 0.1s);
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: perspective(1000px) translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: perspective(1000px) translateY(0) scale(1);
  }
}
```

### Edge Cases

1. **카드가 0개인 경우**
   - 영향 없음 (map이 빈 배열 반환)

2. **카드가 10개 이상인 경우**
   - 마지막 카드 딜레이: 0.45 + 9 * 0.1 = 1.35s
   - 전체 시퀀스: ~1.85s (수용 가능 범위)

3. **조명 모드 빠른 토글 (스팸 클릭)**
   - `isAnimating` 플래그로 이미 방지됨 (LightModeController)
   - CSS 애니메이션은 클래스 제거 시 즉시 중단

4. **prefers-reduced-motion 설정**
   - 향후 개선 가능: `@media (prefers-reduced-motion: reduce)` 추가

## 10. Validation Criteria

- [ ] SpotlightCard 초기 상태가 `opacity: 0`으로 설정됨
- [ ] `body.light-rays-visible` 클래스 추가 시 애니메이션 시작
- [ ] 각 카드의 `animation-delay`가 인덱스에 따라 증가
- [ ] `animation-fill-mode: forwards`로 최종 상태 유지
- [ ] 기존 호버/틸트 효과와 충돌 없음
- [ ] 3개 테마 모두에서 정상 동작
- [ ] 성능 저하 없음 (GPU 가속 활용)

## 11. Related Specifications / Further Reading

### 프로젝트 관련 문서

- `spec/spec-design-inspiration-page.md` - 영감 페이지 전체 스펙
- `spec/spec-design-inspiration-light-mode.md` - 조명 모드 스펙
- `spec/spec-design-spotlight-card-glass-footer.md` - 카드 디자인 스펙

### 프로젝트 참고 파일

- `apps/frontend/src/components/inspiration/SpotlightCard.tsx` - 수정 대상
- `apps/frontend/src/components/inspiration/InspirationGrid.tsx` - 수정 대상
- `apps/frontend/src/components/inspiration/LightModeController.tsx` - 트리거 관리
- `apps/frontend/src/pages/inspiration.astro` - 제목 neon 애니메이션 참조

### 외부 참고 자료

- [CSS Stagger Animation (Codepen)](https://codepen.io/titouanmathis/pen/zqOQgW)
- [CSS Tricks - Staggered Animation Approaches](https://css-tricks.com/different-approaches-for-creating-a-staggered-animation/)
- [Framer Motion Stagger (개념 참조)](https://codesandbox.io/s/framer-motion-animate-presence-with-child-stagger-3lbs3)
- [Material Design Motion](https://m2.material.io/design/motion/speed.html)
- [CSS animation-fill-mode (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode)

---

## 수정 대상 파일 요약

| 파일 | 수정 내용 |
|------|-----------|
| `InspirationGrid.tsx` | `style={{ '--index': index }}` 추가 |
| `SpotlightCard.tsx` | props에 `style` 추가, div에 적용, CSS에 애니메이션 추가 |

## 예상 결과 시각적 시퀀스

1. **CircularReveal**로 검은 배경 퍼짐
2. **LightRays** 빛줄기가 부드럽게 나타남 (0~300ms)
3. **0.45s** 시점: **"靈感"** 제목 플리커링 + **첫 번째 카드** 등장 **동시 시작!**
4. **0.1s 간격**으로 나머지 카드들 순차 등장 (0.55s, 0.65s, ...)
5. 모든 카드 등장 완료 → 정상적인 인터랙션 가능
