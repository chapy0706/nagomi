import type { Floor } from "@/src/domain/entities/Floor";
import { Position } from "@/src/domain/value-objects/Position";

const GRID_SPACING = 100;
const MIN_DISTANCE = 80;
const FLOOR_MARGIN = 50;

export class AvatarPlacementService {
  findInitialPosition(floor: Floor, occupiedPositions: ReadonlyArray<Position>): Position {
    for (let y = FLOOR_MARGIN; y <= floor.height - FLOOR_MARGIN; y += GRID_SPACING) {
      for (let x = FLOOR_MARGIN; x <= floor.width - FLOOR_MARGIN; x += GRID_SPACING) {
        const candidate = Position.create(x, y);
        if (this.isClearOf(candidate, occupiedPositions)) {
          return candidate;
        }
      }
    }
    // フロアが満杯の場合は左上マージン位置にフォールバック
    return Position.create(FLOOR_MARGIN, FLOOR_MARGIN);
  }

  private isClearOf(candidate: Position, occupied: ReadonlyArray<Position>): boolean {
    return occupied.every((p) => candidate.distanceTo(p) >= MIN_DISTANCE);
  }
}
