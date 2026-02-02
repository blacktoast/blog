import type { ComponentChildren } from 'preact';
import styles from './GlassNavIcon.module.css';

interface GlassNavIconProps {
  href: string;
  label: string;
  isActive?: boolean;
  children: ComponentChildren;
  className?: string;
  'data-lightbulb'?: boolean;
  'data-lightbulb-mobile'?: boolean;
  /** 모바일 메뉴용 레이아웃 */
  variant?: 'default' | 'mobile';
  /** 모바일에서 표시할 텍스트 라벨 */
  showLabel?: boolean;
}

export default function GlassNavIcon({
  href,
  label,
  isActive = false,
  children,
  className,
  'data-lightbulb': dataLightbulb,
  'data-lightbulb-mobile': dataLightbulbMobile,
  variant = 'default',
  showLabel = false,
}: GlassNavIconProps) {
  const isMobile = variant === 'mobile';

  const classNames = [
    isMobile ? styles.glassIconMobile : styles.glassIcon,
    isActive && styles.active,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const dataAttrs: Record<string, boolean> = {};
  if (dataLightbulb) dataAttrs['data-lightbulb'] = true;
  if (dataLightbulbMobile) dataAttrs['data-lightbulb-mobile'] = true;

  return (
    <a href={href} class={classNames} aria-label={label} {...dataAttrs}>
      {/* 배경 레이어 - 클릭/활성 시 accent 컬러 */}
      <div class={styles.back} aria-hidden="true" />
      {/* 글래스 레이어 */}
      <span class={styles.front}>
        <span class={styles.icon}>{children}</span>
        {showLabel && <span class={styles.label}>{label}</span>}
      </span>
    </a>
  );
}
