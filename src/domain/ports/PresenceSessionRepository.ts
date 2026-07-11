/// WebSocket 接続の在室証跡（presence_sessions）を記録するポート。
///
/// 追記のみ（append-only）。終了時刻（disconnected_at）の確定更新だけを例外的に許す。
/// 個人特定情報は auth_user_id（Keアカウント sub）のみで、業務勤怠とは分離する。

export type PresenceSessionRepository = {
  /// 接続確立を記録する（新規セッション行を作る）。
  recordConnected(input: { employeeAuthId: string; connectionId: string }): Promise<void>;

  /// 接続終了を記録する。開いているセッションの disconnected_at のみを確定する。
  recordDisconnected(connectionId: string, disconnectedAt: Date): Promise<void>;
};
