import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useClient, useClientProjects, useClientContacts } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Plus, Mail, Phone, Globe, FolderKanban, Users, FileText } from "lucide-react";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { SEO } from "@/components/SEO";
import { format } from "date-fns";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(clientId);
  const { data: projects = [] } = useClientProjects(clientId);
  const { data: contacts = [] } = useClientContacts(clientId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!client) return <div className="p-4">Client not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-32">
      <SEO title={`${client.company_name || client.name} · Client`} description="Client hub" />

      <button onClick={() => navigate("/clients")} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> All clients
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shrink-0">
            {(client.company_name || client.name).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight truncate">{client.company_name || client.name}</h1>
            {client.company_name && <p className="text-sm text-muted-foreground truncate">{client.name}</p>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
      </div>

      {/* Contact strip */}
      {(client.contact_email || client.contact_phone || client.website) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {client.contact_email && (
            <a href={`mailto:${client.contact_email}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-card border border-border">
              <Mail className="h-3 w-3" /> {client.contact_email}
            </a>
          )}
          {client.contact_phone && (
            <a href={`tel:${client.contact_phone}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-card border border-border">
              <Phone className="h-3 w-3" /> {client.contact_phone}
            </a>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-card border border-border">
              <Globe className="h-3 w-3" /> Site
            </a>
          )}
        </div>
      )}

      {/* Projects */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Projects ({projects.length})
          </h2>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/desk?client=${client.id}`)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New
          </Button>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
            No projects yet for this client.
          </p>
        ) : (
          <div className="space-y-1.5">
            {projects.map((p: any) => (
              <Link
                key={p.id}
                to={`/desk/${p.id}`}
                className="block rounded-lg border border-border bg-card hover:bg-accent/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{p.title}</p>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">
                    {p.status || "draft"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {p.workspace_type || "general"} · updated {format(new Date(p.updated_at), "MMM d")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Contacts */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> People ({contacts.length})
        </h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
            Add team members or stakeholders from this client. Coming soon.
          </p>
        ) : (
          <div className="space-y-1.5">
            {contacts.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role} · {c.email}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      {client.notes && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Notes
          </h2>
          <div className="rounded-lg border border-border bg-card p-3 text-sm whitespace-pre-wrap">{client.notes}</div>
        </section>
      )}

      <ClientFormDialog open={editing} onOpenChange={setEditing} client={client} />
    </div>
  );
};

export default ClientDetail;
