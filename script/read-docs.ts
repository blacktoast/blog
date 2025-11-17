import { readdir, stat } from "node:fs/promises";
import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";

type PathConfig = {
  pathRoot: string;
  blogPaths: readonly string[];
  logPath: string;
};

const DOCUMENT_EXTENSIONS: readonly string[] = [
  ".md",
  ".mdx",
  ".markdown",
  ".txt",
  ".log",
];

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required.`);
  }
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new Error(`Environment variable ${key} cannot be empty.`);
  }
  return trimmedValue;
}

function parsePaths(rawValue: string, pathRoot: string): readonly string[] {
  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => resolveRelativeToRoot(pathRoot, entry, "Blog path"));
}

function resolveRelativeToRoot(
  pathRoot: string,
  targetPath: string,
  label: string
): string {
  const sanitizedTarget = targetPath.replace(/^[\\/]+/, "");
  if (sanitizedTarget.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  if (isAbsolute(sanitizedTarget)) {
    throw new Error(
      `${label} ${targetPath} must be relative to PATH_ROOT ${pathRoot}.`
    );
  }
  const resolvedPath = normalize(resolve(pathRoot, sanitizedTarget));
  ensureWithinRoot(resolvedPath, pathRoot, label);
  return resolvedPath;
}

function ensureWithinRoot(
  candidatePath: string,
  pathRoot: string,
  label: string
): void {
  const normalizedRoot = normalize(pathRoot);
  const relativePathValue = relative(normalizedRoot, candidatePath);
  if (
    relativePathValue.length > 0 &&
    relativePathValue !== "." &&
    relativePathValue.startsWith("..")
  ) {
    throw new Error(
      `${label} ${candidatePath} must stay within PATH_ROOT ${normalizedRoot}.`
    );
  }
}

function loadPathConfig(): PathConfig {
  const pathRoot = getRequiredEnv("PATH_ROOT");
  const blogValue = getRequiredEnv("PATH_BLOG");
  const logValue = getRequiredEnv("PATH_LOG");

  const blogPaths = parsePaths(blogValue, pathRoot);
  const logPath = parsePaths(logValue, pathRoot);
  return { pathRoot, blogPaths, logPath: logPath[0] };
}

async function collectDocumentsFromDirectory(
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
      const nested = await collectDocumentsFromDirectory(entryPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      if (DOCUMENT_EXTENSIONS.includes(extname(entry.name).toLowerCase())) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

async function collectDocumentsFromPaths(
  paths: readonly string[]
): Promise<string[]> {
  const collected = await Promise.all(
    paths.map(async (directory) => collectDocumentsFromDirectory(directory))
  );
  return collected.flat();
}

function printDocumentGroup(label: string, files: readonly string[]): void {
  console.log(`\n${label}`);
  if (files.length === 0) {
    console.log("  (no documents found)");
    return;
  }
  files.forEach((file) => console.log(`  - ${file}`));
}

async function run(): Promise<void> {
  const config = loadPathConfig();
  const blogDocuments = await collectDocumentsFromPaths(config.blogPaths);
  const logDocuments = await collectDocumentsFromPaths([config.logPath]);
  printDocumentGroup("Blog documents", blogDocuments);
  printDocumentGroup("Log documents", logDocuments);
}

run().catch((error) => {
  console.error("Failed to read documents.", error);
  process.exitCode = 1;
});
