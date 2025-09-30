import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Briefcase, Share2, Edit } from "lucide-react";

const Profile = () => {
  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Profile Header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="relative h-48 bg-gradient-to-br from-primary via-secondary to-accent" />
          
          <div className="relative px-8 pb-8">
            <div className="mb-6 -mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
                  alt="Profile"
                  className="h-32 w-32 rounded-2xl border-4 border-card object-cover"
                />
                <div>
                  <h1 className="mb-1 text-3xl font-bold">Jordan Rivers</h1>
                  <p className="mb-2 text-lg text-muted-foreground">
                    Music Producer & Sound Designer
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Los Angeles, CA
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      4.9 (23 reviews)
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="gradient">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border bg-background p-6">
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-primary">156</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-secondary">42</div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-accent">98%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="mb-6 w-full justify-start rounded-2xl bg-card p-1">
            <TabsTrigger value="about" className="rounded-xl">About</TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-xl">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-3 text-xl font-semibold">About</h3>
              <p className="text-muted-foreground">
                Award-winning music producer with 10+ years of experience in the industry. 
                Specializing in electronic music, hip-hop, and cinematic soundtracks. 
                Passionate about collaborating with emerging artists and pushing creative boundaries.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-xl font-semibold">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Music Production",
                  "Sound Design",
                  "Mixing & Mastering",
                  "Ableton Live",
                  "Logic Pro",
                  "Audio Engineering",
                  "Composition",
                  "Arrangement",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-smooth hover:-translate-y-1 hover:shadow-glow"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={`https://images.unsplash.com/photo-149923997537${item}?w=400&h=300&fit=crop`}
                      alt={`Project ${item}`}
                      className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="mb-1 font-semibold">Project Title {item}</h4>
                    <p className="text-sm text-muted-foreground">
                      Electronic music production
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {[1, 2, 3].map((review) => (
              <div
                key={review}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://images.unsplash.com/photo-150393031906${review}?w=50&h=50&fit=crop`}
                      alt="Reviewer"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">Client Name</div>
                      <div className="text-sm text-muted-foreground">2 weeks ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Amazing work! Jordan delivered exactly what we needed and went above and beyond. 
                  Highly professional and creative. Would definitely work together again.
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
