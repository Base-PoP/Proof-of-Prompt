"use client";

import * as React from "react";

import { cn } from "./utils";

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => {
  const isVertical = orientation === "vertical";
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-border shrink-0",
        isVertical ? "w-px h-full" : "h-px w-full",
        className,
      )}
      {...props}
    />
  );
});

Separator.displayName = "Separator";

export { Separator };
