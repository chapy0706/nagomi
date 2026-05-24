const MIN_LENGTH = 1;
const MAX_LENGTH = 30;
const FORBIDDEN_SUBSTRINGS = ["管理者", "admin", "system", "システム"];
const FORBIDDEN_CHARS_RE = /[<>&]/;

export class DisplayName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static parse(raw: unknown): DisplayName {
    if (typeof raw !== "string") {
      throw new Error("表示名は文字列である必要があります");
    }
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new Error(`表示名は${MIN_LENGTH}〜${MAX_LENGTH}文字で入力してください`);
    }
    if (FORBIDDEN_CHARS_RE.test(trimmed)) {
      throw new Error("表示名に使用できない文字が含まれています");
    }
    const lower = trimmed.toLowerCase();
    for (const word of FORBIDDEN_SUBSTRINGS) {
      if (lower.includes(word.toLowerCase())) {
        throw new Error(`表示名に使用できない文字列が含まれています: "${word}"`);
      }
    }
    return new DisplayName(trimmed);
  }

  static initial(seq: number): DisplayName {
    return new DisplayName(`User${seq}`);
  }

  get value(): string {
    return this._value;
  }

  equals(other: DisplayName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
