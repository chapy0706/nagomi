import type { Floor } from "@/src/domain/entities/Floor";
import type { MeetingRoom, MeetingRoomTopic } from "@/src/domain/entities/MeetingRoom";

export type EnterMeetingRoomInput = {
  floor: Floor;
  roomId: string;
  currentParticipantCount: number;
};

export type MeetingRoomSummary = {
  readonly id: string;
  readonly topic: MeetingRoomTopic;
  readonly capacityMax: number;
};

export type EnterMeetingRoomResult =
  | { success: true; room: MeetingRoomSummary }
  | { success: false; reason: "not_found" | "full" };

/**
 * 会議室の入室前バリデーション。定員チェックのみを行い、ロビー画面に遷移してよいかを返す。
 * 実際の Jitsi への接続はロビー画面の「参加する」ボタンが押されたタイミングで起こす（ADR-006: 明示的な合意ステップ）。
 */
export class EnterMeetingRoom {
  execute(input: EnterMeetingRoomInput): EnterMeetingRoomResult {
    const room: MeetingRoom | undefined = input.floor.findMeetingRoom(input.roomId);
    if (!room) {
      return { success: false, reason: "not_found" };
    }
    if (room.capacity.isFull(input.currentParticipantCount)) {
      return { success: false, reason: "full" };
    }
    return {
      success: true,
      room: {
        id: room.id,
        topic: room.topic,
        capacityMax: room.capacity.max,
      },
    };
  }
}
