import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap ring-1 ring-inset",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground ring-border",
        accent: "bg-accent-soft text-accent ring-accent/15",
        success: "bg-success-soft text-success ring-success/15",
        warning: "bg-warning-soft text-warning ring-warning/20",
        danger: "bg-danger-soft text-danger ring-danger/15",
        info: "bg-info-soft text-info ring-info/15",
        dark: "bg-primary text-primary-foreground ring-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {props.children}
    </span>
  );
}
