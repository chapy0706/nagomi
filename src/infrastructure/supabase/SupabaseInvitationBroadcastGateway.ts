import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";
import type {
  InvitationAcceptancePayload,
  InvitationBroadcastGateway,
  InvitationPayload,
  Unsubscribe,
} from "@/src/domain/ports/InvitationBroadcastGateway";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "local";

type BroadcastEvent = "invitation" | "acceptance";

function invitationChannel(inviteeAuthId: string): string {
  return `${APP_ENV}:invitations:${inviteeAuthId}`;
}

function responseChannel(inviterAuthId: string): string {
  return `${APP_ENV}:invitation-responses:${inviterAuthId}`;
}

function parseInvitationPayload(raw: unknown): InvitationPayload | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return undefined;
  if (typeof r.inviterAuthId !== "string") return undefined;
  if (typeof r.inviterDisplayName !== "string") return undefined;
  if (typeof r.expiresAt !== "string") return undefined;
  const validTopics: InvitationTopic[] = ["counseling", "casual", "meeting"];
  const topic =
    typeof r.topic === "string" && validTopics.includes(r.topic as InvitationTopic)
      ? (r.topic as InvitationTopic)
      : undefined;
  return {
    id: r.id,
    inviterAuthId: r.inviterAuthId,
    inviterDisplayName: r.inviterDisplayName,
    inviterAvatarUrl: typeof r.inviterAvatarUrl === "string" ? r.inviterAvatarUrl : undefined,
    topic,
    expiresAt: r.expiresAt,
  };
}

function parseAcceptancePayload(raw: unknown): InvitationAcceptancePayload | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.invitationId !== "string") return undefined;
  if (typeof r.roomId !== "string") return undefined;
  return { invitationId: r.invitationId, roomId: r.roomId };
}

export class SupabaseInvitationBroadcastGateway implements InvitationBroadcastGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async broadcastInvitation(inviteeAuthId: string, payload: InvitationPayload): Promise<void> {
    await this.broadcast(invitationChannel(inviteeAuthId), "invitation", payload);
  }

  async broadcastAcceptance(
    inviterAuthId: string,
    payload: InvitationAcceptancePayload
  ): Promise<void> {
    await this.broadcast(responseChannel(inviterAuthId), "acceptance", payload);
  }

  async subscribeToInvitations(
    inviteeAuthId: string,
    onReceive: (payload: InvitationPayload) => void
  ): Promise<Unsubscribe> {
    return this.subscribe(invitationChannel(inviteeAuthId), "invitation", (raw) => {
      const parsed = parseInvitationPayload(raw);
      if (parsed) onReceive(parsed);
    });
  }

  async subscribeToAcceptances(
    inviterAuthId: string,
    onReceive: (payload: InvitationAcceptancePayload) => void
  ): Promise<Unsubscribe> {
    return this.subscribe(responseChannel(inviterAuthId), "acceptance", (raw) => {
      const parsed = parseAcceptancePayload(raw);
      if (parsed) onReceive(parsed);
    });
  }

  private async broadcast(
    channelName: string,
    event: BroadcastEvent,
    payload: InvitationPayload | InvitationAcceptancePayload
  ): Promise<void> {
    const channel = this.supabase.channel(channelName);

    await new Promise<void>((resolve, reject) => {
      channel.subscribe(async (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`招待ブロードキャスト失敗: ${status}`));
          return;
        }
        if (status !== "SUBSCRIBED") return;

        try {
          await channel.send({ type: "broadcast", event, payload });
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          this.supabase.removeChannel(channel).catch(() => {});
        }
      });
    });
  }

  private async subscribe(
    channelName: string,
    event: BroadcastEvent,
    onMessage: (payload: unknown) => void
  ): Promise<Unsubscribe> {
    const channel: RealtimeChannel = this.supabase.channel(channelName);
    channel.on("broadcast", { event }, ({ payload }) => onMessage(payload));

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`招待チャネル購読失敗: ${status}`));
        }
      });
    });

    return () => {
      this.supabase.removeChannel(channel).catch(() => {});
    };
  }
}
