/// satisfaction アクションの状態型と初期値。
///
/// "use server" ファイル（satisfaction.ts）は async 関数以外を export できないため
/// （Next.js の Server Actions 制約）、値の定数・型はこの通常モジュールに分離する。
/// Client Component はここから初期値を import する。

export type SatisfactionActionState = {
  success: boolean | undefined;
  errorMessage: string | undefined;
};

export const SATISFACTION_INITIAL_STATE: SatisfactionActionState = {
  success: undefined,
  errorMessage: undefined,
};
