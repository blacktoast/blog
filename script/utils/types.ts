import { type FrontmatterRecord } from "./frontmatter.ts";

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
