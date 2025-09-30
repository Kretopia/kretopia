interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

export const FeatureCard = ({ icon, title, description, gradient }: FeatureCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-glow">
      <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-3 text-primary-foreground`}>
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
