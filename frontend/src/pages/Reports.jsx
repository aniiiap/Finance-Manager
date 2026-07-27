import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { formatCurrency } from "../data/mock"
import { useData } from "../context/DataContext"
import { ExportButtons } from "../components/ui/ExportButtons"
import { Search } from "lucide-react"
import { DateFilter } from "../components/ui/DateFilter"

export default function Reports() {
  const { projects, transactions } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Calculate data based on filters
  const reportData = projects
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(project => {
      let projectTxs = transactions.filter(t => t.project_id === project.id || t.project === project.name);

      if (fromDate) {
        projectTxs = projectTxs.filter(t => t.date && t.date >= fromDate);
      }
      if (toDate) {
        projectTxs = projectTxs.filter(t => t.date && t.date <= toDate);
      }

      const received = projectTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = projectTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const profit = received - expenses;
      const profitPercent = received > 0 ? ((profit / received) * 100).toFixed(1) : 0;

      return {
        id: project.id,
        Project: project.name,
        Income: received,
        Expense: expenses,
        Profit: profit,
        "Profit %": `${profitPercent}%`
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-slate-500">Measure your business performance.</p>
        </div>
        <ExportButtons 
          data={reportData} 
          columns={["Project", "Income", "Expense", "Profit", "Profit %"]} 
          filename={`Reports_${new Date().toISOString().split('T')[0]}`} 
          title="Project Profitability Report" 
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Project Profitability</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-full sm:w-auto flex items-center gap-2">
              <label className="text-sm text-slate-500 font-medium">From:</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
                className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <label className="text-sm text-slate-500 font-medium">To:</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
                className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-sm text-red-500 hover:underline px-2">Clear</button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search projects..."
                className="flex h-10 w-full sm:w-[250px] rounded-md border border-slate-200 bg-white px-3 py-2 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expense</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Profit %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-slate-500">No projects found.</TableCell></TableRow>
                ) : reportData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.Project}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(row.Income)}</TableCell>
                    <TableCell className="text-right text-rose-600">{formatCurrency(row.Expense)}</TableCell>
                    <TableCell className={`text-right font-medium ${row.Profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.Profit)}</TableCell>
                    <TableCell className="text-right">{row["Profit %"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
