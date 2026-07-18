import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { formatCurrency } from "../data/mock"
import { useData } from "../context/DataContext"

export default function Reports() {
  const { projects, transactions } = useData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-sm text-slate-500">Measure your business performance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Profitability</CardTitle>
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
              {projects.map((project) => {
                const projectTxs = transactions.filter(t => t.project_id === project.id || t.project === project.name);
                const received = projectTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0);
                const expenses = projectTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);
                const profit = received - expenses;
                const profitPercent = received > 0 ? ((profit / received) * 100).toFixed(1) : 0;
                
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(received)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expenses)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(profit)}</TableCell>
                    <TableCell className="text-right">{profitPercent}%</TableCell>
                  </TableRow>
                )
              })}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-500">No projects to display.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>
    </div>
  )
}

