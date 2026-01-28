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
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .card-image {
          flex: 1;
          overflow: hidden;
          border-radius: 1.5rem 1.5rem 0 0;
        }

        .card-image img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .card-spotlight:hover .card-image img {
          transform: scale(1.05);
        }

        .card-footer {
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .card-origin {
          font-size: 0.875rem;
          color: var(--color-muted);
          font-family: monospace;
        }
      `}</style>
    </>
  );
}
