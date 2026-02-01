import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './BlogTitleAnimation.module.css';

interface BlogTitleAnimationProps {
  class?: string;
}

const titles = [
  { text: "Retto's blog", flag: '🇺🇸', lang: 'en' },
  { text: 'ラッコのブログ', flag: '🇯🇵', lang: 'ja' },
  { text: '海獭的博客', flag: '🇨🇳', lang: 'zh' },
  { text: 'Le Blog de Loutre', flag: '🇫🇷', lang: 'fr' },
  { text: "Sjøoter's Blog", flag: '🇳🇴', lang: 'no' },
];

const fontWarmupSpecs: Record<string, string> = {
  en: '700 20px "en-blog"',
  ja: '900 20px "JPLogo"',
  zh: '400 20px "ZHLogo"',
  fr: '700 20px "FRLogo"',
  no: '700 20px "FRLogo"',
};

// 타이밍 파라미터
const TYPING_SPEED = 50;
const DELETING_SPEED = 30;
const PAUSE_DURATION = 2000;
const NEXT_TITLE_DELAY = 500;

function warmFontForLang(lang: string) {
  const spec = fontWarmupSpecs[lang];
  if (spec && typeof document !== 'undefined' && document.fonts) {
    document.fonts.load(spec);
  }
}

// Intl.Segmenter를 사용하여 grapheme cluster 단위로 문자열 분할
function splitIntoGraphemes(str: string): string[] {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), (s) => s.segment);
  }
  return Array.from(str);
}

type Phase = 'typing' | 'pause' | 'deleting' | 'next';

export default function BlogTitleAnimation({ class: className }: BlogTitleAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showFlag, setShowFlag] = useState(false);

  const phaseRef = useRef<Phase>('typing');
  const charIndexRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const currentTitle = titles[currentIndex];
  const charactersRef = useRef<string[]>([]);

  // 타이틀 변경 시 characters 업데이트
  useEffect(() => {
    charactersRef.current = splitIntoGraphemes(titles[currentIndex].text);
    charIndexRef.current = 0;
    phaseRef.current = 'typing';
    setDisplayedText('');
    setShowFlag(false);

    // 폰트 프리로딩
    warmFontForLang(titles[currentIndex].lang);
    const nextIndex = (currentIndex + 1) % titles.length;
    warmFontForLang(titles[nextIndex].lang);
  }, [currentIndex]);

  useEffect(() => {
    const runAnimation = () => {
      const characters = charactersRef.current;

      switch (phaseRef.current) {
        case 'typing':
          if (charIndexRef.current < characters.length) {
            charIndexRef.current++;
            setDisplayedText(characters.slice(0, charIndexRef.current).join(''));
            timeoutRef.current = window.setTimeout(runAnimation, TYPING_SPEED);
          } else {
            // 타이핑 완료, 국기 표시
            setShowFlag(true);
            phaseRef.current = 'pause';
            timeoutRef.current = window.setTimeout(runAnimation, PAUSE_DURATION);
          }
          break;

        case 'pause':
          // 대기 완료, 삭제 시작
          phaseRef.current = 'deleting';
          setShowFlag(false); // 국기 먼저 숨김
          timeoutRef.current = window.setTimeout(runAnimation, DELETING_SPEED);
          break;

        case 'deleting':
          if (charIndexRef.current > 0) {
            charIndexRef.current--;
            setDisplayedText(characters.slice(0, charIndexRef.current).join(''));
            timeoutRef.current = window.setTimeout(runAnimation, DELETING_SPEED);
          } else {
            // 삭제 완료, 다음 타이틀 준비
            phaseRef.current = 'next';
            timeoutRef.current = window.setTimeout(runAnimation, NEXT_TITLE_DELAY);
          }
          break;

        case 'next':
          // 다음 타이틀로 전환
          setCurrentIndex((prev) => (prev + 1) % titles.length);
          break;
      }
    };

    // 애니메이션 시작
    timeoutRef.current = window.setTimeout(runAnimation, TYPING_SPEED);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex]);

  return (
    <span
      class={`${styles.container} ${className || ''}`}
      data-lang={currentTitle.lang}
    >
      <span class={styles.titleText}>{displayedText}</span>
      <span class={styles.titleFlag}>{showFlag ? ` ${currentTitle.flag}` : ''}</span>
      <span class={styles.cursor}>|</span>
    </span>
  );
}
