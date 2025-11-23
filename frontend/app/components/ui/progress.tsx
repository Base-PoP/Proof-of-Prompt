import * as React from "react"
import { cn } from "./utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number | null, indicatorColor?: string }
>(({ className, value, indicatorColor, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-gray-100",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 transition-all duration-500 ease-in-out"
      style={{ 
        transform: `translateX(-${100 - Math.min(100, Math.max(0, value || 0))}%)`,
        backgroundColor: indicatorColor || '#0052FF'
      }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }

