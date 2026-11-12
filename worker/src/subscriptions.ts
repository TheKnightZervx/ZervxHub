export type SubscriptionPlan = "free" | "starter" | "pro" | "business";
export type BillingPeriod = "none" | "monthly" | "yearly";

export const PLAN_CATALOG: ReadonlyArray<{
  id: SubscriptionPlan;
  name: string;
  available: boolean;
  billingPeriods: ReadonlyArray<BillingPeriod>;
  limits: Readonly<Record<string, number>> | null;
}> = [
  { id: "free", name: "Free", available: true, billingPeriods: ["none"], limits: null },
  { id: "starter", name: "Starter", available: false, billingPeriods: ["monthly", "yearly"], limits: null },
  { id: "pro", name: "Pro", available: false, billingPeriods: ["monthly", "yearly"], limits: null },
  { id: "business", name: "Business", available: false, billingPeriods: ["monthly", "yearly"], limits: null },
];

export interface VerifiedBillingEvent {
  eventId: string;
  provider: string;
  developerId: string;
  subscriptionId: string;
  kind: "activated" | "renewed" | "past_due" | "canceled" | "expired";
  plan: Exclude<SubscriptionPlan, "free">;
  billingPeriod: Exclude<BillingPeriod, "none">;
  periodStart: number;
  periodEnd: number;
  occurredAt: number;
}

export interface BillingProviderAdapter {
  verifyAndParse(request: Request, webhookSecret: string): Promise<VerifiedBillingEvent>;
}
