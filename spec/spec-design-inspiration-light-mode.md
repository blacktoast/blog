---
title: 영감 페이지 조명 모드(Light Mode) 기능 명세서
version: 1.0
date_created: 2026-01-28
last_updated: 2026-01-28
tags: [design, frontend, animation, preact, webgl, interaction]
---

# Introduction

영감 페이지에 "조명 모드" 기능을 추가하여 몰입감 있는 갤러리 경험을 제공합니다. 전구 아이콘 클릭 시 배경이 어두워지고, 헤더/푸터가 사라지며, 오직 카드와 WebGL 광선 효과, 전구 아이콘만 남아 극장 같은 분위기를 연출합니다.

## 1. Purpose & Scope

### 목적
- 영감 카드에 집중할 수 있는 몰입형 환경 제공
- WebGL 광선 효과를 더욱 돋보이게 하는 어두운 배경 연출
- 인터랙티브한 토글 애니메이션으로 사용자 경험 향상

### 범위

**포함:**
- 전구 아이콘 클릭으로 조명 모드 토글
- 원형(Circular) 애니메이션으로 배경 전환
- 헤더/푸터 숨김/표시 애니메이션
- 테마별 LightRays 색상 적용
- 조명 모드에서 고정 위치 전구 아이콘

**제외:**
- 키보드 단축키 지원
- 조명 모드 상태 저장 (새로고침 시 초기화)
- 모바일 제스처 (스와이프 등)

### 대상 사용자
- 블로그 방문자 (영감 페이지 이용자)

### 가정
- 기존 LightRays WebGL 효과가 구현되어 있음
- 헤더에 전구 아이콘이 이미 추가되어 있음
- Preact 기반 컴포넌트 시스템 사용

## 2. Definitions

| 용어 | 설명 |
|------|------|
| 조명 모드 (Light Mode) | 배경이 어두워지고 UI 요소가 숨겨진 몰입형 상태 |
| Circular Reveal | 특정 지점을 중심으로 원형으로 퍼지거나 수축하는 애니메이션 효과 |
| LightRays | WebGL 기반 광선 효과 컴포넌트 |
| Floating Lightbulb | 조명 모드에서 화면에 고정 표시되는 전구 아이콘 |
| clip-path | CSS 속성으로, 요소의 표시 영역을 특정 모양으로 제한 |

## 3. Requirements, Constraints & Guidelines

### 기능 요구사항

- **REQ-001**: 전구 아이콘 클릭 시 조명 모드로 전환한다
- **REQ-002**: 조명 모드 진입 시 배경이 `#110f15` 색상으로 변경된다
- **REQ-003**: 배경 전환은 전구 위치를 중심으로 원형(circular)으로 진행된다
- **REQ-004**: 조명 모드 진입 시 헤더가 위쪽으로 사라진다
- **REQ-005**: 조명 모드 진입 시 푸터가 아래쪽으로 사라진다
- **REQ-006**: 조명 모드에서 전구 아이콘은 기존 헤더 위치에 고정 표시된다
- **REQ-007**: 전구 아이콘 재클릭 시 조명 모드가 해제된다
- **REQ-008**: 조명 모드 해제 시 전구 위치에서 원형으로 기존 배경이 복구된다
- **REQ-009**: 조명 모드에서 InspirationGrid 카드는 정상 표시된다
- **REQ-010**: 조명 모드에서 LightRays 효과는 더욱 선명하게 보인다

### UI/애니메이션 요구사항

- **UI-001**: 원형 애니메이션 지속 시간은 0.6초이다
- **UI-002**: 헤더/푸터 숨김 애니메이션은 원형 애니메이션과 동시에 진행된다
- **UI-003**: 전구 아이콘은 조명 모드에서도 빛나는 애니메이션을 유지한다
- **UI-004**: 애니메이션 easing은 `ease-out` 또는 유사한 자연스러운 곡선을 사용한다
- **UI-005**: 원형 애니메이션 최대 반경은 `150vmax`로 화면 전체를 덮는다

### 테마 요구사항

- **THM-001**: LightRays 색상은 테마별 accent 색상의 밝은 변형을 사용한다
  - light: `#4fc3f7` (밝은 블루, 기본 accent `#0288d1`)
  - dark: `#ffd54f` (밝은 골드, 기본 accent `#f9a826`)
  - spring: `#ffb6c1` (밝은 핑크, 기본 accent `#ff8fa3`)
- **THM-002**: 조명 모드 배경색 `#110f15`는 모든 테마에서 동일하다

### 제약사항

- **CON-001**: Preact와 `preact/hooks`를 사용한다
- **CON-002**: CSS `clip-path: circle()` 속성을 사용하여 원형 애니메이션을 구현한다
- **CON-003**: 조명 모드 상태는 클라이언트 사이드에서만 관리한다
- **CON-004**: 기존 LightRays 컴포넌트를 수정하여 테마별 색상을 적용한다

### 가이드라인

- **GUD-001**: 전구 위치는 `getBoundingClientRect()`로 동적 계산한다
- **GUD-002**: z-index 레이어 순서를 명확히 유지한다
- **GUD-003**: 애니메이션 중 사용자 인터랙션을 방해하지 않도록 한다
- **GUD-004**: 모바일에서도 동일하게 전구 아이콘 탭으로 토글한다

### 패턴

- **PAT-001**: 상태 관리는 Preact의 `useState` 훅을 사용한다
- **PAT-002**: 애니메이션은 CSS transition/animation 기반으로 구현한다
- **PAT-003**: 전구 위치 추적은 커스텀 훅으로 분리한다

## 4. Interfaces & Data Contracts

### InspirationPage Props

```typescript
interface InspirationPageProps {
  children?: preact.ComponentChildren;
}
```

### InspirationPage 상태

```typescript
interface InspirationPageState {
  /** 조명 모드 활성화 여부 */
  isLightMode: boolean;
  /** 전구 아이콘의 화면 내 위치 */
  lightbulbPosition: { x: number; y: number } | null;
  /** 애니메이션 진행 중 여부 */
  isAnimating: boolean;
}
```

### CircularReveal Props

```typescript
interface CircularRevealProps {
  /** 조명 모드 활성화 여부 */
  isActive: boolean;
  /** 원형 중심점 좌표 */
  origin: { x: number; y: number };
  /** 배경색 */
  backgroundColor?: string;
  /** 애니메이션 지속 시간 (ms) */
  duration?: number;
  /** 애니메이션 완료 콜백 */
  onAnimationEnd?: () => void;
}
```

### FloatingLightbulb Props

```typescript
interface FloatingLightbulbProps {
  /** 표시 여부 */
  visible: boolean;
  /** 고정 위치 좌표 */
  position: { x: number; y: number };
  /** 클릭 핸들러 */
  onClick: () => void;
}
```

### LightRays 색상 상수

```typescript
const LIGHT_RAYS_COLORS: Record<string, string> = {
  light: '#4fc3f7',   // 밝은 블루
  dark: '#ffd54f',    // 밝은 골드
  spring: '#ffb6c1',  // 밝은 핑크
};
```

### Z-Index 레이어 구조

```typescript
const Z_INDEX = {
  LIGHT_RAYS: 0,          // WebGL 배경
  CIRCULAR_REVEAL: 5,     // 원형 오버레이
  INSPIRATION_GRID: 10,   // 카드 그리드
  HEADER: 20,             // 헤더 (일반 모드)
  FOOTER: 20,             // 푸터 (일반 모드)
  FLOATING_LIGHTBULB: 30, // 고정 전구 (조명 모드)
};
```

## 5. Acceptance Criteria

- **AC-001**: Given 일반 모드에서, When 사용자가 헤더의 전구 아이콘을 클릭하면, Then 전구 위치를 중심으로 원형으로 배경이 어두워진다
- **AC-002**: Given 조명 모드 진입 중, When 원형 애니메이션이 진행되면, Then 헤더가 위쪽으로 사라지고 푸터가 아래쪽으로 사라진다
- **AC-003**: Given 조명 모드에서, When 화면을 확인하면, Then 전구 아이콘이 기존 헤더 위치에 고정 표시되어 있다
- **AC-004**: Given 조명 모드에서, When 배경을 확인하면, Then 배경색이 `#110f15`이다
- **AC-005**: Given 조명 모드에서, When 사용자가 전구 아이콘을 클릭하면, Then 전구 위치에서 원형으로 기존 배경이 복구된다
- **AC-006**: Given 조명 모드 해제 중, When 원형 애니메이션이 진행되면, Then 헤더가 위에서 내려오고 푸터가 아래에서 올라온다
- **AC-007**: Given 다크 테마에서, When 조명 모드를 활성화하면, Then LightRays 색상이 밝은 골드(`#ffd54f`)이다
- **AC-008**: Given 스프링 테마에서, When 조명 모드를 활성화하면, Then LightRays 색상이 밝은 핑크(`#ffb6c1`)이다
- **AC-009**: Given 모바일 기기에서, When 사용자가 헤더의 전구 아이콘을 탭하면, Then 조명 모드가 토글된다
- **AC-010**: Given 조명 모드에서, When InspirationGrid를 확인하면, Then 카드들이 정상적으로 표시되고 클릭 가능하다

## 6. Test Automation Strategy

### 테스트 레벨

- **Unit**:
  - CircularReveal 컴포넌트 clip-path 계산
  - FloatingLightbulb 위치 계산
  - 테마별 LightRays 색상 반환

- **Visual**:
  - 조명 모드 전/후 스크린샷 비교
  - 각 테마별 LightRays 색상 확인

- **E2E**:
  - 전구 클릭 → 조명 모드 진입 → 전구 클릭 → 조명 모드 해제 플로우

### 수동 테스트 체크리스트

- [ ] 전구 클릭 시 원형으로 어두워짐
- [ ] 어두워지는 중심점이 전구 위치와 일치
- [ ] 헤더가 위쪽으로 자연스럽게 사라짐
- [ ] 푸터가 아래쪽으로 자연스럽게 사라짐
- [ ] 조명 모드에서 전구 아이콘 위치가 기존 헤더 위치와 동일
- [ ] 전구 아이콘 빛나는 애니메이션 유지
- [ ] 다시 클릭 시 원형으로 밝아짐
- [ ] 복구 후 헤더/푸터 정상 표시
- [ ] 각 테마별 LightRays 색상 확인 (light: 블루, dark: 골드, spring: 핑크)
- [ ] 모바일에서 전구 탭 동작 확인
- [ ] 조명 모드에서 카드 클릭 정상 동작

## 7. Rationale & Context

### 몰입형 갤러리 경험

미술관이나 갤러리에서 조명을 어둡게 하여 작품에 집중하게 하는 것처럼, 조명 모드는 영감 카드에 시각적 집중을 유도합니다. 어두운 배경(`#110f15`)은 WebGL 광선 효과를 더욱 선명하게 만들고, 카드의 GIF 프리뷰가 돋보이게 합니다.

### 원형(Circular) 애니메이션 선택

전구에서 빛이 퍼지는 것과 같은 자연스러운 은유를 표현합니다. CSS `clip-path: circle()`은 GPU 가속을 활용하여 부드러운 애니메이션을 제공하며, JavaScript 없이도 transition으로 구현 가능합니다.

### 전구 위치 고정

조명 모드에서 전구를 기존 헤더 위치에 고정함으로써:
- 사용자가 토글 버튼을 쉽게 찾을 수 있음
- 공간 일관성 유지
- "불을 끄고 켜는" 물리적 행동과의 연결

### 테마별 LightRays 색상

각 테마의 accent 색상을 더 밝게 변형하여 사용합니다. 이는:
- 테마 일관성 유지
- 어두운 배경에서의 가시성 향상
- 심미적 조화

## 8. Dependencies & External Integrations

### 내부 컴포넌트 의존성

- **INT-001**: `LightRays.tsx` - WebGL 광선 효과 (수정 필요)
- **INT-002**: `InspirationGrid.tsx` - 카드 그리드 (수정 없음)
- **INT-003**: `Header.astro` - 헤더 컴포넌트 (조명 모드 숨김 클래스 추가)
- **INT-004**: `Footer.astro` - 푸터 컴포넌트 (조명 모드 숨김 클래스 추가)

### 기술 플랫폼 의존성

- **PLT-001**: Preact 및 preact/hooks - 상태 관리 및 컴포넌트
- **PLT-002**: CSS clip-path - 원형 애니메이션
- **PLT-003**: CSS transitions - 부드러운 애니메이션

### 브라우저 지원

- **BRW-001**: `clip-path: circle()` 지원 (모던 브라우저 전부 지원)
- **BRW-002**: CSS transitions 지원

## 9. Examples & Edge Cases

### 원형 애니메이션 clip-path 예시

```css
/* 조명 모드 진입: 큰 원 → 작은 원 (어두운 영역이 확장) */
.circular-reveal {
  background-color: #110f15;
  clip-path: circle(150vmax at var(--origin-x) var(--origin-y));
  transition: clip-path 0.6s ease-out;
}

.circular-reveal.active {
  clip-path: circle(0px at var(--origin-x) var(--origin-y));
}

/* 조명 모드 해제: 작은 원 → 큰 원 (밝은 영역이 확장) */
/* 위 클래스의 active 제거로 자동 transition */
```

### 전구 위치 계산 예시

```typescript
const getLightbulbPosition = (): { x: number; y: number } | null => {
  const lightbulb = document.querySelector('[data-lightbulb]');
  if (!lightbulb) return null;

  const rect = lightbulb.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};
```

### 테마별 LightRays 색상 적용 예시

```typescript
const getThemeRaysColor = (): string => {
  const theme = document.documentElement.dataset.theme || 'light';
  const colors: Record<string, string> = {
    light: '#4fc3f7',
    dark: '#ffd54f',
    spring: '#ffb6c1',
  };
  return colors[theme] || colors.light;
};
```

### Edge Cases

1. **빠른 연속 클릭**: 애니메이션 진행 중 클릭 무시 (`isAnimating` 상태 확인)
2. **창 리사이즈**: 전구 위치 재계산 필요 (resize 이벤트 리스너)
3. **모바일 메뉴 열린 상태**: 모바일 메뉴의 전구도 동일하게 동작
4. **테마 변경 중**: 테마 변경 시 LightRays 색상 실시간 업데이트

## 10. Validation Criteria

- [ ] 전구 클릭 시 조명 모드 진입
- [ ] 원형 애니메이션 중심점이 전구 위치와 일치
- [ ] 배경색이 정확히 `#110f15`
- [ ] 헤더/푸터 숨김 애니메이션 자연스러움
- [ ] 조명 모드에서 전구 아이콘 정상 표시 및 동작
- [ ] 조명 모드 해제 시 복구 애니메이션 정상
- [ ] 세 가지 테마 모두에서 LightRays 색상 정확
- [ ] 모바일에서 정상 동작
- [ ] 카드 인터랙션 정상 유지
- [ ] 애니메이션 중 연속 클릭 방지

## 11. Related Specifications / Further Reading

### 관련 명세서

- [spec-design-inspiration-page.md](./spec-design-inspiration-page.md) - 영감 페이지 기본 명세서

### 프로젝트 참고 파일

- `/apps/frontend/src/components/inspiration/LightRays.tsx` - WebGL 광선 효과
- `/apps/frontend/src/components/inspiration/InspirationGrid.tsx` - 카드 그리드
- `/apps/frontend/src/pages/inspiration.astro` - 영감 페이지
- `/apps/frontend/src/components/Header.astro` - 헤더 컴포넌트
- `/apps/frontend/src/styles/global.css` - 테마 CSS 변수

### 외부 참고 자료

- [CSS clip-path MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)
- [CSS circle() function](https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/circle)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks/)

---

## 파일 구조 (예상)

```
apps/frontend/src/
├── components/
│   └── inspiration/
│       ├── LightRays.tsx           # 수정: 테마별 색상 적용
│       ├── InspirationGrid.tsx     # 기존 유지
│       ├── SpotlightCard.tsx       # 기존 유지
│       ├── InspirationPage.tsx     # 신규: 페이지 래퍼 + 상태 관리
│       ├── CircularReveal.tsx      # 신규: 원형 애니메이션 오버레이
│       └── FloatingLightbulb.tsx   # 신규: 고정 전구 아이콘
├── pages/
│   └── inspiration.astro           # 수정: InspirationPage로 감싸기
└── ...
```

## 애니메이션 시퀀스 다이어그램

```
[일반 모드] ──(전구 클릭)──> [조명 모드 진입 애니메이션]
                                    │
                                    ├─ CircularReveal: circle(150vmax) → circle(0)
                                    ├─ Header: opacity 1→0, translateY(0)→(-100%)
                                    └─ Footer: opacity 1→0, translateY(0)→(100%)
                                    │
                                    v
                            [조명 모드 활성]
                                    │
                            (전구 다시 클릭)
                                    │
                                    v
                        [조명 모드 해제 애니메이션]
                                    │
                                    ├─ CircularReveal: circle(0) → circle(150vmax)
                                    ├─ Header: opacity 0→1, translateY(-100%)→(0)
                                    └─ Footer: opacity 0→1, translateY(100%)→(0)
                                    │
                                    v
                              [일반 모드]
```
