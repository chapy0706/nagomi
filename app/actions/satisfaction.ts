"use server";

import { redirect } from "next/navigation";
import { SubmitSatisfactionResponse } from "@/src/application/use-cases/SubmitSatisfactionResponse";
import { createSatisfactionResponseGateway } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type SatisfactionActionState = {
  success: boolean | undefined;
  errorMessage: string | undefined;
};

const INITIAL_STATE: SatisfactionActionState = { success: undefined, errorMessage: undefined };

export { INITIAL_STATE as SATISFACTION_INITIAL_STATE };

export async function submitSatisfactionAction(
  _prev: SatisfactionActionState,
  formData: FormData
): Promise<SatisfactionActionState> {
  const serverClient = await createSupabaseServerClient();
  const { data: authData } = await serverClient.auth.getUser();
  if (!authData.user) redirect("/login");

  const type = formData.get("type");
  const comment = formData.get("comment");

  const useCase = new SubmitSatisfactionResponse(createSatisfactionResponseGateway(), SystemClock);

  if (type === "session") {
    const rawRating = formData.get("rating");
    const rating = typeof rawRating === "string" ? Number.parseInt(rawRating, 10) : Number.NaN;
    if (Number.isNaN(rating)) {
      return { success: false, errorMessage: "評価を選択してください" };
    }
    const result = await useCase.execute({
      type: "session",
      rating,
      comment: typeof comment === "string" && comment.trim() ? comment.trim() : undefined,
    });
    return result.success
      ? { success: true, errorMessage: undefined }
      : { success: false, errorMessage: result.errorMessage };
  }

  if (type === "nps") {
    const rawScore = formData.get("npsScore");
    const npsScore = typeof rawScore === "string" ? Number.parseInt(rawScore, 10) : Number.NaN;
    if (Number.isNaN(npsScore)) {
      return { success: false, errorMessage: "スコアを選択してください" };
    }
    const result = await useCase.execute({
      type: "nps",
      npsScore,
      comment: typeof comment === "string" && comment.trim() ? comment.trim() : undefined,
    });
    return result.success
      ? { success: true, errorMessage: undefined }
      : { success: false, errorMessage: result.errorMessage };
  }

  return { success: false, errorMessage: "無効なアンケート種別です" };
}
