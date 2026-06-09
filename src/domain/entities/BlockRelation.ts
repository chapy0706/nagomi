export class BlockRelation {
  private constructor(
    readonly id: string,
    readonly blockerAuthId: string,
    readonly blockedAuthId: string,
    readonly createdAt: Date
  ) {}

  static create(params: {
    id: string;
    blockerAuthId: string;
    blockedAuthId: string;
    createdAt: Date;
  }): BlockRelation {
    if (params.blockerAuthId === params.blockedAuthId) {
      throw new Error("自分自身はブロックできません");
    }
    return new BlockRelation(
      params.id,
      params.blockerAuthId,
      params.blockedAuthId,
      params.createdAt
    );
  }
}
