import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getControlAdmin } from "@/lib/control-auth";
import { prisma } from "@/lib/prisma";
import { resolvePlanPrice, type SubscriptionPlanKey } from "@/config/subscription-plans";
import { MAX_DEVICE_LIMIT, MIN_DEVICE_LIMIT, isValidSubscriptionDuration } from "@/lib/subscription-rules";

const PLANS = new Set(Object.values(SubscriptionPlan));

function cleanText(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
}

export async function GET(request: Request) {
  if (!(await getControlAdmin(request))) return apiError("Unauthorized.", 401);

  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(10, Math.trunc(requestedLimit))) : 50;
    const cursor = url.searchParams.get("cursor") || undefined;
    const restaurants = await prisma.restaurant.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { users: { some: { email: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        users: {
          where: { role: "OWNER" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true, name: true, email: true, lastLoginAt: true, isActive: true },
        },
        subscriptions: {
          orderBy: { expiresAt: "desc" },
          take: 1,
          select: {
            id: true,
            plan: true,
            status: true,
            startsAt: true,
            expiresAt: true,
            maxDevices: true,
            priceAmount: true,
            currency: true,
          },
        },
        devices: {
          where: { status: "ACTIVE" },
          select: { id: true, name: true, status: true, appVersion: true, lastSeenAt: true },
        },
      },
    });

    const hasMore = restaurants.length > limit;
    const page = hasMore ? restaurants.slice(0, limit) : restaurants;
    return apiSuccess({ items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch (error) {
    console.error("CONTROL_RESTAURANTS_GET_ERROR", error);
    return apiError("Unable to load restaurants.", 500, { code: "INTERNAL_ERROR" });
  }
}

export async function PATCH(request: Request) {
  const admin = await getControlAdmin(request);
  if (!admin) return apiError("Unauthorized.", 401);

  try {
    const body = await request.json() as Record<string, unknown>;
    const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId.trim() : "";
    const action = typeof body.action === "string" ? body.action : body.maxDevices !== undefined ? "set_max_devices" : "";
    if (!restaurantId) return apiError("restaurantId is required.", 400, { code: "VALIDATION_ERROR" });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true, users: { where: { role: "OWNER" }, take: 1, select: { id: true } } },
    });
    if (!restaurant) return apiError("Restaurant not found.", 404, { code: "NOT_FOUND" });

    const subscription = await prisma.subscription.findFirst({
      where: { restaurantId },
      orderBy: { expiresAt: "desc" },
    });

    if (action === "set_max_devices") {
      if (!subscription) return apiError("Subscription not found.", 404, { code: "NOT_FOUND" });
      const maxDevices = Number(body.maxDevices);
      if (!Number.isInteger(maxDevices) || maxDevices < MIN_DEVICE_LIMIT || maxDevices > MAX_DEVICE_LIMIT) {
        return apiError(`maxDevices must be between ${MIN_DEVICE_LIMIT} and ${MAX_DEVICE_LIMIT}.`, 400, { code: "VALIDATION_ERROR" });
      }
      const activeDevices = await prisma.device.count({ where: { restaurantId, status: "ACTIVE" } });
      if (maxDevices < activeDevices) {
        return apiError(`Cannot set below the ${activeDevices} currently active devices.`, 409, { code: "DEVICE_LIMIT_CONFLICT" });
      }
      return apiSuccess(await prisma.subscription.update({
        where: { id: subscription.id },
        data: { maxDevices },
        select: { id: true, maxDevices: true, plan: true, status: true, expiresAt: true },
      }));
    }

    if (action === "renew") {
      if (!subscription) return apiError("Subscription not found.", 404, { code: "NOT_FOUND" });
      const months = Number(body.months);
      if (!Number.isInteger(months) || months < 1 || months > 36) {
        return apiError("Renewal months must be between 1 and 36.", 400, { code: "VALIDATION_ERROR" });
      }
      const requestedPlan = typeof body.plan === "string" ? body.plan.toUpperCase() : subscription.plan;
      if (!PLANS.has(requestedPlan as SubscriptionPlan)) return apiError("Invalid subscription plan.", 400);
      const plan = requestedPlan as SubscriptionPlanKey;
      if (!isValidSubscriptionDuration(plan, months)) {
        return apiError(plan === "CUSTOM" ? "Custom renewal duration must be between 1 and 36 months." : "Basic and Pro renewals are only available for 6 or 12 months.", 400, { code: "INVALID_DURATION" });
      }
      const customPrice = body.customPrice === undefined || body.customPrice === null || body.customPrice === "" ? undefined : Number(body.customPrice);
      const configuredPrice = resolvePlanPrice(plan, months, customPrice);
      if (configuredPrice === null) {
        return apiError("No price is configured for this plan/duration.", 400, { code: "INVALID_PLAN_PRICE" });
      }
      const priceAmount = configuredPrice;
      const base = subscription.expiresAt > new Date() ? new Date(subscription.expiresAt) : new Date();
      const expiresAt = new Date(base);
      expiresAt.setMonth(expiresAt.getMonth() + months);
      const maxDevices = body.maxDevices === undefined ? subscription.maxDevices : Number(body.maxDevices);
      if (!Number.isInteger(maxDevices) || maxDevices < MIN_DEVICE_LIMIT || maxDevices > MAX_DEVICE_LIMIT) return apiError(`maxDevices must be between ${MIN_DEVICE_LIMIT} and ${MAX_DEVICE_LIMIT}.`, 400);

      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: plan as SubscriptionPlan,
          status: SubscriptionStatus.ACTIVE,
          expiresAt,
          maxDevices,
          priceAmount,
          renewedAt: new Date(),
          renewalCount: { increment: 1 },
          previousExpiresAt: subscription.expiresAt,
          cancelledAt: null,
          cancelReason: null,
        },
        select: { id: true, plan: true, status: true, expiresAt: true, maxDevices: true, priceAmount: true, currency: true },
      });
      await prisma.$transaction([
        prisma.restaurant.update({ where: { id: restaurantId }, data: { isActive: true } }),
        prisma.user.updateMany({ where: { restaurantId }, data: { isActive: true } }),
      ]);
      return apiSuccess(updated);
    }

    if (["suspend", "activate", "cancel"].includes(action)) {
      if (!subscription) return apiError("Subscription not found.", 404, { code: "NOT_FOUND" });
      if (action === "activate" && subscription.expiresAt <= new Date()) {
        return apiError("Expired subscriptions must be renewed before activation.", 409, { code: "SUBSCRIPTION_EXPIRED" });
      }
      const status = action === "suspend"
        ? SubscriptionStatus.SUSPENDED
        : action === "cancel"
          ? SubscriptionStatus.CANCELLED
          : SubscriptionStatus.ACTIVE;
      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status,
            cancelledAt: status === SubscriptionStatus.CANCELLED ? now : null,
            cancelReason: status === SubscriptionStatus.CANCELLED ? (cleanText(body.reason, 500) ?? "Cancelled by control admin") : null,
          },
          select: { id: true, plan: true, status: true, expiresAt: true, maxDevices: true },
        });
        if (status === SubscriptionStatus.ACTIVE) {
          await tx.restaurant.update({ where: { id: restaurantId }, data: { isActive: true } });
          await tx.user.updateMany({ where: { restaurantId }, data: { isActive: true } });
        } else {
          await tx.restaurant.update({ where: { id: restaurantId }, data: { isActive: false } });
          await tx.user.updateMany({ where: { restaurantId }, data: { isActive: false } });
          await tx.device.updateMany({ where: { restaurantId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: now } });
        }
        return next;
      });
      return apiSuccess(updated);
    }

    if (action === "set_account_active") {
      if (typeof body.isActive !== "boolean") return apiError("isActive must be boolean.", 400);
      const now = new Date();
      if (body.isActive) {
        if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE || subscription.expiresAt <= now) {
          return apiError("An active, unexpired subscription is required before enabling the account.", 409, { code: "SUBSCRIPTION_REQUIRED" });
        }
        const updated = await prisma.$transaction(async (tx) => {
          const result = await tx.restaurant.update({ where: { id: restaurantId }, data: { isActive: true }, select: { id: true, name: true, isActive: true } });
          await tx.user.updateMany({ where: { restaurantId }, data: { isActive: true } });
          return result;
        });
        return apiSuccess(updated);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.restaurant.update({ where: { id: restaurantId }, data: { isActive: false }, select: { id: true, name: true, isActive: true } });
        await tx.user.updateMany({ where: { restaurantId }, data: { isActive: false } });
        await tx.device.updateMany({ where: { restaurantId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: now } });
        return result;
      });
      return apiSuccess(updated);
    }

    if (action === "update_contact") {
      const name = cleanText(body.name, 120);
      const email = cleanText(body.email, 254)?.toLowerCase() ?? null;
      const phone = cleanText(body.phone, 30);
      const address = cleanText(body.address, 500);
      const ownerName = cleanText(body.ownerName, 100);
      if (!name) return apiError("Restaurant name is required.", 400);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Invalid email.", 400);
      const ownerId = restaurant.users[0]?.id;
      const [updated] = await prisma.$transaction([
        prisma.restaurant.update({ where: { id: restaurantId }, data: { name, email, phone, address } }),
        ...(ownerId && ownerName ? [prisma.user.update({ where: { id: ownerId }, data: { name: ownerName } })] : []),
      ]);
      return apiSuccess({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, address: updated.address });
    }

    return apiError("Unsupported restaurant action.", 400, { code: "VALIDATION_ERROR" });
  } catch (error) {
    console.error("CONTROL_RESTAURANTS_PATCH_ERROR", error);
    return apiError("Unable to update subscriber.", 500, { code: "INTERNAL_ERROR" });
  }
}
