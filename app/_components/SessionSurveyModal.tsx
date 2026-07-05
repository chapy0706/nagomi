"use client";

import { useActionState, useEffect, useState } from "react";
import { markSessionSurveyShown } from "@/app/_lib/surveySchedule";
import { submitSatisfactionAction } from "@/app/actions/satisfaction";
import { SATISFACTION_INITIAL_STATE } from "@/app/actions/satisfactionState";

type Props = {
  onClose: () => void;
};

const STAR_LABELS = ["とても不満", "不満", "普通", "満足", "とても満足"];

export function SessionSurveyModal({ onClose }: Props) {
  const [state, formAction, isPending] = useActionState(
    submitSatisfactionAction,
    SATISFACTION_INITIAL_STATE
  );
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (state.success) {
      markSessionSurveyShown();
      const timer = window.setTimeout(onClose, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [state.success, onClose]);

  function handleSkip() {
    markSessionSurveyShown();
    onClose();
  }

  const display = hovered || selected;

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
        aria-label="今回のセッションはいかがでしたか？"
        className="relative bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col gap-4"
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
              <p className="text-sm font-semibold text-gray-900">
                今回のセッションはいかがでしたか？
              </p>
              <p className="text-xs text-gray-400">匿名で送信されます</p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="type" value="session" />
              <input type="hidden" name="rating" value={selected || ""} />

              {/* biome-ignore lint/a11y/noStaticElementInteractions: onMouseLeave は視覚的ホバー解除のみで、操作はすべて子 button が担う */}
              <div className="flex justify-center gap-2" onMouseLeave={() => setHovered(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={STAR_LABELS[n - 1]}
                    className="text-3xl transition-transform hover:scale-110"
                    onMouseEnter={() => setHovered(n)}
                    onClick={() => setSelected(n)}
                  >
                    <span className={n <= display ? "text-yellow-400" : "text-gray-200"}>★</span>
                  </button>
                ))}
              </div>

              {display > 0 && (
                <p className="text-xs text-gray-500 text-center">{STAR_LABELS[display - 1]}</p>
              )}

              <div>
                <label htmlFor="session-comment" className="text-xs text-gray-500 block mb-1">
                  コメント（任意・300文字以内）
                </label>
                <textarea
                  id="session-comment"
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
                  disabled={isPending || selected === 0}
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
