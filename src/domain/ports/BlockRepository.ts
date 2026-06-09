export type BlockedEmployeeSummary = {
  blockedAuthId: string;
  displayName: string;
  avatarUrl: string | undefined;
  blockedAt: Date;
};

export type BlockRepository = {
  /** blockerAuthId が blockedAuthId をブロックしているか */
  isBlocked(blockerAuthId: string, blockedAuthId: string): Promise<boolean>;
  block(blockerAuthId: string, blockedAuthId: string): Promise<void>;
  unblock(blockerAuthId: string, blockedAuthId: string): Promise<void>;
  findBlockedAuthIds(blockerAuthId: string): Promise<string[]>;
  findBlockedSummaries(blockerAuthId: string): Promise<BlockedEmployeeSummary[]>;
};
