import React, { useState } from "react"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { Plus, Trash2, Tag, CornerDownRight } from "lucide-react"

export default function Categories() {
  const { categories, addCategory, deleteCategory } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [selectedType, setSelectedType] = useState('Expense')

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

  const incomeCategories = categories.filter(c => c.type === 'Income')
  const expenseCategories = categories.filter(c => c.type === 'Expense')
  const roleCategories = categories.filter(c => c.type === 'Role')

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
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map(parent => (
                <React.Fragment key={parent.id}>
                  <TableRow>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-400" />
                      {parent.name}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setCategoryToDelete(parent.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Category">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                  {cats.filter(c => c.parent_id === parent.id).map(child => (
                    <TableRow key={child.id} className="bg-slate-50">
                      <TableCell className="font-medium flex items-center gap-2 pl-8 text-slate-600">
                        <CornerDownRight className="w-3 h-3 text-slate-400" />
                        {child.name}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => setCategoryToDelete(child.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Subcategory">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              {cats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-6 text-slate-500">No categories found.</TableCell>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Categories</h2>
          <p className="text-sm text-slate-500">Add or remove custom transaction categories and sub-categories.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {renderTable(incomeCategories, "Income Categories")}
        {renderTable(expenseCategories, "Expense Categories")}
        {renderTable(roleCategories, "Roles (People)")}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Custom Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select name="type" required value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
              <option value="Role">People Role</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Parent Category (Optional)</label>
            <select name="parent_id" className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="">None (Top Level)</option>
              {categories.filter(c => c.type === selectedType && !c.parent_id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Category Name</label>
            <input name="name" type="text" required placeholder="e.g. Petrol, Legal Fees..." className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Save Category</Button>
        </form>
      </Modal>
      <ConfirmModal 
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => deleteCategory(categoryToDelete)}
        title="Delete Category"
        message="Are you sure you want to delete this category? Any transactions using this category might lose their categorization. This action cannot be undone."
      />
    </div>
  )
}

