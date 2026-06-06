"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { JitsiVideoRoomGateway } from "@/src/infrastructure/jitsi/JitsiVideoRoomGateway";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabaseRoomActivityGateway } from "@/src/infrastructure/supabase/SupabaseRoomActivityGateway";

type VideoOverlayProps = {
  displayName: string;
};

const ACTIVITY_WINDOW_MS = 30_000;
const ACTIVITY_BROADCAST_INTERVAL_MS = 5_000;

export function VideoOverlay({ displayName }: VideoOverlayProps) {
  const isOpen = useVideoStore((s) => s.isOpen);
  const roomId = useVideoStore((s) => s.roomId);
  const startWithAudioMuted = useVideoStore((s) => s.startWithAudioMuted);
  const startWithVideoMuted = useVideoStore((s) => s.startWithVideoMuted);
  const close = useVideoStore((s) => s.close);
  const enterCall = useSelfStatusStore((s) => s.enterCall);
  const exitCall = useSelfStatusStore((s) => s.exitCall);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const activityGateway = useMemo(() => new SupabaseRoomActivityGateway(supabase), [supabase]);

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
