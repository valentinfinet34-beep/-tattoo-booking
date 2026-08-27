export function isProPlan(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): boolean {
  return (
    plan === "pro" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing")
  );
}
