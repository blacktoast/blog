import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

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
