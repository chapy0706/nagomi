import type { Position } from "@/src/domain/value-objects/Position";
import type { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

export type MeetingRoomTopic = "counseling" | "casual" | "meeting";

const VALID_TOPICS: ReadonlySet<MeetingRoomTopic> = new Set(["counseling", "casual", "meeting"]);
const MEETING_ROOM_MIN_MAX_CAPACITY = 5;

export class MeetingRoom {
  readonly kind = "meeting_room" as const;

  private constructor(
    readonly id: string,
    readonly position: Position,
    readonly capacity: RoomCapacity,
    readonly topic: MeetingRoomTopic
  ) {}

  static create(
    id: string,
    position: Position,
    capacity: RoomCapacity,
    topic: MeetingRoomTopic
  ): MeetingRoom {
    if (id.trim() === "") throw new Error("MeetingRoom ID は空にできません");
    if (capacity.max < MEETING_ROOM_MIN_MAX_CAPACITY) {
      throw new Error(
        `MeetingRoom の定員上限は${MEETING_ROOM_MIN_MAX_CAPACITY}人以上です: max=${capacity.max}`
      );
    }
    if (!VALID_TOPICS.has(topic)) {
      throw new Error(`無効なトピックです: ${topic}`);
    }
    return new MeetingRoom(id, position, capacity, topic);
  }
}
