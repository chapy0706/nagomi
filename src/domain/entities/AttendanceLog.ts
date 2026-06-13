export type LogSource = "explicit" | "inferred";

export class AttendanceLog {
  private constructor(
    readonly id: string,
    readonly employeeAuthId: string,
    readonly loggedInAt: Date,
    readonly loggedOutAt: Date | undefined,
    readonly source: LogSource
  ) {}

  /** 新規ログイン時に生成する。source は inferred を初期値とし、明示ログアウトで explicit へ更新される。 */
  static open(params: { id: string; employeeAuthId: string; loggedInAt: Date }): AttendanceLog {
    return new AttendanceLog(
      params.id,
      params.employeeAuthId,
      params.loggedInAt,
      undefined,
      "inferred"
    );
  }

  /** DB から復元する。 */
  static reconstruct(params: {
    id: string;
    employeeAuthId: string;
    loggedInAt: Date;
    loggedOutAt: Date | undefined;
    source: LogSource;
  }): AttendanceLog {
    return new AttendanceLog(
      params.id,
      params.employeeAuthId,
      params.loggedInAt,
      params.loggedOutAt,
      params.source
    );
  }

  isOpen(): boolean {
    return this.loggedOutAt === undefined;
  }

  /** セッション継続時間（ミリ秒）。未終了の場合は now までを計算する。 */
  durationMs(now: Date): number {
    const end = this.loggedOutAt ?? now;
    return Math.max(0, end.getTime() - this.loggedInAt.getTime());
  }
}
