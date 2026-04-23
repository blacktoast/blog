import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BookText, ScrollText, Lightbulb } from 'lucide-preact';
import styles from './NavBar.module.css';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: string;
}

interface NavBarProps {
  items: NavItem[];
  isInspirationPage: boolean;
}

const ITEM_SIZE = 40;
const GAP = 8;
const ICON_SIZE = 20;
const DRILL_ICON_SIZE = 24;
const STEP = ITEM_SIZE + GAP;
const ACTIVE_CIRCLE = 20;
const HOVER_CIRCLE = 28;
const HOVER_OFFSET = -6;
const ACTIVE_OFFSET = (ITEM_SIZE - ACTIVE_CIRCLE) / 2;

const CLICK_SETTLE_TRANSITION =
  'left 140ms cubic-bezier(0.34, 1.56, 0.64, 1), top 140ms cubic-bezier(0.34, 1.56, 0.64, 1), width 140ms cubic-bezier(0.34, 1.56, 0.64, 1), height 140ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 140ms ease-out';

function PebblesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 21L16 14L20 15L22 19L20.5 21H14Z" />
        <path d="M16 14L14 6L6 9L3 21H14" />
      </g>
    </svg>
  );
}

function DrillIconSvg() {
  return (
    <svg
      width="24" height="24" viewBox="0 0 32 32"
      overflow="visible" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g class="environment">
        <g class="rock-mover">
          <g class="rock-vibrate">
            <path d="M -1.5 13 L 2.5 14 L 5 18.5 L 3 23 L -1.5 25 L -5.5 22 L -4.5 16 Z" strokeWidth="1.5" />
            <path d="M -0.5 17 L 2 19 L 5 18.5" strokeWidth="1.5" opacity="0.6" />
          </g>
        </g>
        <g class="sparks" strokeWidth="1.5">
          <line class="spark spark-1" x1="6.8" y1="16.8" x2="10.3" y2="13.3" />
          <line class="spark spark-2" x1="7.1" y1="17.8" x2="11.9" y2="19.1" />
          <line class="spark spark-3" x1="6.6" y1="18.4" x2="9.1" y2="22.7" />
        </g>
        <g class="debris-group" fill="currentColor" stroke="none">
          <circle class="debris d1" cx="6.0" cy="17.6" r="0.8" />
          <circle class="debris d2" cx="6.0" cy="17.6" r="1.2" />
          <circle class="debris d3" cx="6.0" cy="17.6" r="0.7" />
        </g>
      </g>
      <g class="drill-wrapper">
        <g class="drill-vibrate">
          <line class="bit" x1="6" y1="12" x2="11" y2="12" />
          <polygon points="14,9.5 11,10.5 11,13.5 14,14.5" />
          <rect x="14" y="9" width="10" height="6" rx="1.5" />
          <line x1="20.5" y1="10" x2="20.5" y2="14" strokeWidth="1.5" opacity="0.6" />
          <line x1="22" y1="10" x2="22" y2="14" strokeWidth="1.5" opacity="0.6" />
          <path d="M 18 15 L 19 22" />
          <path d="M 22 15 L 23 22" />
          <rect x="17" y="22" width="8" height="4" rx="1" />
          <line class="trigger" x1="18" y1="17" x2="16" y2="17" />
        </g>
      </g>
    </svg>
  );
}

function renderIcon(icon: string) {
  switch (icon) {
    case 'book-text':
      return <BookText size={ICON_SIZE} />;
    case 'pebbles':
      return <PebblesIcon />;
    case 'scroll-text':
      return <ScrollText size={ICON_SIZE} />;
    case 'lightbulb':
      return <Lightbulb size={ICON_SIZE} />;
    case 'drill':
      return <DrillIconSvg />;
    default:
      return null;
  }
}

export default function NavBar({ items, isInspirationPage }: NavBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPath(window.location.pathname);

    const handle = () => {
      setCurrentPath(window.location.pathname);
      setClickedIndex(null);
    };
    document.addEventListener('astro:page-load', handle);
    return () => document.removeEventListener('astro:page-load', handle);
  }, []);

  const activeIndex = useMemo(() => {
    return items.findIndex((item) => currentPath.startsWith(item.href));
  }, [currentPath, items]);

  // Priority: clicked > hover (non-active) > active > none
  let targetIndex = -1;
  let useActiveGeometry = false;

  if (clickedIndex !== null) {
    targetIndex = clickedIndex;
    useActiveGeometry = true;
  } else if (hoveredIndex !== null && hoveredIndex !== activeIndex) {
    targetIndex = hoveredIndex;
    useActiveGeometry = false;
  } else if (activeIndex >= 0) {
    targetIndex = activeIndex;
    useActiveGeometry = true;
  }

  const hasTarget = targetIndex >= 0;
  const circleSize = useActiveGeometry ? ACTIVE_CIRCLE : HOVER_CIRCLE;
  const circleOffset = useActiveGeometry ? ACTIVE_OFFSET : HOVER_OFFSET;
  const circleLeft = hasTarget ? targetIndex * STEP + circleOffset : 0;
  const circleTop = hasTarget ? circleOffset : 0;
  const circleCenterX = circleLeft + circleSize / 2;
  const circleCenterY = circleTop + circleSize / 2;

  const getMaskStyle = (i: number): Record<string, string> => {
    const iconSize = items[i].icon === 'drill' ? DRILL_ICON_SIZE : ICON_SIZE;
    const iconLeft = i * STEP + (ITEM_SIZE - iconSize) / 2;
    const iconTop = (ITEM_SIZE - iconSize) / 2;

    const cxLocal = circleCenterX - iconLeft;
    const cyLocal = circleCenterY - iconTop;

    const maskRadius = circleSize / 2 + 6;
    const maskDiameter = maskRadius * 2;
    const maskPosX = cxLocal - maskRadius;
    const maskPosY = cyLocal - maskRadius;

    const gradient =
      'radial-gradient(circle, black 0%, black 40%, transparent 100%)';

    return {
      maskImage: gradient,
      maskSize: `${maskDiameter}px ${maskDiameter}px`,
      maskPosition: `${maskPosX}px ${maskPosY}px`,
      maskRepeat: 'no-repeat',
      WebkitMaskImage: gradient,
      WebkitMaskSize: `${maskDiameter}px ${maskDiameter}px`,
      WebkitMaskPosition: `${maskPosX}px ${maskPosY}px`,
      WebkitMaskRepeat: 'no-repeat',
    };
  };

  const handleItemMouseDown = (i: number) => {
    setClickedIndex(i);
  };

  const handleLightbulbClick = (e: MouseEvent) => {
    if (!isInspirationPage) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent('lightbulb-click', {
        detail: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      }),
    );
  };

  // Preact+Astro hydration has an edge case where SSR-rendered elements
  // don't get their class/data attributes updated on the first client render,
  // even though children are added correctly. Set attributes imperatively
  // via ref to bypass this.
  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.setAttribute('data-visible', hasTarget ? 'true' : 'false');
    el.style.left = `${circleLeft}px`;
    el.style.top = `${circleTop}px`;
    el.style.width = `${circleSize}px`;
    el.style.height = `${circleSize}px`;
    if (clickedIndex !== null) {
      el.style.transition = CLICK_SETTLE_TRANSITION;
    } else {
      el.style.removeProperty('transition');
    }
  }, [hasTarget, circleLeft, circleTop, circleSize, clickedIndex]);

  return (
    <div class={styles.container}>
      <div ref={circleRef} class={styles.accentCircle} data-visible="false" />

      {items.map((item, i) => {
        const isDrill = item.icon === 'drill';
        const isLightbulb = item.icon === 'lightbulb';
        const isLightbulbLit = isLightbulb && isInspirationPage;
        const iconSize = isDrill ? DRILL_ICON_SIZE : ICON_SIZE;

        const itemClasses = [
          styles.navItem,
          isDrill && 'drill-nav',
          isLightbulbLit && 'lightbulb-lit',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <a
            key={item.id}
            href={item.href}
            class={itemClasses}
            aria-label={item.label}
            style={isDrill ? { overflow: 'visible' } : undefined}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseDown={() => handleItemMouseDown(i)}
            onClick={isLightbulb ? handleLightbulbClick : undefined}
            data-lightbulb={isLightbulb || undefined}
          >
            <span class={styles.front}>
              <span
                class={styles.iconContainer}
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                }}
              >
                <span class={styles.iconBase}>{renderIcon(item.icon)}</span>
                {hasTarget && !isLightbulbLit && (
                  <span class={styles.iconHighlight} style={getMaskStyle(i)}>
                    {renderIcon(item.icon)}
                  </span>
                )}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
