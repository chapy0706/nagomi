export type SurveyType = "session" | "nps";

const MAX_COMMENT_LENGTH = 300;

/**
 * 満足度回答エンティティ。
 * 個人を特定できる情報（employee_id, auth_user_id）を一切持たない。
 */
export class SatisfactionResponse {
  private constructor(
    readonly id: string,
    readonly surveyType: SurveyType,
    readonly rating: number | undefined,
    readonly npsScore: number | undefined,
    readonly comment: string | undefined,
    readonly submittedAt: Date
  ) {}

  static forSession(params: {
    id: string;
    rating: number;
    comment: string | undefined;
    submittedAt: Date;
  }): SatisfactionResponse {
    if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
      throw new Error("セッション評価は 1〜5 の整数で入力してください");
    }
    if (params.comment !== undefined && params.comment.length > MAX_COMMENT_LENGTH) {
      throw new Error(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください`);
    }
    return new SatisfactionResponse(
      params.id,
      "session",
      params.rating,
      undefined,
      params.comment || undefined,
      params.submittedAt
    );
  }

  static forNps(params: {
    id: string;
    npsScore: number;
    comment: string | undefined;
    submittedAt: Date;
  }): SatisfactionResponse {
    if (!Number.isInteger(params.npsScore) || params.npsScore < 0 || params.npsScore > 10) {
      throw new Error("NPS スコアは 0〜10 の整数で入力してください");
    }
    if (params.comment !== undefined && params.comment.length > MAX_COMMENT_LENGTH) {
      throw new Error(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください`);
    }
    return new SatisfactionResponse(
      params.id,
      "nps",
      undefined,
      params.npsScore,
      params.comment || undefined,
      params.submittedAt
    );
  }
}
