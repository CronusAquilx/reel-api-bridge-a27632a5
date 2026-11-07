import { describe, expect, it } from "vitest";
import { makeDesktopItem, normalizedRectangle, rectanglesIntersect } from "./desktop-items";

describe("Windows 2.0 desktop interactions", () => {
  it("creates distinct folders without replacing an existing folder", () => {
    const first = makeDesktopItem("folder", [], "one");
    const second = makeDesktopItem("folder", [first], "two");
    expect(first.name).toBe("New folder");
    expect(second.name).toBe("New folder (2)");
  });
  it("creates an editable empty text document", () => {
    expect(makeDesktopItem("file", [], "doc")).toEqual({ id: "doc", name: "New Text Document", kind: "file", content: "" });
  });
  it("hit-tests icons in either drag direction", () => {
    const box = normalizedRectangle({ x: 100, y: 100 }, { x: 10, y: 20 });
    expect(rectanglesIntersect(box, { left: 20, top: 30, right: 50, bottom: 60 })).toBe(true);
    expect(rectanglesIntersect(box, { left: 110, top: 110, right: 130, bottom: 130 })).toBe(false);
  });
});
