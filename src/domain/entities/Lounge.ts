import type { Position } from "@/src/domain/value-objects/Position";
import type { RoomCapacity } from "@/src/domain/value-objects/RoomCapacity";

export class Lounge {
  readonly kind = "lounge" as const;

  private constructor(
    readonly id: string,
    readonly position: Position,
    readonly capacity: RoomCapacity
  ) {}

  static create(id: string, position: Position, capacity: RoomCapacity): Lounge {
    if (id.trim() === "") throw new Error("Lounge ID は空にできません");
    if (capacity.max < 2 || capacity.max > 3) {
      throw new Error(`Lounge の定員上限は2〜3人です: max=${capacity.max}`);
    }
    return new Lounge(id, position, capacity);
  }
}
