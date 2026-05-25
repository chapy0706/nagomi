import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type {
  PresenceGateway,
  PresenceHandlers,
  PresencePayload,
  PresenceStatus,
} from "@/src/domain/ports/PresenceGateway";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
const CHANNEL_NAME = `${APP_ENV}:floor`;
const CONNECTION_WARN_THRESHOLD = 180;

type RawPresence = {
  employeeId: string;
  displayName: string;
  avatarUrl: string | null;
  x: number;
  y: number;
  status: string;
  presence_ref: string;
};

function parsePresence(raw: unknown): PresencePayload | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.employeeId !== "string" || !r.employeeId) return undefined;
  if (typeof r.displayName !== "string") return undefined;
  if (typeof r.x !== "number" || !Number.isFinite(r.x)) return undefined;
  if (typeof r.y !== "number" || !Number.isFinite(r.y)) return undefined;
  const status: PresenceStatus =
    r.status === "active" || r.status === "away" || r.status === "busy" ? r.status : "active";
  return {
    employeeId: r.employeeId,
    displayName: r.displayName,
    avatarUrl: typeof r.avatarUrl === "string" ? r.avatarUrl : undefined,
    x: r.x,
    y: r.y,
    status,
  };
}

export class SupabasePresenceGateway implements PresenceGateway {
  private channel: RealtimeChannel | undefined;
  private trackedPayload: RawPresence | undefined;

  constructor(private readonly supabase: SupabaseClient) {}

  async join(payload: PresencePayload, handlers: PresenceHandlers): Promise<void> {
    if (this.channel) {
      await this.leave();
    }

    const rawPayload: RawPresence = {
      employeeId: payload.employeeId,
      displayName: payload.displayName,
      avatarUrl: payload.avatarUrl ?? null,
      x: payload.x,
      y: payload.y,
      status: payload.status,
      presence_ref: "",
    };

    const channel = this.supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: payload.employeeId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<RawPresence>();
        const presences: PresencePayload[] = [];
        for (const list of Object.values(state)) {
          for (const p of list) {
            const parsed = parsePresence(p);
            if (parsed) presences.push(parsed);
          }
        }
        if (presences.length >= CONNECTION_WARN_THRESHOLD) {
          console.warn(
            `[PresenceGateway] ${presences.length} concurrent users — approaching free-tier limit`
          );
        }
        handlers.onSync(presences);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        for (const p of newPresences) {
          const parsed = parsePresence(p);
          if (parsed) handlers.onJoin(parsed);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        handlers.onLeave(String(key));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.trackedPayload = rawPayload;
          await channel.track(rawPayload);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[PresenceGateway] ${status} — reconnecting automatically`);
        }
      });

    this.channel = channel;
  }

  async updatePosition(x: number, y: number): Promise<void> {
    if (!this.channel || !this.trackedPayload) return;
    const updated: RawPresence = { ...this.trackedPayload, x, y };
    this.trackedPayload = updated;
    await this.channel.track(updated);
  }

  async leave(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = undefined;
      this.trackedPayload = undefined;
    }
  }
}
