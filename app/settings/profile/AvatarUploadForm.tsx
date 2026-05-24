"use client";

import { startTransition, useActionState, useRef } from "react";
import { AvatarImage } from "@/app/_components/AvatarImage";
import { type ProfileActionState, uploadAvatarAction } from "./actions";

const initialState: ProfileActionState = { errorMessage: undefined, successMessage: undefined };
const MAX_SIZE_PX = 256;

type Props = { displayName: string; avatarUrl?: string; seed: string };

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(MAX_SIZE_PX / img.width, MAX_SIZE_PX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("リサイズに失敗しました"));
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = URL.createObjectURL(file);
  });
}

export function AvatarUploadForm({ displayName, avatarUrl, seed }: Props) {
  const [state, dispatch, isPending] = useActionState(uploadAvatarAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = formRef.current?.querySelector<HTMLInputElement>('input[name="avatar"]');
    const file = input?.files?.[0];
    if (!file) return;

    const resized = await resizeImage(file).catch(() => file);
    const fd = new FormData();
    fd.append("avatar", resized, file.name);

    startTransition(() => dispatch(fd));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <AvatarImage displayName={displayName} avatarUrl={avatarUrl} seed={seed} size={64} />
        <div className="flex flex-col gap-1">
          <label htmlFor="avatar" className="text-sm font-medium text-gray-700">
            アバター画像
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
          />
          <p className="text-xs text-gray-400">PNG・JPEG・WebP、2MB以下</p>
        </div>
      </div>

      {state.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {state.errorMessage}
        </p>
      )}
      {state.successMessage && (
        <p role="status" className="text-sm text-green-600">
          {state.successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "アップロード中..." : "アップロード"}
      </button>
    </form>
  );
}
