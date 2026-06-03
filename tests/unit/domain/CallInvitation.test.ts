import { describe, expect, it } from "vitest";
import { CallInvitation } from "@/src/domain/entities/CallInvitation";

const BASE = {
  id: "inv-1",
  inviterAuthId: "auth-a",
  inviterDisplayName: "Alice",
  inviterAvatarUrl: undefined,
  inviteeAuthId: "auth-b",
  topic: undefined,
  now: new Date("2026-06-03T10:00:00Z"),
} as const;

describe("CallInvitation.issue", () => {
  it("正常なパラメータで招待を生成できる", () => {
    const inv = CallInvitation.issue({ ...BASE });
    expect(inv.id).toBe("inv-1");
    expect(inv.status).toBe("pending");
    expect(inv.isPending()).toBe(true);
  });

  it("有効期限は発行から30秒後", () => {
    const inv = CallInvitation.issue({ ...BASE });
    const diffMs = inv.expiresAt.getTime() - BASE.now.getTime();
    expect(diffMs).toBe(30_000);
  });

  it("自己招待はエラー", () => {
    expect(() => CallInvitation.issue({ ...BASE, inviteeAuthId: BASE.inviterAuthId })).toThrow(
      "自分自身には招待を送れません"
    );
  });
});

describe("CallInvitation.isExpired", () => {
  it("有効期限前は expired ではない", () => {
    const inv = CallInvitation.issue({ ...BASE });
    const before = new Date(BASE.now.getTime() + 10_000);
    expect(inv.isExpired(before)).toBe(false);
  });

  it("有効期限と同時刻は expired", () => {
    const inv = CallInvitation.issue({ ...BASE });
    expect(inv.isExpired(inv.expiresAt)).toBe(true);
  });

  it("有効期限後は expired", () => {
    const inv = CallInvitation.issue({ ...BASE });
    const after = new Date(inv.expiresAt.getTime() + 1);
    expect(inv.isExpired(after)).toBe(true);
  });
});
