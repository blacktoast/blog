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
  extractDate,
  extractPublished,
  extractTags,
  extractTitle,
  buildReferenceIds,
  normalizeReferenceId,
  toSlug,
  formatDate,
  ensureTrailingNewline,
  extractDescription,
  formatYamlString,
  trimLeadingBlankLines,
  truncate,
} from "./utils/index.ts";
import { type PathConfig, loadPathConfig } from "./get-path.ts";
import { IS_DEBUG_MODE } from "./constants/debug.ts";
import { processEmbeddedImages } from "./parse-image.ts";
import { synchronizeLogFiles } from "./parse-log.ts";

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

type PebbleEntry = {
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
  pebbleReferenceMap: Map<string, PebbleEntry>;
  sourceReferenceMap: Map<string, NoteDocument>;
  rootDir: string;
  blogOutputDir: string;
  pebbleOutputDir: string;
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

async function lookupNoteInRoot(
  rootDir: string,
  blogOutputDir: string,
  pebbleOutputDir: string,
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
    pebbleOutputDir,
    referenceId
  );
  cache.set(referenceId, result);
  return result;
}

async function findNoteByReferenceId(
  rootDir: string,
  blogOutputDir: string,
  pebbleOutputDir: string,
  referenceId: string
): Promise<RootLookupResult> {
  try {
    const normalizedReferenceId = normalizeReferenceId(referenceId);
    const slugReferenceId = toSlug(referenceId);
    const files = await collectMarkdownFiles([
      rootDir,
      blogOutputDir,
      pebbleOutputDir,
    ]);
    for (const filePath of files) {
      const rawContent = await readFile(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatter(rawContent);
      const title = extractTitle(frontmatter, filePath);
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
        const published = extractPublished(frontmatter);
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
  let pebbleEntry = context.pebbleReferenceMap.get(referenceId);
  if (pebbleEntry === undefined) {
    pebbleEntry = context.pebbleReferenceMap.get(normalizedReferenceId);
  }
  if (pebbleEntry === undefined) {
    pebbleEntry = context.pebbleReferenceMap.get(slugReferenceId);
  }
  if (pebbleEntry === undefined) {
    pebbleEntry = context.pebbleReferenceMap.get(lowerReferenceId);
  }
  if (pebbleEntry !== undefined) {
    return {
      url: `/pebbles/${pebbleEntry.slug.normalize("NFC")}`,
      label: pebbleEntry.metadata.title,
    };
  }
  const rootLookup = await lookupNoteInRoot(
    context.rootDir,
    context.blogOutputDir,
    context.pebbleOutputDir,
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
    if (isPathInDirectory(rootLookup.filePath, context.pebbleOutputDir)) {
      const slug = basename(rootLookup.filePath, extname(rootLookup.filePath));
      return {
        url: `/pebbles/${slug.normalize("NFC")}`,
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

    // const bodyWithToc = `## Table of contents\n\n${rewrittenBody}`;
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
    const title = extractTitle(frontmatter, filePath);
    const tags = extractTags(frontmatter);
    const created =
      extractDate(frontmatter, "pubDate") ??
      extractDate(frontmatter, "created");
    const modified =
      extractDate(frontmatter, "updatedDate") ??
      extractDate(frontmatter, "modified");
    const slug = basename(filePath, extname(filePath));
    const referenceIds = buildReferenceIds(title, filePath, slug);
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

async function discoverExistingPebbleEntries(
  pebbleDir: string
): Promise<PebbleEntry[]> {
  const existingPaths = await collectMarkdownFiles([pebbleDir]);
  const entries: PebbleEntry[] = [];
  for (const filePath of existingPaths) {
    const rawContent = await readFile(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(rawContent);
    const title = extractTitle(frontmatter, filePath);
    const tags = extractTags(frontmatter);
    const created =
      extractDate(frontmatter, "pubDate") ??
      extractDate(frontmatter, "created");
    const modified =
      extractDate(frontmatter, "updatedDate") ??
      extractDate(frontmatter, "modified");
    const slug = basename(filePath, extname(filePath));
    const referenceIds = buildReferenceIds(title, filePath, slug);
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

function buildLinkResolutionContext(
  publishedNotes: readonly NoteDocument[],
  existingBlogEntries: readonly BlogEntry[],
  existingPebbleEntries: readonly PebbleEntry[],
  rootDir: string,
  blogOutputDir: string,
  pebbleOutputDir: string
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
  const pebbleReferenceMap = new Map<string, PebbleEntry>();
  for (const pebble of existingPebbleEntries) {
    for (const refId of pebble.metadata.referenceIds) {
      pebbleReferenceMap.set(refId, pebble);
    }
    const normalizedTitle = normalizeReferenceId(pebble.metadata.title);
    const slugTitle = toSlug(pebble.metadata.title);
    pebbleReferenceMap.set(normalizedTitle, pebble);
    pebbleReferenceMap.set(slugTitle, pebble);
    pebbleReferenceMap.set(pebble.metadata.title.toLowerCase(), pebble);
  }
  return {
    blogReferenceMap,
    pebbleReferenceMap,
    sourceReferenceMap,
    rootDir,
    blogOutputDir,
    pebbleOutputDir,
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
  const pebbleOutputDir = resolve(config.blogOutputDir, "../pebbles");
  const existingBlogEntries = await discoverExistingBlogEntries(
    config.blogOutputDir
  );
  const existingPebbleEntries =
    await discoverExistingPebbleEntries(pebbleOutputDir);
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
    existingPebbleEntries,
    config.rootDir,
    config.blogOutputDir,
    pebbleOutputDir
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
