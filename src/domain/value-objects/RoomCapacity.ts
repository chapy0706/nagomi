export class RoomCapacity {
  private constructor(
    readonly min: number,
    readonly max: number
  ) {}

  static of(min: number, max: number): RoomCapacity {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error("定員は整数である必要があります");
    }
    if (min < 1) {
      throw new Error("最小定員は1以上である必要があります");
    }
    if (max < min) {
      throw new Error("最大定員は最小定員以上である必要があります");
    }
    return new RoomCapacity(min, max);
  }

  canAccept(currentCount: number): boolean {
    return currentCount < this.max;
  }

  isFull(currentCount: number): boolean {
    return currentCount >= this.max;
  }

  toString(): string {
    return `${this.min}〜${this.max}人`;
  }
}
