import { Verified, Database, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Mock verified profile card showing the "end state" product —
 * what a creator's profile looks like after claiming credits.
 */
export const VisualProofCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="max-w-[280px] sm:max-w-xs mx-auto"
    >
      <div className="rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Header gradient */}
        <div className="h-14 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10 relative">
          <div className="absolute -bottom-6 left-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border-2 border-card shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
          </div>
        </div>

        <div className="pt-8 px-4 pb-4">
          {/* Name + verified */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-foreground">Alex Rivera</p>
            <Verified className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Music Producer & Filmmaker</p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mb-3">
            <MapPin className="h-2.5 w-2.5" /> Los Angeles, CA
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1 text-[10px]">
              <Database className="h-3 w-3 text-primary" />
              <span className="font-semibold text-foreground">47</span>
              <span className="text-muted-foreground">Credits</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <Star className="h-3 w-3 text-warning" />
              <span className="font-semibold text-foreground">4.9</span>
              <span className="text-muted-foreground">Rating</span>
            </div>
          </div>

          {/* Mini credit pills */}
          <div className="flex flex-wrap gap-1.5">
            {["Squid Game S2", "Beyoncé Tour", "Netflix Doc"].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary"
              >
                <Verified className="h-2 w-2" />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-[10px] text-muted-foreground/60 mt-2 italic">
        What your verified profile could look like
      </p>
    </motion.div>
  );
};
