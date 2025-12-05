import { describe, it, expect, beforeAll } from "bun:test";
import { resolveLogLink, rewriteLogBody } from "./parse-log.js";
import { loadNoteDocument, type NoteDocument } from "./parse-blog.js";
import { join, resolve } from "node:path";

const TEST_ROOT = resolve(process.cwd(), "test-data/root");

describe("Log Parsing Logic", () => {
  const mockIgnorePaths = [join(TEST_ROOT, "ignore")];
  
  let logNote: NoteDocument;
  let pebbleNote: NoteDocument;
  let blogNote: NoteDocument;
  let ignoredNote: NoteDocument;
  let anotherLog: NoteDocument; 
  
  let context: any;

  beforeAll(async () => {
      logNote = await loadNoteDocument(TEST_ROOT, join(TEST_ROOT, "log/entry.md"));
      pebbleNote = await loadNoteDocument(TEST_ROOT, join(TEST_ROOT, "pebbles/pebble.md"));
      blogNote = await loadNoteDocument(TEST_ROOT, join(TEST_ROOT, "blog/post.md"));
      ignoredNote = await loadNoteDocument(TEST_ROOT, join(TEST_ROOT, "ignore/note.md"));
      
      context = {
        notes: [logNote], 
        ignorePaths: mockIgnorePaths,
        pebbles: new Map<string, NoteDocument>(),
        allAvailableNotes: [logNote, pebbleNote, blogNote, ignoredNote],
        blogNotes: [blogNote],
      };
  });

  describe("resolveLogLink", () => {
    it("should resolve link to a blog post as /blog/{slug}", async () => {
      const result = await resolveLogLink("Blog Post", context);
      expect(result.url).toBe("/blog/blog-post"); 
      expect(result.label).toBe("Blog Post");
    });

    it("should resolve link to a non-blog, non-ignored file as pebble and extract it", async () => {
      const result = await resolveLogLink("Pebble Note", context);
      expect(result.url).toBe("/pebbles/pebble-note"); 
      expect(result.label).toBe("Pebble Note");
      expect(context.pebbles.has(pebbleNote.sourcePath)).toBe(true);
    });

    it("should resolve link to an ignored file as /writing", async () => {
      const result = await resolveLogLink("Ignored Note", context);
      expect(result.url).toBe("/writing");
      expect(result.label).toBe("Ignored Note");
    });

    it("should default to /writing for unknown links", async () => {
      const result = await resolveLogLink("Unknown", context);
      expect(result.url).toBe("/writing");
      expect(result.label).toBe("Unknown");
    });
  });

  describe("rewriteLogBody", () => {
    it("should rewrite links correctly", async () => {
      // Reset pebbles map
      context.pebbles.clear();

      const rewritten = await rewriteLogBody(
        logNote,
        context.notes,
        context.ignorePaths,
        context.pebbles,
        context.allAvailableNotes,
        context.blogNotes
      );

      expect(rewritten).toContain("[Blog Post](/blog/blog-post)");
      expect(rewritten).toContain("[Pebble Note](/pebbles/pebble-note)");
      expect(rewritten).toContain("[Ignored Note](/writing)");
      expect(rewritten).toContain("[Unknown](/writing)");
      
      // Verify pebble extraction side effect
      expect(context.pebbles.has(pebbleNote.sourcePath)).toBe(true);
    });
  });
});
