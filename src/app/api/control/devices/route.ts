import { apiError, apiSuccess } from "@/lib/api-response";
import { getControlAdmin } from "@/lib/control-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await getControlAdmin(request))) return apiError("Unauthorized.", 401);
  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(10, Math.trunc(requestedLimit))) : 50;
    const cursor = url.searchParams.get("cursor") || undefined;
    const devices = await prisma.device.findMany({
      orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, name: true, status: true, lastSeenAt: true, activatedAt: true,
        revokedAt: true, appVersion: true, syncProtocolVersion: true,
        restaurant: { select: { id: true, name: true } },
        _count: { select: { syncOperations: true } },
      },
    });
    const hasMore = devices.length > limit;
    const page = hasMore ? devices.slice(0, limit) : devices;
    return apiSuccess({ items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch {
    return apiError("Unable to load devices.", 500, { code: "INTERNAL_ERROR" });
  }
}

export async function PATCH(request: Request) {
  if (!(await getControlAdmin(request))) return apiError("Unauthorized.", 401);
  try {
    const body = await request.json() as { deviceId?: unknown; action?: unknown };
    if (typeof body.deviceId !== "string" || !body.deviceId) return apiError("deviceId is required.", 400);
    if (body.action !== "revoke" && body.action !== "activate") return apiError("Unsupported device action.", 400);

    const device = await prisma.device.findUnique({
      where: { id: body.deviceId },
      select: { id: true, restaurantId: true, status: true },
    });
    if (!device) return apiError("Device not found.", 404);

    if (body.action === "activate") {
      const subscription = await prisma.subscription.findFirst({
        where: { restaurantId: device.restaurantId, status: "ACTIVE", expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "desc" },
        select: { maxDevices: true },
      });
      if (!subscription) return apiError("Restaurant has no active subscription.", 409);

      const active = await prisma.device.count({
        where: { restaurantId: device.restaurantId, status: "ACTIVE", id: { not: device.id } },
      });
      if (active >= subscription.maxDevices) {
        return apiError(`Device limit reached (${subscription.maxDevices}).`, 409, { code: "DEVICE_LIMIT_REACHED" });
      }
    }

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: body.action === "revoke"
        ? { status: "REVOKED", revokedAt: new Date() }
        : { status: "ACTIVE", revokedAt: null, lastSeenAt: new Date() },
      select: { id: true, status: true, revokedAt: true },
    });

    return apiSuccess(updated);
  } catch {
    return apiError("Unable to update device.", 500, { code: "INTERNAL_ERROR" });
  }
}
