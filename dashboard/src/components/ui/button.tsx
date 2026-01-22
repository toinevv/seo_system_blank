import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Anti-Vibe-Code: 4px radius, 150ms transitions, subtle scale on hover
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-xs font-medium ring-offset-background transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[hsl(var(--glass-border))] bg-[hsl(var(--glass-bg))] backdrop-blur-[12px] hover:bg-[hsl(var(--glass-hover))] hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-[hsl(var(--glass-hover))] hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:scale-100",
        landing:
          "bg-landing-accent text-white hover:bg-landing-accent-hover font-medium",
        "landing-outline":
          "border border-landing-border bg-transparent text-landing-text hover:bg-landing-card-hover",
        "landing-ghost":
          "bg-transparent text-landing-text hover:bg-landing-card-hover",
      },
      size: {
        // Anti-Vibe-Code: Reduced heights for density
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2.5",
        lg: "h-9 px-4",
        xl: "h-10 px-6 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
