"use client";

import { useActionState } from "react";
import { type ProfileActionState, updateDisplayNameAction } from "./actions";

const initialState: ProfileActionState = { errorMessage: undefined, successMessage: undefined };

type Props = { currentDisplayName: string };

export function DisplayNameForm({ currentDisplayName }: Props) {
  const [state, formAction, isPending] = useActionState(updateDisplayNameAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          表示名
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={currentDisplayName}
          maxLength={30}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400">1〜30文字。記号 {"<>&"} は使用できません。</p>
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
        {isPending ? "更新中..." : "更新する"}
      </button>
    </form>
  );
}
