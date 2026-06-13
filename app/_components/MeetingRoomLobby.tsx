"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarImage } from "@/app/_components/AvatarImage";
import { useMediaPreview } from "@/app/_hooks/useMediaPreview";
import { TOPIC_ROOM_LABELS } from "@/app/_lib/topicStyle";
import { useDevicePreferenceStore } from "@/app/_stores/devicePreferenceStore";
import { useLobbyStore } from "@/app/_stores/lobbyStore";
import { selectPresenceList, usePresenceStore } from "@/app/_stores/presenceStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { EnterMeetingRoom } from "@/src/application/use-cases/EnterMeetingRoom";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";

const LOBBY_TIMEOUT_MS = 5 * 60 * 1000;

export function MeetingRoomLobby() {
  const roomId = useLobbyStore((s) => s.roomId);
  if (!roomId) return null;
  return <MeetingRoomLobbyInner key={roomId} roomId={roomId} />;
}

function MeetingRoomLobbyInner({ roomId }: { roomId: string }) {
  const closeLobby = useLobbyStore((s) => s.close);
  const openVideo = useVideoStore((s) => s.open);
  const presences = usePresenceStore(selectPresenceList);

  const floor = useMemo(() => buildFloor(DEFAULT_FLOOR_LAYOUT), []);
  const useCase = useMemo(() => new EnterMeetingRoom(), []);

  const participants = useMemo(
    () => presences.filter((p) => p.currentRoomId === roomId),
    [presences, roomId]
  );

  const validation = useCase.execute({
    floor,
    roomId,
    currentParticipantCount: participants.length,
  });

  const audioInputId = useDevicePreferenceStore((s) => s.audioInputId);
  const videoInputId = useDevicePreferenceStore((s) => s.videoInputId);
  const setAudioInputId = useDevicePreferenceStore((s) => s.setAudioInputId);
  const setVideoInputId = useDevicePreferenceStore((s) => s.setVideoInputId);
  const hydrate = useDevicePreferenceStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const preview = useMediaPreview({
    audioDeviceId: audioInputId,
    videoDeviceId: videoInputId,
    micEnabled,
    cameraEnabled,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = preview.stream ?? null;
  }, [preview.stream]);

  useEffect(() => {
    const timer = window.setTimeout(() => closeLobby(), LOBBY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [closeLobby]);

  const handleJoin = () => {
    if (!validation.success) return;
    openVideo(roomId, {
      startWithAudioMuted: !micEnabled,
      startWithVideoMuted: !cameraEnabled,
    });
    closeLobby();
  };

  const isFull = !validation.success && validation.reason === "full";
  const topicLabel = validation.success ? TOPIC_ROOM_LABELS[validation.room.topic] : "会議室";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${topicLabel} のロビー`}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{topicLabel} のロビー</h2>
          <span className="text-xs text-gray-500">
            参加中: {participants.length} / {validation.success ? validation.room.capacityMax : "?"}
          </span>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="bg-gray-900 aspect-video rounded-lg overflow-hidden flex items-center justify-center text-gray-300 text-sm relative">
              {cameraEnabled && preview.stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <span>{cameraEnabled ? "カメラ準備中..." : "カメラ OFF"}</span>
              )}
            </div>

            {preview.error && (
              <p className="text-xs text-red-600" role="alert">
                {preview.error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMicEnabled((v) => !v)}
                className={`flex-1 min-h-[44px] py-2 rounded-lg text-sm font-medium transition-colors ${
                  micEnabled
                    ? "bg-indigo-500 text-white hover:bg-indigo-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                aria-pressed={micEnabled}
              >
                マイク {micEnabled ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => setCameraEnabled((v) => !v)}
                className={`flex-1 min-h-[44px] py-2 rounded-lg text-sm font-medium transition-colors ${
                  cameraEnabled
                    ? "bg-indigo-500 text-white hover:bg-indigo-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                aria-pressed={cameraEnabled}
              >
                カメラ {cameraEnabled ? "ON" : "OFF"}
              </button>
            </div>

            <label className="text-xs text-gray-600 flex flex-col gap-1">
              マイク
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={audioInputId ?? ""}
                onChange={(e) => setAudioInputId(e.target.value || undefined)}
                disabled={!micEnabled}
              >
                <option value="">システム既定</option>
                {preview.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-gray-600 flex flex-col gap-1">
              カメラ
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={videoInputId ?? ""}
                onChange={(e) => setVideoInputId(e.target.value || undefined)}
                disabled={!cameraEnabled}
              >
                <option value="">システム既定</option>
                {preview.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800">現在の参加者</h3>
            {participants.length === 0 ? (
              <p className="text-xs text-gray-500">まだ誰もいません</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {participants.map((p) => (
                  <li key={p.employeeId} className="flex items-center gap-2">
                    <AvatarImage
                      displayName={p.displayName}
                      avatarUrl={p.avatarUrl}
                      seed={p.employeeId}
                      size={28}
                    />
                    <span className="text-sm text-gray-800">{p.displayName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-200 pt-3">
          「参加する」を押すことで、本サービスの
          <a href="/docs/privacy-policy" className="underline">
            利用ポリシー
          </a>
          に同意したものとみなします。
        </p>

        {isFull && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            この部屋は満員です。少し時間を置いてから再度お試しください。
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={closeLobby}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!validation.success}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            参加する
          </button>
        </div>
      </div>
    </div>
  );
}
