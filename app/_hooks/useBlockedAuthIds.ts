"use client";

import { useEffect, useState } from "react";
import { getMyBlockedAuthIdsAction } from "@/app/actions/block";

export function useBlockedAuthIds(selfAuthUserId: string): Set<string> {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-fetch when user identity changes
  useEffect(() => {
    getMyBlockedAuthIdsAction().then((ids) => {
      setBlockedIds(new Set(ids));
    });
  }, [selfAuthUserId]);

  return blockedIds;
}
