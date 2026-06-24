import { describe, expect, it } from "bun:test";
import { createPersonalOnlyTransformer } from "../src/remarkPersonalOnly.mjs";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const tree = {
  type: "root",
  children: [
    {
      type: "paragraph",
      children: [{ type: "text", value: "Public" }],
    },
    {
      type: "containerDirective",
      name: "p",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "Secret" }],
        },
      ],
    },
  ],
};

describe("remarkPersonalOnly", () => {
  it("removes p directives in main builds", () => {
    const document = clone(tree);

    createPersonalOnlyTransformer({ isPersonalBuild: false })(document);

    expect(JSON.stringify(document)).toContain("Public");
    expect(JSON.stringify(document)).not.toContain("Secret");
    expect(JSON.stringify(document)).not.toContain("containerDirective");
  });

  it("unwraps p directives in personal builds", () => {
    const document = clone(tree);

    createPersonalOnlyTransformer({ isPersonalBuild: true })(document);

    expect(document.children).toHaveLength(2);
    expect(JSON.stringify(document)).toContain("Public");
    expect(JSON.stringify(document)).toContain("Secret");
    expect(JSON.stringify(document)).not.toContain("containerDirective");
  });
});
