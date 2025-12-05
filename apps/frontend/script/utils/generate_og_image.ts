import satori from "satori";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadMoiraiOneFont(): ArrayBuffer {
  const fontPath = join(
    process.cwd(),
    "public",
    "fonts",
    "MoiraiOne-Regular.ttf"
  );

  return readFileSync(fontPath).buffer;
}

function loadEnFont(): ArrayBuffer {
  const fontPath = join(process.cwd(), "public", "fonts", "en-for-og.ttf");
  return readFileSync(fontPath).buffer;
}

export async function generateOgImage(
  title: string,
  pubDate: Date
): Promise<Buffer> {
  // 밤하늘 테마
  const theme = {
    bg: "linear-gradient(135deg, #1a0b2e 0%, #16213e 50%, #0f172a 100%)", // 밤하늘 그라데이션
    text: "#ffffff", // 흰색 텍스트
    shadow: "#000000", // 검은색 그림자
  };

  const fontData = loadMoiraiOneFont();
  const enFontData = loadEnFont();

  // 레이아웃 구성 (Satori)
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          background: theme.bg,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden", // 장식이 삐져나가지 않게
        },
        children: [
          // --- 배경 장식 (별/빛 효과) ---
          // 밤하늘 느낌의 반투명 원형 장식
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 100,
                left: 150,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.3)",
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
                opacity: 0.6,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 150,
                right: 200,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.3)",
                boxShadow: "0 0 15px rgba(255, 255, 255, 0.4)",
                opacity: 0.6,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 80,
                right: 300,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.3)",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                opacity: 0.5,
              },
            },
          },

          // --- 텍스트 컨테이너 ---
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                padding: "0 150px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 90, // 폰트 크기
                      lineHeight: 1.1,
                      fontFamily: "MoiraiOne",
                      color: theme.text,
                      textAlign: "center",
                      wordBreak: "keep-all",
                      // 밤하늘에서 잘 보이도록 텍스트 그림자
                      textShadow:
                        "2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)",
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      marginTop: 30,
                      fontSize: 14,
                      color: "rgba(255, 255, 255, 0.6)",
                      fontFamily: "en-for-og",
                    },
                    children: pubDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                },
                // 하단 블로그 이름 (고정)
                {
                  type: "div",
                  props: {
                    style: {
                      marginTop: 40,
                      fontSize: 20,
                      fontFamily: "en-for-og",
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                    children: "Retto's Blog",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "MoiraiOne",
          data: fontData,
          weight: 400,
          style: "normal",
        },
        {
          name: "en-for-og",
          data: enFontData,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  // sharp를 사용하여 SVG를 PNG로 변환
  const svgBuffer = Buffer.from(svg);
  const pngBuffer = await sharp(svgBuffer)
    .resize(1200, 630, {
      fit: "contain",
      background: { r: 15, g: 11, b: 46, alpha: 1 }, // 밤하늘 배경색 (어두운 보라색)
    })
    .png()
    .toBuffer();

  return pngBuffer;
}
