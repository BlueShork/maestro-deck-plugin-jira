type AdfInline = { type: "text"; text: string } | { type: "hardBreak" };
export interface AdfDoc {
  type: "doc";
  version: 1;
  content: { type: "paragraph"; content: AdfInline[] }[];
}

/** Plain text → Atlassian Document Format (required by REST v3 descriptions). */
export function textToAdf(text: string): AdfDoc | undefined {
  const normalised = text.replace(/\r\n?/g, "\n").trim();
  if (!normalised) return undefined;
  const paragraphs = normalised.split(/\n\s*\n/).map((block) => {
    const content: AdfInline[] = [];
    block.split("\n").forEach((line, i) => {
      if (i > 0) content.push({ type: "hardBreak" });
      if (line) content.push({ type: "text", text: line });
    });
    return { type: "paragraph" as const, content };
  });
  return { type: "doc", version: 1, content: paragraphs };
}
