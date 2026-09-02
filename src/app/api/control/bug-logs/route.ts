import { apiError, apiSuccess } from "@/lib/api-response";
import { getControlAdmin } from "@/lib/control-auth";
import { prisma } from "@/lib/prisma";

function metadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

export async function GET(request: Request) {
  if (!(await getControlAdmin(request))) {
    return apiError("Unauthorized.", 401);
  }

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(500, Math.max(25, Math.trunc(requestedLimit)))
      : 200;
    const cursor = url.searchParams.get("cursor") || undefined;

    const events = await prisma.systemEvent.findMany({
      where: {
        source: { startsWith: "USER_BUG_" },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        createdAt: true,
        severity: true,
        source: true,
        message: true,
        requestId: true,
        restaurantId: true,
        deviceId: true,
        metadata: true,
      },
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    const restaurantIds = Array.from(
      new Set(page.map((event) => event.restaurantId).filter((id): id is string => Boolean(id))),
    );
    const deviceIds = Array.from(
      new Set(page.map((event) => event.deviceId).filter((id): id is string => Boolean(id))),
    );
    const userIds = Array.from(
      new Set(
        page
          .map((event) => metadataString(event.metadata, "userId"))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [restaurants, devices, users] = await Promise.all([
      restaurantIds.length
        ? prisma.restaurant.findMany({
            where: { id: { in: restaurantIds } },
            select: { id: true, name: true },
          })
        : [],
      deviceIds.length
        ? prisma.device.findMany({
            where: { id: { in: deviceIds } },
            select: { id: true, name: true, appVersion: true, status: true },
          })
        : [],
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, role: true },
          })
        : [],
    ]);

    const restaurantById = new Map(restaurants.map((item) => [item.id, item]));
    const deviceById = new Map(devices.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    const items = page.map((event) => {
      const userId = metadataString(event.metadata, "userId");
      return {
        ...event,
        restaurant: event.restaurantId
          ? restaurantById.get(event.restaurantId) ?? null
          : null,
        device: event.deviceId ? deviceById.get(event.deviceId) ?? null : null,
        user: userId ? userById.get(userId) ?? null : null,
      };
    });

    return apiSuccess({
      items,
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  } catch (error: unknown) {
    console.error("CONTROL_BUG_LOGS_ERROR", error);
    return apiError("Unable to load user bug logs.", 500, {
      code: "INTERNAL_ERROR",
    });
  }
}
