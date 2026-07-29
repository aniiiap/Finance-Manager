import { useState, useEffect } from "react"
import { useData } from "../context/DataContext"
import { formatCurrency, formatFullCurrency } from "../data/mock"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Filter, ArrowLeft, Search } from "lucide-react"

import { DateFilter } from "../components/ui/DateFilter"
import { ExportButtons } from "../components/ui/ExportButtons"

export default function Ledger() {
  const { projects, transactions, people, clients, categories } = useData()
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedParty, setSelectedParty] = useState("all")
  const [selectedClient, setSelectedClient] = useState("all")
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const getPartyName = (idOrName) => {
    if (!idOrName) return '';
    if (isNaN(idOrName)) return idOrName;
    const person = people.find(p => p.id === Number(idOrName));
    return person ? person.name : idOrName;
  };

  const getCategoryName = (idOrName) => {
    if (!idOrName) return '';
    if (isNaN(idOrName)) return idOrName;
    const cat = categories.find(c => c.id === Number(idOrName));
    return cat ? cat.name : idOrName;
  };

  const actualClients = people.filter(p => projects.some(proj => proj.client_id === p.id));
  const suppliers = people.filter(p => !projects.some(proj => proj.client_id === p.id));

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedProject, selectedParty, searchQuery])

  // Filter transactions
  let projectTransactions = transactions;
  if (selectedProject !== "all") {
    projectTransactions = projectTransactions.filter(t => (t.project_name || t.project) === selectedProject)
  }
  if (selectedClient !== "all") {
    projectTransactions = projectTransactions.filter(t => {
      const partyName = t.party_name || getPartyName(t.party_id || t.party);
      if (partyName === selectedClient) return true;
      const proj = projects.find(p => p.name === (t.project_name || t.project));
      if (proj && proj.client === selectedClient) return true;
      return false;
    })
  }
  if (selectedParty !== "all") {
    projectTransactions = projectTransactions.filter(t => getPartyName(t.party_id || t.party) === selectedParty)
  }
  if (filterDate) {
    projectTransactions = projectTransactions.filter(t => (t.date || '').startsWith(filterDate))
  }
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase()
    projectTransactions = projectTransactions.filter(tx => 
      String(tx.party_name || getPartyName(tx.party_id || tx.party) || '').toLowerCase().includes(q) || 
      String(getCategoryName(tx.category_id || tx.category) || '').toLowerCase().includes(q) ||
      String(tx.narration || '').toLowerCase().includes(q) ||
      String(tx.description || '').toLowerCase().includes(q) ||
      String(tx.project_name || tx.project || '').toLowerCase().includes(q) ||
      String(tx.amount || '').toLowerCase().includes(q) ||
      String(tx.paymentMethod || '').toLowerCase().includes(q)
    )
  }

  // Calculate running ledger
  let runningBalance = 0;
  const ledgerData = [...projectTransactions].reverse().map(tx => {
    if(tx.type === 'Income') runningBalance += Number(tx.amount);
    else runningBalance -= Number(tx.amount);
    return { ...tx, runningBalance };
  }).reverse();

  const totalPages = Math.ceil(ledgerData.length / itemsPerPage)
  const paginatedLedger = ledgerData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const exportData = ledgerData.map(tx => ({
    "Date": new Date(tx.date).toLocaleDateString(),
    "Project": tx.project_name || tx.project,
    "Party": tx.party_name || getPartyName(tx.party_id || tx.party),
    "Narration": tx.narration || tx.description || '',
    "Category": getCategoryName(tx.category_id || tx.category),
    "Method": tx.payment_method,
    "Credit": tx.type === 'Income' ? tx.amount : '',
    "Debit": tx.type === 'Expense' ? tx.amount : '',
    "Balance": tx.runningBalance
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Ledger</h2>
          <p className="text-sm text-slate-500">Chronological statement of credits and debits.</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto mt-4 lg:mt-0 flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Date", "Project", "Party", "Narration", "Category", "Method", "Credit", "Debit", "Balance"]}
            filename={`Ledger_${new Date().toISOString().split('T')[0]}`}
            title="Ledger Statement"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end w-full mt-4 md:mt-0">
        <div className="relative w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search any field..."
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
            <DateFilter value={filterDate} onChange={setFilterDate} className="bg-white h-10" />
          </div>
          <div className="w-full">
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
          <div className="w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Filter by Client</label>
            <select 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={selectedClient} 
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="all">All Clients</option>
              {actualClients.map(c => <option key={`c-${c.id}`} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Filter by Party</label>
            <select 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={selectedParty} 
              onChange={(e) => setSelectedParty(e.target.value)}
            >
              <option value="all">All Subcontractors & Suppliers</option>
              {suppliers.map(p => <option key={`p-${p.id}`} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

      {(selectedParty !== 'all' || selectedProject !== 'all') && (
        <Button 
          variant="ghost" 
          onClick={() => { setSelectedParty('all'); setSelectedProject('all'); }}
          className="text-slate-500 hover:text-slate-900 -mt-2 -ml-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Ledgers
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {selectedProject === "all" && <TableHead>Project</TableHead>}
                  <TableHead>Particulars</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right text-green-600">Credit (In)</TableHead>
                  <TableHead className="text-right text-red-600">Debit (Out)</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLedger.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-slate-500">{new Date(tx.date).toLocaleDateString()}</TableCell>
                    {selectedProject === "all" && <TableCell className="text-slate-500">{tx.project_name || tx.project}</TableCell>}
                    <TableCell>
                      <div 
                        className="font-medium text-indigo-600 hover:underline cursor-pointer"
                        onClick={() => setSelectedParty(tx.party_name || getPartyName(tx.party_id || tx.party))}
                        title="Click to view ledger for this party only"
                      >
                        {tx.party_name || getPartyName(tx.party_id || tx.party)}
                      </div>
                      {(tx.narration || tx.description) && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{tx.narration || tx.description}</div>}
                    </TableCell>
                    <TableCell>{getCategoryName(tx.category_id || tx.category)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{tx.paymentMethod || 'Net Banking'}</TableCell>
                    <TableCell className="text-right text-green-600">{tx.type === 'Income' ? formatFullCurrency(tx.amount) : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{tx.type === 'Expense' ? formatFullCurrency(tx.amount) : '-'}</TableCell>
                    <TableCell className="text-right font-bold">{formatFullCurrency(tx.runningBalance)}</TableCell>
                  </TableRow>
                ))}
                {ledgerData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={selectedProject === "all" ? 8 : 7} className="text-center py-6 text-slate-500">No transactions recorded.</TableCell>
                  </TableRow>
                )}
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
    </div>
  )
}
