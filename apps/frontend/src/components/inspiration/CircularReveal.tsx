import { useEffect, useState, useRef } from 'preact/hooks';

interface CircularRevealProps {
  isActive: boolean;
  originX: number;
  originY: number;
  onAnimationComplete?: () => void;
}

/**
 * box-shadow를 사용한 원형 마스킹 오버레이
 *
 * 원리: 작은 원형 div에 거대한 box-shadow를 적용
 * - 원 안쪽: 투명 (기존 배경 보임)
 * - 원 바깥: 검은색 그림자로 채움
 *
 * 조명 모드 진입 (isActive: true): 원이 수축 → 검은색이 퍼짐
 * 조명 모드 해제 (isActive: false): 원이 확장 → 기존 배경이 퍼짐
 */
export default function CircularReveal({
  isActive,
  originX,
  originY,
  onAnimationComplete
}: CircularRevealProps) {
  // 뷰포트 대각선 길이 계산 (원이 화면 전체를 덮을 수 있는 최대 크기)
  const getMaxRadius = () => {
    if (typeof window === 'undefined') return 2000;
    return Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
  };

  const [maxRadius, setMaxRadius] = useState(getMaxRadius);
  // 항상 maxRadius로 시작 (투명 상태)
  const [radius, setRadius] = useState(getMaxRadius);
  const animationRef = useRef<number | null>(null);
  // 현재 목표 반지름 (중복 애니메이션 방지용)
  const targetRadiusRef = useRef<number>(getMaxRadius());
  // 현재 반지름을 ref로도 추적 (클로저 문제 방지)
  const currentRadiusRef = useRef<number>(getMaxRadius());

  const ANIMATION_DURATION = 600; // ms

  // radius 변경 시 ref도 동기화
  useEffect(() => {
    currentRadiusRef.current = radius;
  }, [radius]);

  // 윈도우 리사이즈 시 최대 반지름 업데이트
  useEffect(() => {
    const handleResize = () => {
      const newMax = getMaxRadius();
      setMaxRadius(newMax);
      // 현재 완전히 확장된 상태라면 새 최대값으로 업데이트
      if (!isActive && radius >= maxRadius) {
        setRadius(newMax);
        currentRadiusRef.current = newMax;
        targetRadiusRef.current = newMax;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, radius, maxRadius]);

  // isActive 변경 시 애니메이션 실행
  useEffect(() => {
    const newTarget = isActive ? 0 : maxRadius;

    // 목표가 같으면 스킵 (중복 애니메이션 방지)
    if (targetRadiusRef.current === newTarget) {
      return;
    }
    targetRadiusRef.current = newTarget;

    // 이전 애니메이션 취소
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // 현재 위치에서 시작 (ref 사용으로 최신 값 보장)
    const startRadius = currentRadiusRef.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // easeOutCubic 이징 함수
      const eased = 1 - Math.pow(1 - progress, 3);

      const newRadius = startRadius + (newTarget - startRadius) * eased;
      setRadius(newRadius);
      currentRadiusRef.current = newRadius;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        onAnimationComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, maxRadius, onAnimationComplete]);

  // 완전히 확장된 상태면 숨김 (성능 최적화)
  const isFullyExpanded = !isActive && radius >= maxRadius - 1;

  return (
    <div
      class="circular-reveal-container"
      style={{
        pointerEvents: 'none',
        visibility: isFullyExpanded ? 'hidden' : 'visible',
      }}
    >
      <div
        class="circular-reveal-circle"
        style={{
          left: `${originX}px`,
          top: `${originY}px`,
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}
