import { readFile } from "node:fs/promises";
import { normalize, relative } from "node:path";
import {
  extractDate,
  extractPublished,
  extractTags,
  extractTitle,
  parseFrontmatter,
} from "./frontmatter.ts";
import { buildReferenceIds, toSlug } from "./slug.ts";
import { type NoteDocument, type NoteMetadata } from "./types.ts";

export async function loadNoteDocument(
  rootDir: string,
  filePath: string
): Promise<NoteDocument> {
  const rawContent = await readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(rawContent);
  const relativePath = normalize(relative(rootDir, filePath));
  const title = extractTitle(frontmatter, filePath);
  const slug = toSlug(title);
  const tags = extractTags(frontmatter);
  const created = extractDate(frontmatter, "created");
  const modified = extractDate(frontmatter, "modified");
  const published = extractPublished(frontmatter);
  const referenceIds = buildReferenceIds(title, filePath, relativePath);
  const metadata: NoteMetadata = {
    title,
    slug,
    created,
    modified,
    published,
    tags,
    referenceIds,
  };
  return {
    sourcePath: filePath,
    relativePath,
    frontmatter,
    body,
    metadata,
  };
}
