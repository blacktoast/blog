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

    // Spotlight effect
    divRef.current.style.setProperty("--mouse-x", `${x}px`);
    divRef.current.style.setProperty("--mouse-y", `${y}px`);
    divRef.current.style.setProperty(
      "--spotlight-color",
      getSpotlightColor(theme)
    );

    // 3D Tilt effect - calculate rotation based on mouse position
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 8; // maximum tilt angle in degrees

    // rotateY: left(-) / right(+), rotateX: top(+) / bottom(-)
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const rotateX = ((centerY - y) / centerY) * maxTilt;

    divRef.current.style.setProperty("--rotate-x", `${rotateX}deg`);
    divRef.current.style.setProperty("--rotate-y", `${rotateY}deg`);
  };

  const handleMouseLeave = () => {
    if (!divRef.current) return;
    // Reset tilt on mouse leave
    divRef.current.style.setProperty("--rotate-x", "0deg");
    divRef.current.style.setProperty("--rotate-y", "0deg");
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

          /* Transitions */
          transition: transform 0.15s ease-out, box-shadow 0.2s ease, background 0.3s ease;
        }

        .card-spotlight:hover {
          box-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            0 12px 32px rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.15);
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
