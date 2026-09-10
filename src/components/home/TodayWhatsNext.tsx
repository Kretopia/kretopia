import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ThrivePromptHero } from "@/components/home/ThrivePromptHero";
import { MoreFromToday } from "@/components/home/MoreFromToday";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface TodayWhatsNextProps {
  firstName?: string;
  peopleForYou?: ReactNode;
  profile?: ProfileRow | null;
  profileFull?: ProfileRow | null;
  myCredits?: number;
}

/**
 * TodayWhatsNext — "what should I do next": the live prompt composer with
 * its context-aware action chips (Find collaborators, Plan release, Draft
 * outreach, ...), followed by the filterable action blocks (approvals,
 * deadlines, discover, schedule) that used to carry their own separate
 * "dashboard" framing -- now clearly downstream of TodayDashboard instead
 * of competing with it for the same name.
 */
export function TodayWhatsNext({ firstName, peopleForYou, profile, profileFull, myCredits }: TodayWhatsNextProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <ThrivePromptHero firstName={firstName} />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.08, ease: [0.2, 0.65, 0.3, 0.95] }}
      >
        <MoreFromToday peopleForYou={peopleForYou} profile={profile} profileFull={profileFull} myCredits={myCredits} />
      </motion.div>
    </div>
  );
}

export default TodayWhatsNext;
