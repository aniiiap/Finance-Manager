import React, { useState, useEffect } from "react"
import { DateFilter } from "../components/ui/DateFilter"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { Plus, Trash2, Package, ArrowDownToLine, ArrowUpFromLine, Activity, Search, Edit2 } from "lucide-react"
import { ExportButtons } from "../components/ui/ExportButtons"
import { Pagination } from "../components/ui/pagination"
import { useAuth } from "../context/AuthContext"

export default function Stock() {
  const { user } = useAuth()
  const { inventoryItems, inventoryTransactions, addInventoryItem, updateInventoryItem, deleteInventoryItem, addInventoryTransaction, updateInventoryTransaction, deleteInventoryTransaction, projects, bulkDelete } = useData()
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [txToDelete, setTxToDelete] = useState(null)
  
  // Modal states for Transaction
  const [txType, setTxType] = useState('IN')
  const [txItemId, setTxItemId] = useState('')

  // Filters & Bulk Delete for Transactions
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTxIds, setSelectedTxIds] = useState([])

  const handleBulkDeleteTx = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTxIds.length} transactions?`)) return;
    const success = await bulkDelete('inventory_transactions', selectedTxIds);
    if (success) setSelectedTxIds([]);
  }

  const toggleSelectAllTx = (e) => {
    if (e.target.checked) setSelectedTxIds(paginatedTransactions.map(i => i.id));
    else setSelectedTxIds([]);
  }

  const toggleSelectTx = (id) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  // Calculate stock balances
  const stockBalances = inventoryItems.map(item => {
    const itemTxs = inventoryTransactions.filter(tx => tx.item_id === item.id)
    const totalIn = itemTxs.filter(tx => tx.type === 'IN').reduce((sum, tx) => sum + Number(tx.quantity), 0)
    const totalOut = itemTxs.filter(tx => tx.type === 'OUT').reduce((sum, tx) => sum + Number(tx.quantity), 0)
    const balance = totalIn - totalOut
    return { ...item, totalIn, totalOut, balance }
  })

  const filteredTransactions = inventoryTransactions.filter(tx => {
    const searchMatch = (tx.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (tx.narration || '').toLowerCase().includes(searchQuery.toLowerCase());
    const dateMatch = filterDate ? (tx.date || '').startsWith(filterDate) : true;
    return searchMatch && dateMatch;
  });

  // Pagination logic
  const pageSize = 10;
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDate]);

  const handleAddItem = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addInventoryItem({
      name: formData.get('name'),
      unit: formData.get('unit')
    })
    setIsItemModalOpen(false)
  }

  const handleAddTx = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addInventoryTransaction({
      item_id: formData.get('item_id'),
      project_id: null,
      type: formData.get('type'),
      quantity: formData.get('quantity'),
      date: formData.get('date'),
      narration: formData.get('narration')
    })
    setIsTxModalOpen(false)
  }

  const handleEditItem = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateInventoryItem(itemToEdit.id, {
      name: formData.get('name'),
      unit: formData.get('unit')
    })
    setIsEditItemModalOpen(false)
    setItemToEdit(null)
  }

  const handleEditTx = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateInventoryTransaction(txToEdit.id, {
      item_id: formData.get('item_id'),
      project_id: null,
      type: formData.get('type'),
      quantity: formData.get('quantity'),
      date: formData.get('date'),
      narration: formData.get('narration')
    })
    setIsEditTxModalOpen(false)
    setTxToEdit(null)
  }

  const exportData = stockBalances.map(item => ({
    "Material": item.name,
    "Unit": item.unit,
    "Total In": item.totalIn,
    "Total Out": item.totalOut,
    "Current Balance": item.balance
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock & Inventory</h2>
          <p className="text-sm text-slate-500">Track materials and inventory across all your projects.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {selectedTxIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDeleteTx} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete {selectedTxIds.length} Txs
            </Button>
          )}
          <ExportButtons 
            data={exportData} 
            columns={["Material", "Unit", "Total In", "Total Out", "Current Balance"]}
            filename={`Stock_${new Date().toISOString().split('T')[0]}`}
            title="Stock & Inventory Report"
          />
          <Button variant="outline" onClick={() => setIsItemModalOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New Material
          </Button>
          <Button onClick={() => setIsTxModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
            <Activity className="w-4 h-4" /> Record Movement
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search stock activity..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Materials</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
            <p className="text-xs text-slate-500">Total item types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Received</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryTransactions.filter(t => t.type === 'IN').length}</div>
            <p className="text-xs text-slate-500">Total IN transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Consumed</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryTransactions.filter(t => t.type === 'OUT').length}</div>
            <p className="text-xs text-slate-500">Total OUT transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Current Stock Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Total In</TableHead>
                    <TableHead className="text-right">Total Out</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    {user?.role === 'ADMIN' && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockBalances.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        <div className="text-xs text-slate-500">Unit: {item.unit}</div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">+{item.totalIn}</TableCell>
                      <TableCell className="text-right text-rose-600">-{item.totalOut}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{item.balance} {item.unit}</TableCell>
                      {user?.role === 'ADMIN' && (
                        <TableCell className="flex gap-2">
                          <button onClick={() => { setItemToEdit(item); setIsEditItemModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setItemToDelete(item.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {stockBalances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'ADMIN' ? 5 : 4} className="text-center py-6 text-slate-500">No materials added yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {user?.role === 'ADMIN' && (
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          className="cursor-pointer rounded border-slate-300 w-4 h-4"
                          checked={paginatedTransactions.length > 0 && selectedTxIds.length === paginatedTransactions.length}
                          onChange={toggleSelectAllTx}
                        />
                      </TableHead>
                    )}
                    <TableHead>Date</TableHead>
                    <TableHead>Movement</TableHead>
                    <TableHead>Notes</TableHead>
                    {user?.role === 'ADMIN' && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'ADMIN' ? 5 : 4} className="text-center py-6 text-slate-500">No transactions found.</TableCell>
                    </TableRow>
                  ) : paginatedTransactions.map(tx => (
                    <TableRow key={tx.id} className={selectedTxIds.includes(tx.id) ? 'bg-red-50/50' : ''}>
                      {user?.role === 'ADMIN' && (
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="cursor-pointer rounded border-slate-300 w-4 h-4"
                            checked={selectedTxIds.includes(tx.id)}
                            onChange={() => toggleSelectTx(tx.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {tx.type === 'IN' ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className={`font-semibold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.type === 'IN' ? '+' : '-'}{tx.quantity} {tx.item_unit}
                            </div>
                            <div className="text-xs text-slate-500">{tx.item_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.narration && <div className="text-xs text-slate-500">{tx.narration}</div>}
                      </TableCell>
                      {user?.role === 'ADMIN' && (
                        <TableCell className="flex gap-2">
                          <button onClick={() => { setTxToEdit(tx); setTxType(tx.type); setTxItemId(tx.item_id); setIsEditTxModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setTxToDelete(tx.id)} className="text-slate-400 hover:text-red-600 transition-colors">
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
      </div>

      {/* Material Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Add New Material">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Material Name</label>
            <input name="name" required className="w-full border rounded-md p-2" placeholder="e.g., Cement" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit of Measurement</label>
            <input name="unit" required className="w-full border rounded-md p-2" placeholder="e.g., Bags, Kg, Tons" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Material</Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleAddTx} className="space-y-4">
          <div className="flex gap-4 mb-6">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${txType === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}>
              <input type="radio" name="type" value="IN" checked={txType === 'IN'} onChange={() => setTxType('IN')} className="hidden" />
              <ArrowDownToLine className="w-4 h-4" /> Stock Received (IN)
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${txType === 'OUT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'hover:bg-slate-50'}`}>
              <input type="radio" name="type" value="OUT" checked={txType === 'OUT'} onChange={() => setTxType('OUT')} className="hidden" />
              <ArrowUpFromLine className="w-4 h-4" /> Stock Consumed (OUT)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Material</label>
            <select name="item_id" required value={txItemId} onChange={(e) => setTxItemId(e.target.value)} className="w-full border rounded-md p-2">
              <option value="">Select material...</option>
              {inventoryItems.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input name="quantity" type="number" step="0.01" required className="w-full border rounded-md p-2" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Narration / Notes</label>
            <input name="narration" className="w-full border rounded-md p-2" placeholder="Supplier name, delivery note, or reason..." />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsTxModalOpen(false)}>Cancel</Button>
            <Button type="submit">Record Movement</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Material Modal */}
      <Modal isOpen={isEditItemModalOpen} onClose={() => setIsEditItemModalOpen(false)} title="Edit Material">
        {itemToEdit && (
          <form onSubmit={handleEditItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Material Name</label>
              <input name="name" required defaultValue={itemToEdit.name} className="w-full border rounded-md p-2" placeholder="e.g., Cement" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit of Measurement</label>
              <input name="unit" required defaultValue={itemToEdit.unit} className="w-full border rounded-md p-2" placeholder="e.g., Bags, Kg, Tons" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditItemModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal isOpen={isEditTxModalOpen} onClose={() => setIsEditTxModalOpen(false)} title="Edit Stock Movement">
        {txToEdit && (
          <form onSubmit={handleEditTx} className="space-y-4">
            <div className="flex gap-4 mb-6">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${txType === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}>
                <input type="radio" name="type" value="IN" checked={txType === 'IN'} onChange={() => setTxType('IN')} className="hidden" />
                <ArrowDownToLine className="w-4 h-4" /> Stock Received (IN)
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${txType === 'OUT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'hover:bg-slate-50'}`}>
                <input type="radio" name="type" value="OUT" checked={txType === 'OUT'} onChange={() => setTxType('OUT')} className="hidden" />
                <ArrowUpFromLine className="w-4 h-4" /> Stock Consumed (OUT)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" name="date" required defaultValue={new Date(txToEdit.date).toISOString().split('T')[0]} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Material</label>
              <select name="item_id" required value={txItemId} onChange={(e) => setTxItemId(e.target.value)} className="w-full border rounded-md p-2">
                <option value="">Select material...</option>
                {inventoryItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input name="quantity" type="number" step="0.01" required defaultValue={txToEdit.quantity} className="w-full border rounded-md p-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Narration / Notes</label>
              <input name="narration" defaultValue={txToEdit.narration} className="w-full border rounded-md p-2" placeholder="Supplier name, delivery note, or reason..." />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditTxModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmations */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          deleteInventoryItem(itemToDelete)
          setItemToDelete(null)
        }}
        title="Delete Material"
        message="Are you sure? This will hide the material. History will be kept."
      />

      <ConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => {
          deleteInventoryTransaction(txToDelete)
          setTxToDelete(null)
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this stock movement?"
      />
    </div>
  )
}
