import React, { useState } from "react"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { Plus, Trash2, Package, ArrowDownToLine, ArrowUpFromLine, Activity, Download } from "lucide-react"

export default function Stock() {
  const { inventoryItems, inventoryTransactions, addInventoryItem, deleteInventoryItem, addInventoryTransaction, deleteInventoryTransaction, projects, user } = useData()
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [txToDelete, setTxToDelete] = useState(null)
  
  // Modal states for Transaction
  const [txType, setTxType] = useState('IN')
  const [txItemId, setTxItemId] = useState('')

  // Calculate stock balances
  const stockBalances = inventoryItems.map(item => {
    const itemTxs = inventoryTransactions.filter(tx => tx.item_id === item.id)
    const totalIn = itemTxs.filter(tx => tx.type === 'IN').reduce((sum, tx) => sum + Number(tx.quantity), 0)
    const totalOut = itemTxs.filter(tx => tx.type === 'OUT').reduce((sum, tx) => sum + Number(tx.quantity), 0)
    const balance = totalIn - totalOut
    return { ...item, totalIn, totalOut, balance }
  })

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

  const exportToCsv = () => {
    const headers = ['Material', 'Unit', 'Total In', 'Total Out', 'Current Balance']
    const csvRows = [headers.join(',')]
    
    stockBalances.forEach(item => {
      const row = [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.unit.replace(/"/g, '""')}"`,
        item.totalIn,
        item.totalOut,
        item.balance
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "stock_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Stock & Inventory</h2>
          <p className="text-sm text-slate-500">Track materials and inventory across all your projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCsv} className="gap-2">
            <Download className="w-4 h-4" /> Export to Excel
          </Button>
          <Button variant="outline" onClick={() => setIsItemModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Material
          </Button>
          <Button onClick={() => setIsTxModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Activity className="w-4 h-4" /> Record Movement
          </Button>
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
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Total In</TableHead>
                    <TableHead className="text-right">Total Out</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
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
                      <TableCell>
                        <button onClick={() => setItemToDelete(item.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockBalances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">No materials added yet.</TableCell>
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
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Movement</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryTransactions.map(tx => (
                    <TableRow key={tx.id}>
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
                      <TableCell>
                        <button onClick={() => setTxToDelete(tx.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inventoryTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500">No recent activity.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Material Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Add New Material">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Material Name</label>
            <input name="name" type="text" required placeholder="e.g. UltraTech Cement" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit of Measurement</label>
            <input name="unit" type="text" required placeholder="e.g. Bags, Kgs, Pieces" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Save Material</Button>
        </form>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleAddTx} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Movement Type</label>
              <select name="type" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txType} onChange={(e) => setTxType(e.target.value)}>
                <option value="IN">IN (Stock Received)</option>
                <option value="OUT">OUT (Stock Consumed/Sold)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <select name="item_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={txItemId} onChange={(e) => setTxItemId(e.target.value)}>
                <option value="">Select Material...</option>
                {inventoryItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <input name="quantity" type="number" step="0.01" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Narration / Notes</label>
            <textarea name="narration" rows="2" placeholder="e.g. Received from Supplier X, Used for foundation..." className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          
          <Button type="submit" className="w-full">Save Record</Button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => deleteInventoryItem(itemToDelete)}
        title="Delete Material"
        message="Are you sure you want to delete this material? All associated stock history will also be permanently deleted. This action cannot be undone."
      />

      <ConfirmModal 
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => deleteInventoryTransaction(txToDelete)}
        title="Delete Stock Record"
        message="Are you sure you want to delete this transaction record? The stock balance will be recalculated. This action cannot be undone."
      />
    </div>
  )
}

