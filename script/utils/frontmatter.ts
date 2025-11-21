import { basename, extname } from "node:path";

export type FrontmatterValue = string | boolean | string[] | null;

export type FrontmatterRecord = Record<string, FrontmatterValue>;

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

export function getFrontmatterValue(
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

export function extractTitle(
  frontmatter: FrontmatterRecord,
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

export function extractTags(frontmatter: FrontmatterRecord): readonly string[] {
  const rawTags = getFrontmatterValue(frontmatter, "tags");
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
  if (typeof rawTags === "string" && rawTags.trim().length > 0) {
    return [rawTags.trim()];
  }
  return [];
}

export function extractDate(
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

export function extractPublished(frontmatter: FrontmatterRecord): boolean {
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
