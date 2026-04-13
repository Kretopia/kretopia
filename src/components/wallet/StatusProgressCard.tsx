import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateStatusFromCredits, type StatusResult } from "@/lib/statusEngine";
import { ThriveStatusCard } from "@/components/ThriveStatusCard";

export function StatusProgressCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusResult | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from("credits")
        .select("verification_status")
        .eq("user_id", user.id);
      if (data) {
        setStatus(calculateStatusFromCredits(data));
      }
    };
    fetchData();
  }, [user]);

  if (!status) return null;

  return <ThriveStatusCard status={status} />;
}
