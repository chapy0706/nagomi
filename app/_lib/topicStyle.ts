import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

/**
 * トピック種別の表示情報。domain ではなく presentation の責務として持つ。
 */
export const TOPIC_LABELS: Record<CallTopicKind, string> = {
  counseling: "悩み相談",
  casual: "雑談",
  meeting: "面談",
};

export const TOPIC_ROOM_LABELS: Record<CallTopicKind, string> = {
  counseling: "相談室",
  casual: "雑談室",
  meeting: "会議室",
};

export const TOPIC_BUTTON_LABELS: Record<CallTopicKind, string> = {
  counseling: "相談",
  casual: "雑談",
  meeting: "打ち合わせ",
};

export const TOPIC_COLORS: Record<CallTopicKind, { container: string; chip: string; dot: string }> =
  {
    counseling: {
      container: "bg-indigo-100 border-indigo-400 text-indigo-800",
      chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-500",
    },
    casual: {
      container: "bg-green-100 border-green-400 text-green-800",
      chip: "bg-green-50 text-green-700 border-green-200",
      dot: "bg-green-500",
    },
    meeting: {
      container: "bg-blue-100 border-blue-400 text-blue-800",
      chip: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
  };

export const TOPIC_ICONS: Record<CallTopicKind, string> = {
  counseling: "💬",
  casual: "☕",
  meeting: "📋",
};
