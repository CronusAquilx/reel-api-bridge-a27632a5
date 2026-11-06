import { describe, expect, it } from "vitest";
import { encodeViewSession, normalizeCommandCursor, parseViewSession } from "./view-session";
import { TROLLS, TROLL_CSS } from "@/components/astra/TrollLayer";

describe("staff view privacy", () => {
  it("keeps legacy view links working with a generic visible notice", () => {
    expect(parseViewSession("123e4567-e89b-42d3-a456-426614174000")).toEqual({
      id: "123e4567-e89b-42d3-a456-426614174000", name: null, notify: true,
    });
  });

  it("round-trips anonymous viewing with the notice disabled", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(parseViewSession(encodeViewSession({ id, name: null, notify: false }))).toEqual({ id, name: null, notify: false });
  });

  it("keeps the command cursor valid after a database timestamp with an offset", () => {
    expect(normalizeCommandCursor("2026-11-06 03:45:50.087604+00:00")).toBe("2026-11-06T03:45:50.087Z");
    expect(normalizeCommandCursor("2026-11-06T03:45:50.087Z")).toBe("2026-11-06T03:45:50.087Z");
  });

  it("rejects malformed session metadata instead of opening an arbitrary channel", () => {
    expect(parseViewSession('{"v":1,"id":"bad channel","notify":true}')).toBeNull();
    expect(parseViewSession("not json or an id")).toBeNull();
  });
});

describe("troll rendering boundaries", () => {
  it("scopes visual effects to app content instead of transforming the whole document", () => {
    for (const css of Object.values(TROLL_CSS)) {
      expect(css).not.toMatch(/(?:^|[}\s])(?:html|body)\s*\{/);
      expect(css).toContain("#site-content");
    }
  });

  it("provides unique commands for the expanded effect palette", () => {
    expect(new Set(TROLLS.map((troll) => troll.id)).size).toBe(TROLLS.length);
    expect(TROLLS.length).toBeGreaterThanOrEqual(30);
  });
});
