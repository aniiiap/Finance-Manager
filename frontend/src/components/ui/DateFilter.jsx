import { ChevronLeft, ChevronRight } from "lucide-react"

export function DateFilter({ value, onChange, className = "" }) {
  const handlePrevDay = () => {
    if (!value) {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      onChange(today.toISOString().split('T')[0]);
      return;
    }
    const date = new Date(value);
    date.setDate(date.getDate() - 1);
    onChange(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (!value) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      onChange(today.toISOString().split('T')[0]);
      return;
    }
    const date = new Date(value);
    date.setDate(date.getDate() + 1);
    onChange(date.toISOString().split('T')[0]);
  };

  return (
    <div className={`flex items-center border rounded-md overflow-hidden ${className}`}>
      <button 
        onClick={handlePrevDay} 
        className="px-2 py-2 hover:bg-slate-100 text-slate-500 border-r"
        title="Previous Day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <input 
        type="date" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm border-none focus:ring-0 outline-none min-w-[130px]"
        title="Filter by Date"
      />
      <button 
        onClick={handleNextDay} 
        className="px-2 py-2 hover:bg-slate-100 text-slate-500 border-l"
        title="Next Day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
