import { NextResponse } from "next/server";
import { getVersionHeaders } from "@/config/version";

export function apiSuccess<T>(
  data: T,
  options?: { status?: number; requestId?: string }
) {
  return NextResponse.json(
    { success: true, data },
    {
      status: options?.status ?? 200,
      headers: {
        ...getVersionHeaders(),
        "Cache-Control": "no-store",
        ...(options?.requestId ? { "X-Request-Id": options.requestId } : {}),
      },
    }
  );
}

export function apiError(
  message: string,
  status: number,
  options?: { code?: string; requestId?: string }
) {
  return NextResponse.json(
    { success: false, error: message, ...(options?.code ? { code: options.code } : {}) },
    {
      status,
      headers: {
        ...getVersionHeaders(),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(options?.requestId ? { "X-Request-Id": options.requestId } : {}),
      },
    }
  );
}
