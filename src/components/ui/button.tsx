import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const HERO_LIME_CLASSES =
  "bg-energy text-energy-foreground font-black uppercase tracking-wider hover:scale-[1.03] shadow-glow-lime";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        outline: "border-2 border-primary/60 bg-primary/10 text-foreground hover:bg-primary/20 hover:border-primary backdrop-blur-sm hover:shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm",
        ghost: "hover:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Solid accent CTA — flattened from a violet→magenta gradient in
        // the design system reset (gradient-primary is now a flat color).
        gradient: "gradient-primary text-primary-foreground font-bold hover:opacity-95 hover:scale-[1.02] shadow-glow",
        // Hero / Lime — identical loudest-CTA treatment (signature accent,
        // #FF2DA1) kept as two variant names for call-site readability.
        // Shared string so the two can't drift apart.
        hero: HERO_LIME_CLASSES,
        lime: HERO_LIME_CLASSES,
        glow: "bg-primary text-primary-foreground hover:bg-primary/90 animate-glow",
        // Liquid Glass — translucent surface, hairline border, accent on hover/active.
        glass: "glass-surface text-foreground hover:border-[hsl(var(--color-accent)_/_0.5)] hover:text-[hsl(var(--color-accent))] data-[state=open]:border-[hsl(var(--color-accent)_/_0.6)] data-[state=open]:text-[hsl(var(--color-accent))]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
