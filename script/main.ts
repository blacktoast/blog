import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  basename,
  extname,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import {
  type NoteDocument,
  type NoteMetadata,
  collectMarkdownFiles,
  ensureUniqueSlug,
  loadNoteDocument,
  parseFrontmatter,
  type FrontmatterRecord,
} from "./parse-blog.js";
import { type PathConfig, loadPathConfig } from "./get-path.js";
import { IS_DEBUG_MODE } from "./constants/debug.js";
import { processEmbeddedImages } from "./parse-image.js";
import { synchronizeLogFiles } from "./parse-log.js";

let syncLogSequence = 0;

function logSyncStep(message: string, context?: Record<string, unknown>): void {
  if (!IS_DEBUG_MODE) {
    return;
  }
  syncLogSequence += 1;
  if (context !== undefined) {
    console.log(`[sync:${syncLogSequence}] ${message}`, context);
    return;
  }
  console.log(`[sync:${syncLogSequence}] ${message}`);
}

type BlogEntry = {
  slug: string;
  outputPath: string;
  metadata: NoteMetadata;
};

type BlogFrontmatter = {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  tags: readonly string[];
};

type SyncResult = {
  writtenCount: number;
  entries: readonly BlogEntry[];
};

type LinkResolutionContext = {
  blogReferenceMap: Map<string, BlogEntry>;
  sourceReferenceMap: Map<string, NoteDocument>;
  rootDir: string;
  blogOutputDir: string;
  rootLookupCache: Map<string, RootLookupResult>;
};

type RootLookupResult =
  | { status: "not-found" }
  | { status: "found"; published: boolean; title: string; filePath: string };

function buildBlogFrontmatter(note: NoteDocument): BlogFrontmatter {
  const pubDate = note.metadata.created ?? note.metadata.modified ?? new Date();
  const description = extractDescription(note.body);
  return {
    title: note.metadata.title,
    description,
    pubDate,
    updatedDate: note.metadata.modified,
    tags: note.metadata.tags,
  };
}

function extractDescription(body: string): string {
  const lines = body.split(/\r?\n/);
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
      continue;
    }
    if (trimmedLine.startsWith("#")) {
      continue;
    }
    buffer.push(trimmedLine);
  }
  if (buffer.length > 0) {
    paragraphs.push(buffer.join(" "));
  }
  const firstParagraph = paragraphs.find((paragraph) => paragraph.length > 0);
  if (!firstParagraph) {
    return "No description available.";
  }
  return truncate(firstParagraph, 180);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function serializeBlogFrontmatter(frontmatter: BlogFrontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${formatYamlString(frontmatter.title)}`);
  lines.push(`description: ${formatYamlString(frontmatter.description)}`);
  lines.push(`pubDate: ${formatDate(frontmatter.pubDate)}`);
  if (frontmatter.updatedDate) {
    lines.push(`updatedDate: ${formatDate(frontmatter.updatedDate)}`);
  }
  if (frontmatter.tags.length > 0) {
    lines.push("tags:");
    for (const tag of frontmatter.tags) {
      lines.push(`  - ${formatYamlString(tag)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function formatYamlString(value: string): string {
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `'${year}-${month}-${day}'`;
}

function trimLeadingBlankLines(value: string): string {
  return value.replace(/^\s*\n+/, "");
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function normalizeReferenceId(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const withoutAlias = trimmed.split("|")[0];
  const withoutExtension = withoutAlias.replace(/\.[^/.]+$/, "");
  const normalizedSeparators = withoutExtension.replace(/\\/g, "/");
  const collapsedWhitespace = normalizedSeparators.replace(/\s+/g, " ");
  return collapsedWhitespace.toLowerCase();
}

function toSlug(input: string): string {
  const normalized = input.trim();
  if (normalized.length === 0) {
    return "note";
  }
  const sanitized = normalized
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = sanitized.length === 0 ? "note" : sanitized;
  return slug.toLowerCase();
}

async function lookupNoteInRoot(
  rootDir: string,
  blogOutputDir: string,
  referenceId: string,
  cache: Map<string, RootLookupResult>
): Promise<RootLookupResult> {
  const cached = cache.get(referenceId);
  if (cached !== undefined) {
    return cached;
  }
  const result = await findNoteByReferenceId(
    rootDir,
    blogOutputDir,
    referenceId
  );
  cache.set(referenceId, result);
  return result;
}

async function findNoteByReferenceId(
  rootDir: string,
  blogOutputDir: string,
  referenceId: string
): Promise<RootLookupResult> {
  try {
    const normalizedReferenceId = normalizeReferenceId(referenceId);
    const slugReferenceId = toSlug(referenceId);
    const files = await collectMarkdownFiles([rootDir, blogOutputDir]);
    for (const filePath of files) {
      const rawContent = await readFile(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatter(rawContent);
      const title = extractTitleFromFrontmatter(frontmatter, body, filePath);
      const normalizedTitle = normalizeReferenceId(title);
      const normalizedPath = normalizeReferenceId(
        basename(filePath, extname(filePath))
      );
      const slugTitle = toSlug(title);
      const slugPath = toSlug(basename(filePath, extname(filePath)));
      if (
        normalizedTitle === normalizedReferenceId ||
        normalizedPath === normalizedReferenceId ||
        slugTitle === slugReferenceId ||
        slugPath === slugReferenceId ||
        slugTitle === normalizedReferenceId ||
        slugPath === normalizedReferenceId ||
        normalizedTitle === slugReferenceId ||
        normalizedPath === slugReferenceId
      ) {
        const published = extractPublishedFromFrontmatter(frontmatter);
        return {
          status: "found",
          published,
          title,
          filePath,
        };
      }
    }
  } catch (error) {
    console.warn(`[lookup] Error searching for ${referenceId}:`, error);
  }
  return { status: "not-found" };
}

function extractTitleFromFrontmatter(
  frontmatter: FrontmatterRecord,
  body: string,
  filePath: string
): string {
  const titleValue = getFrontmatterValue(frontmatter, "title");
  if (typeof titleValue === "string" && titleValue.trim().length > 0) {
    return titleValue.trim();
  }
  return basename(filePath, extname(filePath)).trim();
}

function getFrontmatterValue(
  record: FrontmatterRecord,
  key: string
): string | boolean | string[] | null | undefined {
  const target = key.toLowerCase();
  for (const entryKey of Object.keys(record)) {
    if (entryKey.toLowerCase() === target) {
      return record[entryKey];
    }
  }
  return undefined;
}

function extractPublishedFromFrontmatter(
  frontmatter: FrontmatterRecord
): boolean {
  const value = getFrontmatterValue(frontmatter, "published");
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  return false;
}

function isPathInDirectory(filePath: string, directory: string): boolean {
  const normalizedDir = normalize(resolve(directory));
  const normalizedPath = normalize(resolve(filePath));
  const relativePath = relative(normalizedDir, normalizedPath);
  return !relativePath.startsWith("..") && relativePath !== normalizedPath;
}

async function resolveLinkReference(
  referenceId: string,
  context: LinkResolutionContext
): Promise<{ url: string; label: string }> {
  const normalizedReferenceId = normalizeReferenceId(referenceId);
  const slugReferenceId = toSlug(referenceId);
  const lowerReferenceId = referenceId.toLowerCase();
  let blogEntry = context.blogReferenceMap.get(referenceId);
  if (blogEntry === undefined) {
    blogEntry = context.blogReferenceMap.get(normalizedReferenceId);
  }
  if (blogEntry === undefined) {
    blogEntry = context.blogReferenceMap.get(slugReferenceId);
  }
  if (blogEntry === undefined) {
    blogEntry = context.blogReferenceMap.get(lowerReferenceId);
  }
  if (blogEntry !== undefined) {
    return {
      url: `/blog/${blogEntry.slug}`,
      label: blogEntry.metadata.title,
    };
  }
  let sourceNote = context.sourceReferenceMap.get(referenceId);
  if (sourceNote === undefined) {
    sourceNote = context.sourceReferenceMap.get(normalizedReferenceId);
  }
  if (sourceNote === undefined) {
    sourceNote = context.sourceReferenceMap.get(slugReferenceId);
  }
  if (sourceNote === undefined) {
    sourceNote = context.sourceReferenceMap.get(lowerReferenceId);
  }
  if (sourceNote !== undefined) {
    if (sourceNote.metadata.published) {
      return {
        url: `/blog/${sourceNote.metadata.slug}`,
        label: sourceNote.metadata.title,
      };
    }
    return {
      url: `/writing`,
      label: sourceNote.metadata.title,
    };
  }
  const rootLookup = await lookupNoteInRoot(
    context.rootDir,
    context.blogOutputDir,
    referenceId,
    context.rootLookupCache
  );
  if (rootLookup.status === "found") {
    if (isPathInDirectory(rootLookup.filePath, context.blogOutputDir)) {
      const slug = basename(rootLookup.filePath, extname(rootLookup.filePath));
      return {
        url: `/blog/${slug}`,
        label: rootLookup.title,
      };
    }
    if (rootLookup.published) {
      return {
        url: `/writing`,
        label: rootLookup.title,
      };
    }
    return {
      url: `/writing`,
      label: rootLookup.title,
    };
  }
  return {
    url: `/writing`,
    label: referenceId,
  };
}

async function rewriteNoteBody(
  note: NoteDocument,
  context: LinkResolutionContext
): Promise<string> {
  logSyncStep("rewriteNoteBody:start", {
    notePath: note.sourcePath,
  });
  const doubleBracketPattern = /\[\[([^\]]+)\]\]/g;
  const matches = Array.from(note.body.matchAll(doubleBracketPattern));
  if (matches.length === 0) {
    logSyncStep("rewriteNoteBody:no-links", {
      notePath: note.sourcePath,
    });
    return note.body;
  }
  let rewritten = note.body;
  for (const match of matches.reverse()) {
    const fullMatch = match[0];
    const referenceText = match[1];
    const resolved = await resolveLinkReference(referenceText, context);
    const replacement = `[${resolved.label}](${resolved.url})`;
    const matchIndex = match.index!;
    rewritten =
      rewritten.slice(0, matchIndex) +
      replacement +
      rewritten.slice(matchIndex + fullMatch.length);
    logSyncStep("rewriteNoteBody:link-resolved", {
      notePath: note.sourcePath,
      referenceText,
      url: resolved.url,
    });
  }
  logSyncStep("rewriteNoteBody:completed", {
    notePath: note.sourcePath,
    replacements: matches.length,
  });
  return rewritten;
}

async function synchronizePublishedNotes(
  notes: readonly NoteDocument[],
  outputDir: string,
  context: LinkResolutionContext
): Promise<SyncResult> {
  logSyncStep("synchronizePublishedNotes:start", {
    notes: notes.map((note) => note.sourcePath),
    outputDir,
  });
  await mkdir(outputDir, { recursive: true });
  const entries: BlogEntry[] = [];
  let writtenCount = 0;
  const assetSourceRootDirectory = resolve(context.rootDir, "assets");
  for (const note of notes) {
    logSyncStep("synchronizePublishedNotes:note-start", {
      notePath: note.sourcePath,
      slug: note.metadata.slug,
    });
    const extension =
      extname(note.sourcePath).toLowerCase() === ".mdx" ? ".mdx" : ".md";
    const destinationPath = join(
      outputDir,
      `${note.metadata.slug}${extension}`
    );
    const blogFrontmatter = buildBlogFrontmatter(note);
    const bodyWithImages = await processEmbeddedImages(note, {
      assetSourceRootDirectory,
    });
    logSyncStep("synchronizePublishedNotes:images-processed", {
      notePath: note.sourcePath,
    });
    const noteWithImages: NoteDocument = { ...note, body: bodyWithImages };
    const transformedBody = await rewriteNoteBody(noteWithImages, context);
    logSyncStep("synchronizePublishedNotes:links-rewritten", {
      notePath: note.sourcePath,
    });
    const rewrittenBody = ensureTrailingNewline(
      trimLeadingBlankLines(transformedBody)
    );
    const documentContent = `${serializeBlogFrontmatter(blogFrontmatter)}\n${rewrittenBody}`;
    await writeFile(destinationPath, documentContent, "utf8");
    logSyncStep("synchronizePublishedNotes:note-written", {
      notePath: note.sourcePath,
      destinationPath,
    });
    writtenCount += 1;
    entries.push({
      slug: note.metadata.slug,
      outputPath: destinationPath,
      metadata: {
        ...note.metadata,
        published: true,
      },
    });
  }
  logSyncStep("synchronizePublishedNotes:completed", {
    writtenCount,
  });
  return { writtenCount, entries };
}

async function discoverExistingBlogEntries(
  blogDir: string
): Promise<BlogEntry[]> {
  const existingPaths = await collectMarkdownFiles([blogDir]);
  const entries: BlogEntry[] = [];
  for (const filePath of existingPaths) {
    const rawContent = await readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(rawContent);
    const title = extractTitleFromFrontmatter(frontmatter, body, filePath);
    const tags = extractTagsFromFrontmatter(frontmatter);
    const created =
      extractDateFromFrontmatter(frontmatter, "pubDate") ??
      extractDateFromFrontmatter(frontmatter, "created");
    const modified =
      extractDateFromFrontmatter(frontmatter, "updatedDate") ??
      extractDateFromFrontmatter(frontmatter, "modified");
    const slug = basename(filePath, extname(filePath));
    const referenceIds = buildReferenceIds(title, slug, filePath);
    const metadata: NoteMetadata = {
      title,
      slug,
      created,
      modified,
      published: true,
      tags,
      referenceIds,
    };
    entries.push({
      slug,
      outputPath: filePath,
      metadata,
    });
  }
  return entries;
}

function extractTagsFromFrontmatter(
  frontmatter: FrontmatterRecord
): readonly string[] {
  const rawTags = getFrontmatterValue(frontmatter, "tags");
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
  if (typeof rawTags === "string" && rawTags.trim().length > 0) {
    return [rawTags.trim()];
  }
  return [];
}

function extractDateFromFrontmatter(
  frontmatter: FrontmatterRecord,
  key: string
): Date | undefined {
  const rawValue = getFrontmatterValue(frontmatter, key);
  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
}

function buildReferenceIds(
  title: string,
  slug: string,
  filePath: string
): readonly string[] {
  const ids = new Set<string>();
  const baseName = basename(filePath, extname(filePath));
  ids.add(normalizeReferenceId(title));
  ids.add(normalizeReferenceId(slug));
  ids.add(normalizeReferenceId(baseName));
  ids.add(toSlug(title));
  ids.add(toSlug(baseName));
  return Array.from(ids).filter((value) => value.length > 0);
}

function buildLinkResolutionContext(
  publishedNotes: readonly NoteDocument[],
  existingBlogEntries: readonly BlogEntry[],
  rootDir: string,
  blogOutputDir: string
): LinkResolutionContext {
  const blogReferenceMap = new Map<string, BlogEntry>();
  for (const entry of existingBlogEntries) {
    for (const refId of entry.metadata.referenceIds) {
      blogReferenceMap.set(refId, entry);
    }
    const normalizedTitle = normalizeReferenceId(entry.metadata.title);
    const slugTitle = toSlug(entry.metadata.title);
    blogReferenceMap.set(normalizedTitle, entry);
    blogReferenceMap.set(slugTitle, entry);
    blogReferenceMap.set(entry.metadata.title.toLowerCase(), entry);
  }
  const sourceReferenceMap = new Map<string, NoteDocument>();
  for (const note of publishedNotes) {
    for (const refId of note.metadata.referenceIds) {
      sourceReferenceMap.set(refId, note);
    }
    const normalizedTitle = normalizeReferenceId(note.metadata.title);
    const slugTitle = toSlug(note.metadata.title);
    sourceReferenceMap.set(normalizedTitle, note);
    sourceReferenceMap.set(slugTitle, note);
    sourceReferenceMap.set(note.metadata.title.toLowerCase(), note);
  }
  return {
    blogReferenceMap,
    sourceReferenceMap,
    rootDir,
    blogOutputDir,
    rootLookupCache: new Map(),
  };
}

function areDatesEqual(
  date1: Date | undefined,
  date2: Date | undefined
): boolean {
  if (date1 === undefined && date2 === undefined) {
    return true;
  }
  if (date1 === undefined || date2 === undefined) {
    return false;
  }
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function findDuplicateEntry(
  note: NoteDocument,
  existingEntries: readonly BlogEntry[]
): BlogEntry | undefined {
  for (const entry of existingEntries) {
    if (
      entry.slug === note.metadata.slug &&
      entry.metadata.title === note.metadata.title &&
      areDatesEqual(entry.metadata.created, note.metadata.created)
    ) {
      return entry;
    }
  }
  return undefined;
}

async function run(): Promise<void> {
  logSyncStep("run:start");
  const config = loadPathConfig();
  console.log(`[config] ROOT: ${config.rootDir}`);
  console.log(`[config] BLOG OUTPUT: ${config.blogOutputDir}`);
  const sourcePaths = await collectMarkdownFiles(config.blogSourceDirs);
  if (sourcePaths.length === 0) {
    console.warn("[info] No source markdown documents found.");
  }
  const sourceNotes = await Promise.all(
    sourcePaths.map(async (filePath) =>
      loadNoteDocument(config.rootDir, filePath)
    )
  );
  const existingBlogEntries = await discoverExistingBlogEntries(
    config.blogOutputDir
  );
  const usedSlugs = new Set<string>();
  const entriesToRemove = new Set<string>();
  for (const note of sourceNotes) {
    const duplicate = findDuplicateEntry(note, existingBlogEntries);
    if (duplicate !== undefined) {
      entriesToRemove.add(duplicate.slug);
      note.metadata.slug = duplicate.slug;
      usedSlugs.add(duplicate.slug);
    } else {
      note.metadata.slug = ensureUniqueSlug(note.metadata.slug, usedSlugs);
    }
  }
  const filteredExistingEntries = existingBlogEntries.filter(
    (entry) => !entriesToRemove.has(entry.slug)
  );
  const publishedNotes = sourceNotes.filter((note) => note.metadata.published);
  if (publishedNotes.length === 0) {
    console.log("[info] No published notes detected.");
    return;
  }
  const context = buildLinkResolutionContext(
    publishedNotes,
    filteredExistingEntries,
    config.rootDir,
    config.blogOutputDir
  );
  const syncResult = await synchronizePublishedNotes(
    publishedNotes,
    config.blogOutputDir,
    context
  );
  console.log(
    `[summary] scanned ${sourceNotes.length} notes, published ${publishedNotes.length}, wrote ${syncResult.writtenCount} files.`
  );
  logSyncStep("run:completed", {
    totalNotes: sourceNotes.length,
    publishedNotes: publishedNotes.length,
    writtenCount: syncResult.writtenCount,
  });
  await synchronizeLogFiles(config);
}

run().catch((error) => {
  console.error("Failed to process documents.", error);
  process.exitCode = 1;
});
