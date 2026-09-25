import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-amethyst-bright/30 bg-amethyst-bright/10 text-amethyst-bright",
        secondary: "border-border bg-secondary text-muted-foreground",
        success: "border-c2/30 bg-c2/10 text-c2",
        warning: "border-c3/30 bg-c3/10 text-c3",
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
