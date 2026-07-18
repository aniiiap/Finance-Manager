import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useData } from "../context/DataContext"
import { formatCurrency, formatFullCurrency } from "../data/mock"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { ArrowLeft, Wallet, TrendingUp, CreditCard, Clock, UserCircle2, Building2, Calendar, FileText, IndianRupee, PieChart, Users, BookOpen, Plus, Trash2, Search } from "lucide-react"
import { Button } from "../components/ui/button"
import { Modal } from "../components/ui/modal"

export default function ProjectDetail() {
  const { id } = useParams()
  const { projects, transactions, people, addTransaction, addPerson, deletePerson, categories, companyInfo } = useData()
  const project = projects.find(p => p.id === parseInt(id)) || projects[0]
  
  const getPaymentMethods = () => {
    if (companyInfo?.payment_methods) {
      return companyInfo.payment_methods
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
    }
    return ["Net Banking", "UPI", "Cash"];
  };
  const [activeTab, setActiveTab] = useState('ledger')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeTab])

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [txType, setTxType] = useState('Income')
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false)
  
  let projectTransactions = transactions.filter(t => (t.project_name || t.project) === project.name)
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase()
    projectTransactions = projectTransactions.filter(tx => 
      (tx.party_id || tx.party || '').toString().toLowerCase().includes(q) || 
      (tx.category_id || tx.category || '').toString().toLowerCase().includes(q) ||
      (tx.narration && tx.narration.toLowerCase().includes(q)) ||
      (tx.description && tx.description.toLowerCase().includes(q))
    )
  }
  const incomeTxs = projectTransactions.filter(t => t.type === 'Income')
  const expenseTxs = projectTransactions.filter(t => t.type === 'Expense')

  // Calculate running ledger
  let runningBalance = 0;
  const ledgerData = [...projectTransactions].reverse().map(tx => {
    if(tx.type === 'Income') runningBalance += Number(tx.amount);
    else runningBalance -= Number(tx.amount);
    return { ...tx, runningBalance };
  }).reverse();

  const totalPages = Math.ceil(ledgerData.length / itemsPerPage)
  const paginatedLedger = ledgerData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = expenseTxs.reduce((sum, t) => sum + Number(t.amount), 0)
  
  // Show people who were created on this project, or have been paid on this project
  const projectPeople = people.filter(p => p.project === project.name || expenseTxs.some(tx => tx.party_id === p.id || tx.party === p.name))

  const getPartyName = (idOrName) => {
    if (!idOrName) return '';
    const numId = Number(idOrName);
    if (!isNaN(numId)) {
      const p = people.find(x => x.id === numId);
      if (p) return p.name;
    }
    return idOrName;
  }

  const getCategoryName = (idOrName) => {
    if (!idOrName) return '';
    const numId = Number(idOrName);
    if (!isNaN(numId)) {
      const c = categories.find(x => x.id === numId);
      if (c) return c.name;
    }
    return idOrName;
  }

  const handleTxSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addTransaction({
      type: formData.get('type'),
      project_id: project.id,
      category_id: formData.get('category_id'),
      party_id: formData.get('party_id'),
      amount: formData.get('amount'),
      paymentMethod: formData.get('paymentMethod'),
      date: formData.get('date'),
      description: formData.get('narration')
    })
    setIsTxModalOpen(false)
  }

  const handlePersonSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addPerson({
      name: formData.get('name'),
      role: formData.get('role'),
      workAssigned: formData.get('workAssigned'),
      project: project.name
    })
    setIsPersonModalOpen(false)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Badge variant="outline" className="font-normal">{project.status}</Badge>
            <span>•</span>
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {project.client}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <Wallet className="w-4 h-4" />
              <h3 className="text-sm font-medium">Budget</h3>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-medium">Total Income</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-medium">Total Expenses</h3>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <CreditCard className="w-4 h-4 text-yellow-600" />
              <h3 className="text-sm font-medium">Pending Payments</h3>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(project.budget - totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <Clock className="w-4 h-4" />
              <h3 className="text-sm font-medium">Progress</h3>
            </div>
            <div className="text-2xl font-bold mb-2">{project.progress}%</div>
            <Progress value={project.progress} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-end justify-between border-b pb-0">
        <div className="flex space-x-1">
            <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'ledger' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <BookOpen className="w-4 h-4" /> Ledger
            </button>
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <FileText className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => setActiveTab('income')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'income' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <IndianRupee className="w-4 h-4" /> Income
            </button>
            <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'expenses' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <PieChart className="w-4 h-4" /> Expenses
            </button>
            <button onClick={() => setActiveTab('people')} className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'people' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Users className="w-4 h-4" /> People
            </button>
        </div>
        <div className="pb-2 pr-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-9 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'ledger' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Ledger</CardTitle>
              <Button size="sm" onClick={() => setIsTxModalOpen(true)} className="gap-2"><Plus className="w-4 h-4"/> Add Entry</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right text-green-600">Credit (In)</TableHead>
                    <TableHead className="text-right text-red-600">Debit (Out)</TableHead>
                    <TableHead className="text-right font-bold">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLedger.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{getPartyName(tx.party_id || tx.party)}</TableCell>
                      <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{tx.paymentMethod || 'Net Banking'}</TableCell>
                      <TableCell className="text-right text-green-600">{tx.type === 'Income' ? formatFullCurrency(tx.amount) : '-'}</TableCell>
                      <TableCell className="text-right text-red-600">{tx.type === 'Expense' ? formatFullCurrency(tx.amount) : '-'}</TableCell>
                      <TableCell className="text-right font-bold">{formatFullCurrency(tx.runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
</div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <span className="text-sm text-slate-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, ledgerData.length)} of {ledgerData.length} entries
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <div className="flex items-center justify-center px-3 text-sm font-medium border border-slate-200 rounded-md bg-slate-50 text-slate-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTransactions.slice(0, 5).map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'Income' ? 'default' : 'secondary'} className={tx.type === 'Income' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{getPartyName(tx.party_id || tx.party)}</div>
                        {(tx.narration || tx.description) && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{tx.narration || tx.description}</div>}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.type === 'Income' ? 'text-green-600' : 'text-slate-900'}`}>
                        {tx.type === 'Income' ? '+' : '-'} {formatFullCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
</div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'income' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Income Transactions</CardTitle>
              <Button size="sm" onClick={() => { setTxType('Income'); setIsTxModalOpen(true); }} className="gap-2"><Plus className="w-4 h-4"/> Add Income</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTxs.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{getPartyName(tx.party_id || tx.party)}</TableCell>
                      <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{tx.paymentMethod || 'Net Banking'}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">+{formatFullCurrency(tx.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
</div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'expenses' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expense Transactions</CardTitle>
              <Button size="sm" onClick={() => { setTxType('Expense'); setIsTxModalOpen(true); }} className="gap-2"><Plus className="w-4 h-4"/> Add Expense</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Paid To</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTxs.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{getPartyName(tx.party_id || tx.party)}</TableCell>
                      <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{tx.paymentMethod || 'Net Banking'}</TableCell>
                      <TableCell className="text-right text-slate-900 font-semibold">-{formatFullCurrency(tx.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
</div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'people' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>People & Subcontractors</CardTitle>
              <Button size="sm" onClick={() => setIsPersonModalOpen(true)} className="gap-2"><Plus className="w-4 h-4"/> Add Person</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Work Assigned</TableHead>
                    <TableHead className="text-right">Paid on this Project</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectPeople.map(person => {
                    const personExpenses = expenseTxs.filter(tx => tx.party === person.name || tx.party_id === person.id)
                    const totalForPerson = personExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0)
                    return (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-slate-400" />
                          {person.name}
                        </TableCell>
                        <TableCell>{person.role}</TableCell>
                        <TableCell>{person.workAssigned}</TableCell>
                        <TableCell className="text-right font-semibold">{formatFullCurrency(totalForPerson)}</TableCell>
                        <TableCell>
                          <button onClick={() => deletePerson(person.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Person">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction Modal */}
      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={`Add ${txType} to ${project.name}`}>
        <form onSubmit={handleTxSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (₹)</label>
            <input name="amount" type="number" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select name="category_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select Category...</option>
                {categories.filter(c => c.type === txType && !c.parent_id).map(parent => (
                  <React.Fragment key={parent.id}>
                    <option value={parent.id}>{parent.name}</option>
                    {categories.filter(c => c.parent_id === parent.id).map(child => (
                      <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.name}</option>
                    ))}
                  </React.Fragment>
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
              <>
                <input type="text" readOnly value={project.client || ''} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-slate-50 cursor-not-allowed" />
                <input type="hidden" name="party_id" value={people.find(c => c.name === project.client)?.id || ''} />
              </>
            ) : (
              <select name="party_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select Person...</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </Modal>

      {/* Person Modal */}
      <Modal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} title="Add Subcontractor / Person">
        <form onSubmit={handlePersonSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name or Company</label>
            <input name="name" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role (e.g. Labour, Supplier)</label>
            <select name="role" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="">Select a Role...</option>
              {categories.filter(c => c.type === 'Role').map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Work Assigned</label>
            <input name="workAssigned" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Save Person</Button>
        </form>
      </Modal>
    </div>
  )
}

