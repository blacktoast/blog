// @ts-check
// import { fileURLToPath } from "node:url";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import remarkDirective from "remark-directive";
import remarkToc from "remark-toc";
import remarkBreaks from "remark-breaks";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import cloudflare from "@astrojs/cloudflare";
import { SITE } from "./src/config.ts";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import remarkPersonalOnly from "./src/remarkPersonalOnly.mjs";

import preact from "@astrojs/preact";

const isPersonalBuild = process.env.PUBLIC_TYPE === "personal";

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  integrations: [mdx(), sitemap(), icon(), preact()],
  adapter: cloudflare(),

  markdown: {
    remarkPlugins: [
      remarkDirective,
      [remarkPersonalOnly, { isPersonalBuild }],
      remarkBreaks,
      remarkToc,
      remarkMath,
    ],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
