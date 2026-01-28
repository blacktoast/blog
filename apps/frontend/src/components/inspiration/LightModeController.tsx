import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import CircularReveal from './CircularReveal';
import FloatingLightbulb from './FloatingLightbulb';
import './InspirationPage.css';

/**
 * 조명 모드를 제어하는 클라이언트 사이드 컴포넌트
 *
 * 동작 흐름:
 * 1. 페이지 진입 시 → 자동으로 조명 모드 시작 (배경이 검은색으로 전환)
 * 2. 전구 클릭 → 조명 모드 해제 (기존 배경으로 복원)
 * 3. 다시 전구 클릭 → 조명 모드 재진입
 */
// 모바일 브레이크포인트 (Header.astro의 max-[720px]와 일치)
const MOBILE_BREAKPOINT = 720;

export default function LightModeController() {
  // 초기에는 꺼진 상태에서 시작 (애니메이션을 위해)
  const [isLightMode, setIsLightMode] = useState(false);
  // 애니메이션 진행 중 플래그 (연속 클릭 방지)
  const [isAnimating, setIsAnimating] = useState(false);
  // 초기 위치: 화면 상단 중앙 (나중에 실제 전구 위치로 업데이트)
  const [lightbulbPosition, setLightbulbPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: 40
  }));
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  // 네비게이션 타이머 ref (취소 가능하도록)
  const navigationTimerRef = useRef<number | null>(null);

  // 전구 위치 계산 함수
  const calculateLightbulbPosition = useCallback(() => {
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
    setIsMobile(mobile);

    if (mobile) {
      // 모바일: 상단 중앙
      return {
        x: window.innerWidth / 2,
        y: 28 // 헤더 높이의 중간쯤
      };
    } else {
      // 데스크톱: 헤더의 전구 아이콘 위치
      const lightbulb = document.querySelector('[data-lightbulb]') as HTMLElement;
      if (lightbulb) {
        const rect = lightbulb.getBoundingClientRect();
        // 아이콘의 정확한 중심 계산
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }

    // 기본값
    return {
      x: window.innerWidth / 2,
      y: 40
    };
  }, []);

  // 페이지 로드 시 전구 위치 찾기 및 초기 애니메이션 시작
  useEffect(() => {
    const initializeLightMode = () => {
      const position = calculateLightbulbPosition();
      setLightbulbPosition(position);

      // 약간의 딜레이 후 조명 모드 시작 (애니메이션 보이도록)
      setTimeout(() => {
        setIsLightMode(true);
      }, 100);
    };

    requestAnimationFrame(initializeLightMode);

  }, [calculateLightbulbPosition]);

  useEffect(() => {
    const handleResize = () => {
      if (isLightMode) {
        const position = calculateLightbulbPosition();
        setLightbulbPosition(position);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateLightbulbPosition, isLightMode]);

  // 전구 클릭 핸들러
  const handleLightbulbClick = useCallback((e: CustomEvent<{ x: number; y: number }>) => {
    const { x, y } = e.detail;
    setLightbulbPosition({ x, y });
    console.log('handleLightbulbClick', isLightMode, x, y);
    setIsLightMode(prev => !prev);
  }, []);

  // 헤더/푸터 숨김 클래스 토글
  useEffect(() => {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    if (isLightMode) {
      header?.classList.add('header-hidden');
      footer?.classList.add('footer-hidden');
      document.body.classList.add('light-mode-active');
    } else {
      header?.classList.remove('header-hidden');
      footer?.classList.remove('footer-hidden');
      document.body.classList.remove('light-mode-active');
    }
  }, [isLightMode]);

  // 전구 클릭 이벤트 리스너 등록
  useEffect(() => {
    const handleClick = (e: Event) => handleLightbulbClick(e as CustomEvent<{ x: number; y: number }>);
    window.addEventListener('lightbulb-click', handleClick);
    return () => window.removeEventListener('lightbulb-click', handleClick);
  }, [handleLightbulbClick]);

  // 애니메이션 완료 콜백
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // 조명 모드 해제 → 이전 페이지로 이동
  const handleFloatingLightbulbClick = useCallback(() => {
    if (isAnimating) return;

    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }

    setIsAnimating(true);
    setIsLightMode(false);
    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null;
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }, 600); // 애니메이션 시간과 동일
  }, [isAnimating]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 어두운 오버레이 */}
      <CircularReveal
        isActive={isLightMode}
        originX={lightbulbPosition.x}
        originY={lightbulbPosition.y}
        onAnimationComplete={handleAnimationComplete}
      />

      {/* 떠있는 전구 (조명 모드에서만 표시) */}
      <FloatingLightbulb
        isVisible={isLightMode}
        x={lightbulbPosition.x}
        y={lightbulbPosition.y}
        onClick={handleFloatingLightbulbClick}
      />
    </>
  );
}
