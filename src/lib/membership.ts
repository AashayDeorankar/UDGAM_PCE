export type MembershipTier = "free" | "gold" | "platinum";

export const FREE_ALUMNI_SESSION_LIMIT = 3;

export function normalizeMembershipTier(value: unknown): MembershipTier {
  if (value === "gold" || value === "platinum") return value;
  return "free";
}

export function getMentorPriceLabel(category: "industry" | "alumni", tier: MembershipTier): string {
  if (category === "industry") {
    return tier === "free" ? "Paid" : "Included";
  }
  return tier === "free" ? "Free" : "Included";
}

export function canBookMentor(
  category: "industry" | "alumni",
  tier: MembershipTier,
  alumniSessionsUsed: number,
): { allowed: boolean; reason?: string } {
  if (category === "alumni" && tier === "free" && alumniSessionsUsed >= FREE_ALUMNI_SESSION_LIMIT) {
    return {
      allowed: false,
      reason: `Free tier includes up to ${FREE_ALUMNI_SESSION_LIMIT} alumni sessions. Upgrade to Gold or Platinum to continue.`,
    };
  }
  return { allowed: true };
}

export function isPriorityTier(tier: MembershipTier): boolean {
  return tier === "platinum";
}
