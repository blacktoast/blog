import { basename, extname } from "node:path";

export function toSlug(input: string): string {
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

export function normalizeReferenceId(rawValue: string): string {
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

export function buildReferenceIds(
  title: string,
  filePath: string,
  extraId?: string
): readonly string[] {
  const ids = new Set<string>();
  const baseName = basename(filePath, extname(filePath));
  ids.add(normalizeReferenceId(title));
  ids.add(normalizeReferenceId(baseName));
  if (extraId) {
    ids.add(normalizeReferenceId(extraId));
  }
  ids.add(toSlug(title));
  ids.add(toSlug(baseName));
  return Array.from(ids).filter((value) => value.length > 0);
}
