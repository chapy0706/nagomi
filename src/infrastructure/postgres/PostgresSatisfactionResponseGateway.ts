import type { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";
import type { SatisfactionResponseGateway } from "@/src/domain/ports/SatisfactionResponseGateway";
import type { getDb } from "./client";
import { satisfactionResponses } from "./schema";

export class PostgresSatisfactionResponseGateway implements SatisfactionResponseGateway {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async submit(response: SatisfactionResponse): Promise<void> {
    await this.db.insert(satisfactionResponses).values({
      id: response.id,
      surveyType: response.surveyType,
      rating: response.rating ?? null,
      npsScore: response.npsScore ?? null,
      comment: response.comment ?? null,
      submittedAt: response.submittedAt,
    });
  }
}
