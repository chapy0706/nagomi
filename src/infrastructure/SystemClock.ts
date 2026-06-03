import type { Clock } from "@/src/domain/ports/Clock";

export const SystemClock: Clock = {
  now: () => new Date(),
};
