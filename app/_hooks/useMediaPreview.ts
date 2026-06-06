"use client";

import { useCallback, useEffect, useState } from "react";

export type MediaDeviceOption = {
  deviceId: string;
  label: string;
};

export type MediaPreviewState = {
  stream: MediaStream | undefined;
  audioInputs: MediaDeviceOption[];
  videoInputs: MediaDeviceOption[];
  error: string | undefined;
  micEnabled: boolean;
  cameraEnabled: boolean;
};

export type UseMediaPreviewOptions = {
  audioDeviceId: string | undefined;
  videoDeviceId: string | undefined;
  micEnabled: boolean;
  cameraEnabled: boolean;
};

/**
 * ロビーでの自前マイク・カメラプレビュー。
 * - Jitsi の prejoin 機能を使わず getUserMedia で取得する（issue-16 の検討事項）
 * - デバイス選択が変わるたびに stream を取り直す
 * - cleanup で必ず track.stop() を呼んでリソース解放する
 */
export function useMediaPreview(options: UseMediaPreviewOptions): MediaPreviewState {
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `マイク ${i + 1}` }))
      );
      setVideoInputs(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `カメラ ${i + 1}` }))
      );
    } catch (err) {
      console.error("[useMediaPreview] enumerateDevices failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!options.micEnabled && !options.cameraEnabled) {
      setStream((current) => {
        for (const track of current?.getTracks() ?? []) track.stop();
        return undefined;
      });
      return;
    }

    let cancelled = false;
    let acquired: MediaStream | undefined;

    const audio: MediaStreamConstraints["audio"] = options.micEnabled
      ? options.audioDeviceId
        ? { deviceId: { exact: options.audioDeviceId } }
        : true
      : false;
    const video: MediaStreamConstraints["video"] = options.cameraEnabled
      ? options.videoDeviceId
        ? { deviceId: { exact: options.videoDeviceId } }
        : true
      : false;

    navigator.mediaDevices
      .getUserMedia({ audio, video })
      .then((s) => {
        if (cancelled) {
          for (const track of s.getTracks()) track.stop();
          return;
        }
        acquired = s;
        setStream((previous) => {
          for (const track of previous?.getTracks() ?? []) track.stop();
          return s;
        });
        setError(undefined);
        refreshDevices();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "マイク・カメラへのアクセスが許可されていません"
              : err.name === "NotFoundError"
                ? "利用可能なマイク・カメラが見つかりません"
                : err.message
            : "デバイスの取得に失敗しました";
        setError(message);
        setStream((previous) => {
          for (const track of previous?.getTracks() ?? []) track.stop();
          return undefined;
        });
      });

    return () => {
      cancelled = true;
      if (acquired) {
        for (const track of acquired.getTracks()) track.stop();
      }
    };
  }, [
    options.audioDeviceId,
    options.videoDeviceId,
    options.micEnabled,
    options.cameraEnabled,
    refreshDevices,
  ]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    stream,
    audioInputs,
    videoInputs,
    error,
    micEnabled: options.micEnabled,
    cameraEnabled: options.cameraEnabled,
  };
}
