import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/config/subscription-plans";

export const MIN_DEVICE_LIMIT = 1;
export const MAX_DEVICE_LIMIT = 10;
export const MIN_CUSTOM_DURATION_MONTHS = 1;
export const MAX_CUSTOM_DURATION_MONTHS = 36;

export function isValidSubscriptionDuration(plan: SubscriptionPlanKey, months: number): boolean {
  if (!Number.isInteger(months)) return false;
  if (plan === "CUSTOM") {
    return months >= MIN_CUSTOM_DURATION_MONTHS && months <= MAX_CUSTOM_DURATION_MONTHS;
  }
  return months === 6 || months === 12;
}

export function validateSubscriptionPrice(
  plan: SubscriptionPlanKey,
  durationMonths: number,
  customPrice?: number,
): number | null {
  if (!isValidSubscriptionDuration(plan, durationMonths)) return null;
  if (plan === "CUSTOM") {
    return Number.isFinite(customPrice) && (customPrice ?? 0) > 0 ? customPrice! : null;
  }
  return SUBSCRIPTION_PLANS[plan].prices[durationMonths as 6 | 12] ?? null;
}

export function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  result.setMonth(result.getMonth() + months);
  return result;
}
