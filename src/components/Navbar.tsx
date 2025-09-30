import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Flame, Trophy, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoBlack from "@/assets/logo-black.png";

interface NavbarProps {
  user?: { email?: string } | null;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center">
          <img 
            src={logoBlack} 
            alt="ThriveIN" 
            className="h-8 dark:invert"
          />
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/discover">
                <Button variant="ghost">Discover</Button>
              </Link>
              <Link to="/spark">
                <Button variant="ghost" className="gap-1.5">
                  <Flame className="h-4 w-4" />
                  Spark
                </Button>
              </Link>
              <Link to="/studio">
                <Button variant="ghost" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Studio
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="ghost" size="icon">
                  <Trophy className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/circle">
                <Button variant="ghost" size="icon">
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
