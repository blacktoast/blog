import { useEffect, useRef } from 'preact/hooks';

interface FloatingLightbulbProps {
  isVisible: boolean;
  x: number;
  y: number;
  onClick: () => void;
}

/**
 * 조명 모드에서 헤더가 사라진 후에도 전구 아이콘이 같은 위치에 떠있도록 하는 컴포넌트
 */
export default function FloatingLightbulb({
  isVisible,
  x,
  y,
  onClick
}: FloatingLightbulbProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      // 페이드인 애니메이션
      buttonRef.current.style.opacity = '0';
      requestAnimationFrame(() => {
        if (buttonRef.current) {
          buttonRef.current.style.opacity = '1';
        }
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <button
      ref={buttonRef}
      class="floating-lightbulb"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        // transform으로 정확히 중앙 정렬
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
      aria-label="조명 모드 해제"
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    </button>
  );
}
