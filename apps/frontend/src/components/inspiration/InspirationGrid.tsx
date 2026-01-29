import SpotlightCard from "./SpotlightCard";

interface InspirationItem {
  url: string;
  gifPath: string;
  name?: string;
}

// 영감 받은 사이트 데이터 (하드코딩)
const inspirations: InspirationItem[] = [
  // 예시 데이터 - 실제 데이터로 교체하세요
  {
    url: "https://origamiarchive.com/",
    gifPath: "/inspiration/origamiarchive.gif",
    name: "Stripe"
  },
];

const getOrigin = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

export default function InspirationGrid() {
  if (inspirations.length === 0) {
    return (
      <div class="empty-state">
        <p>아직 등록된 영감이 없습니다.</p>
        <style>{`
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--color-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div class="inspiration-grid">
        {inspirations.map((item, index) => (
          <SpotlightCard key={index} href={item.url}>
            <div class="card-content">
              <div class="card-image">
                <img
                  src={item.gifPath}
                  alt={item.name || getOrigin(item.url)}
                  loading="lazy"
                />
              </div>
              <div class="card-footer">
                <span class="card-origin">{getOrigin(item.url)}</span>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <style>{`
        .inspiration-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 640px) {
          .inspiration-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .inspiration-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .card-content {
          position: relative;
          height: 100%;
        }

        .card-image {
          overflow: hidden;
          border-radius: 1rem;
        }

        .card-image img {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .card-spotlight:hover .card-image img {
          transform: scale(1.05);
        }

        /* Glass Footer - pill shape overlay on image */
        .card-footer {
          position: absolute;
          display: flex;
          align-items: center;
          
          bottom: 0.75rem;
          right: 0.75rem;
          padding: 0.25rem 0.5rem;

          /* Glass Effect */
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px) saturate(1.5);
          -webkit-backdrop-filter: blur(12px) saturate(1.5);

          /* Glass Border */
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            0 2px 8px rgba(0, 0, 0, 0.1);

          /* Pill shape */
          border-radius: 9999px;

          /* Below spotlight overlay (z-index: 10) */
          z-index: 5;

          /* Limit width for long domains */
          max-width: calc(100% - 1.5rem);

          /* Smooth theme transition */
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        /* Dark theme glass */
        :global([data-theme="dark"]) .card-footer {
          background: rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Spring theme glass */
        :global([data-theme="spring"]) .card-footer {
          background: rgba(255, 182, 193, 0.25);
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* Fallback for browsers without backdrop-filter */
        @supports not (backdrop-filter: blur(12px)) {
          .card-footer {
            background: rgba(255, 255, 255, 0.85);
          }

          :global([data-theme="dark"]) .card-footer {
            background: rgba(0, 0, 0, 0.75);
          }

          :global([data-theme="spring"]) .card-footer {
            background: rgba(255, 182, 193, 0.85);
          }
        }

        .card-origin {
          font-size: 0.6rem;
          line-height: 1;
          color: var(--color-muted);
          font-family: monospace;
          /* Handle long domain names */
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
      `}</style>
    </>
  );
}
