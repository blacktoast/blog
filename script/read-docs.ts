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

function getHomeDirectory(): string {
  const homeValue = process.env.HOME;
  if (homeValue === undefined) {
    throw new Error("Environment variable HOME is required.");
  }
  const trimmedHomeValue = homeValue.trim();
  if (trimmedHomeValue.length === 0) {
    throw new Error("Environment variable HOME cannot be empty.");
  }
  return normalize(trimmedHomeValue);
}

function parsePaths(
  rawValue: string,
  basePath: string,
  label: string
): readonly string[] {
  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => resolveRelativePath(basePath, entry, label));
}

function resolveRelativePath(
  basePath: string,
  targetPath: string,
  label: string
): string {
  const sanitizedTarget = targetPath.replace(/^[\\/]+/, "");
  if (sanitizedTarget.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  if (isAbsolute(sanitizedTarget)) {
    throw new Error(`${label} ${targetPath} must be relative to ${basePath}.`);
  }
  const resolvedPath = normalize(resolve(basePath, sanitizedTarget));
  ensureWithinBase(resolvedPath, basePath, label);
  return resolvedPath;
}

function ensureWithinBase(
  candidatePath: string,
  basePath: string,
  label: string
): void {
  const normalizedBasePath = normalize(basePath);
  const relativePathValue = relative(normalizedBasePath, candidatePath);
  if (
    relativePathValue.length > 0 &&
    relativePathValue !== "." &&
    relativePathValue.startsWith("..")
  ) {
    throw new Error(
      `${label} ${candidatePath} must stay within ${normalizedBasePath}.`
    );
  }
}

function loadPathConfig(): PathConfig {
  const homeDirectory = getHomeDirectory();
  const pathRootValue = getRequiredEnv("PATH_ROOT");
  const blogValue = getRequiredEnv("PATH_BLOG");
  const logValue = getRequiredEnv("PATH_LOG");
  const pathRoot = resolveRelativePath(
    homeDirectory,
    pathRootValue,
    "PATH_ROOT"
  );
  const blogPaths = parsePaths(blogValue, pathRoot, "Blog path");
  const logPaths = parsePaths(logValue, pathRoot, "Log path");
  if (logPaths.length === 0) {
    throw new Error("PATH_LOG must contain at least one path.");
  }
  return { pathRoot, blogPaths, logPath: logPaths[0] };
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
