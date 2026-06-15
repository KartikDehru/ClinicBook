import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-clinic-700 text-white hover:bg-clinic-800",
        dark: "bg-ink-900 text-white hover:bg-ink-700",
        secondary: "bg-sand-100 text-ink-900 hover:bg-sand-200",
        outline: "border border-ink-200 bg-white text-ink-900 hover:bg-ink-50",
        ghost: "text-ink-700 hover:bg-ink-100",
        onDark: "bg-white text-clinic-900 hover:bg-sand-100",
        outlineOnDark: "border border-white/40 text-white hover:bg-white/10",
        destructive: "bg-signal-red text-white hover:bg-red-800",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
