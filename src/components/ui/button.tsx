import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[#00FF88] text-black font-semibold shadow-[0_0_12px_rgba(0,255,136,0.25)] hover:shadow-[0_0_20px_rgba(0,255,136,0.45)] active:scale-[0.98]",
        destructive:
          "bg-[#FF3131] text-white font-semibold shadow-[0_0_12px_rgba(255,49,49,0.25)] hover:shadow-[0_0_20px_rgba(255,49,49,0.45)] active:scale-[0.98]",
        outline:
          "border border-[#1E1E1E] bg-transparent text-[#888888] hover:border-[rgba(0,255,136,0.35)] hover:text-[#DEDEDE] hover:bg-[rgba(0,255,136,0.04)]",
        secondary:
          "bg-[#141414] text-[#888888] border border-[#1C1C1C] hover:bg-[#1A1A1A] hover:text-[#DEDEDE]",
        ghost:
          "text-[#444444] hover:text-[#999999] hover:bg-[rgba(255,255,255,0.04)]",
        link: "text-[#00FF88] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
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
    VariantProps<typeof buttonVariants> {}

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
