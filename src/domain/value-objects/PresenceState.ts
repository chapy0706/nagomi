import type { ManualStatus, PresenceStatus } from "@/src/domain/ports/PresenceGateway";

export class PresenceState {
  private constructor(
    readonly manualStatus: ManualStatus,
    private readonly _isInCall: boolean
  ) {}

  static of(manual: ManualStatus): PresenceState {
    return new PresenceState(manual, false);
  }

  get effectiveStatus(): PresenceStatus {
    return this._isInCall ? "in_call" : this.manualStatus;
  }

  get isInCall(): boolean {
    return this._isInCall;
  }

  withManualStatus(manual: ManualStatus): PresenceState {
    return new PresenceState(manual, this._isInCall);
  }

  enterCall(): PresenceState {
    return new PresenceState(this.manualStatus, true);
  }

  exitCall(): PresenceState {
    return new PresenceState(this.manualStatus, false);
  }

  isCallable(): boolean {
    return !this._isInCall && this.manualStatus !== "busy";
  }
}
