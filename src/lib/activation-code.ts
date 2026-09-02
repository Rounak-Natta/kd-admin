import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function hash(code: string) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

function makeCode() {
  const bytes = crypto.randomBytes(12);
  let random = "";
  for (const byte of bytes) random += ALPHABET[byte % ALPHABET.length];
  return `KD-${random.slice(0,4)}-${random.slice(4,8)}-${random.slice(8,12)}`;
}

export async function generateActivationCode() {
  for (;;) {
    const code = makeCode();
    const codeHash = hash(code);
    const exists = await prisma.activationCode.findUnique({
      where: { codeHash },
      select: { id: true },
    });
    if (!exists) return { code, codeHash };
  }
}
