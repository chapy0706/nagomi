import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type {
  RoomActivityGateway,
  RoomActivitySnapshot,
  RoomActivityUnsubscribe,
} from "@/src/domain/ports/RoomActivityGateway";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
const ACTIVITY_EVENT = "activity";

function channelName(roomId: string): string {
  return `${APP_ENV}:room-activity:${roomId}`;
}

function parseSnapshot(raw: unknown): RoomActivitySnapshot | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.recentSpeakerEventCount !== "number") return undefined;
  if (!Number.isFinite(r.recentSpeakerEventCount)) return undefined;
  if (typeof r.emittedAt !== "string") return undefined;
  return {
    recentSpeakerEventCount: r.recentSpeakerEventCount,
    emittedAt: r.emittedAt,
  };
}

export class SupabaseRoomActivityGateway implements RoomActivityGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async broadcastActivity(roomId: string, snapshot: RoomActivitySnapshot): Promise<void> {
    const channel = this.supabase.channel(channelName(roomId));
    await new Promise<void>((resolve, reject) => {
      channel.subscribe(async (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`room activity broadcast failed: ${status}`));
          return;
        }
        if (status !== "SUBSCRIBED") return;
        try {
          await channel.send({ type: "broadcast", event: ACTIVITY_EVENT, payload: snapshot });
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          this.supabase.removeChannel(channel).catch(() => {});
        }
      });
    });
  }

  async subscribeToActivity(
    roomId: string,
    onReceive: (snapshot: RoomActivitySnapshot) => void
  ): Promise<RoomActivityUnsubscribe> {
    const channel: RealtimeChannel = this.supabase.channel(channelName(roomId));
    channel.on("broadcast", { event: ACTIVITY_EVENT }, ({ payload }) => {
      const parsed = parseSnapshot(payload);
      if (parsed) onReceive(parsed);
    });

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`room activity subscribe failed: ${status}`));
        }
      });
    });

    return () => {
      this.supabase.removeChannel(channel).catch(() => {});
    };
  }
}
