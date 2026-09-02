import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const configuredEmail = process.env.CONTROL_ADMIN_EMAIL?.trim();
  const configuredPassword = process.env.CONTROL_ADMIN_PASSWORD;
  const email = (
    configuredEmail || "admin@kitchendiaries.local"
  ).toLowerCase();
  const password = configuredPassword || "Admin@123456";
  const name =
    process.env.CONTROL_ADMIN_NAME?.trim() || "Kitchen Diaries Admin";

  if (
    process.env.NODE_ENV === "production" &&
    (!configuredEmail || !configuredPassword)
  ) {
    throw new Error(
      "CONTROL_ADMIN_EMAIL and CONTROL_ADMIN_PASSWORD are required in production."
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    password === "Admin@123456"
  ) {
    throw new Error(
      "Refusing to seed the known development admin password in production."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "CONTROL_ADMIN_PASSWORD must be at least 12 characters."
    );
  }

  const hash = await bcrypt.hash(password, 12);

  // IMPORTANT:
  // The schema must already exist before this seed runs.
  // We deliberately do NOT use db push, migrate reset, or raw
  // CREATE TABLE statements from the seed.
  //
  // Seed policy:
  // - NEVER delete existing control admins.
  // - Upsert only the requested admin by email.
  // - Never touch restaurants, subscriptions, devices, orders, etc.
  await prisma.controlAdmin.upsert({
    where: { email },
    update: { name, password: hash, isActive: true },
    create: { name, email, password: hash, isActive: true },
  });

  console.log(`Control admin provisioned: ${email}`);
}

main()
  .catch((error) => {
    console.error("Control admin seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
