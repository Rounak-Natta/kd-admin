export const SUBSCRIPTION_PLANS = {
  BASIC: {
    label: "Basic",
    prices: { 6: 3500, 12: 4999 },
  },
  PRO: {
    label: "Pro",
    prices: { 6: 5999, 12: 7999 },
  },
  CUSTOM: {
    label: "Custom",
    prices: {},
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export function resolvePlanPrice(
  plan: SubscriptionPlanKey,
  durationMonths: number,
  customPrice?: number,
): number | null {
  if (plan === "CUSTOM") {
    return Number.isFinite(customPrice) && (customPrice ?? 0) > 0 ? customPrice! : null;
  }
  if (durationMonths !== 6 && durationMonths !== 12) return null;
  return SUBSCRIPTION_PLANS[plan].prices[durationMonths] ?? null;
}
