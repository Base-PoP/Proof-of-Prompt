"use client";

import * as React from "react";

type TooltipContextValue = {
  children?: React.ReactNode;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function TooltipProvider({
  children,
  delayDuration,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  // delayDuration is accepted for API parity; no-op in this lightweight implementation.
  void delayDuration;
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipContext.Provider value={{ children }}>
      {children}
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & { asChild?: boolean };

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ children, asChild, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, { ...props, ref });
    }
    return (
      <span ref={ref} {...props}>
        {children}
      </span>
    );
  },
);

TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hidden?: boolean; side?: string; align?: string }
>(({ children, hidden, ...props }, ref) => {
  if (hidden) return null;
  return (
    <div ref={ref} data-slot="tooltip-content" role="tooltip" {...props}>
      {children}
    </div>
  );
});

TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
