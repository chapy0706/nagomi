"use client";

import { useActionState } from "react";
import { type ChangePinState, changePinAction } from "./actions";

const initialState: ChangePinState = { errorMessage: undefined };

export function ChangePinForm() {
  const [state, formAction, isPending] = useActionState(changePinAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="currentPin" className="text-sm font-medium text-gray-700">
          現在のPIN
        </label>
        <input
          id="currentPin"
          name="currentPin"
          type="password"
          inputMode="numeric"
          required
          placeholder="••••••"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="newPin" className="text-sm font-medium text-gray-700">
          新しいPIN（6桁以上の数字）
        </label>
        <input
          id="newPin"
          name="newPin"
          type="password"
          inputMode="numeric"
          minLength={6}
          required
          placeholder="••••••"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPin" className="text-sm font-medium text-gray-700">
          新しいPIN（確認）
        </label>
        <input
          id="confirmPin"
          name="confirmPin"
          type="password"
          inputMode="numeric"
          minLength={6}
          required
          placeholder="••••••"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {state.errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "設定中..." : "PINを設定する"}
      </button>
    </form>
  );
}
