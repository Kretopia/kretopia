import { useEffect, useState } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

type CreditRequest = {
  id: string;
  credit_id: string;
  status: string;
  relationship: string | null;
  endorser_name: string | null;
  project_name: string;
  role: string;
  year: number | null;
  requester_name: string | null;
  requester_avatar_url: string | null;
};

export default function CreditVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [request, setRequest] = useState<CreditRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [testimonial, setTestimonial] = useState("");
  const [completeStatus, setCompleteStatus] = useState<string | null>(null);

  useEffect(() => {
    loadRequest().catch(() => {
      toast.error("Couldn't load verification link");
      setLoading(false);
    });
  }, [token]);

  const loadRequest = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_credit_endorsement_by_token" as any, { _token: token });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setRequest(row as CreditRequest);
      setName(row.endorser_name || "");
      setRelationship(row.relationship || "");
      if (row.status !== "pending") setCompleteStatus(row.status);
    }
    setLoading(false);
  };

  const respond = async (accepted: boolean) => {
    if (!token) return;
    setSubmitting(accepted ? "accept" : "decline");
    try {
      const { data, error } = await supabase.rpc("submit_credit_endorsement_by_token" as any, {
        _token: token,
        _accepted: accepted,
        _endorser_name: name,
        _relationship: relationship,
        _testimonial: testimonial,
      });
      if (error) throw error;
      if (data && typeof data === "object" && "success" in data && !data.success) {
        throw new Error(String(data.error || "Unable to submit"));
      }
      setCompleteStatus(accepted ? "accepted" : "declined");
      toast.success(accepted ? "Credit verified" : "Credit declined");
    } catch (error: any) {
      toast.error(error?.message || "Couldn't submit verification");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 px-6"><CreativeLoader size="page" /></div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Verification link not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">This link may be invalid or already removed.</p>
            <Button onClick={() => navigate("/")} className="w-full">Go to ThriveIN</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completeStatus) {
    const accepted = completeStatus === "accepted";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6 space-y-4">
            {accepted ? <CheckCircle2 className="h-14 w-14 mx-auto text-primary" /> : <XCircle className="h-14 w-14 mx-auto text-muted-foreground" />}
            <div>
              <h1 className="text-xl font-bold">{accepted ? "Credit verified" : "Credit declined"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {accepted ? "Thanks — your confirmation now helps strengthen this creator’s verified record." : "Thanks — your response has been recorded."}
              </p>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full">Build your ThriveIN profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={request.requester_avatar_url || ""} />
                <AvatarFallback>{request.requester_name?.[0] || "T"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="text-xl">Verify this credit?</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{request.requester_name || "A creator"} asked you to confirm their role.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">{request.project_name}</p>
                  <p className="text-sm text-muted-foreground">{request.role}{request.year ? ` · ${request.year}` : ""}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should your confirmation appear?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship to the project</Label>
                <Input id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Client, collaborator, guest, producer..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial">Note (optional)</Label>
                <Textarea id="testimonial" value={testimonial} onChange={(e) => setTestimonial(e.target.value)} placeholder="Add a short confirmation or context." />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button onClick={() => respond(true)} disabled={!!submitting}>
                {submitting === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Yes, verify
              </Button>
              <Button variant="outline" onClick={() => respond(false)} disabled={!!submitting}>
                {submitting === "decline" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                I can’t verify
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}