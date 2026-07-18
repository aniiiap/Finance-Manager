import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency, formatFullCurrency } from "../data/mock"
import { TrendingUp, CreditCard, FolderKanban, IndianRupee, Plus, BookOpen } from "lucide-react"
import { useData } from "../context/DataContext"
import { Modal } from "../components/ui/modal"
import { Button } from "../components/ui/button"
import { useState } from "react"

const monthlyData = [
  { name: 'May', income: 4000000, expense: 2400000 },
  { name: 'Jun', income: 3000000, expense: 1398000 },
  { name: 'Jul', income: 2000000, expense: 9800000 },
  { name: 'Aug', income: 2780000, expense: 3908000 },
  { name: 'Sep', income: 1890000, expense: 4800000 },
  { name: 'Oct', income: 2390000, expense: 3800000 },
];

const pieData = [
  { name: 'Labour', value: 400000 },
  { name: 'Material', value: 3000000 },
  { name: 'Machinery', value: 300000 },
  { name: 'Transport', value: 200000 },
];

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8'];

export default function Dashboard() {
  const { clients, projects, transactions, people, addTransaction, addClient, addProject, categories, companyInfo } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [txType, setTxType] = useState('Income')
  const [txProject, setTxProject] = useState(projects[0]?.name || '')

  const getPaymentMethods = () => {
    if (companyInfo?.payment_methods) {
      return companyInfo.payment_methods
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
    }
    return ["Net Banking", "UPI", "Cash"];
  };

  const selectedProjectDetails = projects.find(p => p.name === txProject)
  
  const projectsWithMetrics = projects.map(p => {
    const pTxs = transactions.filter(t => t.project_id === p.id || t.project === p.name);
    const received = pTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = pTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const progress = p.budget > 0 ? Math.min(100, Math.round((expenses / p.budget) * 100)) : 0;
    return { ...p, received, expenses, progress };
  });

  const activeProjects = projectsWithMetrics.filter(p => p.status === 'Active')
  const completedProjects = projectsWithMetrics.filter(p => p.status === 'Completed')
  const recentProjects = projectsWithMetrics.slice(0, 3)
  const recentTransactions = transactions.slice(0, 5)

  // Dynamically calculate totals
  const totalIncome = projectsWithMetrics.reduce((sum, p) => sum + p.received, 0)
  const totalExpenses = projectsWithMetrics.reduce((sum, p) => sum + p.expenses, 0)
  const netProfit = totalIncome - totalExpenses
  const pendingPayments = projectsWithMetrics.reduce((sum, p) => sum + (Number(p.budget) - p.received), 0)
  const ledgerBalance = totalIncome - totalExpenses; // Cash balance

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addTransaction({
      type: formData.get('type'),
      project: formData.get('project'),
      category: formData.get('category'),
      party: formData.get('party'),
      amount: formData.get('amount'),
      paymentMethod: formData.get('paymentMethod'),
      date: formData.get('date'),
      narration: formData.get('narration')
    })
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-base text-slate-600 mt-1">
            {companyInfo ? (
              <>Welcome back to <span className="font-bold text-slate-900">{companyInfo.company_name}</span>! Managed by <span className="font-bold text-slate-900">{companyInfo.admin_name}</span>.</>
            ) : "Welcome back! Here's an overview of your business."}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ledger Balance</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(ledgerBalance)}</div>
            <p className="text-xs text-slate-500">Current cash</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-slate-500">{activeProjects.length} Active, {completedProjects.length} Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <IndianRupee className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-slate-500">Across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(netProfit)}</div>
            <p className="text-xs text-slate-500">Margin: {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingPayments)}</div>
            <p className="text-xs text-slate-500">To be received</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentProjects.map(project => (
                <div key={project.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">{project.name}</div>
                    <div className="text-sm font-semibold text-green-600">Profit {formatCurrency(project.received - project.expenses)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={project.progress} className="h-2 flex-1" />
                    <span className="text-xs text-slate-500 w-8">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'Income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'Income' ? '+' : '-'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{tx.party}</div>
                      <div className="text-xs text-slate-500">{tx.category}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${tx.type === 'Income' ? 'text-green-600' : 'text-slate-900'}`}>
                    {tx.type === 'Income' ? '+' : '-'} {formatFullCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select name="type" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txType} onChange={(e) => setTxType(e.target.value)}>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <select name="project" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txProject} onChange={(e) => setTxProject(e.target.value)}>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹)</label>
              <input name="amount" type="number" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select name="category" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select Category...</option>
                {categories.filter(c => c.type === txType).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <select name="paymentMethod" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                {getPaymentMethods().map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Narration (Optional)</label>
            <textarea name="narration" rows="2" placeholder="Brief description of the transaction..." className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{txType === 'Income' ? 'Received From (Client)' : 'Paid To (Subcontractor/Supplier)'}</label>
            {txType === 'Income' ? (
              <input name="party" type="text" readOnly value={selectedProjectDetails?.client || ''} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-slate-50 cursor-not-allowed" />
            ) : (
              <select name="party" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select Person...</option>
                {people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>
          <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </Modal>
    </div>
  )
}

