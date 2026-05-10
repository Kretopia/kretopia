import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2, Briefcase, CalendarDays, Rocket, ArrowRight } from "lucide-react";

const items = [
  {
    label: "Clients",
    description: "Your roster, contacts, and project links.",
    icon: Building2,
    path: "/clients",
  },
  {
    label: "My Gigs",
    description: "Gigs you've posted and applicant pipelines.",
    icon: Briefcase,
    path: "/manage-opportunities",
  },
  {
    label: "My Events",
    description: "Sessions, RSVPs, and the backstage check-in.",
    icon: CalendarDays,
    path: "/events/backstage",
  },
  {
    label: "My Campaigns",
    description: "ThriveFund campaigns — drafts, live, and past.",
    icon: Rocket,
    path: "/fund/manage",
  },
];

const ManageHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Manage · ThriveIN</title>
        <meta name="description" content="One dashboard for your clients, gigs, events, and campaigns." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Manage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you've put out — clients, gigs, events, and campaigns — in one place.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(({ label, description, icon: Icon, path }) => (
            <Card
              key={path}
              role="button"
              tabIndex={0}
              onClick={() => navigate(path)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(path)}
              className="group p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">{label}</h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageHub;
