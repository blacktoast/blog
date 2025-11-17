import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, normalize, relative } from "node:path";

export type FrontmatterValue = string | boolean | string[] | null;

export type FrontmatterRecord = Record<string, FrontmatterValue>;

export type NoteMetadata = {
  title: string;
  slug: string;
  created?: Date;
  modified?: Date;
  published: boolean;
  tags: readonly string[];
  referenceIds: readonly string[];
};

export type NoteDocument = {
  sourcePath: string;
  relativePath: string;
  frontmatter: FrontmatterRecord;
  body: string;
  metadata: NoteMetadata;
};

const NOTE_EXTENSIONS = new Set<string>([".md", ".mdx"]);

export async function collectMarkdownFilesFromDirectory(
  directory: string
): Promise<string[]> {
  try {
    const directoryStat = await stat(directory);
    if (!directoryStat.isDirectory()) {
      console.warn(`[skip] ${directory} is not a directory.`);
      return [];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`[missing] ${directory} does not exist.`);
      return [];
    }
    throw error;
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFilesFromDirectory(entryPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      const extension = extname(entry.name).toLowerCase();
      if (NOTE_EXTENSIONS.has(extension)) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

export async function collectMarkdownFiles(
  paths: readonly string[]
): Promise<string[]> {
  const collected = await Promise.all(
    paths.map(async (directory) => collectMarkdownFilesFromDirectory(directory))
  );
  return collected.flat();
}

export async function loadNoteDocument(
  rootDir: string,
  filePath: string
): Promise<NoteDocument> {
  const rawContent = await readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(rawContent);
  const relativePath = normalize(relative(rootDir, filePath));
  const title = extractTitle(frontmatter, body, filePath);
  const slug = toSlug(title || basename(filePath, extname(filePath)));
  const tags = extractTags(frontmatter);
  const created = extractDate(frontmatter, "created");
  const modified = extractDate(frontmatter, "modified");
  const published = extractPublished(frontmatter);
  const referenceIds = buildReferenceIds(title, relativePath, filePath);
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

export function parseFrontmatter(content: string): {
  frontmatter: FrontmatterRecord;
  body: string;
} {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }
  const lines = content.split(/\r?\n/);
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) {
    return { frontmatter: {}, body: content };
  }
  const frontmatterLines = lines.slice(1, closingIndex);
  const bodyLines = lines.slice(closingIndex + 1);
  const frontmatter = parseFrontmatterLines(frontmatterLines);
  return { frontmatter, body: bodyLines.join("\n") };
}

function parseFrontmatterLines(lines: readonly string[]): FrontmatterRecord {
  const record: FrontmatterRecord = {};
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    index += 1;
    if (line.trim().length === 0) {
      continue;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const rawKey = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    if (rawValue.length === 0) {
      const values: string[] = [];
      while (index < lines.length) {
        const arrayLine = lines[index];
        const match = arrayLine.match(/^\s*-\s*(.*)$/);
        if (!match) {
          break;
        }
        values.push(match[1].trim());
        index += 1;
      }
      record[rawKey] = values;
      continue;
    }
    record[rawKey] = parseScalarValue(rawValue);
  }
  return record;
}

function parseScalarValue(value: string): FrontmatterValue {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === "true") {
    return true;
  }
  if (lower === "false") {
    return false;
  }
  if (lower === "null" || lower === "~") {
    return null;
  }
  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function getFrontmatterValue(
  record: FrontmatterRecord,
  key: string
): FrontmatterValue | undefined {
  const target = key.toLowerCase();
  for (const entryKey of Object.keys(record)) {
    if (entryKey.toLowerCase() === target) {
      return record[entryKey];
    }
  }
  return undefined;
}

function extractTitle(
  frontmatter: FrontmatterRecord,
  body: string,
  filePath: string
): string {
  const frontmatterTitle = getFrontmatterValue(frontmatter, "title");
  if (
    typeof frontmatterTitle === "string" &&
    frontmatterTitle.trim().length > 0
  ) {
    return frontmatterTitle.trim();
  }
  return basename(filePath, extname(filePath)).trim();
}

function extractTags(frontmatter: FrontmatterRecord): readonly string[] {
  const rawTags = getFrontmatterValue(frontmatter, "tags");
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
  if (typeof rawTags === "string" && rawTags.trim().length > 0) {
    return [rawTags.trim()];
  }
  return [];
}

function extractDate(
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

function extractPublished(frontmatter: FrontmatterRecord): boolean {
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

function buildReferenceIds(
  title: string,
  relativePath: string,
  filePath: string
): readonly string[] {
  const ids = new Set<string>();
  const baseName = basename(filePath, extname(filePath));
  ids.add(normalizeReferenceId(title));
  ids.add(normalizeReferenceId(baseName));
  ids.add(normalizeReferenceId(relativePath));
  ids.add(toSlug(title));
  ids.add(toSlug(baseName));
  return Array.from(ids).filter((value) => value.length > 0);
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

export function ensureUniqueSlug(
  baseSlug: string,
  usedSlugs: Set<string>
): string {
  let candidate = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}
