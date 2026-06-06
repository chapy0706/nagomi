import { describe, expect, it } from "vitest";
import { EnterMeetingRoom } from "@/src/application/use-cases/EnterMeetingRoom";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";

const floor = buildFloor(DEFAULT_FLOOR_LAYOUT);

describe("EnterMeetingRoom", () => {
  it("空きのある会議室は success を返し、roomサマリを含む", () => {
    const useCase = new EnterMeetingRoom();
    const result = useCase.execute({
      floor,
      roomId: "room-casual",
      currentParticipantCount: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.room.id).toBe("room-casual");
      expect(result.room.topic).toBe("casual");
      expect(result.room.capacityMax).toBe(8);
    }
  });

  it("存在しない会議室IDは not_found を返す", () => {
    const useCase = new EnterMeetingRoom();
    const result = useCase.execute({
      floor,
      roomId: "missing-room",
      currentParticipantCount: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("not_found");
  });

  it("定員上限と同数のときは full を返す", () => {
    const useCase = new EnterMeetingRoom();
    const result = useCase.execute({
      floor,
      roomId: "room-casual",
      currentParticipantCount: 8,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("full");
  });

  it("定員上限直前は success を返す", () => {
    const useCase = new EnterMeetingRoom();
    const result = useCase.execute({
      floor,
      roomId: "room-meeting",
      currentParticipantCount: 9,
    });

    expect(result.success).toBe(true);
  });
});
