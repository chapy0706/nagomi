import { describe, expect, it } from "vitest";
import { AttendanceLog } from "@/src/domain/entities/AttendanceLog";

const FIXED_IN = new Date("2026-06-13T09:00:00Z");
const FIXED_OUT = new Date("2026-06-13T17:30:00Z");
const FIXED_NOW = new Date("2026-06-13T12:00:00Z");

describe("AttendanceLog.open", () => {
  it("開いたセッションを生成できる", () => {
    const log = AttendanceLog.open({
      id: "log-1",
      employeeAuthId: "auth-1",
      loggedInAt: FIXED_IN,
    });
    expect(log.id).toBe("log-1");
    expect(log.employeeAuthId).toBe("auth-1");
    expect(log.loggedInAt).toEqual(FIXED_IN);
    expect(log.loggedOutAt).toBeUndefined();
    expect(log.isOpen()).toBe(true);
  });

  it("初期 source は inferred", () => {
    const log = AttendanceLog.open({ id: "log-1", employeeAuthId: "auth-1", loggedInAt: FIXED_IN });
    expect(log.source).toBe("inferred");
  });
});

describe("AttendanceLog.reconstruct", () => {
  it("クローズ済みセッションを復元できる", () => {
    const log = AttendanceLog.reconstruct({
      id: "log-2",
      employeeAuthId: "auth-2",
      loggedInAt: FIXED_IN,
      loggedOutAt: FIXED_OUT,
      source: "explicit",
    });
    expect(log.isOpen()).toBe(false);
    expect(log.source).toBe("explicit");
  });
});

describe("AttendanceLog.durationMs", () => {
  it("クローズ済みは logged_out_at まで計算する", () => {
    const log = AttendanceLog.reconstruct({
      id: "log-3",
      employeeAuthId: "auth-1",
      loggedInAt: FIXED_IN,
      loggedOutAt: FIXED_OUT,
      source: "explicit",
    });
    const expected = FIXED_OUT.getTime() - FIXED_IN.getTime();
    expect(log.durationMs(FIXED_NOW)).toBe(expected);
  });

  it("オープン中は now まで計算する", () => {
    const log = AttendanceLog.open({ id: "log-4", employeeAuthId: "auth-1", loggedInAt: FIXED_IN });
    const expected = FIXED_NOW.getTime() - FIXED_IN.getTime();
    expect(log.durationMs(FIXED_NOW)).toBe(expected);
  });

  it("負の値にならない", () => {
    const log = AttendanceLog.open({
      id: "log-5",
      employeeAuthId: "auth-1",
      loggedInAt: FIXED_NOW,
    });
    expect(log.durationMs(FIXED_IN)).toBe(0);
  });
});
