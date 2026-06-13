import type {
  InvitationAcceptancePayload,
  InvitationBroadcastGateway,
  InvitationPayload,
  Unsubscribe,
} from "@/src/domain/ports/InvitationBroadcastGateway";
import type { WebSocketClient } from "./WebSocketClient";

export class WebSocketInvitationBroadcastGateway implements InvitationBroadcastGateway {
  constructor(private readonly client: WebSocketClient) {}

  async broadcastInvitation(inviteeAuthId: string, payload: InvitationPayload): Promise<void> {
    this.client.send({
      type: "invitation:send",
      invitee_auth_id: inviteeAuthId,
      payload,
    });
  }

  async broadcastAcceptance(
    inviterAuthId: string,
    payload: InvitationAcceptancePayload
  ): Promise<void> {
    this.client.send({
      type: "invitation:accept",
      inviter_auth_id: inviterAuthId,
      payload,
    });
  }

  async subscribeToInvitations(
    inviteeAuthId: string,
    onReceive: (payload: InvitationPayload) => void
  ): Promise<Unsubscribe> {
    // サーバーにサブスクリプション登録
    this.client.send({
      type: "invitation:subscribe",
      invitee_auth_id: inviteeAuthId,
    });

    const unsub = this.client.on("invitation:received", (msg) => {
      onReceive(msg.payload);
    });

    return () => {
      unsub();
    };
  }

  async subscribeToAcceptances(
    inviterAuthId: string,
    onReceive: (payload: InvitationAcceptancePayload) => void
  ): Promise<Unsubscribe> {
    this.client.send({
      type: "acceptance:subscribe",
      inviter_auth_id: inviterAuthId,
    });

    const unsub = this.client.on("acceptance:received", (msg) => {
      onReceive(msg.payload);
    });

    return () => {
      unsub();
    };
  }
}
