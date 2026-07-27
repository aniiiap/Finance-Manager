import React, { useState } from "react"
import { DateFilter } from "../components/ui/DateFilter"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { ExportButtons } from "../components/ui/ExportButtons"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { Plus, Trash2, Tag, CornerDownRight, Search, Edit2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Categories() {
  const { user } = useAuth()
  const { categories, addCategory, updateCategory, deleteCategory, bulkDelete } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [selectedType, setSelectedType] = useState('Expense')

  // Filters & Bulk Delete
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateCategory(categoryToEdit.id, {
      name: formData.get('name'),
      type: formData.get('type'),
      parent_id: formData.get('parent_id') || null
    })
    setIsEditModalOpen(false)
    setCategoryToEdit(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addCategory({
      name: formData.get('name'),
      type: formData.get('type'),
      parent_id: formData.get('parent_id') || null
    })
    setIsModalOpen(false)
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} categories?`)) return;
    const success = await bulkDelete('categories', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const toggleSelectAll = (e, items) => {
    if (e.target.checked) {
      const ids = items.map(c => c.id);
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    } else {
      const idsToRemove = new Set(items.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !idsToRemove.has(id)));
    }
  }

  const filteredCategories = categories.filter(c => {
    const searchMatch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = filterDate ? (c.created_at || c.updated_at || '').startsWith(filterDate) : true;
    return searchMatch && dateMatch;
  });

  const incomeCategories = filteredCategories.filter(c => c.type === 'Income')
  const expenseCategories = filteredCategories.filter(c => c.type === 'Expense')
  const roleCategories = filteredCategories.filter(c => c.type === 'Role')

  const exportData = filteredCategories.map((c) => ({
    "Name": c.name,
    "Type": c.type,
    "Parent Category": categories.find(parent => parent.id === c.parent_id)?.name || 'None'
  }))

  const renderTable = (cats, title) => {
    const parents = cats.filter(c => !c.parent_id);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {user?.role === 'ADMIN' && (
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-slate-300 w-4 h-4"
                        checked={cats.length > 0 && cats.every(c => selectedIds.includes(c.id))}
                        onChange={(e) => toggleSelectAll(e, cats)}
                      />
                    </TableHead>
                  )}
                  <TableHead>Category Name</TableHead>
                  {user?.role === 'ADMIN' && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map(parent => (
                  <React.Fragment key={parent.id}>
                    <TableRow className={selectedIds.includes(parent.id) ? 'bg-red-50/50' : ''}>
                      {user?.role === 'ADMIN' && (
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="cursor-pointer rounded border-slate-300 w-4 h-4"
                            checked={selectedIds.includes(parent.id)}
                            onChange={() => toggleSelect(parent.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        {parent.name}
                      </TableCell>
                      {user?.role === 'ADMIN' && (
                        <TableCell className="flex gap-2 justify-end">
                          <button onClick={() => { setCategoryToEdit(parent); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit Category">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setCategoryToDelete(parent.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Category">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                    {cats.filter(c => c.parent_id === parent.id).map(child => (
                      <TableRow key={child.id} className={selectedIds.includes(child.id) ? 'bg-red-50/50' : 'bg-slate-50'}>
                        {user?.role === 'ADMIN' && (
                          <TableCell>
                            <input 
                              type="checkbox" 
                              className="cursor-pointer rounded border-slate-300 w-4 h-4"
                              checked={selectedIds.includes(child.id)}
                              onChange={() => toggleSelect(child.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium flex items-center gap-2 pl-8 text-slate-600">
                          <CornerDownRight className="w-3 h-3 text-slate-400" />
                          {child.name}
                        </TableCell>
                        {user?.role === 'ADMIN' && (
                          <TableCell className="flex gap-2 justify-end">
                            <button onClick={() => { setCategoryToEdit(child); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit Subcategory">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCategoryToDelete(child.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Subcategory">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                {cats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'ADMIN' ? 3 : 1} className="text-center py-6 text-slate-500">No categories found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Categories</h2>
          <p className="text-sm text-slate-500">Add or remove custom transaction categories and sub-categories.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => { setIsModalOpen(true); setSelectedType('Expense'); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {renderTable(expenseCategories, "Expense Categories")}
        {renderTable(incomeCategories, "Income Categories")}
        {renderTable(roleCategories, "Role Categories")}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Category"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select 
              name="type" 
              required 
              className="w-full border rounded-md p-2"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
              <option value="Role">Role (for team members)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Parent Category (Optional)</label>
            <select name="parent_id" className="w-full border rounded-md p-2">
              <option value="">-- None (Top Level) --</option>
              {categories
                .filter(c => !c.parent_id && c.type === selectedType)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Leave blank to create a main category.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category Name</label>
            <input name="name" required className="w-full border rounded-md p-2" placeholder="E.g., Travel" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Category</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Category"
      >
        {categoryToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select 
                name="type" 
                required 
                className="w-full border rounded-md p-2"
                defaultValue={categoryToEdit.type}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="Role">Role (for team members)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parent Category (Optional)</label>
              <select name="parent_id" className="w-full border rounded-md p-2" defaultValue={categoryToEdit.parent_id || ''}>
                <option value="">-- None (Top Level) --</option>
                {categories
                  .filter(c => !c.parent_id && c.type === (selectedType || categoryToEdit.type) && c.id !== categoryToEdit.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Leave blank to make this a main category.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category Name</label>
              <input name="name" required defaultValue={categoryToEdit.name} className="w-full border rounded-md p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          deleteCategory(categoryToDelete)
          setCategoryToDelete(null)
        }}
        title="Delete Category"
        message="Are you sure? Any sub-categories under this will also be deleted."
      />
    </div>
  )
}
