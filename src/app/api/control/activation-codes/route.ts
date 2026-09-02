import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getControlAdmin } from "@/lib/control-auth";
import { generateActivationCode } from "@/lib/activation-code";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_DEVICE_LIMIT, MIN_DEVICE_LIMIT, isValidSubscriptionDuration } from "@/lib/subscription-rules";
import {
  resolvePlanPrice,
  type SubscriptionPlanKey,
} from "@/config/subscription-plans";

const VALID_PLANS = ["BASIC", "PRO", "CUSTOM"] as const;
type ActivationPlan = (typeof VALID_PLANS)[number];

type CreateActivationCodeBody = {
  plan?: unknown;
  durationMonths?: unknown;
  expiresAt?: unknown;
  restaurantId?: unknown;
  maxDevices?: unknown;
  customPrice?: unknown;
  restaurantName?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  password?: unknown;
  notes?: unknown;
};

function isValidPlan(value: string): value is ActivationPlan {
  return VALID_PLANS.includes(value as ActivationPlan);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s().-]{5,28}[0-9]$/.test(value);
}


export async function GET(request: Request) {
  const admin = await getControlAdmin(request);
  if (!admin) return apiError("Unauthorized.", 401);

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(10, Math.trunc(requestedLimit))) : 50;
    const cursor = url.searchParams.get("cursor") || undefined;
    const rows = await prisma.activationCode.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        plan: true,
        durationMonths: true,
        maxDevices: true,
        priceAmount: true,
        currency: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        restaurantName: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        notes: true,
        restaurant: { select: { name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return apiSuccess({ items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch (error) {
    console.error("CONTROL_ACTIVATION_CODES_GET_ERROR", error);
    return apiError("Unable to load activation codes.", 500, { code: "INTERNAL_ERROR" });
  }
}

export async function POST(request: Request) {
  const admin = await getControlAdmin(request);
  if (!admin) return apiError("Unauthorized.", 401);

  const limit = await rateLimit(`control-code:${admin.id}`, 30, 60 * 60_000);
  if (!limit.allowed) {
    return apiError("Too many subscription creations. Try again later.", 429, { code: "RATE_LIMITED" });
  }

  try {
    const body = (await request.json()) as CreateActivationCodeBody;
    const planValue = typeof body.plan === "string" ? body.plan.toUpperCase() : "";
    if (!isValidPlan(planValue)) {
      return apiError("Plan must be BASIC, PRO, or CUSTOM.", 400, { code: "VALIDATION_ERROR" });
    }

    const restaurantName = text(body.restaurantName);
    const customerName = text(body.customerName);
    const customerEmail = text(body.customerEmail).toLowerCase();
    const customerPhone = text(body.customerPhone);
    const password = typeof body.password === "string" ? body.password : "";
    const notes = text(body.notes);

    if (restaurantName.length < 2 || restaurantName.length > 120) {
      return apiError("Restaurant name is required (2–120 characters).", 400, { code: "VALIDATION_ERROR" });
    }
    if (customerName.length < 2 || customerName.length > 80) {
      return apiError("Customer name is required (2–80 characters).", 400, { code: "VALIDATION_ERROR" });
    }
    if (!validEmail(customerEmail) || customerEmail.length > 254) {
      return apiError("A valid customer email is required.", 400, { code: "VALIDATION_ERROR" });
    }
    if (!validPhone(customerPhone)) {
      return apiError("A valid customer phone number is required.", 400, { code: "VALIDATION_ERROR" });
    }
    if (notes.length > 500) {
      return apiError("Notes must be 500 characters or less.", 400, { code: "VALIDATION_ERROR" });
    }

    const plan: SubscriptionPlanKey = planValue;
    const durationMonths = Number(body.durationMonths);
    const maxDevices = Number(body.maxDevices ?? 1);
    const customPrice =
      body.customPrice === undefined || body.customPrice === null || body.customPrice === ""
        ? undefined
        : Number(body.customPrice);

    const requestedExpiry =
      typeof body.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt) : null;

    if (requestedExpiry && Number.isNaN(requestedExpiry.getTime())) {
      return apiError("expiresAt must be a valid date.", 400, { code: "VALIDATION_ERROR" });
    }
    if (requestedExpiry && requestedExpiry <= new Date()) {
      return apiError("expiresAt must be in the future.", 400, { code: "VALIDATION_ERROR" });
    }
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 36) {
      return apiError("Duration must be between 1 and 36 months.", 400, { code: "VALIDATION_ERROR" });
    }
    if (!isValidSubscriptionDuration(plan, durationMonths)) {
      return apiError(plan === "CUSTOM" ? "Custom subscriptions must be between 1 and 36 months." : "Basic and Pro subscriptions are only available for 6 or 12 months.", 400, { code: "INVALID_DURATION" });
    }
    if (!Number.isInteger(maxDevices) || maxDevices < MIN_DEVICE_LIMIT || maxDevices > MAX_DEVICE_LIMIT) {
      return apiError(`Max devices must be between ${MIN_DEVICE_LIMIT} and ${MAX_DEVICE_LIMIT}.`, 400, { code: "VALIDATION_ERROR" });
    }
    if (plan === "CUSTOM" && (!Number.isFinite(customPrice) || (customPrice ?? 0) <= 0)) {
      return apiError("Custom price must be greater than zero.", 400, { code: "VALIDATION_ERROR" });
    }

    const price = resolvePlanPrice(plan, durationMonths, customPrice);
    if (price === null) {
      return apiError("No price is configured for this plan/duration.", 400, { code: "INVALID_PLAN_PRICE" });
    }

    // Existing restaurants can still receive a standalone activation code for
    // support/renewal workflows. New subscribers are created immediately with
    // an owner password and an ACTIVE subscription below.
    if (typeof body.restaurantId === "string" && body.restaurantId.trim()) {
      const restaurantId = body.restaurantId.trim();
      const existingRestaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });
      if (!existingRestaurant) {
        return apiError("Assigned restaurant was not found.", 404, { code: "NOT_FOUND" });
      }

      const generated = await generateActivationCode();
      const row = await prisma.activationCode.create({
        data: {
          codeHash: generated.codeHash,
          status: "AVAILABLE",
          plan,
          durationMonths,
          maxDevices,
          priceAmount: price,
          currency: "INR",
          expiresAt: requestedExpiry,
          restaurantId,
          restaurantName,
          customerName,
          customerEmail,
          customerPhone,
          notes: notes || null,
        },
      });

      return apiSuccess({
        id: row.id,
        code: generated.code,
        mode: "ACTIVATION_CODE",
        restaurantId,
      }, { status: 201 });
    }

    if (password.length < 10 || password.length > 72) {
      return apiError("Owner password must be between 10 and 72 characters.", 400, { code: "VALIDATION_ERROR" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });
    if (existingUser) {
      return apiError("A subscriber with this email already exists.", 409, { code: "EMAIL_EXISTS" });
    }

    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });
    if (existingRestaurant) {
      return apiError("A restaurant using this email already exists.", 409, { code: "EMAIL_EXISTS" });
    }

    const [passwordHash, generated] = await Promise.all([
      bcrypt.hash(password, 12),
      generateActivationCode(),
    ]);

    const now = new Date();
    const subscriptionExpiresAt = requestedExpiry ?? (() => {
      const result = new Date(now);
      result.setMonth(result.getMonth() + durationMonths);
      return result;
    })();

    const created = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          email: customerEmail,
          phone: customerPhone,
          address: null,
          currency: "INR",
          timezone: "Asia/Kolkata",
          businessDayStartHour: 4,
          defaultTaxRate: 5,
          orderPrefix: "ORD",
          billPrefix: "BILL",
          receiptPrefix: "RCPT",
          isActive: true,
        },
        select: { id: true, name: true, email: true },
      });

      const owner = await tx.user.create({
        data: {
          name: customerName,
          email: customerEmail,
          password: passwordHash,
          role: "OWNER",
          isActive: true,
          restaurantId: restaurant.id,
        },
        select: { id: true, name: true, email: true },
      });

      const subscription = await tx.subscription.create({
        data: {
          plan,
          status: "ACTIVE",
          startsAt: now,
          expiresAt: subscriptionExpiresAt,
          maxDevices,
          priceAmount: price,
          currency: "INR",
          restaurantId: restaurant.id,
        },
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
      });

      // Keep a consumed license record for control-plane history. Login does
      // not require this code because the subscriber account now already
      // exists; the first successful credential login activates that device.
      const license = await tx.activationCode.create({
        data: {
          codeHash: generated.codeHash,
          status: "USED",
          plan,
          durationMonths,
          maxDevices,
          priceAmount: price,
          currency: "INR",
          expiresAt: requestedExpiry,
          usedAt: now,
          restaurantId: restaurant.id,
          restaurantName,
          customerName,
          customerEmail,
          customerPhone,
          notes: notes || null,
        },
        select: { id: true },
      });

      await tx.systemEvent.create({
        data: {
          severity: "INFO",
          source: "CONTROL_SUBSCRIBER_CREATE",
          message: `Subscriber created: ${restaurantName}`,
          restaurantId: restaurant.id,
          metadata: {
            adminId: admin.id,
            ownerId: owner.id,
            subscriptionId: subscription.id,
            plan,
            durationMonths,
            maxDevices,
          },
        },
      });

      return { restaurant, owner, subscription, license };
    });

    return apiSuccess(
      {
        mode: "SUBSCRIBER_CREATED",
        code: generated.code,
        restaurant: created.restaurant,
        owner: created.owner,
        subscription: created.subscription,
        licenseId: created.license.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CONTROL_ACTIVATION_CODE_ERROR", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("A subscriber with the same email or unique details already exists.", 409, { code: "DUPLICATE_SUBSCRIBER" });
    }

    return apiError("Unable to create subscriber/subscription.", 500, { code: "INTERNAL_ERROR" });
  }
}
