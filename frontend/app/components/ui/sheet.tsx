"use client";

import * as React from "react";

type SheetContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function Sheet({
  open = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      <div data-slot="sheet" {...props}>
        {open ? children : null}
      </div>
    </SheetContext.Provider>
  );
}

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { side?: "left" | "right" }
>(({ children, ...props }, ref) => (
  <div ref={ref} data-slot="sheet-content" {...props}>
    {children}
  </div>
));

SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) => (
  <div data-slot="sheet-header" className={className} {...props} />
);

const SheetTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h2">) => (
  <h2 data-slot="sheet-title" className={className} {...props} />
);

const SheetDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) => (
  <p data-slot="sheet-description" className={className} {...props} />
);

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
