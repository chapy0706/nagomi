"use client";

import { useActionState, useState } from "react";
import { type ConsentState, consentAction } from "./actions";

const initialState: ConsentState = { errorMessage: undefined };

export function ConsentForm() {
  const [state, formAction, isPending] = useActionState(consentAction, initialState);
  const [agreed, setAgreed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="agreed" value={String(agreed)} />

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">
          プライバシーポリシーおよび利用規約を読み、内容に同意します
        </span>
      </label>

      {state.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {state.errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!agreed || isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "送信中..." : "同意して始める"}
      </button>
    </form>
  );
}
