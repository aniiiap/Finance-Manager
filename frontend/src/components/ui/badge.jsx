import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-600/80 border-transparent shadow-sm",
    secondary: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100/80 border-transparent",
    success: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-transparent shadow-sm",
    warning: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-transparent",
    danger: "bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-transparent shadow-sm",
    outline: "text-indigo-950 border border-indigo-200",
  }
  return (
    <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2", variants[variant], className)} {...props} />
  )
})
Badge.displayName = "Badge"
export { Badge }
