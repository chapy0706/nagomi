export type CallTopicKind = "counseling" | "casual" | "meeting";

const KINDS: ReadonlyArray<CallTopicKind> = ["counseling", "casual", "meeting"];

/**
 * 通話のトピック種別を表す値オブジェクト。
 * - counseling: 悩み相談
 * - casual: 雑談
 * - meeting: 面談（業務的な打ち合わせ）
 *
 * 表示ラベル・色などのプレゼンテーションは presentation 層で扱う（domain は kind のみ保持）。
 */
export class CallTopic {
  static readonly KINDS = KINDS;

  private constructor(readonly kind: CallTopicKind) {}

  static of(kind: CallTopicKind): CallTopic {
    if (!KINDS.includes(kind)) {
      throw new Error(`無効なトピックです: ${kind}`);
    }
    return new CallTopic(kind);
  }

  static parse(value: unknown): CallTopic | undefined {
    if (typeof value !== "string") return undefined;
    if (!KINDS.includes(value as CallTopicKind)) return undefined;
    return new CallTopic(value as CallTopicKind);
  }

  static isValidKind(value: unknown): value is CallTopicKind {
    return typeof value === "string" && KINDS.includes(value as CallTopicKind);
  }

  equals(other: CallTopic): boolean {
    return this.kind === other.kind;
  }
}
