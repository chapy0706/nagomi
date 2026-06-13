"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { completeTutorialAction } from "@/app/onboarding/tutorial/actions";

type Step = {
  title: string;
  body: string[];
  icon: string;
};

const STEPS: Step[] = [
  {
    title: "nagomi（和み）へようこそ",
    icon: "🌿",
    body: [
      "nagomiは派遣社員のための仮想オフィスです。業務終わりや休日にふらっと立ち寄れる、あなたの居場所を目指しています。",
      "大切なこと：無理に通話しなくていい。ただいるだけでも大丈夫です。",
    ],
  },
  {
    title: "フロアを歩き回ろう",
    icon: "🗺️",
    body: [
      "フロアをクリック（またはタップ）すると、アバターが移動します。矢印キーでも移動できます。",
      "会議室をクリックするとロビーが開きます。入室して通話を始められます。通話トピックはカジュアル・相談・業務連絡の3種類です。",
    ],
  },
  {
    title: "気が向かない時は断ってOK",
    icon: "🛡️",
    body: [
      "上部のステータスを「取り込み中」に切り替えると、通話の誘いが届きにくくなります。",
      "誘いが来ても「断る」ボタンで断れます。断ることは正しい使い方です。遠慮しないでください。",
    ],
  },
  {
    title: "安心して使うために",
    icon: "🤝",
    body: [
      "不快な相手はブロックできます。ブロックすると相手のアバターが見えなくなり、互いに通話できなくなります。",
      "深刻なルール違反は通報機能を使ってください。通報者の情報は保護されます。あなたの安心が最優先です。",
    ],
  },
];

type Props = {
  isFirstTime: boolean;
};

export function TutorialStepper({ isFirstTime }: Props) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleFinish = useCallback(() => {
    if (isFirstTime) {
      startTransition(() => completeTutorialAction());
    } else {
      window.location.href = "/";
    }
  }, [isFirstTime]);

  useEffect(() => {
    const el = dialogRef.current;
    if (el) el.focus();

    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          setStep((s) => Math.min(s + 1, STEPS.length - 1));
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setStep((s) => Math.max(s - 1, 0));
          break;
        case "Escape":
          e.preventDefault();
          handleFinish();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFinish]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-emerald-50 px-4 py-12">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`チュートリアル ステップ ${step + 1} / ${STEPS.length}: ${current.title}`}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 flex flex-col gap-6 outline-none"
      >
        {/* ステップインジケーター */}
        <div className="flex justify-center gap-2" aria-hidden="true">
          {STEPS.map((s, idx) => (
            <div
              key={s.title}
              className={[
                "h-1.5 rounded-full transition-all",
                idx === step ? "w-8 bg-indigo-500" : "w-3 bg-gray-200",
              ].join(" ")}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl" role="img" aria-hidden="true">
            {current.icon}
          </span>
          <h1 className="text-xl font-bold text-gray-900">{current.title}</h1>
          <div className="flex flex-col gap-3">
            {current.body.map((line, i) => (
              <p
                key={line}
                className={[
                  "text-sm leading-relaxed text-gray-700",
                  i === 1 ? "font-medium text-indigo-700 bg-indigo-50 rounded-lg px-4 py-2" : "",
                ].join(" ")}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* ナビゲーション */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              aria-label="前のステップへ"
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 戻る
            </button>
            {isLast ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleFinish}
                className="flex-1 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "始める →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                aria-label="次のステップへ"
                className="flex-1 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
              >
                次へ →
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleFinish}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            スキップ（後でヘルプメニューから確認できます）
          </button>
        </div>
      </div>
    </div>
  );
}
