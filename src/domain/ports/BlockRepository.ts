export type BlockRepository = {
  isBlocked(inviterAuthId: string, inviteeAuthId: string): Promise<boolean>;
};
