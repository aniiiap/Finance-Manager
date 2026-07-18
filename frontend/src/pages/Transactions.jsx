import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { useData } from "../context/DataContext"
import { formatCurrency } from "../data/mock"
import { Filter, Download, Plus, ArrowLeft, Search, Trash2 } from "lucide-react"

export default function Transactions() {
  const { projects, transactions, people, addTransaction, deleteTransaction, categories, clients, companyInfo } = useData()
  
  const getPaymentMethods = () => {
    if (companyInfo?.payment_methods) {
      return companyInfo.payment_methods
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
    }
    return ["Net Banking", "UPI", "Cash"];
  };
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [txToDelete, setTxToDelete] = useState(null)
  const [txType, setTxType] = useState('Income')
  const [txProject, setTxProject] = useState(projects[0]?.id || '')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterProject, setFilterProject] = useState('All')
  const [selectedParty, setSelectedParty] = useState('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const selectedProjectDetails = projects.find(p => p.id === Number(txProject)) || projects.find(p => p.name === txProject)

  const getPartyName = (idOrName) => {
    if (!idOrName) return '';
    if (isNaN(idOrName)) return idOrName; // it's already a string name
    const person = people.find(p => p.id === Number(idOrName));
    return person ? person.name : idOrName;
  };

  const getCategoryName = (idOrName) => {
    if (!idOrName) return '';
    if (isNaN(idOrName)) return idOrName; // it's already a string name
    const cat = categories.find(c => c.id === Number(idOrName));
    return cat ? cat.name : idOrName;
  };

  const actualClients = people.filter(p => projects.some(proj => proj.client_id === p.id));
  const suppliers = people.filter(p => !projects.some(proj => proj.client_id === p.id));

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterProject, selectedParty, filterType])

  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase()
    const partyName = getPartyName(tx.party_id || tx.party);
    const categoryName = getCategoryName(tx.category_id || tx.category);

    const matchesSearch = partyName.toLowerCase().includes(q) || 
                          categoryName.toLowerCase().includes(q) ||
                          (tx.description || tx.narration || '').toString().toLowerCase().includes(q)
    const txProjectName = tx.project_name || tx.project
    const matchesProject = filterProject === 'All' || txProjectName === filterProject
    const matchesParty = selectedParty === 'all' || partyName === selectedParty
    return matchesSearch && matchesProject && matchesParty
  })

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="text-sm text-slate-500">Complete record of all income and expenses.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search..."
              className="flex h-10 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="flex h-10 w-40 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <select 
            className="flex h-10 w-40 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
          >
            <option value="all">All Parties</option>
            <optgroup label="Clients">
              {actualClients.map(c => <option key={`c-${c.id}`} value={c.name}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Subcontractors & Suppliers">
              {suppliers.map(p => <option key={`p-${p.id}`} value={p.name}>{p.name}</option>)}
            </optgroup>
          </select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {(selectedParty !== 'all' || filterProject !== 'All') && (
        <Button 
          variant="ghost" 
          onClick={() => { setSelectedParty('all'); setFilterProject('All'); }}
          className="text-slate-500 hover:text-slate-900 -mt-2 -ml-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Transactions
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
<Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{tx.project_name || tx.project}</TableCell>
                  <TableCell>
                     <Badge variant={tx.type === 'Income' ? 'success' : 'danger'}>{tx.type}</Badge>
                  </TableCell>
                  <TableCell>
                      <div 
                        className="font-medium text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => setSelectedParty(getPartyName(tx.party_id || tx.party))}
                        title="Click to filter by this party"
                      >
                        {getPartyName(tx.party_id || tx.party)}
                      </div>
                      {tx.description && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{tx.description}</div>}
                    </TableCell>
                  <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{tx.paymentMethod}</TableCell>
                  <TableCell className={`text-right font-semibold ${tx.type === 'Income' ? 'text-green-600' : 'text-slate-900'}`}>
                    {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.status === 'Completed' ? 'outline' : 'warning'}>{tx.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => setTxToDelete(tx.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Transaction">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
</div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries
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
                <input type="text" readOnly value={selectedProjectDetails?.client || ''} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-slate-50 cursor-not-allowed" />
                <input type="hidden" name="party_id" value={clients.find(c => c.name === selectedProjectDetails?.client)?.id || ''} />
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
      <ConfirmModal 
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => deleteTransaction(txToDelete)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
      />
    </div>
  )
}

