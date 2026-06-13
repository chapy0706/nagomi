import { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";
import type { Clock } from "@/src/domain/ports/Clock";
import type { SatisfactionResponseGateway } from "@/src/domain/ports/SatisfactionResponseGateway";

export type SubmitSatisfactionInput =
  | { type: "session"; rating: number; comment?: string }
  | { type: "nps"; npsScore: number; comment?: string };

export type SubmitSatisfactionResult = { success: true } | { success: false; errorMessage: string };

export class SubmitSatisfactionResponse {
  constructor(
    private readonly gateway: SatisfactionResponseGateway,
    private readonly clock: Clock
  ) {}

  async execute(input: SubmitSatisfactionInput): Promise<SubmitSatisfactionResult> {
    let response: SatisfactionResponse;
    try {
      if (input.type === "session") {
        response = SatisfactionResponse.forSession({
          id: crypto.randomUUID(),
          rating: input.rating,
          comment: input.comment,
          submittedAt: this.clock.now(),
        });
      } else {
        response = SatisfactionResponse.forNps({
          id: crypto.randomUUID(),
          npsScore: input.npsScore,
          comment: input.comment,
          submittedAt: this.clock.now(),
        });
      }
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : "回答の作成に失敗しました",
      };
    }
    await this.gateway.submit(response);
    return { success: true };
  }
}
