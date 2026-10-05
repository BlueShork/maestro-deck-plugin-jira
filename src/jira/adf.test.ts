import { describe, expect, it } from "vitest";
import { textToAdf } from "./adf";

describe("textToAdf", () => {
  it("returns undefined for blank text", () => {
    expect(textToAdf("  \n ")).toBeUndefined();
  });
  it("splits paragraphs on blank lines and keeps single newlines as hard breaks", () => {
    expect(textToAdf("Steps:\n1. open\n\nExpected: ok")).toEqual({
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Steps:" }, { type: "hardBreak" }, { type: "text", text: "1. open" }] },
        { type: "paragraph", content: [{ type: "text", text: "Expected: ok" }] },
      ],
    });
  });
  it("normalises CRLF", () => {
    expect(textToAdf("a\r\n\r\nb")?.content).toHaveLength(2);
  });
});
