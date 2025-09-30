interface EarnCardProps {
  icon: string;
  title: string;
  credits: string;
  description: string;
}

export const EarnCard = ({ icon, title, credits, description }: EarnCardProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <div className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
        {credits}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
