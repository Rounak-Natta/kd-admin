import { apiError, apiSuccess } from "@/lib/api-response";
import { getControlAdmin } from "@/lib/control-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await getControlAdmin(request))) return apiError("Unauthorized.", 401, { code: "UNAUTHORIZED" });
  try {
    const now = new Date();
    const [restaurants, activeSubscriptions, activeDevices, failedSync, errors, expiring] = await Promise.all([
      prisma.restaurant.count(),
      prisma.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
      prisma.device.count({ where: { status: "ACTIVE" } }),
      prisma.syncOperation.count({ where: { status: { in: ["FAILED", "CONFLICT"] } } }),
      prisma.systemEvent.count({ where: { severity: "ERROR", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      prisma.subscription.count({ where: { expiresAt: { gt: now, lte: new Date(Date.now() + 30 * 86_400_000) }, status: "ACTIVE" } }),
    ]);
    return apiSuccess({ restaurants, activeSubscriptions, activeDevices, failedSync, errorsLast24h: errors, expiringNext30Days: expiring, generatedAt: now.toISOString() });
  } catch {
    return apiError("Unable to load control overview.", 500, { code: "INTERNAL_ERROR" });
  }
}
