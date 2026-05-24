"use client";

import { useActionState } from "react";
import { type LoginState, loginAction } from "./actions";

const initialState: LoginState = { errorMessage: undefined };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="employeeId" className="text-sm font-medium text-gray-700">
          社員ID
        </label>
        <input
          id="employeeId"
          name="employeeId"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{9}"
          maxLength={9}
          required
          placeholder="000000000"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="text-sm font-medium text-gray-700">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
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
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
