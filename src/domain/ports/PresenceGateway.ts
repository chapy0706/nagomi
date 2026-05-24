export type PresenceStatus = "active" | "away" | "busy";

export type PresencePayload = {
  readonly employeeId: string;
  readonly displayName: string;
  readonly avatarUrl: string | undefined;
  readonly x: number;
  readonly y: number;
  readonly status: PresenceStatus;
};

export type PresenceHandlers = {
  readonly onSync: (presences: ReadonlyArray<PresencePayload>) => void;
  readonly onJoin: (presence: PresencePayload) => void;
  readonly onLeave: (employeeId: string) => void;
};

export type PresenceGateway = {
  join(payload: PresencePayload, handlers: PresenceHandlers): Promise<void>;
  leave(): Promise<void>;
};
