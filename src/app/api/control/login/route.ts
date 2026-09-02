import { apiError, apiSuccess } from "@/lib/api-response";
import {
  compareControlPassword,
  createControlToken,
} from "@/lib/control-auth";
import { getControlCookieOptions } from "@/lib/control-cookie";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const limit = await rateLimit(`control-login:${ip}`, 10, 15 * 60_000);

  if (!limit.allowed) {
    const response = apiError(
      "Too many login attempts. Try again later.",
      429,
      { code: "RATE_LIMITED" },
    );
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))));
    return response;
  }

  try {
    // --------------------------------------------------
    // Environment validation
    // --------------------------------------------------

    const secret = process.env.CONTROL_JWT_SECRET?.trim();

    if (!secret || secret.length < 32) {
      console.error("CONTROL_LOGIN_CONFIG_ERROR", {
        message:
          "CONTROL_JWT_SECRET is missing or shorter than 32 characters.",
        configured: Boolean(secret),
        length: secret?.length ?? 0,
      });

      return apiError(
        "Control panel authentication is not configured correctly.",
        500,
        { code: "AUTH_CONFIG_ERROR" },
      );
    }

    // --------------------------------------------------
    // Request validation
    // --------------------------------------------------

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, {
        code: "VALIDATION_ERROR",
      });
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return apiError("Invalid request body.", 400, {
        code: "VALIDATION_ERROR",
      });
    }

    const payload = body as {
      email?: unknown;
      password?: unknown;
    };

    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";

    const password =
      typeof payload.password === "string"
        ? payload.password
        : "";

    if (!email || !password) {
      return apiError(
        "Email and password are required.",
        400,
        { code: "VALIDATION_ERROR" },
      );
    }

    // --------------------------------------------------
    // Database lookup
    // --------------------------------------------------

    const admin = await prisma.controlAdmin.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
      },
    });

    if (!admin) {
      return apiError(
        "Invalid email or password.",
        401,
        { code: "INVALID_CREDENTIALS" },
      );
    }

    if (!admin.isActive) {
      return apiError(
        "This admin account is inactive.",
        403,
        { code: "ACCOUNT_INACTIVE" },
      );
    }

    // --------------------------------------------------
    // Password verification
    // --------------------------------------------------

    const passwordValid = await compareControlPassword(
      password,
      admin.password,
    );

    if (!passwordValid) {
      return apiError(
        "Invalid email or password.",
        401,
        { code: "INVALID_CREDENTIALS" },
      );
    }

    // --------------------------------------------------
    // Create session token
    // --------------------------------------------------

    const token = createControlToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
    });

    if (!token) {
      console.error("CONTROL_LOGIN_TOKEN_ERROR");

      return apiError(
        "Unable to create admin session.",
        500,
        { code: "TOKEN_ERROR" },
      );
    }

    // --------------------------------------------------
    // Response + cookie
    // --------------------------------------------------

    const response = apiSuccess({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    });

    response.cookies.set(
      "kd_control_session",
      token,
      getControlCookieOptions(),
    );

    // --------------------------------------------------
    // Last login
    // --------------------------------------------------

    await prisma.controlAdmin.update({
      where: {
        id: admin.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return response;
  } catch (error) {
    console.error("CONTROL_LOGIN_ERROR", {
      name: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message
          : String(error),
      stack:
        error instanceof Error
          ? error.stack
          : undefined,
    });

    return apiError(
      "Unable to sign in.",
      500,
      { code: "INTERNAL_ERROR" },
    );
  }
}