"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm",
          "ring-offset-background placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:border-amethyst-bright",
          "focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-amethyst-bright/20",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
