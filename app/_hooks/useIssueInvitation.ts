"use client";

import { useMemo } from "react";
import { IssueCallInvitation } from "@/src/application/use-cases/IssueCallInvitation";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { NullBlockRepository } from "@/src/infrastructure/supabase/NullBlockRepository";
import { SupabaseCallInvitationRepository } from "@/src/infrastructure/supabase/SupabaseCallInvitationRepository";
import { SupabaseInvitationBroadcastGateway } from "@/src/infrastructure/supabase/SupabaseInvitationBroadcastGateway";

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
  const useCase = useMemo(
    () =>
      new IssueCallInvitation(
        new SupabaseCallInvitationRepository(supabase),
        new SupabaseInvitationBroadcastGateway(supabase),
        new NullBlockRepository(),
        SystemClock
      ),
    [supabase]
  );

  const issue = (p: IssueParams) =>
    useCase.execute({
      inviterAuthId: params.selfAuthUserId,
      inviterDisplayName: params.selfDisplayName,
      inviterAvatarUrl: params.selfAvatarUrl,
      inviteeAuthId: p.inviteeAuthId,
      inviteeStatus: p.inviteeStatus,
      topic: p.topic,
    });

  return { issue };
}
