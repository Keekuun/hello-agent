import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createEditor, Editor, Transforms } from "slate";
import { withReact } from "slate-react";
import {
  resetDocumentToEmptyParagraph,
  selectAllDocument,
  shouldClearDocumentOnDelete,
  withBlocks,
} from "../slate/plugins";

function createTestEditor(children: Parameters<typeof withBlocks>[0]["children"]) {
  const editor = withBlocks(withReact(createEditor()));
  editor.children = children;
  return editor;
}

describe("editor selection", () => {
  it("selectAllDocument selects from first to last block", () => {
    const editor = createTestEditor([
      { id: "b1", type: "paragraph", children: [{ text: "hello" }] },
      { id: "b2", type: "divider", children: [{ text: "" }] },
      { id: "b3", type: "paragraph", children: [{ text: "world" }] },
    ]);

    selectAllDocument(editor);
    assert.equal(shouldClearDocumentOnDelete(editor), true);
  });

  it("clears entire document to one empty paragraph", () => {
    const editor = createTestEditor([
      { id: "b1", type: "heading-one", children: [{ text: "Title" }] },
      { id: "b2", type: "code-block", language: "js", children: [{ text: "code" }] },
      { id: "b3", type: "paragraph", children: [{ text: "tail" }] },
    ]);

    selectAllDocument(editor);
    resetDocumentToEmptyParagraph(editor);

    assert.equal(editor.children.length, 1);
    assert.equal(editor.children[0]?.type, "paragraph");
    assert.equal(Editor.string(editor, [0]), "");
  });

  it("clears a single code block when fully selected", () => {
    const editor = createTestEditor([
      {
        id: "b1",
        type: "code-block",
        language: "js",
        children: [{ text: "const x = 1;" }],
      },
    ]);

    Transforms.select(editor, {
      anchor: Editor.start(editor, [0]),
      focus: Editor.end(editor, [0]),
    });
    assert.equal(shouldClearDocumentOnDelete(editor), true);
    resetDocumentToEmptyParagraph(editor);

    assert.equal(editor.children.length, 1);
    assert.equal(editor.children[0]?.type, "paragraph");
    assert.equal(Editor.string(editor, [0]), "");
  });
});
