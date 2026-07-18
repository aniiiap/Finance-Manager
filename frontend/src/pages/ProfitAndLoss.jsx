import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { useData } from "../context/DataContext"
import { formatCurrency, formatFullCurrency } from "../data/mock"
import { useState } from "react"

export default function ProfitAndLoss() {
  const { transactions, projects, categories, people } = useData()
  const [selectedProject, setSelectedProject] = useState("all")

  const getPartyName = (idOrName) => {
    if (!idOrName) return '--';
    if (isNaN(idOrName)) return idOrName;
    const person = people.find(p => p.id === Number(idOrName));
    return person ? person.name : idOrName;
  };

  const getCategoryName = (idOrName) => {
    if (!idOrName) return 'Uncategorized';
    if (isNaN(idOrName)) return idOrName;
    const cat = categories.find(c => c.id === Number(idOrName));
    return cat ? cat.name : idOrName;
  };

  const filteredTransactions = selectedProject === "all" 
    ? transactions 
    : transactions.filter(t => (t.project_name || t.project) === selectedProject)

  const incomeTxs = filteredTransactions.filter(t => t.type === 'Income')
  const expenseTxs = filteredTransactions.filter(t => t.type === 'Expense')

  const totalIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = expenseTxs.reduce((sum, t) => sum + Number(t.amount), 0)
  const netProfit = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0

  // Group by category
  const groupByCat = (txs) => {
    return txs.reduce((acc, tx) => {
      const catName = getCategoryName(tx.category_id || tx.category);
      if (!acc[catName]) acc[catName] = []
      acc[catName].push(tx)
      return acc
    }, {})
  }

  const incomeCategories = groupByCat(incomeTxs)
  const expenseCategories = groupByCat(expenseTxs)

  const renderCategoryGroup = (title, groupedTxs, isIncome) => {
    const totalForGroup = Object.values(groupedTxs).flat().reduce((sum, tx) => sum + Number(tx.amount), 0)
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={isIncome ? 'text-green-700' : 'text-red-700'}>{title}</CardTitle>
          <div className={`text-xl font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalForGroup)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedTxs).map(([category, txs]) => {
              const catTotal = txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
              return (
                <div key={category} className="border rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{category}</span>
                    <span className="font-semibold">{formatCurrency(catTotal)}</span>
                  </div>
                  <div className="overflow-x-auto w-full">
<Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>{isIncome ? 'Received From' : 'Paid To'}</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txs.map(tx => (
                        <TableRow key={tx.id} className="text-sm">
                          <TableCell className="text-slate-500">{new Date(tx.date).toLocaleDateString()}</TableCell>
                          <TableCell>{getPartyName(tx.party_id || tx.party)}</TableCell>
                          <TableCell className="text-slate-500">{tx.project_name || tx.project}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatFullCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              )
            })}
            {Object.keys(groupedTxs).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No transactions found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profit and Loss Statement</h2>
          <p className="text-sm text-slate-500">Comprehensive view of your business income, expenses, and net profit.</p>
        </div>
        <div className="w-64">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Filter by Project</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">Entire Company (All Projects)</option>
            {projects.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 text-slate-50">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Total Operating Income</h3>
            <div className="text-3xl font-bold">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Expenses</h3>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Net Profit</h3>
            <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-slate-500 mt-2">{profitMargin}% Net Margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {renderCategoryGroup("Income Breakdown", incomeCategories, true)}
        {renderCategoryGroup("Expense Breakdown", expenseCategories, false)}
      </div>
    </div>
  )
}

