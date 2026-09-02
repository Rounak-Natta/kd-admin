export const CONTROL_COOKIE_NAME = "kd_control_session";

export function getControlCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

export function getExpiredControlCookieOptions() {
  return {
    ...getControlCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}
