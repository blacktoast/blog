// @ts-check
// import { fileURLToPath } from "node:url";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";

import cloudflare from "@astrojs/cloudflare";

import { SITE } from "./src/config.ts";

import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  integrations: [mdx(), sitemap(), icon()],
  adapter: cloudflare(),

  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
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