"use client";

import { useState, useTransition } from "react";
import { SessionSurveyModal } from "@/app/_components/SessionSurveyModal";
import { shouldShowSessionSurvey } from "@/app/_lib/surveySchedule";
import { logoutAction } from "@/app/actions/logout";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const [showSurvey, setShowSurvey] = useState(false);

  function handleClick() {
    if (shouldShowSessionSurvey()) {
      setShowSurvey(true);
    } else {
      startTransition(() => logoutAction());
    }
  }

  function handleSurveyClose() {
    setShowSurvey(false);
    startTransition(() => logoutAction());
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "ログアウト中..." : "ログアウト"}
      </button>
      {showSurvey && <SessionSurveyModal onClose={handleSurveyClose} />}
    </>
  );
}
