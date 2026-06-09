"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";

/**
 * 自分がブロックしたユーザーの authUserId 集合を返す。
 * フロア表示でブロック済みアバターを半透明にするために使用する。
 */
export function useBlockedAuthIds(selfAuthUserId: string): Set<string> {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    supabase
      .from("block_relations")
      .select("blocked_auth_id")
      .eq("blocker_auth_id", selfAuthUserId)
      .then(({ data }) => {
        if (data) {
          setBlockedIds(new Set(data.map((r: { blocked_auth_id: string }) => r.blocked_auth_id)));
        }
      });
  }, [selfAuthUserId, supabase]);

  return blockedIds;
}
