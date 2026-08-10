import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { formatCurrency, formatFullCurrency } from "../data/mock"
import { TrendingUp, CreditCard, FolderKanban, IndianRupee, Plus, BookOpen } from "lucide-react"
import { useData } from "../context/DataContext"
import { Modal } from "../components/ui/modal"
import { Button } from "../components/ui/button"
import React, { useState } from "react"

export default function Dashboard() {
  const { user } = useAuth()
  const { clients, projects, transactions, people, addTransaction, addClient, addProject, categories, addCategory, companyInfo } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [txType, setTxType] = useState('Expense')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [txProject, setTxProject] = useState(projects[0]?.id || '')

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

  const recentProjects = projectsWithMetrics.slice(0, 3)
  const recentTransactions = transactions.slice(0, 5)

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addTransaction({
      type: formData.get('type'),
      project_id: formData.get('project_id'),
      category_id: formData.get('category_id'),
      party_id: formData.get('party_id'),
      amount: formData.get('amount'),
      paymentMethod: formData.get('paymentMethod'),
      date: formData.get('date'),
      description: formData.get('narration')
    })
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-4rem)] -m-4 p-4 md:-m-8 md:p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Dashboard</h2>
        {user?.role !== 'USER' && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-5 h-5" /> Add Transaction
          </Button>
        )}
      </div>

      {companyInfo ? (
        <div className="bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden transform transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-56 h-56 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            {companyInfo.logo_url ? (
              <div className="relative group mix-blend-multiply">
                <img src={companyInfo.logo_url} alt="Logo" className="relative w-36 h-36 md:w-40 md:h-40 object-contain transform transition duration-500 group-hover:scale-105" />
              </div>
            ) : (
              <div className="w-36 h-36 md:w-40 md:h-40 rounded-3xl border-4 border-white/40 shadow-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-7xl font-black">
                {companyInfo.company_name?.charAt(0) || 'C'}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 drop-shadow-md">{companyInfo.company_name}</h1>
              <div className="inline-block bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30">
                <p className="text-amber-50 text-xl font-medium drop-shadow-sm">Managed by <span className="text-white font-extrabold">{companyInfo.admin_name}</span></p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <h1 className="text-5xl font-black tracking-tight mb-3 relative z-10">Welcome to FinManager</h1>
          <p className="text-amber-100 text-xl font-medium relative z-10">Here's an overview of your business.</p>
        </div>
      )}

      {user?.role !== 'USER' && (
        <div className="mt-10">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-rose-500" /> Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              {recentProjects.map(project => (
                <div key={project.id} className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-slate-700 text-base">{project.name}</div>
                    <div className="text-base font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      Profit {formatCurrency(project.received - project.expenses)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={project.progress} className="h-3 flex-1 bg-slate-100" indicatorClassName="bg-gradient-to-r from-amber-400 to-rose-500" />
                    <span className="text-sm font-bold text-slate-600 w-10 text-right">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      )}      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select name="type" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txType} onChange={(e) => setTxType(e.target.value)}>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <select name="project_id" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txProject} onChange={(e) => setTxProject(e.target.value)}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              <select name="category_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" onChange={(e) => { if (e.target.value === "CREATE_NEW") { setIsCategoryModalOpen(true); e.target.value = ""; } }}>
                <option value="">Select Category...</option>
                {categories.filter(c => c.type === txType && !c.parent_id).map(parent => (
                  <React.Fragment key={parent.id}>
                    <option value={parent.id}>{parent.name}</option>
                    {categories.filter(c => c.parent_id === parent.id).map(child => (
                      <option key={child.id} value={child.id}>&nbsp;&nbsp;— {child.name}</option>
                    ))}
                  </React.Fragment>
                ))}
                <option value="CREATE_NEW" className="font-bold text-indigo-600">+ Create New Category</option>
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
              <>
                <input type="text" readOnly value={selectedProjectDetails?.client || ''} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-slate-50 cursor-not-allowed" />
                <input type="hidden" name="party_id" value={people.find(c => c.name === selectedProjectDetails?.client)?.id || ''} />
              </>
            ) : (
              <select name="party_id" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select Person...</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </Modal>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Create New Category">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const name = e.target.name.value;
          const parent_id = e.target.parent_id.value || null;
          await addCategory({ name, parent_id, type: txType, status: 'Active' });
          setIsCategoryModalOpen(false);
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category Name</label>
            <input name="name" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Parent Category (Optional)</label>
            <select name="parent_id" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="">None (Top Level)</option>
              {categories.filter(c => c.type === txType && !c.parent_id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white">Create Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
