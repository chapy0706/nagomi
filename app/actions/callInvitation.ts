"use server";

import { redirect } from "next/navigation";
import { AcceptCallInvitation } from "@/src/application/use-cases/AcceptCallInvitation";
import { DeclineCallInvitation } from "@/src/application/use-cases/DeclineCallInvitation";
import { IssueCallInvitation } from "@/src/application/use-cases/IssueCallInvitation";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";
import type {
  InvitationAcceptancePayload,
  InvitationBroadcastGateway,
  InvitationPayload,
  Unsubscribe,
} from "@/src/domain/ports/InvitationBroadcastGateway";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";
import {
  createBlockRepository,
  createCallInvitationRepository,
} from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

/// WS broadcast はクライアント側で行うため、サーバーアクション内では noop ゲートウェイを使う
class NoopBroadcastGateway implements InvitationBroadcastGateway {
  async broadcastInvitation(_inviteeAuthId: string, _payload: InvitationPayload): Promise<void> {}
  async broadcastAcceptance(
    _inviterAuthId: string,
    _payload: InvitationAcceptancePayload
  ): Promise<void> {}
  async subscribeToInvitations(
    _inviteeAuthId: string,
    _onReceive: (payload: InvitationPayload) => void
  ): Promise<Unsubscribe> {
    return () => {};
  }
  async subscribeToAcceptances(
    _inviterAuthId: string,
    _onReceive: (payload: InvitationAcceptancePayload) => void
  ): Promise<Unsubscribe> {
    return () => {};
  }
}

async function getAuthUserId(): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}

export type IssueCallInvitationActionInput = {
  inviterAuthId: string;
  inviterDisplayName: string;
  inviterAvatarUrl: string | undefined;
  inviteeAuthId: string;
  inviteeStatus: PresenceStatus;
  topic: InvitationTopic | undefined;
};

export type IssueCallInvitationActionResult =
  | { success: true; invitationId: string; expiresAt: string }
  | {
      success: false;
      reason: "self_invite" | "invitee_unavailable" | "blocked" | "cooldown" | "unauthorized";
    };

export async function issueCallInvitationAction(
  input: IssueCallInvitationActionInput
): Promise<IssueCallInvitationActionResult> {
  const authUserId = await getAuthUserId();
  if (authUserId !== input.inviterAuthId) {
    return { success: false, reason: "unauthorized" };
  }

  const useCase = new IssueCallInvitation(
    createCallInvitationRepository(),
    new NoopBroadcastGateway(),
    createBlockRepository(),
    SystemClock
  );

  const result = await useCase.execute(input);
  if (!result.success) return result;

  return {
    success: true,
    invitationId: result.invitation.id,
    expiresAt: result.invitation.expiresAt.toISOString(),
  };
}

export type AcceptCallInvitationActionResult =
  | { success: true; roomId: string }
  | { success: false; reason: "expired" };

export async function acceptCallInvitationAction(input: {
  invitationId: string;
  inviterAuthId: string;
  expiresAt: Date;
}): Promise<AcceptCallInvitationActionResult> {
  await getAuthUserId();

  const useCase = new AcceptCallInvitation(
    createCallInvitationRepository(),
    new NoopBroadcastGateway(),
    SystemClock
  );

  return useCase.execute(input);
}

export async function declineCallInvitationAction(input: { invitationId: string }): Promise<void> {
  await getAuthUserId();
  await new DeclineCallInvitation(createCallInvitationRepository()).execute(input);
}
