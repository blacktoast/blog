import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import { processEmbeddedImages } from "./parse-image.js";
import { loadNoteDocument } from "./parse-blog.js";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// Mock sharp
mock.module("sharp", () => {
  return {
    default: () => ({
      webp: () => ({
        toFile: async () => Promise.resolve(),
      }),
    }),
  };
});

const TEST_ROOT = resolve(process.cwd(), "test-data/root");
const ASSET_SOURCE_ROOT = join(TEST_ROOT, "assets");
const BLOG_ASSET_ROOT = join(TEST_ROOT, "output/assets");

describe("processEmbeddedImages", () => {
  beforeAll(async () => {
    await mkdir(BLOG_ASSET_ROOT, { recursive: true });
  });

  afterAll(async () => {
    await rm(join(TEST_ROOT, "output"), { recursive: true, force: true });
  });

  it("should replace image links and convert to webp", async () => {
    const notePath = join(TEST_ROOT, "image-note.md");
    const note = await loadNoteDocument(TEST_ROOT, notePath);

    const result = await processEmbeddedImages(note, {
      assetSourceRootDirectory: ASSET_SOURCE_ROOT,
      blogAssetRootDirectory: BLOG_ASSET_ROOT,
      blogAssetRelativePath: "../../assets",
    });

    expect(result).toContain("Here is an image: ![blog placeholder](../../assets/image-test-note/1.webp)");
  });

  it("should handle multiple images", async () => {
    const notePath = join(TEST_ROOT, "image-note-2.md");
    const note = await loadNoteDocument(TEST_ROOT, notePath);

    const result = await processEmbeddedImages(note, {
      assetSourceRootDirectory: ASSET_SOURCE_ROOT,
      blogAssetRootDirectory: BLOG_ASSET_ROOT,
      blogAssetRelativePath: "../../assets",
    });

    expect(result).toContain("Img1: ![blog placeholder](../../assets/image-test-note-2/1.webp)");
    expect(result).toContain("Img2: ![blog placeholder](../../assets/image-test-note-2/2.webp)");
  });
});
