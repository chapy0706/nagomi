"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWakeLock } from "@/app/_hooks/useWakeLock";
import { useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { recordCallJoinAction } from "@/app/actions/callParticipation";
import { DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";
import { JitsiVideoRoomGateway } from "@/src/infrastructure/jitsi/JitsiVideoRoomGateway";
import { createRoomActivityGateway } from "@/src/infrastructure/realtimeGatewayFactory";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";

type VideoOverlayProps = {
  authUserId: string;
  displayName: string;
};

const ACTIVITY_WINDOW_MS = 30_000;
const ACTIVITY_BROADCAST_INTERVAL_MS = 5_000;

function lookupTopic(roomId: string): CallTopicKind | undefined {
  return DEFAULT_FLOOR_LAYOUT.meetingRooms.find((r) => r.id === roomId)?.topic;
}

export function VideoOverlay({ authUserId: _authUserId, displayName }: VideoOverlayProps) {
  const isOpen = useVideoStore((s) => s.isOpen);
  const roomId = useVideoStore((s) => s.roomId);
  const startWithAudioMuted = useVideoStore((s) => s.startWithAudioMuted);
  const startWithVideoMuted = useVideoStore((s) => s.startWithVideoMuted);
  const close = useVideoStore((s) => s.close);
  const enterCall = useSelfStatusStore((s) => s.enterCall);
  const exitCall = useSelfStatusStore((s) => s.exitCall);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const activityGateway = useMemo(() => createRoomActivityGateway(supabase), [supabase]);

  useWakeLock(isOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const gatewayRef = useRef<JitsiVideoRoomGateway | undefined>(undefined);
  const speakerEventTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen || !roomId || !containerRef.current) return;

    const gateway = new JitsiVideoRoomGateway();
    gatewayRef.current = gateway;
    enterCall();
    speakerEventTimesRef.current = [];

    gateway
      .join(
        containerRef.current,
        {
          roomId,
          displayName,
          startWithVideoMuted,
          startWithAudioMuted,
        },
        {
          onConferenceJoined: () => {
            const topic = lookupTopic(roomId);
            if (topic) {
              recordCallJoinAction(roomId, topic).catch((err) => {
                console.error("[VideoOverlay] recordCallJoin failed:", err);
              });
            }
          },
          onReadyToClose: () => close(),
          onDominantSpeakerChanged: () => {
            speakerEventTimesRef.current.push(Date.now());
          },
        }
      )
      .catch((err) => console.error("[VideoOverlay] join failed:", err));

    const broadcastInterval = window.setInterval(() => {
      const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
      speakerEventTimesRef.current = speakerEventTimesRef.current.filter((t) => t >= cutoff);
      const snapshot = {
        recentSpeakerEventCount: speakerEventTimesRef.current.length,
        emittedAt: new Date().toISOString(),
      };
      activityGateway.broadcastActivity(roomId, snapshot).catch((err) => {
        console.error("[VideoOverlay] broadcast activity failed:", err);
      });
    }, ACTIVITY_BROADCAST_INTERVAL_MS);

    return () => {
      window.clearInterval(broadcastInterval);
      navigator.sendBeacon("/api/call-participation/leave");
      gatewayRef.current?.leave();
      gatewayRef.current = undefined;
      speakerEventTimesRef.current = [];
      exitCall();
    };
  }, [
    isOpen,
    roomId,
    displayName,
    startWithAudioMuted,
    startWithVideoMuted,
    enterCall,
    exitCall,
    close,
    activityGateway,
  ]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black">
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
