import { describe, expect, it } from "vitest";
import { Lounge } from "@/src/domain/entities/Lounge";
import { MeetingRoom } from "@/src/domain/entities/MeetingRoom";
import { isLounge, isMeetingRoom } from "@/src/domain/entities/Room";
import { Position } from "@/src/domain/value-objects/Position";
import { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

const pos = Position.create(100, 100);

describe("Lounge.create", () => {
  it("定員2のラウンジを作成できる", () => {
    const l = Lounge.create("l-1", pos, RoomCapacity.of(2, 2));
    expect(l.kind).toBe("lounge");
    expect(l.id).toBe("l-1");
  });

  it("定員3のラウンジを作成できる", () => {
    const l = Lounge.create("l-2", pos, RoomCapacity.of(2, 3));
    expect(l.capacity.max).toBe(3);
  });

  it("定員4は無効（Loungeは最大3人）", () => {
    expect(() => Lounge.create("l-3", pos, RoomCapacity.of(2, 4))).toThrow();
  });

  it("定員1は無効（Loungeは最低2人）", () => {
    expect(() => Lounge.create("l-4", pos, RoomCapacity.of(1, 1))).toThrow();
  });

  it("ID が空は無効", () => {
    expect(() => Lounge.create("", pos, RoomCapacity.of(2, 3))).toThrow();
  });
});

describe("MeetingRoom.create", () => {
  it("定員5のミーティングルームを作成できる", () => {
    const r = MeetingRoom.create("r-1", pos, RoomCapacity.of(2, 5), "casual");
    expect(r.kind).toBe("meeting_room");
    expect(r.topic).toBe("casual");
  });

  it("定員8で counseling トピックを作成できる", () => {
    const r = MeetingRoom.create("r-2", pos, RoomCapacity.of(2, 8), "counseling");
    expect(r.capacity.max).toBe(8);
  });

  it("定員4は無効（MeetingRoomは最低5人）", () => {
    expect(() => MeetingRoom.create("r-3", pos, RoomCapacity.of(2, 4), "meeting")).toThrow();
  });

  it("ID が空は無効", () => {
    expect(() => MeetingRoom.create("", pos, RoomCapacity.of(2, 5), "casual")).toThrow();
  });
});

describe("Room 型ガード", () => {
  it("Lounge は isLounge で判別できる", () => {
    const l = Lounge.create("l-1", pos, RoomCapacity.of(2, 3));
    expect(isLounge(l)).toBe(true);
    expect(isMeetingRoom(l)).toBe(false);
  });

  it("MeetingRoom は isMeetingRoom で判別できる", () => {
    const r = MeetingRoom.create("r-1", pos, RoomCapacity.of(2, 5), "meeting");
    expect(isMeetingRoom(r)).toBe(true);
    expect(isLounge(r)).toBe(false);
  });
});
