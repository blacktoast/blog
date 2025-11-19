import { describe, it, expect } from "bun:test";
import { loadNoteDocument } from "./parse-blog.js";
import { join, resolve } from "node:path";

const TEST_ROOT = resolve(process.cwd(), "test-data/root");
const BLOG_ROOT = join(TEST_ROOT, "blog");

describe("loadNoteDocument", () => {
  it("should parse frontmatter correctly", async () => {
    const filePath = join(BLOG_ROOT, "test.md");
    const note = await loadNoteDocument(TEST_ROOT, filePath);
    expect(note.metadata.title).toBe("Hello World");
    expect(note.frontmatter["published"]).toBe(true);
    expect(note.metadata.tags).toEqual(["a", "b"]);
    expect(note.body.trim()).toBe("Body content");
  });

  it("should handle published: false", async () => {
    const filePath = join(BLOG_ROOT, "draft.md");
    const note = await loadNoteDocument(TEST_ROOT, filePath);
    expect(note.frontmatter["published"]).toBe(false);
  });

  it("should handle missing published (undefined)", async () => {
    const filePath = join(BLOG_ROOT, "implicit.md");
    const note = await loadNoteDocument(TEST_ROOT, filePath);
    expect(note.frontmatter["published"]).toBeUndefined();
  });
});
