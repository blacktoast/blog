import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { IS_DEBUG_MODE } from "./constants/debug.js";
import type { NoteDocument } from "./parse-blog.js";

export const BLOG_ASSET_RELATIVE_PATH = "../../assets/blog-image";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
export const DEFAULT_BLOG_ASSET_ROOT_DIRECTORY = resolve(
  scriptDirectory,
  "../src/assets/blog-image"
);

const SUPPORTED_IMAGE_EXTENSIONS: readonly string[] = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".webp",
  ".svg",
  ".avif",
];

const WEBP_QUALITY = 80;

let imageLogSequence = 0;

function logImageStep(
  message: string,
  context?: Record<string, unknown>
): void {
  if (!IS_DEBUG_MODE) {
    return;
  }
  imageLogSequence += 1;
  if (context !== undefined) {
    console.log(`[image:${imageLogSequence}] ${message}`, context);
    return;
  }
  console.log(`[image:${imageLogSequence}] ${message}`);
}

type ImageReplacement = {
  readonly start: number;
  readonly end: number;
  readonly text: string;
};

type PendingImage = {
  readonly fileName: string;
  readonly sourcePath: string;
};

export type ProcessEmbeddedImagesOptions = {
  readonly assetSourceRootDirectory: string;
  readonly blogAssetRootDirectory?: string;
  readonly blogAssetRelativePath?: string;
};

async function getFileIfExists(
  candidatePath: string
): Promise<string | undefined> {
  try {
    const candidateStat = await stat(candidatePath);
    if (candidateStat.isFile()) {
      return candidatePath;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  return undefined;
}

async function findCaseInsensitive(
  directory: string,
  targetName: string
): Promise<string | undefined> {
  try {
    const entries = await readdir(directory);
    const lowerTarget = targetName.toLowerCase();
    for (const entry of entries) {
      if (entry.toLowerCase() === lowerTarget) {
        const candidatePath = resolve(directory, entry);
        const existing = await getFileIfExists(candidatePath);
        if (existing !== undefined) {
          return existing;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  return undefined;
}

async function findByBaseName(
  directory: string,
  baseName: string
): Promise<string | undefined> {
  try {
    const entries = await readdir(directory);
    const lowerBase = baseName.toLowerCase();
    for (const entry of entries) {
      const entryBase = basename(entry, extname(entry)).toLowerCase();
      if (entryBase === lowerBase) {
        const candidatePath = resolve(directory, entry);
        const existing = await getFileIfExists(candidatePath);
        if (existing !== undefined) {
          return existing;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  return undefined;
}

async function resolveImageReference(
  reference: string,
  baseDirectories: readonly string[]
): Promise<string | undefined> {
  logImageStep("resolveImageReference:start", {
    reference,
    baseDirectories,
  });
  const sanitizedReference = reference.replace(/\\/g, "/").trim();
  if (sanitizedReference.length === 0) {
    logImageStep("resolveImageReference:empty-reference");
    return undefined;
  }
  const normalizedReference = sanitizedReference.replace(/^\/+/, "");
  for (const baseDir of baseDirectories) {
    const directCandidate = await getFileIfExists(
      resolve(baseDir, normalizedReference)
    );
    if (directCandidate !== undefined) {
      logImageStep("resolveImageReference:direct-match", {
        baseDir,
        candidate: directCandidate,
      });
      return directCandidate;
    }
  }
  const referenceDirectoryPart = dirname(normalizedReference);
  const referenceDirectory =
    referenceDirectoryPart === "." ? "" : referenceDirectoryPart;
  const searchDirectories = baseDirectories.map((baseDir) =>
    resolve(baseDir, referenceDirectory)
  );
  const referenceBaseName = basename(normalizedReference);
  const referenceExtension = extname(referenceBaseName);
  if (referenceExtension.length > 0) {
    for (const directory of searchDirectories) {
      const caseInsensitiveMatch = await findCaseInsensitive(
        directory,
        referenceBaseName
      );
      if (caseInsensitiveMatch !== undefined) {
        logImageStep("resolveImageReference:case-insensitive-match", {
          directory,
          candidate: caseInsensitiveMatch,
        });
        return caseInsensitiveMatch;
      }
    }
    const baseWithoutExtension = basename(
      referenceBaseName,
      referenceExtension
    );
    for (const directory of searchDirectories) {
      const baseMatch = await findByBaseName(directory, baseWithoutExtension);
      if (baseMatch !== undefined) {
        logImageStep("resolveImageReference:base-match", {
          directory,
          candidate: baseMatch,
        });
        return baseMatch;
      }
    }
    return undefined;
  }
  for (const directory of searchDirectories) {
    for (const extension of SUPPORTED_IMAGE_EXTENSIONS) {
      const candidatePath = resolve(
        directory,
        `${referenceBaseName}${extension}`
      );
      const candidateMatch = await getFileIfExists(candidatePath);
      if (candidateMatch !== undefined) {
        logImageStep("resolveImageReference:fuzzy-extension-match", {
          directory,
          candidate: candidateMatch,
        });
        return candidateMatch;
      }
    }
  }
  for (const directory of searchDirectories) {
    const fallbackMatch = await findByBaseName(directory, referenceBaseName);
    if (fallbackMatch !== undefined) {
      logImageStep("resolveImageReference:fallback-match", {
        directory,
        candidate: fallbackMatch,
      });
      return fallbackMatch;
    }
  }
  logImageStep("resolveImageReference:not-found", {
    reference,
  });
  return undefined;
}

export async function processEmbeddedImages(
  note: NoteDocument,
  options: ProcessEmbeddedImagesOptions
): Promise<string> {
  logImageStep("processEmbeddedImages:start", {
    notePath: note.sourcePath,
    slug: note.metadata.slug,
  });
  const blogAssetRootDirectory =
    options.blogAssetRootDirectory ?? DEFAULT_BLOG_ASSET_ROOT_DIRECTORY;
  const blogAssetRelativePath =
    options.blogAssetRelativePath ?? BLOG_ASSET_RELATIVE_PATH;
  const uniqueBaseDirectories = Array.from(
    new Set(
      [dirname(note.sourcePath), options.assetSourceRootDirectory].map(
        (entry) => resolve(entry)
      )
    )
  );
  const embedPattern = /!\[\[([^\]]+)\]\]/g;
  const matches = Array.from(note.body.matchAll(embedPattern));
  if (matches.length === 0) {
    logImageStep("processEmbeddedImages:no-embeds", {
      notePath: note.sourcePath,
    });
    return note.body;
  }
  const assetFolderName = note.metadata.slug;
  const replacements: ImageReplacement[] = [];
  const pendingImages: PendingImage[] = [];
  let index = 1;
  for (const match of matches) {
    const fullMatch = match[0];
    const matchIndex = match.index;
    if (matchIndex === undefined) {
      continue;
    }
    const referenceContent = match[1].trim();
    if (referenceContent.length === 0) {
      continue;
    }
    const parts = referenceContent.split("|");
    const targetPathRaw = parts[0];
    const targetPath = targetPathRaw.trim();
    if (targetPath.length === 0) {
      continue;
    }
    const resolvedPath = await resolveImageReference(
      targetPath,
      uniqueBaseDirectories
    );
    if (resolvedPath === undefined) {
      logImageStep("processEmbeddedImages:missing-embed", {
        targetPath,
        notePath: note.sourcePath,
      });
      console.warn(`[image] Missing embed ${targetPath} in ${note.sourcePath}`);
      continue;
    }
    const resolvedExtension = extname(resolvedPath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(resolvedExtension)) {
      logImageStep("processEmbeddedImages:unsupported-extension", {
        targetPath,
        resolvedPath,
      });
      console.warn(
        `[image] Unsupported embed ${targetPath} in ${note.sourcePath}`
      );
      continue;
    }
    const fileName = `${index}.webp`;
    const relativePath = `${blogAssetRelativePath}/${assetFolderName}/${fileName}`;
    replacements.push({
      start: matchIndex,
      end: matchIndex + fullMatch.length,
      text: `![blog placeholder](${relativePath})`,
    });
    logImageStep("processEmbeddedImages:queued-embed", {
      targetPath,
      resolvedPath,
      outputRelativePath: relativePath,
    });
    pendingImages.push({ fileName, sourcePath: resolvedPath });
    index += 1;
  }
  if (pendingImages.length === 0) {
    logImageStep("processEmbeddedImages:no-valid-embeds", {
      notePath: note.sourcePath,
    });
    return note.body;
  }
  await mkdir(blogAssetRootDirectory, { recursive: true });
  const noteAssetDirectory = join(blogAssetRootDirectory, assetFolderName);
  await rm(noteAssetDirectory, { recursive: true, force: true });
  await mkdir(noteAssetDirectory, { recursive: true });
  for (const image of pendingImages) {
    await sharp(image.sourcePath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(join(noteAssetDirectory, image.fileName));
    logImageStep("processEmbeddedImages:converted-image", {
      sourcePath: image.sourcePath,
      destinationPath: join(noteAssetDirectory, image.fileName),
    });
  }
  let rewritten = "";
  let cursor = 0;
  for (const replacement of replacements) {
    rewritten += note.body.slice(cursor, replacement.start);
    rewritten += replacement.text;
    cursor = replacement.end;
  }
  rewritten += note.body.slice(cursor);
  logImageStep("processEmbeddedImages:completed", {
    notePath: note.sourcePath,
    embedCount: pendingImages.length,
  });
  return rewritten;
}
