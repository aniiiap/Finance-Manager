import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    success: "bg-green-100 text-green-800 hover:bg-green-100/80",
    warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
    danger: "bg-red-100 text-red-800 hover:bg-red-100/80",
    outline: "text-slate-950 border border-slate-200",
  }
  return (
    <div ref={ref} className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2", variants[variant], className)} {...props} />
  )
})
Badge.displayName = "Badge"
export { Badge }
