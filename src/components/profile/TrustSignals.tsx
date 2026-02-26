import { Mail, Phone, ShieldCheck, CreditCard, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustSignalsProps {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  idVerified?: boolean;
  paymentVerified?: boolean;
  isOwnProfile?: boolean;
  compact?: boolean;
}

const signals = [
  { key: "email", icon: Mail, label: "Email Verified", unverifiedLabel: "Email not verified" },
  { key: "phone", icon: Phone, label: "Phone Verified", unverifiedLabel: "Phone not verified" },
  { key: "id", icon: ShieldCheck, label: "ID Verified", unverifiedLabel: "ID not verified" },
  { key: "payment", icon: CreditCard, label: "Payment Verified", unverifiedLabel: "Payment not verified" },
] as const;

export function TrustSignals({ emailVerified, phoneVerified, idVerified, paymentVerified, isOwnProfile, compact }: TrustSignalsProps) {
  const verifiedMap: Record<string, boolean> = {
    email: !!emailVerified,
    phone: !!phoneVerified,
    id: !!idVerified,
    payment: !!paymentVerified,
  };

  const verifiedCount = Object.values(verifiedMap).filter(Boolean).length;

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {signals.map((s) => {
                const verified = verifiedMap[s.key];
                return (
                  <div
                    key={s.key}
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                      verified
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground/40"
                    )}
                  >
                    <s.icon className="h-3 w-3" />
                  </div>
                );
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">{verifiedCount}/4 Trust Signals verified</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Trust Signals</h3>
        <span className="text-xs text-muted-foreground">{verifiedCount}/4 verified</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {signals.map((s) => {
          const verified = verifiedMap[s.key];
          return (
            <div
              key={s.key}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
                verified
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  verified
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground/50"
                )}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs font-medium truncate",
                  verified ? "text-foreground" : "text-muted-foreground"
                )}>
                  {verified ? s.label : s.unverifiedLabel}
                </p>
                {verified ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-medium">Verified</span>
                  </div>
                ) : isOwnProfile ? (
                  <span className="text-[10px] text-muted-foreground">Tap to verify</span>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground/50">
                    <Circle className="h-3 w-3" />
                    <span className="text-[10px]">Pending</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Score Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Trust Score</span>
          <span className="font-semibold text-foreground">{verifiedCount * 25}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              verifiedCount === 4
                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                : verifiedCount >= 2
                  ? "bg-gradient-to-r from-primary to-accent"
                  : "bg-muted-foreground/30"
            )}
            style={{ width: `${verifiedCount * 25}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Inline trust badge row for match cards and compact views */
export function TrustBadgeRow({ emailVerified, phoneVerified, idVerified, paymentVerified }: Omit<TrustSignalsProps, "isOwnProfile" | "compact">) {
  const verifiedMap: Record<string, boolean> = {
    email: !!emailVerified,
    phone: !!phoneVerified,
    id: !!idVerified,
    payment: !!paymentVerified,
  };
  const verifiedCount = Object.values(verifiedMap).filter(Boolean).length;
  
  if (verifiedCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
      <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
        {verifiedCount}/4 verified
      </span>
    </div>
  );
}
