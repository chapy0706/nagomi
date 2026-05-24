import type { Floor } from "@/src/domain/entities/Floor";
import type { Lounge } from "@/src/domain/entities/Lounge";
import type { MeetingRoom } from "@/src/domain/entities/MeetingRoom";

export type Room = Floor | Lounge | MeetingRoom;
export type RoomKind = Room["kind"];

export function isFloor(room: Room): room is Floor {
  return room.kind === "floor";
}

export function isLounge(room: Room): room is Lounge {
  return room.kind === "lounge";
}

export function isMeetingRoom(room: Room): room is MeetingRoom {
  return room.kind === "meeting_room";
}
