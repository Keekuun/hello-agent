import type { BlockElement, CustomText, EditorValue } from "@hello-agent/shared";

function textToMd(node: CustomText): string {
  let t = node.text;
  if (node.code) t = `\`${t}\``;
  if (node.bold && node.italic) t = `***${t}***`;
  else if (node.bold) t = `**${t}**`;
  else if (node.italic) t = `*${t}*`;
  return t;
}

function inlineChildren(children: CustomText[] | BlockElement[]): string {
  return children
    .map((c) => ("text" in c ? textToMd(c as CustomText) : ""))
    .join("");
}

function blockToMd(block: BlockElement, listPrefix = ""): string {
  const inline = inlineChildren(block.children as CustomText[]);

  switch (block.type) {
    case "heading-one":
      return `# ${inline}\n`;
    case "heading-two":
      return `## ${inline}\n`;
    case "heading-three":
      return `### ${inline}\n`;
    case "blockquote":
      return `> ${inline}\n`;
    case "code-block":
      return `\`\`\`${block.language ?? ""}\n${inline}\n\`\`\`\n`;
    case "divider":
      return `---\n`;
    case "image":
      return `![${block.alt ?? ""}](${block.url ?? ""})\n`;
    case "list-item":
      return `${listPrefix}${inline}\n`;
    case "bulleted-list":
    case "numbered-list": {
      const items = (block.children as BlockElement[]).map((item, i) => {
        const prefix =
          block.type === "numbered-list" ? `${i + 1}. ` : "- ";
        return blockToMd({ ...item, type: "list-item" }, prefix);
      });
      return items.join("");
    }
    default:
      return `${inline}\n\n`;
  }
}

export function slateToMarkdown(value: EditorValue): string {
  return value.map((b) => blockToMd(b)).join("\n").trim() + "\n";
}

export function buildFrontMatter(meta: {
  title: string;
  slug: string;
  description?: string | null;
  tags?: string[];
  coverUrl?: string | null;
}): string {
  const lines = ["---", `title: "${meta.title.replace(/"/g, '\\"')}"`, `slug: ${meta.slug}`];
  if (meta.description) lines.push(`description: "${meta.description.replace(/"/g, '\\"')}"`);
  if (meta.coverUrl) lines.push(`cover: ${meta.coverUrl}`);
  if (meta.tags?.length) lines.push(`tags: [${meta.tags.map((t) => `"${t}"`).join(", ")}]`);
  lines.push("---", "");
  return lines.join("\n");
}

export function exportMarkdown(
  value: EditorValue,
  meta: Parameters<typeof buildFrontMatter>[0],
): string {
  return buildFrontMatter(meta) + slateToMarkdown(value);
}

export function slateToHtml(value: EditorValue): string {
  const body = value
    .map((block) => {
      const inline = inlineChildren(block.children as CustomText[]);
      switch (block.type) {
        case "heading-one":
          return `<h1>${inline}</h1>`;
        case "heading-two":
          return `<h2>${inline}</h2>`;
        case "heading-three":
          return `<h3>${inline}</h3>`;
        case "blockquote":
          return `<blockquote>${inline}</blockquote>`;
        case "code-block":
          return `<pre><code class="language-${block.language ?? "text"}">${inline}</code></pre>`;
        case "divider":
          return "<hr />";
        case "image":
          return `<img src="${block.url ?? ""}" alt="${block.alt ?? ""}" />`;
        default:
          return `<p>${inline}</p>`;
      }
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${metaTitle(value)}</title></head><body>${body}</body></html>`;
}

function metaTitle(value: EditorValue): string {
  const h1 = value.find((b) => b.type === "heading-one");
  if (!h1) return "Document";
  return inlineChildren(h1.children as CustomText[]) || "Document";
}
