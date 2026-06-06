import type { Clock } from "@/src/domain/ports/Clock";

export type ExpirableInvitation = {
  readonly expiresAt: Date;
};

/**
 * クライアント側で保持している招待のうち、有効期限切れのものを判定する。
 * サーバ側の status は変更しない（issue-15: 失効はクライアント側のタイマーで管理）。
 */
export class ExpireStaleInvitations {
  constructor(private readonly clock: Clock) {}

  isExpired(invitation: ExpirableInvitation): boolean {
    return this.clock.now() >= invitation.expiresAt;
  }

  partition<T extends ExpirableInvitation>(
    invitations: ReadonlyArray<T>
  ): { active: T[]; expired: T[] } {
    const now = this.clock.now();
    const active: T[] = [];
    const expired: T[] = [];
    for (const invitation of invitations) {
      if (now >= invitation.expiresAt) {
        expired.push(invitation);
      } else {
        active.push(invitation);
      }
    }
    return { active, expired };
  }
}
