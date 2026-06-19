"use client";

import { useMemo } from "react";
import {
  type IssueCallInvitationActionResult,
  issueCallInvitationAction,
} from "@/app/actions/callInvitation";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";
import { createInvitationGateway } from "@/src/infrastructure/realtimeGatewayFactory";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";

type IssueParams = {
  inviteeAuthId: string;
  inviteeStatus: PresenceStatus;
  topic: InvitationTopic | undefined;
};

export function useIssueInvitation(params: {
  selfAuthUserId: string;
  selfDisplayName: string;
  selfAvatarUrl: string | undefined;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const gateway = useMemo(() => createInvitationGateway(supabase), [supabase]);

  const issue = async (p: IssueParams): Promise<IssueCallInvitationActionResult> => {
    const result = await issueCallInvitationAction({
      inviterAuthId: params.selfAuthUserId,
      inviterDisplayName: params.selfDisplayName,
      inviterAvatarUrl: params.selfAvatarUrl,
      inviteeAuthId: p.inviteeAuthId,
      inviteeStatus: p.inviteeStatus,
      topic: p.topic,
    });

    if (result.success) {
      await gateway.broadcastInvitation(p.inviteeAuthId, {
        id: result.invitationId,
        inviterAuthId: params.selfAuthUserId,
        inviterDisplayName: params.selfDisplayName,
        inviterAvatarUrl: params.selfAvatarUrl,
        topic: p.topic,
        expiresAt: result.expiresAt,
      });
    }

    return result;
  };

  return { issue };
}
