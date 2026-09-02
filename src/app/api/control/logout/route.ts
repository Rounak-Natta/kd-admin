import { NextResponse } from "next/server";
import { getExpiredControlCookieOptions } from "@/lib/control-cookie";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("kd_control_session", "", getExpiredControlCookieOptions());
  return response;
}
