"use client";

import { useActionState, useEffect, useRef } from "react";
import { AvatarImage } from "@/app/_components/AvatarImage";
import type { ReportTarget } from "@/app/_stores/reportStore";
import { submitReportAction } from "@/app/actions/report";
import { REPORT_CATEGORIES, type ReportCategory } from "@/src/domain/entities/Report";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  harassment: "ハラスメント",
  inappropriate_speech: "不適切な発言",
  rule_violation: "規約違反",
  other: "その他",
};

const MAX_CONTENT = 2000;

const INITIAL_STATE = { success: undefined, errorMessage: undefined };

type Props = {
  target: ReportTarget;
  onClose: () => void;
};

export function ReportModal({ target, onClose }: Props) {
  const [state, formAction, isPending] = useActionState(submitReportAction, INITIAL_STATE);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.success) {
      const timer = window.setTimeout(onClose, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="通報モーダルを閉じる"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${target.displayName} を通報`}
        className="relative bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col gap-4"
      >
        {state.success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm font-medium text-gray-700 text-center">
              通報を受け付けました。
              <br />
              ご報告ありがとうございます。
            </p>
            <p className="text-xs text-gray-400 text-center">対象者には通知されません。</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <AvatarImage
                displayName={target.displayName}
                avatarUrl={target.avatarUrl}
                seed={target.authUserId}
                size={48}
              />
              <p className="text-sm font-semibold text-gray-900">{target.displayName}</p>
              <p className="text-xs text-gray-500">を通報する</p>
            </div>

            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="reportedAuthUserId" value={target.authUserId} />

              <fieldset>
                <legend className="text-xs text-gray-500 mb-2">カテゴリ</legend>
                <div className="flex flex-wrap gap-2">
                  {REPORT_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={cat}
                        defaultChecked={cat === "other"}
                        required
                        className="accent-indigo-500"
                      />
                      <span className="text-xs text-gray-700">{CATEGORY_LABELS[cat]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="report-content" className="text-xs text-gray-500 block mb-1">
                  内容
                </label>
                <textarea
                  id="report-content"
                  ref={textareaRef}
                  name="content"
                  rows={4}
                  maxLength={MAX_CONTENT}
                  required
                  placeholder="具体的な状況を教えてください（任意）"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  onChange={(e) => {
                    const remaining = MAX_CONTENT - e.target.value.length;
                    const hint = e.target.nextElementSibling;
                    if (hint) hint.textContent = `残り ${remaining} 文字`;
                  }}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">残り {MAX_CONTENT} 文字</p>
              </div>

              {state.errorMessage && (
                <p className="text-xs text-red-600 text-center">{state.errorMessage}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                  onClick={onClose}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isPending ? "送信中..." : "通報する"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
