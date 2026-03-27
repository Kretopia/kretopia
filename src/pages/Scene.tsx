import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Flame, MessageSquare } from "lucide-react";
import Events from "./Events";
import { SparkWall } from "@/components/scene/SparkWall";
import { CirclesTab } from "@/components/scene/CirclesTab";

const Scene = () => {
  const [activeTab, setActiveTab] = useState("spark");

  return (
    <>
      <Helmet>
        <title>Scene | ThriveIN</title>
        <meta name="description" content="Your creative community hub — browse events, discover work, and join conversations." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Scene
            </h1>
            <p className="text-sm text-muted-foreground">Events, inspiration & conversations</p>
          </div>

          {/* Sub-tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-3">
              <TabsTrigger value="spark" className="gap-1.5 text-xs sm:text-sm">
                <Flame className="h-3.5 w-3.5" />
                Spark
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5 text-xs sm:text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                Events
              </TabsTrigger>
              <TabsTrigger value="circles" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Circles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spark" className="mt-0">
              <SparkWall />
            </TabsContent>

            <TabsContent value="events" className="mt-0">
              <EventsEmbed />
            </TabsContent>

            <TabsContent value="circles" className="mt-0">
              <CirclesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

const EventsEmbed = () => {
  return <Events embedded />;
};

export default Scene;
