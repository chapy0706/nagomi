import { describe, expect, it } from "vitest";
import { BlockRelation } from "@/src/domain/entities/BlockRelation";

const NOW = new Date("2026-06-09T10:00:00Z");

describe("BlockRelation", () => {
  it("正常系: ブロック関係を作成できる", () => {
    const rel = BlockRelation.create({
      id: "rel-1",
      blockerAuthId: "auth-a",
      blockedAuthId: "auth-b",
      createdAt: NOW,
    });
    expect(rel.blockerAuthId).toBe("auth-a");
    expect(rel.blockedAuthId).toBe("auth-b");
    expect(rel.createdAt).toBe(NOW);
  });

  it("自己ブロックはエラーになる", () => {
    expect(() =>
      BlockRelation.create({
        id: "rel-1",
        blockerAuthId: "auth-a",
        blockedAuthId: "auth-a",
        createdAt: NOW,
      })
    ).toThrowError("自分自身はブロックできません");
  });
});
