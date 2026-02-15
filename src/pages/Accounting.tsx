import { useAuth } from "@/hooks/useAuth";
import { AccountingDashboard } from "@/components/project/AccountingDashboard";
import { ProGate } from "@/components/project/ProGate";
import { Navigate } from "react-router-dom";

const Accounting = () => {
  const { user, subscriptionInfo } = useAuth();
  const isPro = subscriptionInfo.tier === 'pro';

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <ProGate 
        feature="Accounting Suite" 
        description="Track expenses, view spending analytics, AI financial insights, and manage your complete P&L — all in one place." 
        isPro={isPro}
      >
        <AccountingDashboard />
      </ProGate>
    </div>
  );
};

export default Accounting;
