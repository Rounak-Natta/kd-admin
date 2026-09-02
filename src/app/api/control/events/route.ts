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
    const events = await prisma.systemEvent.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, createdAt: true, severity: true, source: true, message: true, requestId: true },
    });
    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    return apiSuccess({ items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch {
    return apiError("Unable to load system events.", 500, { code: "INTERNAL_ERROR" });
  }
}
