import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { DateFilter } from "../components/ui/DateFilter"
import { ExportButtons } from "../components/ui/ExportButtons"
import { useData } from "../context/DataContext"
import { useAuth } from "../context/AuthContext"
import { formatCurrency } from "../data/mock"
import { Pagination } from "../components/ui/pagination"
import { Filter, Download, Plus, ArrowLeft, Search, Trash2, Edit2 } from "lucide-react"

export default function Transactions() {
  const { user } = useAuth()
  const { projects, transactions, people, addTransaction, updateTransaction, deleteTransaction, bulkDelete, categories, clients, companyInfo, addCategory, addPerson } = useData()
  
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false)
  const [txToDelete, setTxToDelete] = useState(null)
  const [txType, setTxType] = useState('Expense')
  const [txProject, setTxProject] = useState(projects[0]?.id || '')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterProject, setFilterProject] = useState('All')
  const [selectedParty, setSelectedParty] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  // Bulk Delete
  const [selectedIds, setSelectedIds] = useState([])

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

  const actualClients = people.filter(p => {
    if (!p.company) return false;
    if (user?.role === 'ADMIN') return true;
    return projects.some(proj => proj.client_id === p.id);
  });
  const suppliers = people.filter(p => !p.company && !projects.some(proj => proj.client_id === p.id));

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterProject, selectedParty, filterType])

  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase()
    const partyName = tx.party_name || getPartyName(tx.party_id || tx.party);
    const categoryName = getCategoryName(tx.category_id || tx.category);

    const matchesSearch = (partyName || '').toString().toLowerCase().includes(q) || 
                          (categoryName || '').toString().toLowerCase().includes(q) ||
                          (tx.description || tx.narration || '').toString().toLowerCase().includes(q) ||
                          (tx.date || '').toString().includes(q)
    const txProjectName = tx.project_name || tx.project
    const matchesProject = filterProject === 'All' || txProjectName === filterProject
    const matchesParty = selectedParty === 'all' || partyName === selectedParty
    let matchesDate = true;
    if (fromDate) matchesDate = matchesDate && new Date(tx.date) >= new Date(fromDate);
    if (toDate) matchesDate = matchesDate && new Date(tx.date) <= new Date(toDate + 'T23:59:59');
    const typeMatches = filterType === 'All' || tx.type === filterType
    return matchesSearch && matchesProject && matchesParty && matchesDate && typeMatches
  })

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;
    const success = await bulkDelete('transactions', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedTransactions.map(tx => tx.id));
    } else {
      setSelectedIds([]);
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

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

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateTransaction(txToEdit.id, {
      type: formData.get('type'),
      project_id: formData.get('project_id'),
      category_id: formData.get('category_id'),
      party_id: formData.get('party_id'),
      amount: formData.get('amount'),
      paymentMethod: formData.get('paymentMethod'),
      date: formData.get('date'),
      description: formData.get('narration')
    })
    setIsEditModalOpen(false)
    setTxToEdit(null)
  }

  const totalDebit = filteredTransactions.reduce((sum, tx) => sum + (tx.type === 'Expense' ? Number(tx.amount) : 0), 0);
  const totalCredit = filteredTransactions.reduce((sum, tx) => sum + (tx.type === 'Income' ? Number(tx.amount) : 0), 0);

  const exportData = [
    ...filteredTransactions.map(tx => ({
      "Date": new Date(tx.date).toLocaleDateString(),
      "Project": tx.project_name || tx.project,
      "Party / Client": tx.party_name || getPartyName(tx.party_id || tx.party),
      "Narration": tx.description || tx.narration || '',
      "Category": getCategoryName(tx.category_id || tx.category),
      "Method": tx.paymentMethod || tx.payment_method || '',
      "Debit": tx.type === 'Expense' ? tx.amount : '',
      "Credit": tx.type === 'Income' ? tx.amount : ''
    })),
    {
      "Date": "TOTAL",
      "Project": "",
      "Party / Client": "",
      "Narration": "",
      "Category": "",
      "Method": "",
      "Debit": totalDebit,
      "Credit": totalCredit
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
          <p className="text-sm text-slate-500">Record and manage your income and expenses.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Date", "Project", "Party / Client", "Narration", "Category", "Method", "Debit", "Credit"]}
            filename={`Transactions_${new Date().toISOString().split('T')[0]}`}
            title="Transactions Report"
          />
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/80 backdrop-blur-md p-4 rounded-xl border border-indigo-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search descriptions, parties..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          <DateFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />
          <select 
            className="flex h-10 w-40 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={selectedParty}
            onChange={(e) => { setSelectedParty(e.target.value); setFilterProject('All'); }}
          >
            <option value="all">All Parties</option>
            <optgroup label="Clients">
              {actualClients.map(c => <option key={`c-${c.id}`} value={c.name}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Subcontractors & Suppliers">
              {suppliers.map(p => <option key={`p-${p.id}`} value={p.name}>{p.name}</option>)}
            </optgroup>
          </select>
          <select 
            className="flex h-10 w-40 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="All">All Projects</option>
            {projects.filter(p => {
              if (selectedParty === 'all') return true;
              const client = actualClients.find(c => c.name === selectedParty);
              return client ? p.client_id === client.id : true;
            }).map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
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
                <TableRow className="bg-indigo-50/40 hover:bg-indigo-50/60">
                  {user?.role === 'ADMIN' && (
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-slate-300 w-4 h-4"
                        checked={paginatedTransactions.length > 0 && selectedIds.length === paginatedTransactions.length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Party / Client</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  {user?.role === 'ADMIN' && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => (
                  <TableRow key={tx.id} className={selectedIds.includes(tx.id) ? 'bg-red-50/50' : ''}>
                    {user?.role === 'ADMIN' && (
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="cursor-pointer rounded border-slate-300 w-4 h-4"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{tx.project_name || tx.project}</TableCell>
                    <TableCell>
                      <div 
                        className="font-medium text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => setSelectedParty(tx.party_name || getPartyName(tx.party_id || tx.party))}
                        title="Click to filter by this party"
                      >
                        {tx.party_name || getPartyName(tx.party_id || tx.party)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 max-w-[150px] truncate" title={tx.description || tx.narration}>
                        {tx.description || tx.narration || '--'}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{tx.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      {tx.type === 'Expense' ? (
                        <span className="font-medium text-red-600">{formatCurrency(tx.amount)}</span>
                      ) : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.type === 'Income' ? (
                        <span className="font-medium text-green-600">{formatCurrency(tx.amount)}</span>
                      ) : '--'}
                    </TableCell>
                    {user?.role === 'ADMIN' && (
                      <TableCell className="flex gap-2">
                        <button 
                          onClick={() => { setTxToEdit(tx); setTxType(tx.type); setTxProject(tx.project_id || txProject); setIsEditModalOpen(true); }} 
                          className="text-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all" 
                          title="Edit Transaction"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setTxToDelete(tx.id)} 
                          className="text-rose-400 hover:text-rose-600 hover:scale-110 transition-all" 
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
                      <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.name}</option>
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
                <input type="hidden" name="party_id" value={clients.find(c => c.name === selectedProjectDetails?.client)?.id || ''} />
              </>
            ) : (
              <select name="party_id" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" onChange={(e) => { if (e.target.value === "CREATE_NEW") { setIsPersonModalOpen(true); e.target.value = ""; } }}>
                <option value="">Select Person...</option>
                {people.filter(p => p.role === 'SUBCONTRACTOR' || !p.company).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="CREATE_NEW" className="font-bold text-indigo-600">+ Create New Person</option>
              </select>
            )}
          </div>
          <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Transaction">
        {txToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <input name="date" type="date" required defaultValue={new Date(txToEdit.date).toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
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
                <input name="amount" type="number" required defaultValue={txToEdit.amount} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select name="category_id" required defaultValue={txToEdit.category_id} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" onChange={(e) => { if (e.target.value === "CREATE_NEW") { setIsCategoryModalOpen(true); e.target.value = ""; } }}>
                  <option value="">Select Category...</option>
                  {categories.filter(c => c.type === txType && !c.parent_id).map(parent => (
                    <React.Fragment key={parent.id}>
                      <option value={parent.id}>{parent.name}</option>
                      {categories.filter(c => c.parent_id === parent.id).map(child => (
                        <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                  <option value="CREATE_NEW" className="font-bold text-indigo-600">+ Create New Category</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select name="paymentMethod" defaultValue={txToEdit.paymentMethod || txToEdit.payment_method} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                  {getPaymentMethods().map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Narration (Optional)</label>
              <textarea name="narration" rows="2" defaultValue={txToEdit.description || txToEdit.narration} placeholder="Brief description of the transaction..." className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm"></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{txType === 'Income' ? 'Received From (Client)' : 'Paid To (Subcontractor/Supplier)'}</label>
              {txType === 'Income' ? (
                <>
                  <input type="text" readOnly value={selectedProjectDetails?.client || ''} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-slate-50 cursor-not-allowed" />
                  <input type="hidden" name="party_id" value={clients.find(c => c.name === selectedProjectDetails?.client)?.id || ''} />
                </>
              ) : (
                <select name="party_id" defaultValue={txToEdit.party_id} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" onChange={(e) => { if (e.target.value === "CREATE_NEW") { setIsPersonModalOpen(true); e.target.value = ""; } }}>
                  <option value="">Select Person...</option>
                  {people.filter(p => p.role === 'SUBCONTRACTOR' || !p.company).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="CREATE_NEW" className="font-bold text-indigo-600">+ Create New Person</option>
                </select>
              )}
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        )}
      </Modal>
      <ConfirmModal 
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => deleteTransaction(txToDelete)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
      />

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
          <Button type="submit" className="w-full">Create Category</Button>
        </form>
      </Modal>

      <Modal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} title="Create New Person">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const name = e.target.name.value;
          await addPerson({ name, role: 'SUBCONTRACTOR', workAssigned: '', project: txProject });
          setIsPersonModalOpen(false);
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Person / Company Name</label>
            <input name="name" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Create Person</Button>
        </form>
      </Modal>
    </div>
  )
}


