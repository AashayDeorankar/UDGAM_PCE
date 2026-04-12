import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type MembershipTier } from "@/lib/membership";
import { Check, Crown } from "lucide-react";

type UpgradePlanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: MembershipTier;
  isLoggedIn: boolean;
  onLoginClick: () => void;
};

const DEFAULT_BILLING_EMAIL = "amanvverma109@gmail.com";
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const BILLING_EMAIL =
  ADMIN_EMAILS[0] || import.meta.env.VITE_BILLING_EMAIL || DEFAULT_BILLING_EMAIL;

function createUpgradeMailto(targetTier: "gold" | "platinum") {
  const planLabel = targetTier === "gold" ? "Gold" : "Platinum";
  const subject = encodeURIComponent(`Upgrade Request: ${planLabel} Plan`);
  const body = encodeURIComponent(
    [
      "Hello Admin Team,",
      "",
      `I would like to upgrade my account to the ${planLabel} plan.`,
      "",
      "Could you please share:",
      "1) Payment link or payment steps",
      "2) Activation timeline",
      "3) Any details needed from my side",
      "",
      "Thanks,",
      "[Your Name]",
      "[Registered Email]",
    ].join("\n"),
  );
  return `mailto:${BILLING_EMAIL}?subject=${subject}&body=${body}`;
}

export function UpgradePlanModal({
  open,
  onOpenChange,
  currentTier,
  isLoggedIn,
  onLoginClick,
}: UpgradePlanModalProps) {
  const isFree = currentTier === "free";
  const isGold = currentTier === "gold";
  const isPlatinum = currentTier === "platinum";

  const plans: Array<{
    id: MembershipTier;
    badge: string;
    title: string;
    currency: string;
    amountValue: string;
    subtitle: string;
    features: string[];
    ctaHelper: string;
    highlighted?: boolean;
  }> = [
    {
      id: "free",
      badge: "Starter",
      title: "Starter",
      currency: "Rs",
      amountValue: "0",
      subtitle: "/user per month",
      features: [
        "Up to 3 alumni sessions",
        "Paid industry mentor sessions",
        "Community and basic support",
      ],
      ctaHelper: "Good for getting started.",
    },
    {
      id: "gold",
      badge: "Premium",
      title: "Premium",
      currency: "Rs",
      amountValue: "199",
      subtitle: "/user per month",
      features: [
        "Unlimited alumni sessions",
        "All industry mentors included",
        "Advanced mentoring access",
      ],
      ctaHelper: "No credit card required.",
    },
    {
      id: "platinum",
      badge: "Enterprise",
      title: "Enterprise",
      currency: "Rs",
      amountValue: "299",
      subtitle: "/user per month",
      features: [
        "Everything in Gold",
        "Priority booking queue",
        "Fast-track support and handling",
      ],
      ctaHelper: "Priority activation and support.",
      highlighted: true,
    },
  ];

  const getTierButton = (planId: MembershipTier) => {
    if (!isLoggedIn) {
      return {
        label: "Login to Continue",
        onClick: onLoginClick,
        disabled: false,
        variant: "default" as const,
      };
    }

    if (planId === "free") {
      return {
        label: isFree ? "Current Plan" : "Starter Plan",
        disabled: true,
        variant: "outline" as const,
      };
    }

    if (planId === "gold") {
      if (isGold) {
        return { label: "Current Plan", disabled: true, variant: "outline" as const };
      }
      if (isPlatinum) {
        return { label: "Included in Platinum", disabled: true, variant: "outline" as const };
      }
      return {
        label: "Try it Free",
        href: createUpgradeMailto("gold"),
        disabled: false,
        variant: "default" as const,
      };
    }

    if (isPlatinum) {
      return { label: "Current Plan", disabled: true, variant: "outline" as const };
    }

    return {
      label: isGold ? "Upgrade to Platinum" : "Book a Demo",
      href: createUpgradeMailto("platinum"),
      disabled: false,
      variant: "outline" as const,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden border-2 border-foreground bg-background">
        <div className="relative">
          <div className="absolute inset-0 bg-dots opacity-30" />
          <DialogHeader>
            <div className="relative px-6 pt-6 pb-5 border-b-2 border-foreground bg-card">
              <span className="sticker-green-soft mb-3 inline-flex">Pricing</span>
              <DialogTitle className="text-foreground text-2xl">Choose Your Plan</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Current plan: {currentTier.toUpperCase()}. Upgrade to unlock more mentor access.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="relative p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const action = getTierButton(plan.id);
              const ctaClassName =
                plan.id === "gold"
                  ? "w-full bg-accent text-accent-foreground border-accent"
                  : plan.id === "platinum"
                    ? "w-full border-foreground text-foreground hover:bg-muted"
                    : "w-full";

              return (
                <div
                  key={plan.id}
                  className={`paper-card card-hover rounded-2xl flex flex-col transition-all duration-200 ${
                    plan.highlighted
                      ? "border-primary"
                      : "border-border"
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{plan.badge}</p>
                      {plan.highlighted && <Crown className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-2xl font-semibold mt-2">{plan.title}</p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-xl font-semibold">{plan.currency}</span>
                      <span className="text-5xl font-bold leading-none">{plan.amountValue}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                  </div>

                  <ul className="space-y-2 text-sm text-foreground/90 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    {action.href ? (
                      <Button
                        className={`${ctaClassName} btn-punch`}
                        variant={action.variant}
                        asChild
                        disabled={action.disabled}
                      >
                        <a href={action.href}>{action.label}</a>
                      </Button>
                    ) : (
                      <Button
                        className={`${ctaClassName} btn-punch`}
                        variant={action.variant}
                        disabled={action.disabled}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </Button>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground text-center">{plan.ctaHelper}</p>
                  </div>
                </div>
              );
            })}
          </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              No credit card required for activation request. Billing and plan activation are handled by the team.
            </p>
          </div>

          <div className="relative px-6 pb-6 pt-1 flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="btn-punch">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
