import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RateLimitResult { allowed: boolean; remaining: number; resetAt: number; }
const storageKey = (key: string) => crypto.createHash("sha256").update(key, "utf8").digest("hex");
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date(); const nextReset = new Date(now.getTime() + windowMs); const hashedKey = storageKey(key);
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt") VALUES (${hashedKey}, 1, ${nextReset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END, "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset} ELSE "RateLimitBucket"."resetAt" END, "updatedAt" = ${now}
    RETURNING "count", "resetAt"`);
  const bucket = rows[0] ?? { count: 1, resetAt: nextReset };
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt.getTime() };
}
