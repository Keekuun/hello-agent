import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createEditor, Editor, Transforms } from "slate";
import { withReact } from "slate-react";
import { withBlocks } from "../slate/plugins";
import {
  applyInlineMarkdownOnSpace,
  applyMarkdownShortcutOnEnter,
  applyMarkdownShortcutOnPaste,
  applyMarkdownShortcutOnSpace,
  markdownTextToBlocks,
} from "../slate/markdown-shortcuts";

function editorWithParagraph(text: string) {
  const editor = withBlocks(withReact(createEditor()));
  editor.children = [
    {
      id: "b1",
      type: "paragraph",
      children: [{ text }],
    },
  ];
  Transforms.select(editor, Editor.end(editor, [0]));
  return editor;
}

describe("markdown-shortcuts", () => {
  it("converts ### + space to heading-three", () => {
    const editor = editorWithParagraph("###");
    const applied = applyMarkdownShortcutOnSpace(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "heading-three");
    assert.equal(Editor.string(editor, [0]), "");
  });

  it("converts ### hello on space to heading-three with content", () => {
    const editor = editorWithParagraph("### hello");
    const applied = applyMarkdownShortcutOnSpace(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "heading-three");
    assert.equal(Editor.string(editor, [0]), "hello");
  });

  it("converts #### title on space to heading-four", () => {
    const editor = editorWithParagraph("#### title");
    const applied = applyMarkdownShortcutOnSpace(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "heading-four");
    assert.equal(Editor.string(editor, [0]), "title");
  });

  it("converts ##### note on enter to heading-five", () => {
    const editor = editorWithParagraph("##### note");
    const applied = applyMarkdownShortcutOnEnter(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "heading-five");
    assert.equal(Editor.string(editor, [0]), "note");
  });

  it("converts **bold** on space to bold mark", () => {
    const editor = editorWithParagraph("**bold**");
    const applied = applyInlineMarkdownOnSpace(editor);
    assert.equal(applied, true);
    const textNode = (editor.children[0] as { children: { text: string; bold?: boolean }[] })
      .children[0];
    assert.equal(textNode.text, "bold");
    assert.equal(textNode.bold, true);
  });

  it("converts ``` on space to code-block", () => {
    const editor = editorWithParagraph("```");
    const applied = applyMarkdownShortcutOnSpace(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "code-block");
  });

  it("converts image markdown on enter", () => {
    const editor = editorWithParagraph("![alt text](https://example.com/a.png)");
    const applied = applyMarkdownShortcutOnEnter(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "image");
    assert.equal((editor.children[0] as { url?: string }).url, "https://example.com/a.png");
    assert.equal((editor.children[0] as { alt?: string }).alt, "alt text");
  });

  it("converts --- on enter to divider", () => {
    const editor = editorWithParagraph("---");
    const applied = applyMarkdownShortcutOnEnter(editor);
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "divider");
  });

  it("parses fenced code block from paste", () => {
    const editor = editorWithParagraph("placeholder");
    const applied = applyMarkdownShortcutOnPaste(
      editor,
      "```js\nconst x = 1;\n```",
    );
    assert.equal(applied, true);
    assert.equal(editor.children[0].type, "code-block");
    assert.equal((editor.children[0] as { language?: string }).language, "js");
    assert.equal(Editor.string(editor, [0]), "const x = 1;");
  });

  it("markdownTextToBlocks parses multi-line markdown", () => {
    const blocks = markdownTextToBlocks("# Title\n- item");
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.type, "heading-one");
    assert.equal(blocks[1]?.type, "bulleted-list");
  });
});
