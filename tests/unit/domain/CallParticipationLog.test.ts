import { describe, expect, it } from "vitest";
import { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";

const FIXED_JOIN = new Date("2026-06-13T10:00:00Z");
const FIXED_LEFT = new Date("2026-06-13T11:30:00Z");
const FIXED_NOW = new Date("2026-06-13T10:45:00Z");

describe("CallParticipationLog.open", () => {
  it("オープンセッションを生成できる", () => {
    const log = CallParticipationLog.open({
      id: "log-1",
      employeeAuthId: "auth-1",
      roomId: "room-casual",
      topic: "casual",
      joinedAt: FIXED_JOIN,
    });
    expect(log.id).toBe("log-1");
    expect(log.employeeAuthId).toBe("auth-1");
    expect(log.roomId).toBe("room-casual");
    expect(log.topic).toBe("casual");
    expect(log.joinedAt).toEqual(FIXED_JOIN);
    expect(log.leftAt).toBeUndefined();
    expect(log.isOpen()).toBe(true);
  });
});

describe("CallParticipationLog.reconstruct", () => {
  it("クローズ済みセッションを復元できる", () => {
    const log = CallParticipationLog.reconstruct({
      id: "log-2",
      employeeAuthId: "auth-2",
      roomId: "room-counseling",
      topic: "counseling",
      joinedAt: FIXED_JOIN,
      leftAt: FIXED_LEFT,
    });
    expect(log.isOpen()).toBe(false);
    expect(log.leftAt).toEqual(FIXED_LEFT);
  });
});

describe("CallParticipationLog.durationMs", () => {
  it("クローズ済みは leftAt まで計算する", () => {
    const log = CallParticipationLog.reconstruct({
      id: "log-3",
      employeeAuthId: "auth-1",
      roomId: "room-meeting",
      topic: "meeting",
      joinedAt: FIXED_JOIN,
      leftAt: FIXED_LEFT,
    });
    expect(log.durationMs(FIXED_NOW)).toBe(FIXED_LEFT.getTime() - FIXED_JOIN.getTime());
  });

  it("オープン中は now まで計算する", () => {
    const log = CallParticipationLog.open({
      id: "log-4",
      employeeAuthId: "auth-1",
      roomId: "room-casual",
      topic: "casual",
      joinedAt: FIXED_JOIN,
    });
    expect(log.durationMs(FIXED_NOW)).toBe(FIXED_NOW.getTime() - FIXED_JOIN.getTime());
  });

  it("負の値にならない", () => {
    const log = CallParticipationLog.open({
      id: "log-5",
      employeeAuthId: "auth-1",
      roomId: "room-casual",
      topic: "casual",
      joinedAt: FIXED_NOW,
    });
    expect(log.durationMs(FIXED_JOIN)).toBe(0);
  });
});
