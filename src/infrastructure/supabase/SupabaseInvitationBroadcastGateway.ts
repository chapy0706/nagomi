import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvitationBroadcastGateway,
  InvitationPayload,
} from "@/src/domain/ports/InvitationBroadcastGateway";

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? "local";

export class SupabaseInvitationBroadcastGateway implements InvitationBroadcastGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async broadcastInvitation(inviteeAuthId: string, payload: InvitationPayload): Promise<void> {
    const channelName = `${APP_ENV}:invitations:${inviteeAuthId}`;
    const channel = this.supabase.channel(channelName);

    await new Promise<void>((resolve, reject) => {
      channel.subscribe(async (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`招待ブロードキャスト失敗: ${status}`));
          return;
        }
        if (status !== "SUBSCRIBED") return;

        try {
          await channel.send({ type: "broadcast", event: "invitation", payload });
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          this.supabase.removeChannel(channel).catch(() => {});
        }
      });
    });
  }
}
