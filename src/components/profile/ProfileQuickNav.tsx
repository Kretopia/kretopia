import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  User,
  Briefcase,
  Star,
  Award,
  Newspaper,
  BarChart3,
  Mail,
  Download,
  ChevronUp,
} from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: <User className="h-4 w-4" /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-4 w-4" /> },
  { id: "experience", label: "Experience", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "reviews-stats", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { id: "press-awards", label: "Press & Awards", icon: <Award className="h-4 w-4" /> },
];

export function ProfileQuickNav() {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      // Determine which section is in view
      const sectionElements = sections.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop Side Navigation */}
      <div className="hidden lg:block fixed left-4 top-1/2 -translate-y-1/2 z-40">
        <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-lg p-2 space-y-1">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full justify-start gap-2 transition-all",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted"
              )}
              title={section.label}
            >
              {section.icon}
              <span className="text-xs font-medium">{section.label}</span>
            </Button>
          ))}
          
          {/* Back to top */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="w-full justify-start gap-2"
              title="Back to top"
            >
              <ChevronUp className="h-4 w-4" />
              <span className="text-xs font-medium">Top</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 z-40 px-4">
        <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-lg p-2">
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex-shrink-0 gap-1 px-3",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : ""
                )}
              >
                {section.icon}
                <span className="text-xs hidden sm:inline">{section.label}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="flex-shrink-0"
              title="Back to top"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
