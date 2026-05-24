export class EmployeeId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static parse(raw: unknown): EmployeeId {
    if (typeof raw !== "string" || !/^[0-9]{9}$/.test(raw)) {
      throw new Error(`社員IDは9桁の数値である必要があります: "${raw}"`);
    }
    return new EmployeeId(raw);
  }

  get value(): string {
    return this._value;
  }

  equals(other: EmployeeId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
