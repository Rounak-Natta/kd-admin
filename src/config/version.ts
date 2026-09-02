export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "1.0.0";

export const API_VERSION = "v1";

export function getVersionHeaders(): Record<string, string> {
  return {
    "X-KD-Control-Version": APP_VERSION,
    "X-KD-API-Version": API_VERSION,
  };
}
