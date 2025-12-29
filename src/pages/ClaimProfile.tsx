import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Mail, 
  Share2, 
  Shield, 
  CheckCircle,
  Loader2,
  UserCheck,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { SEO } from '@/components/SEO';

interface UnclaimedProfile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  is_claimed: boolean;
  imported_from_url: string | null;
}

export default function ClaimProfile() {
  const { claimToken } = useParams<{ claimToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UnclaimedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'social' | 'admin'>('email');
  const [email, setEmail] = useState('');
  const [socialProof, setSocialProof] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  useEffect(() => {
    if (claimToken) {
      fetchProfile();
    }
  }, [claimToken]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, is_claimed, imported_from_url')
        .eq('claim_token', claimToken)
        .single();

      if (error) throw error;
      
      if (data?.is_claimed) {
        toast.error('This profile has already been claimed');
        navigate('/');
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Profile not found or invalid claim link');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const submitClaimRequest = async () => {
    if (!profile) return;
    
    // Validation
    if (verificationMethod === 'email' && !email) {
      toast.error('Please enter your professional email');
      return;
    }
    if (verificationMethod === 'social' && !socialProof) {
      toast.error('Please provide a link to your social media post');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('profile_claim_requests').insert({
        profile_id: profile.user_id,
        claimant_email: email || user?.email || '',
        claimant_user_id: user?.id,
        verification_method: verificationMethod,
        verification_proof: verificationMethod === 'social' ? socialProof : 
                           verificationMethod === 'admin' ? adminMessage : null,
        status: 'pending'
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Claim request submitted! We\'ll review it shortly.');
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Claim Request Submitted</h2>
            <p className="text-muted-foreground text-center mb-6">
              We'll review your request and get back to you within 24-48 hours.
            </p>
            <Button onClick={() => navigate('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`Claim Your Profile - ${profile.full_name}`}
        description={`Claim your ThriveIN profile for ${profile.full_name}`}
      />
      
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unclaimed Profile
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                  <CardDescription className="text-lg">{profile.role}</CardDescription>
                  {profile.location && (
                    <p className="text-sm text-muted-foreground mt-1">{profile.location}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            {profile.bio && (
              <CardContent>
                <p className="text-muted-foreground">{profile.bio}</p>
                {profile.imported_from_url && (
                  <a 
                    href={profile.imported_from_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-4"
                  >
                    View Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            )}
          </Card>

          {/* Claim Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Claim This Profile
              </CardTitle>
              <CardDescription>
                Verify that you are {profile.full_name} to take ownership of this profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={verificationMethod} onValueChange={(v) => setVerificationMethod(v as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="social" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Social</span>
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Manual</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4 mt-6">
                  <div>
                    <Label>Professional Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@professional-email.com"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter an email associated with your professional work. We'll send a verification link.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4 mt-6">
                  <div>
                    <Label>Social Media Proof</Label>
                    <Input
                      value={socialProof}
                      onChange={(e) => setSocialProof(e.target.value)}
                      placeholder="https://twitter.com/yourhandle/status/..."
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Post about claiming your ThriveIN profile from a verified account, then paste the link here.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Suggested post:</p>
                    <p className="text-sm text-muted-foreground italic">
                      "I'm claiming my @ThriveIN profile! 🎵 #ThriveIN #VerifiedCreator"
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="admin" className="space-y-4 mt-6">
                  <div>
                    <Label>Tell us how we can verify you</Label>
                    <Textarea
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="Provide any information that helps us verify your identity (agent contact, management email, official website, etc.)"
                      className="min-h-[120px]"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Our team will manually review your request within 24-48 hours.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button 
                className="w-full mt-6" 
                size="lg"
                onClick={submitClaimRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Submit Claim Request
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                Don't recognize this profile? <a href="mailto:support@thrivein.io" className="text-primary hover:underline">Report an issue</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
