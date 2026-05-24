import { Floor } from "@/src/domain/entities/Floor";
import { Lounge } from "@/src/domain/entities/Lounge";
import { MeetingRoom, type MeetingRoomTopic } from "@/src/domain/entities/MeetingRoom";
import { Position } from "@/src/domain/value-objects/Position";
import { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

export type LoungeConfig = {
  id: string;
  x: number;
  y: number;
  minCapacity: number;
  maxCapacity: number;
};

export type MeetingRoomConfig = {
  id: string;
  x: number;
  y: number;
  minCapacity: number;
  maxCapacity: number;
  topic: MeetingRoomTopic;
};

export type FloorLayoutConfig = {
  id: string;
  width: number;
  height: number;
  maxOccupancy: number;
  lounges: LoungeConfig[];
  meetingRooms: MeetingRoomConfig[];
};

export function buildFloor(config: FloorLayoutConfig): Floor {
  const lounges = config.lounges.map((c) =>
    Lounge.create(c.id, Position.create(c.x, c.y), RoomCapacity.of(c.minCapacity, c.maxCapacity))
  );
  const meetingRooms = config.meetingRooms.map((c) =>
    MeetingRoom.create(
      c.id,
      Position.create(c.x, c.y),
      RoomCapacity.of(c.minCapacity, c.maxCapacity),
      c.topic
    )
  );
  return Floor.create(
    config.id,
    config.width,
    config.height,
    config.maxOccupancy,
    lounges,
    meetingRooms
  );
}

export const DEFAULT_FLOOR_LAYOUT: FloorLayoutConfig = {
  id: "main-floor",
  width: 1000,
  height: 800,
  maxOccupancy: 100,
  lounges: [
    { id: "lounge-1", x: 150, y: 200, minCapacity: 2, maxCapacity: 3 },
    { id: "lounge-2", x: 450, y: 200, minCapacity: 2, maxCapacity: 3 },
    { id: "lounge-3", x: 150, y: 550, minCapacity: 2, maxCapacity: 3 },
  ],
  meetingRooms: [
    { id: "room-counseling", x: 800, y: 150, minCapacity: 2, maxCapacity: 8, topic: "counseling" },
    { id: "room-casual", x: 800, y: 400, minCapacity: 2, maxCapacity: 8, topic: "casual" },
    { id: "room-meeting", x: 800, y: 650, minCapacity: 2, maxCapacity: 10, topic: "meeting" },
  ],
};
