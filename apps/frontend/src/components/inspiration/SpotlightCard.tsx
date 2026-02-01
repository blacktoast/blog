import {
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
  useEffect,
} from "preact/hooks";
import type { ComponentChildren } from "preact";

interface SpotlightCardProps {
  children: ComponentChildren;
  className?: string;
  href?: string;
  maxTilt?: number;
}

interface CachedRect {
  left: number;
  top: number;
  centerX: number;
  centerY: number;
}

const getSpotlightColor = (theme: string) => {
  switch (theme) {
    case "dark":
      return "rgba(249, 168, 38, 0.25)";
    case "spring":
      return "rgba(255, 143, 163, 0.25)";
    default:
      return "rgba(2, 136, 209, 0.25)";
  }
};

export default function SpotlightCard({
  children,
  className = "",
  href,
  maxTilt = 8,
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<string>("light");
  const rafId = useRef<number | null>(null);
  const isHovering = useRef(false);
  const rectRef = useRef<CachedRect | null>(null);

  // 테마별 spotlight 색상 메모이제이션
  const spotlightColor = useMemo(
    () => getSpotlightColor(themeRef.current),
    [themeRef.current]
  );

  // 테마 변경 감지 - state 대신 ref 사용하여 리렌더링 방지
  useLayoutEffect(() => {
    const updateTheme = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      themeRef.current = currentTheme;
      // CSS 변수만 직접 업데이트 (리렌더링 없음)
      divRef.current?.style.setProperty(
        "--spotlight-color",
        getSpotlightColor(currentTheme)
      );
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // 카드 transform 업데이트 함수 (분리하여 재사용)
  const updateCardTransform = useCallback(
    (clientX: number, clientY: number) => {
      if (!divRef.current || !rectRef.current) return;

      const { left, top, centerX, centerY } = rectRef.current;
      const x = clientX - left;
      const y = clientY - top;

      const el = divRef.current;
      // 최소한의 CSS 변수만 업데이트
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
      el.style.setProperty(
        "--rotate-x",
        `${((centerY - y) / centerY) * maxTilt}deg`
      );
      el.style.setProperty(
        "--rotate-y",
        `${((x - centerX) / centerX) * maxTilt}deg`
      );
    },
    [maxTilt]
  );

  // mouseenter: rect 정보 캐싱 (1회만 계산)
  const handleMouseEnter = useCallback(() => {
    const rect = divRef.current?.getBoundingClientRect();
    if (rect) {
      rectRef.current = {
        left: rect.left,
        top: rect.top,
        centerX: rect.width / 2,
        centerY: rect.height / 2,
      };
    }
    isHovering.current = true;
  }, []);

  // mousemove: requestAnimationFrame 기반 throttling
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isHovering.current || rafId.current) return;

      rafId.current = requestAnimationFrame(() => {
        updateCardTransform(e.clientX, e.clientY);
        rafId.current = null;
      });
    },
    [updateCardTransform]
  );

  // mouseleave: cleanup 및 transform 초기화
  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    rectRef.current = null;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    // transform 초기화
    if (divRef.current) {
      divRef.current.style.setProperty("--rotate-x", "0deg");
      divRef.current.style.setProperty("--rotate-y", "0deg");
    }
  }, []);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, [href]);

  return (
    <>
      <div
        ref={divRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        class={`card-spotlight ${className}`}
        role={href ? "link" : undefined}
        tabIndex={href ? 0 : undefined}
      >
        {children}
      </div>

      <style>{`
        .card-spotlight {
          position: relative;
          border-radius: 1.5rem;
          overflow: hidden;
          cursor: pointer;

          /* CSS Variables for effects */
          --mouse-x: 50%;
          --mouse-y: 50%;
          --spotlight-color: rgba(255, 255, 255, 0.05);
          --rotate-x: 0deg;
          --rotate-y: 0deg;

          /* Padding for glass card */
          padding: 0.375rem;

          /* Glass Effect */
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);

          /* Glass Shadow */
          border: none;
          box-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
            0 4px 16px rgba(0, 0, 0, 0.1);

          /* 3D Transform */
          transform-style: preserve-3d;
          transform: perspective(1000px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y));

          /* GPU 레이어 힌트 - transform만 명시하여 불필요한 레이어 생성 방지 */
          will-change: transform;

          /* Transitions - transform만 빠르게, 나머지는 호버 시에만 */
          transition: transform 0.1s ease-out;
        }

        .card-spotlight:hover {
          box-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            0 12px 32px rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.15);
          /* 호버 시에만 box-shadow, background transition 추가 */
          transition: transform 0.1s ease-out, box-shadow 0.2s ease, background 0.3s ease;
        }

        .card-spotlight::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at var(--mouse-x) var(--mouse-y),
            var(--spotlight-color),
            transparent 80%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 10;
          /* spotlight 효과는 별도 레이어로 분리 */
          will-change: opacity;
        }

        .card-spotlight:hover::before,
        .card-spotlight:focus-within::before {
          opacity: 0.6;
        }

        /* Dark theme glass */
        :global([data-theme="dark"]) .card-spotlight {
          background: rgba(255, 255, 255, 0.05);
        }

        :global([data-theme="dark"]) .card-spotlight:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* Spring theme glass */
        :global([data-theme="spring"]) .card-spotlight {
          background: rgba(255, 182, 193, 0.1);
        }

        :global([data-theme="spring"]) .card-spotlight:hover {
          background: rgba(255, 182, 193, 0.15);
        }

        /* Fallback for browsers without backdrop-filter */
        @supports not (backdrop-filter: blur(16px)) {
          .card-spotlight {
            background: rgba(255, 255, 255, 0.9);
          }

          :global([data-theme="dark"]) .card-spotlight {
            background: rgba(17, 17, 17, 0.9);
          }

          :global([data-theme="spring"]) .card-spotlight {
            background: rgba(255, 240, 245, 0.9);
          }
        }
      `}</style>
    </>
  );
}
