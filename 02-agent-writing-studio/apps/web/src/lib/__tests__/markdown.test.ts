import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slateToMarkdown, exportMarkdown } from "../slate/markdown";
import type { EditorValue } from "@hello-agent/shared";

const sample: EditorValue = [
  {
    id: "1",
    type: "heading-one",
    children: [{ text: "Hello" }],
  },
  {
    id: "2",
    type: "paragraph",
    children: [{ text: "World", bold: true }],
  },
];

describe("slate markdown", () => {
  it("converts headings and bold", () => {
    const md = slateToMarkdown(sample);
    assert.ok(md.includes("# Hello"));
    assert.ok(md.includes("**World**"));
  });

  it("exports front matter", () => {
    const md = exportMarkdown(sample, {
      title: "Hello",
      slug: "hello",
      tags: ["test"],
    });
    assert.ok(md.includes("---"));
    assert.ok(md.includes('title: "Hello"'));
  });
});
