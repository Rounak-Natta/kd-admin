import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CONTROL_COOKIE_NAME } from "@/lib/control-cookie";

const ISSUER = "kitchen-diaries-control";
const AUDIENCE = "kitchen-diaries-control-plane";

function getSecret() {
  const secret = process.env.CONTROL_JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("CONTROL_JWT_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export async function hashControlPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function compareControlPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createControlToken(admin: { id: string; email: string; name: string }) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: "PLATFORM_ADMIN" },
    getSecret(),
    {
      algorithm: "HS256",
      expiresIn: "8h",
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: admin.id,
    }
  );
}

export async function getControlAdmin(request?: Request) {
  let token = request?.headers.get("x-control-token")?.trim();

  if (!token) {
    const store = await cookies();
    token = store.get(CONTROL_COOKIE_NAME)?.value;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (!decoded || typeof decoded !== "object" || typeof decoded.id !== "string") {
      return null;
    }

    return prisma.controlAdmin.findFirst({
      where: { id: decoded.id, isActive: true },
      select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true },
    });
  } catch {
    return null;
  }
}
