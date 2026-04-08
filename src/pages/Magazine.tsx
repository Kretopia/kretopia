import { Helmet } from "react-helmet-async";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Magazine = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <Helmet>
        <title>Magazine | ThriveIN</title>
        <meta name="description" content="Read stories, insights and features from the creative economy. ThriveIN Magazine." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <MagazineWall />
        </div>
      </div>
    </PageTransition>
  );
};

export default Magazine;
