import { useRef, useState, useLayoutEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

interface SpotlightCardProps {
  children: ComponentChildren;
  className?: string;
  href?: string;
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
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<string>("light");

  useLayoutEffect(() => {
    const updateTheme = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      setTheme(currentTheme);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    divRef.current.style.setProperty("--mouse-x", `${x}px`);
    divRef.current.style.setProperty("--mouse-y", `${y}px`);
    divRef.current.style.setProperty(
      "--spotlight-color",
      getSpotlightColor(theme)
    );
  };

  const handleClick = () => {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div
        ref={divRef}
        onMouseMove={handleMouseMove}
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
          border: 1px solid var(--color-border);
          background-color: var(--color-background);
          overflow: hidden;
          --mouse-x: 50%;
          --mouse-y: 50%;
          --spotlight-color: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card-spotlight:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
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
          transition: opacity 0.5s ease;
          pointer-events: none;
          z-index: 10;
        }

        .card-spotlight:hover::before,
        .card-spotlight:focus-within::before {
          opacity: 0.6;
        }

        :global([data-theme="dark"]) .card-spotlight {
          background-color: #111;
          border-color: #222;
        }
      `}</style>
    </>
  );
}
