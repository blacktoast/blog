import { isAbsolute, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type PathConfig = {
  homeDir: string;
  rootDir: string;
  blogSourceDirs: readonly string[];
  logSourceDirs: readonly string[];
  pathIgnore: readonly string[];
  blogOutputDir: string;
};

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = normalize(resolve(scriptDirectory, ".."));
export const blogOutputDirectory = resolve(projectRoot, "src/content/blog");

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
  const normalizedBase = normalize(basePath);
  const relativePathValue = relative(normalizedBase, candidatePath);
  if (
    relativePathValue.length > 0 &&
    relativePathValue !== "." &&
    relativePathValue.startsWith("..")
  ) {
    throw new Error(
      `${label} ${candidatePath} must stay within ${normalizedBase}.`
    );
  }
}

export function loadPathConfig(): PathConfig {
  const homeDir = getHomeDirectory();
  const pathRootRaw = getRequiredEnv("PATH_ROOT");
  const blogRaw = getRequiredEnv("PATH_BLOG");
  const logRaw = getRequiredEnv("PATH_LOG");
  const ignoreRaw = process.env.PATH_IGNORE ?? "";
  const rootDir = resolveRelativePath(homeDir, pathRootRaw, "PATH_ROOT");
  const blogSourceDirs = parsePaths(blogRaw, rootDir, "Blog path");
  const logSourceDirs = parsePaths(logRaw, rootDir, "Log path");
  const pathIgnore = parsePaths(ignoreRaw, rootDir, "Ignore path");
  return {
    homeDir,
    rootDir,
    blogSourceDirs,
    logSourceDirs,
    pathIgnore,
    blogOutputDir: blogOutputDirectory,
  };
}
