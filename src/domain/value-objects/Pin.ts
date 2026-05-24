export class Pin {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static parse(raw: unknown): Pin {
    if (typeof raw !== "string" || !/^[0-9]{6,}$/.test(raw)) {
      throw new Error("PINは6桁以上の数字である必要があります");
    }
    return new Pin(raw);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
