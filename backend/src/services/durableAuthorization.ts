import { prisma, withPersonalSession } from "../db.js";

type DurableAuthorization = {
  authorizationVersion: number;
  userId: string;
};

export async function currentDurableAuthorization(userId: string): Promise<DurableAuthorization> {
  const user = await withPersonalSession(prisma, {
    actionReason: "authorization.deferred.validate",
    authSubject: userId
  }, (transaction) => transaction.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      internalAccess: true,
      sessionVersion: true
    }
  }));

  if (!user || !user.internalAccess) {
    throw new Error("Internal authorization is no longer active for this deferred operation.");
  }

  return {
    authorizationVersion: user.sessionVersion,
    userId: user.id
  };
}

export async function assertDurableAuthorization(input: DurableAuthorization): Promise<void> {
  const current = await currentDurableAuthorization(input.userId);

  if (current.authorizationVersion !== input.authorizationVersion) {
    throw new Error("Deferred operation authorization is stale and must be explicitly re-authorized.");
  }
}
