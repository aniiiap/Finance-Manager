export function DateFilter({ fromDate, toDate, onFromChange, onToChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      <div className="flex items-center border border-indigo-100/60 rounded-md overflow-hidden bg-white/80 w-full flex-1">
        <span className="px-3 text-indigo-700 bg-indigo-50/50 border-r border-indigo-100/60 text-sm font-medium h-full flex items-center py-2 w-16 justify-center shrink-0">From</span>
        <input 
          type="date" 
          value={fromDate || ''}
          onChange={(e) => onFromChange(e.target.value)}
          className="px-3 py-2 text-sm border-none focus:ring-0 outline-none w-full min-w-0"
          title="From Date"
        />
      </div>
      <div className="flex items-center border border-indigo-100/60 rounded-md overflow-hidden bg-white/80 w-full flex-1">
        <span className="px-3 text-indigo-700 bg-indigo-50/50 border-r border-indigo-100/60 text-sm font-medium h-full flex items-center py-2 w-14 justify-center shrink-0">To</span>
        <input 
          type="date" 
          value={toDate || ''}
          onChange={(e) => onToChange(e.target.value)}
          className="px-3 py-2 text-sm border-none focus:ring-0 outline-none w-full min-w-0"
          title="To Date"
        />
      </div>
    </div>
  )
}
