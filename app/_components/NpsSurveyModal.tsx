"use client";

import { useActionState, useEffect, useState } from "react";
import { markNpsSurveyShown } from "@/app/_lib/surveySchedule";
import { submitSatisfactionAction } from "@/app/actions/satisfaction";
import { SATISFACTION_INITIAL_STATE } from "@/app/actions/satisfactionState";

type Props = {
  onClose: () => void;
};

export function NpsSurveyModal({ onClose }: Props) {
  const [state, formAction, isPending] = useActionState(
    submitSatisfactionAction,
    SATISFACTION_INITIAL_STATE
  );
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (state.success) {
      markNpsSurveyShown();
      const timer = window.setTimeout(onClose, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [state.success, onClose]);

  function handleSkip() {
    markNpsSurveyShown();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={handleSkip}
        aria-label="アンケートを閉じる"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="nagomiをおすすめしますか？"
        className="relative bg-white rounded-2xl shadow-xl w-96 p-6 flex flex-col gap-4"
      >
        {state.success ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm font-medium text-gray-700 text-center">
              ご回答ありがとうございました！
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-gray-900 text-center">
                nagomiを同僚にすすめる可能性はどのくらいですか？
              </p>
              <p className="text-xs text-gray-400">匿名で送信されます</p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="type" value="nps" />
              <input type="hidden" name="npsScore" value={selected ?? ""} />

              <div className="flex flex-col gap-1">
                <div className="flex justify-between gap-1">
                  {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((score) => (
                    <button
                      key={score}
                      type="button"
                      aria-label={`${score}点`}
                      onClick={() => setSelected(score)}
                      className={[
                        "w-7 h-7 rounded text-xs font-medium transition-colors",
                        selected === score
                          ? "bg-indigo-500 text-white"
                          : score <= 6
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : score <= 8
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200",
                      ].join(" ")}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>すすめない</span>
                  <span>すすめる</span>
                </div>
              </div>

              <div>
                <label htmlFor="nps-comment" className="text-xs text-gray-500 block mb-1">
                  コメント（任意・300文字以内）
                </label>
                <textarea
                  id="nps-comment"
                  name="comment"
                  rows={3}
                  maxLength={300}
                  placeholder="ご感想をお聞かせください"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {state.errorMessage && (
                <p className="text-xs text-red-600 text-center">{state.errorMessage}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                  onClick={handleSkip}
                >
                  スキップ
                </button>
                <button
                  type="submit"
                  disabled={isPending || selected === undefined}
                  className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {isPending ? "送信中..." : "送信する"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
