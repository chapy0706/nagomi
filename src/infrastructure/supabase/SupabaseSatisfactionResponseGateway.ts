import type { SupabaseClient } from "@supabase/supabase-js";
import type { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";
import type { SatisfactionResponseGateway } from "@/src/domain/ports/SatisfactionResponseGateway";

export class SupabaseSatisfactionResponseGateway implements SatisfactionResponseGateway {
  constructor(private readonly client: SupabaseClient) {}

  async submit(response: SatisfactionResponse): Promise<void> {
    const { error } = await this.client.from("satisfaction_responses").insert({
      id: response.id,
      survey_type: response.surveyType,
      rating: response.rating ?? null,
      nps_score: response.npsScore ?? null,
      comment: response.comment ?? null,
      submitted_at: response.submittedAt.toISOString(),
    });
    if (error) throw new Error(`満足度回答の送信に失敗しました: ${error.message}`);
  }
}
