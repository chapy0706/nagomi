export class Position {
  private constructor(
    readonly x: number,
    readonly y: number
  ) {}

  static create(x: unknown, y: unknown): Position {
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("座標は数値である必要があります");
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("座標は有限値である必要があります");
    }
    if (x < 0 || y < 0) {
      throw new Error("座標は0以上である必要があります");
    }
    return new Position(x, y);
  }

  isWithinBounds(width: number, height: number): boolean {
    return this.x <= width && this.y <= height;
  }

  distanceTo(other: Position): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
