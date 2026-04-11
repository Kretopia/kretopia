import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

/**
 * Sticky "Get Started" CTA bar for mobile users.
 * Appears after scrolling past the hero section. Hidden for logged-in users.
 */
export const StickyMobileCTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user) return;
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [user]);

  if (user || !visible) return null;

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 lg:hidden px-3 pb-1">
      <button
        onClick={() => navigate("/auth")}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        Get Started — Free <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};
