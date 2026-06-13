import type { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";

export type SatisfactionResponseGateway = {
  submit(response: SatisfactionResponse): Promise<void>;
};
