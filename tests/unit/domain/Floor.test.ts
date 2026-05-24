import { describe, expect, it } from "vitest";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import { Floor } from "@/src/domain/entities/Floor";
import { Lounge } from "@/src/domain/entities/Lounge";
import { MeetingRoom } from "@/src/domain/entities/MeetingRoom";
import { Position } from "@/src/domain/value-objects/Position";
import { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

function makeLounge(id = "lounge-1"): Lounge {
  return Lounge.create(id, Position.create(100, 100), RoomCapacity.of(2, 3));
}

function makeMeetingRoom(id = "room-1"): MeetingRoom {
  return MeetingRoom.create(id, Position.create(800, 200), RoomCapacity.of(2, 8), "casual");
}

describe("Floor.create", () => {
  it("有効なフロアを作成できる", () => {
    const floor = Floor.create("main", 1000, 800, 100, [makeLounge()], [makeMeetingRoom()]);
    expect(floor.id).toBe("main");
    expect(floor.width).toBe(1000);
    expect(floor.height).toBe(800);
    expect(floor.kind).toBe("floor");
  });

  it("ID が空は無効", () => {
    expect(() => Floor.create("", 1000, 800, 100, [], [])).toThrow();
  });

  it("幅が0以下は無効", () => {
    expect(() => Floor.create("main", 0, 800, 100, [], [])).toThrow();
  });

  it("高さが負は無効", () => {
    expect(() => Floor.create("main", 1000, -1, 100, [], [])).toThrow();
  });
});

describe("Floor.containsPosition", () => {
  const floor = Floor.create("main", 1000, 800, 100, [], []);

  it("フロア内の座標は true", () => {
    expect(floor.containsPosition(Position.create(500, 400))).toBe(true);
  });

  it("フロア外の座標は false", () => {
    expect(floor.containsPosition(Position.create(1001, 400))).toBe(false);
  });
});

describe("Floor.findLounge / findMeetingRoom", () => {
  const lounge = makeLounge("lg-1");
  const room = makeMeetingRoom("rm-1");
  const floor = Floor.create("main", 1000, 800, 100, [lounge], [room]);

  it("存在する Lounge を見つける", () => {
    expect(floor.findLounge("lg-1")).toBe(lounge);
  });

  it("存在しない Lounge は undefined", () => {
    expect(floor.findLounge("no-such")).toBeUndefined();
  });

  it("存在する MeetingRoom を見つける", () => {
    expect(floor.findMeetingRoom("rm-1")).toBe(room);
  });
});

describe("buildFloor / DEFAULT_FLOOR_LAYOUT", () => {
  it("デフォルトレイアウトからフロアを構築できる", () => {
    const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);
    expect(floor.id).toBe("main-floor");
    expect(floor.lounges).toHaveLength(3);
    expect(floor.meetingRooms).toHaveLength(3);
  });

  it("デフォルトレイアウトのミーティングルームにはすべてのトピックが含まれる", () => {
    const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);
    const topics = floor.meetingRooms.map((r) => r.topic);
    expect(topics).toContain("counseling");
    expect(topics).toContain("casual");
    expect(topics).toContain("meeting");
  });
});
