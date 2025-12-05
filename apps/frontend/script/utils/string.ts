export function trimLeadingBlankLines(value: string): string {
  return value.replace(/^\s*\n+/, "");
}

export function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

export function formatYamlString(value: string): string {
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

export function extractDescription(body: string): string {
  const lines = body.split(/\r?\n/);
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
      continue;
    }
    if (trimmedLine.startsWith("#")) {
      continue;
    }
    buffer.push(trimmedLine);
  }
  if (buffer.length > 0) {
    paragraphs.push(buffer.join(" "));
  }
  const firstParagraph = paragraphs.find((paragraph) => paragraph.length > 0);
  if (!firstParagraph) {
    return "No description available.";
  }
  return truncate(firstParagraph, 180);
}
