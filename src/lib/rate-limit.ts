import { prisma } from "@/lib/prisma";

type RateLimitInput = {
  action: string;
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - input.windowMs);
  const blockMs = input.blockMs ?? input.windowMs;

  const result = await prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({
      where: {
        action_key: {
          action: input.action,
          key: input.key,
        },
      },
    });

    if (!bucket) {
      await tx.rateLimitBucket.create({
        data: {
          action: input.action,
          key: input.key,
          count: 1,
          windowStart: now,
        },
      });

      return {
        allowed: true,
        remaining: Math.max(input.limit - 1, 0),
        retryAfterMs: 0,
      };
    }

    if (bucket.blockedUntil && bucket.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: bucket.blockedUntil.getTime() - now.getTime(),
      };
    }

    if (bucket.windowStart < windowStart) {
      await tx.rateLimitBucket.update({
        where: { id: bucket.id },
        data: {
          count: 1,
          windowStart: now,
          blockedUntil: null,
        },
      });

      return {
        allowed: true,
        remaining: Math.max(input.limit - 1, 0),
        retryAfterMs: 0,
      };
    }

    const nextCount = bucket.count + 1;
    const blockedUntil = nextCount > input.limit ? new Date(now.getTime() + blockMs) : null;

    await tx.rateLimitBucket.update({
      where: { id: bucket.id },
      data: {
        count: nextCount,
        blockedUntil,
      },
    });

    return {
      allowed: nextCount <= input.limit,
      remaining: Math.max(input.limit - nextCount, 0),
      retryAfterMs: blockedUntil ? blockedUntil.getTime() - now.getTime() : 0,
    };
  });

  return result;
}

export async function purgeExpiredRateLimits() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2);

  await prisma.rateLimitBucket.deleteMany({
    where: {
      AND: [
        {
          OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
        },
        {
          updatedAt: { lt: staleBefore },
        },
      ],
    },
  });
}

export async function clearRateLimit(action: string, key: string) {
  await prisma.rateLimitBucket.deleteMany({
    where: {
      action,
      key,
    },
  });
}
