import type { Lounge } from "@/src/domain/entities/Lounge";
import type { MeetingRoom } from "@/src/domain/entities/MeetingRoom";
import type { Position } from "@/src/domain/value-objects/Position";

export class Floor {
  readonly kind = "floor" as const;

  private constructor(
    readonly id: string,
    readonly width: number,
    readonly height: number,
    readonly maxOccupancy: number,
    readonly lounges: ReadonlyArray<Lounge>,
    readonly meetingRooms: ReadonlyArray<MeetingRoom>
  ) {}

  static create(
    id: string,
    width: number,
    height: number,
    maxOccupancy: number,
    lounges: ReadonlyArray<Lounge>,
    meetingRooms: ReadonlyArray<MeetingRoom>
  ): Floor {
    if (id.trim() === "") throw new Error("Floor ID は空にできません");
    if (width <= 0 || height <= 0) throw new Error("フロアのサイズは正の数である必要があります");
    if (maxOccupancy < 1) throw new Error("最大収容人数は1以上である必要があります");
    return new Floor(id, width, height, maxOccupancy, lounges, meetingRooms);
  }

  containsPosition(position: Position): boolean {
    return position.isWithinBounds(this.width, this.height);
  }

  findLounge(id: string): Lounge | undefined {
    return this.lounges.find((l) => l.id === id);
  }

  findMeetingRoom(id: string): MeetingRoom | undefined {
    return this.meetingRooms.find((r) => r.id === id);
  }
}
