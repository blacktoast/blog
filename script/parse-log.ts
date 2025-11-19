import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import {
  type NoteDocument,
  type NoteMetadata,
  collectMarkdownFiles,
  loadNoteDocument,
} from "./parse-blog.js";
import { type PathConfig } from "./get-path.js";
import { processEmbeddedImages } from "./parse-image.js";
import { IS_DEBUG_MODE } from "./constants/debug.js";

let logSyncSequence = 0;

function logSyncStep(message: string, context?: Record<string, unknown>): void {
  if (!IS_DEBUG_MODE) {
    return;
  }
  logSyncSequence += 1;
  if (context !== undefined) {
    console.log(`[log-sync:${logSyncSequence}] ${message}`, context);
    return;
  }
  console.log(`[log-sync:${logSyncSequence}] ${message}`);
}

type LogFrontmatter = {
  title: string;
  pubDate: Date;
  updatedDate?: Date;
  tags: readonly string[];
};

function buildLogFrontmatter(note: NoteDocument): LogFrontmatter {
  const pubDate = note.metadata.created ?? note.metadata.modified ?? new Date();
  return {
    title: note.metadata.title,
    pubDate,
    updatedDate: note.metadata.modified,
    tags: note.metadata.tags,
  };
}

function serializeLogFrontmatter(frontmatter: LogFrontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`title: '${frontmatter.title.replace(/'/g, "''")}'`);
  lines.push(`pubDate: ${formatDate(frontmatter.pubDate)}`);
  if (frontmatter.updatedDate) {
    lines.push(`updatedDate: ${formatDate(frontmatter.updatedDate)}`);
  }
  if (frontmatter.tags.length > 0) {
    lines.push("tags:");
    for (const tag of frontmatter.tags) {
      lines.push(`  - '${tag.replace(/'/g, "''")}'`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `'${year}-${month}-${day}'`;
}

function getFormattedDateForImage(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isIgnored(note: NoteDocument): boolean {
  const ignoreValue = note.frontmatter["ignore"];
  return ignoreValue === true || ignoreValue === "true";
}

function isPathIgnored(filePath: string, ignorePaths: readonly string[]): boolean {
    return ignorePaths.some(ignorePath => filePath.startsWith(ignorePath));
}

async function resolveLogLink(
  reference: string,
  context: {
    notes: readonly NoteDocument[];
    ignorePaths: readonly string[];
    pebbles: Map<string, NoteDocument>;
    allAvailableNotes: readonly NoteDocument[];
    blogNotes: readonly NoteDocument[];
  }
): Promise<{ url: string; label: string }> {
    // 1. Try to find in current set of logs
    const targetLog = context.notes.find(n => 
        n.metadata.title === reference || 
        n.metadata.slug === reference ||
        n.metadata.referenceIds.includes(reference.toLowerCase())
    );

    if (targetLog) {
        if (isPathIgnored(targetLog.sourcePath, context.ignorePaths)) {
             return { url: `/writing`, label: targetLog.metadata.title };
        }
        return { url: `/pebbles/${targetLog.metadata.slug}`, label: targetLog.metadata.title };
    }

    // 2. Try to find in blog posts
    const targetBlog = context.blogNotes.find(n => 
        n.metadata.title === reference || 
        n.metadata.slug === reference ||
        n.metadata.referenceIds.includes(reference.toLowerCase())
    );

    if (targetBlog) {
        // Blog posts are always linked to /blog/{slug}
        return { url: `/blog/${targetBlog.metadata.slug}`, label: targetBlog.metadata.title };
    }

    // 3. Try to find in all available notes (potential pebbles)
    const targetPebble = context.allAvailableNotes.find(n => 
        n.metadata.title === reference || 
        n.metadata.slug === reference ||
        n.metadata.referenceIds.includes(reference.toLowerCase())
    );

    if (targetPebble) {
        if (isPathIgnored(targetPebble.sourcePath, context.ignorePaths)) {
             return { url: `/writing`, label: targetPebble.metadata.title };
        }
        // It's a valid pebble! Queue it for processing if not already queued.
        if (!context.pebbles.has(targetPebble.sourcePath)) {
            context.pebbles.set(targetPebble.sourcePath, targetPebble);
        }
        return { url: `/pebbles/${targetPebble.metadata.slug}`, label: targetPebble.metadata.title };
    }
    
    return { url: `/writing`, label: reference };
}

async function rewriteLogBody(
  note: NoteDocument,
  allNotes: readonly NoteDocument[],
  ignorePaths: readonly string[],
  pebbles: Map<string, NoteDocument>,
  allAvailableNotes: readonly NoteDocument[],
  blogNotes: readonly NoteDocument[]
): Promise<string> {
  const doubleBracketPattern = /\[\[([^\]]+)\]\]/g;
  const matches = Array.from(note.body.matchAll(doubleBracketPattern));
  if (matches.length === 0) {
    return note.body;
  }
  let rewritten = note.body;
  for (const match of matches.reverse()) {
    const fullMatch = match[0];
    const referenceText = match[1];
    const resolved = await resolveLogLink(referenceText, { notes: allNotes, ignorePaths, pebbles, allAvailableNotes, blogNotes });
    const replacement = `[${resolved.label}](${resolved.url})`;
    const matchIndex = match.index!;
    rewritten =
      rewritten.slice(0, matchIndex) +
      replacement +
      rewritten.slice(matchIndex + fullMatch.length);
  }
  return rewritten;
}

export async function synchronizeLogFiles(
  config: PathConfig
): Promise<void> {
  logSyncStep("synchronizeLogFiles:start");
  const logOutputDir = resolve(config.blogOutputDir, "../log");
  const pebbleOutputDir = resolve(config.blogOutputDir, "../pebbles");
  await mkdir(logOutputDir, { recursive: true });
  await mkdir(pebbleOutputDir, { recursive: true });

  const logSourcePaths = await collectMarkdownFiles(config.logSourceDirs);
  const blogSourcePaths = await collectMarkdownFiles(config.blogSourceDirs);
  
  // Scan the entire root directory for potential pebbles
  // This ensures we find notes that are not in blog or log folders
  const allSourcePaths = await collectMarkdownFiles([config.rootDir]);
  
  const allAvailableNotes = await Promise.all(
    allSourcePaths.map(async (filePath) =>
      loadNoteDocument(config.rootDir, filePath)
    )
  );

  const logNotes = allAvailableNotes.filter(n => logSourcePaths.includes(n.sourcePath));
  const validLogNotes = logNotes.filter(note => !isIgnored(note));
  
  const blogNotes = allAvailableNotes.filter(n => blogSourcePaths.includes(n.sourcePath));

  const pebbles = new Map<string, NoteDocument>();
  const assetSourceRootDirectory = resolve(config.rootDir, "assets");
  
  let writtenLogCount = 0;
  
  // Process Logs
  for (const note of validLogNotes) {
      const extension = extname(note.sourcePath).toLowerCase() === ".mdx" ? ".mdx" : ".md";
      const destinationPath = join(logOutputDir, `${note.metadata.slug}${extension}`);
      
      const logFrontmatter = buildLogFrontmatter(note);
      const dateStr = getFormattedDateForImage(logFrontmatter.pubDate);
      
      // Target: src/assets/log-image/{date}
      const blogAssetRootDirectory = resolve(config.blogOutputDir, "../../assets/log-image", dateStr);
      // Relative: ../../assets/log-image/{date}
      const blogAssetRelativePath = `../../assets/log-image/${dateStr}`;

      const bodyWithImages = await processEmbeddedImages(note, {
        assetSourceRootDirectory,
        blogAssetRootDirectory,
        blogAssetRelativePath,
      });

      const noteWithImages = { ...note, body: bodyWithImages };
      const rewrittenBody = await rewriteLogBody(noteWithImages, validLogNotes, config.pathIgnore, pebbles, allAvailableNotes, blogNotes);
      
      const documentContent = `${serializeLogFrontmatter(logFrontmatter)}\n${rewrittenBody}`;
      await writeFile(destinationPath, documentContent, "utf8");
      writtenLogCount++;
  }

  // Process Pebbles
  let writtenPebbleCount = 0;
  const processedPebbles = new Set<string>();
  const queue = Array.from(pebbles.values());
  
  while (queue.length > 0) {
      const pebble = queue.shift()!;
      if (processedPebbles.has(pebble.sourcePath)) continue;
      processedPebbles.add(pebble.sourcePath);
      
      const extension = extname(pebble.sourcePath).toLowerCase() === ".mdx" ? ".mdx" : ".md";
      const destinationPath = join(pebbleOutputDir, `${pebble.metadata.slug}${extension}`);
      
      const pebbleFrontmatter = buildLogFrontmatter(pebble);
      
      // Use assets/pebble-image/{slug} for pebbles
      const pebbleAssetRootDirectory = resolve(config.blogOutputDir, "../../assets/pebble-image", pebble.metadata.slug);
      const pebbleAssetRelativePath = `../../assets/pebble-image/${pebble.metadata.slug}`;
      
      const bodyWithImages = await processEmbeddedImages(pebble, {
        assetSourceRootDirectory,
        blogAssetRootDirectory: pebbleAssetRootDirectory,
        blogAssetRelativePath: pebbleAssetRelativePath,
      });
      
      const noteWithImages = { ...pebble, body: bodyWithImages };
      const rewrittenBody = await rewriteLogBody(noteWithImages, validLogNotes, config.pathIgnore, pebbles, allAvailableNotes, blogNotes);
      
      for (const p of pebbles.values()) {
          if (!processedPebbles.has(p.sourcePath) && !queue.some(q => q.sourcePath === p.sourcePath)) {
              queue.push(p);
          }
      }
      
      const documentContent = `${serializeLogFrontmatter(pebbleFrontmatter)}\n${rewrittenBody}`;
      await writeFile(destinationPath, documentContent, "utf8");
      writtenPebbleCount++;
  }
  
  console.log(
    `[summary] scanned ${logSourcePaths.length} logs, processed ${validLogNotes.length} logs, extracted ${writtenPebbleCount} pebbles, wrote ${writtenLogCount + writtenPebbleCount} files.`
  );
  logSyncStep("synchronizeLogFiles:completed", { writtenLogCount, writtenPebbleCount });
}
