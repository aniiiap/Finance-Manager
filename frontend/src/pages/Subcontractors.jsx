import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { ExportButtons } from "../components/ui/ExportButtons"
import { DateFilter } from "../components/ui/DateFilter"
import { useData } from "../context/DataContext"
import { useState, useEffect } from "react"
import { Pagination } from "../components/ui/pagination"
import { Plus, Trash2, Edit2, Search } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Subcontractors() {
  const { user } = useAuth()
  const { people: subcontractors, projects, addPerson: addSubcontractor, updatePerson: updateSubcontractor, deletePerson: deleteSubcontractor, bulkDelete } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [subcontractorToEdit, setSubcontractorToEdit] = useState(null)
  const [subcontractorToDelete, setSubcontractorToDelete] = useState(null)

  // Filters & Bulk Delete
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addSubcontractor({
      name: formData.get('name'),
      company: formData.get('company'),
      budget: formData.get('budget'),
      role: 'SUBCONTRACTOR',
      status: 'Active'
    })
    setIsModalOpen(false)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateSubcontractor(subcontractorToEdit.id, {
      name: formData.get('name'),
      company: formData.get('company'),
      budget: formData.get('budget'),
      role: 'SUBCONTRACTOR',
      status: 'Active'
    })
    setIsEditModalOpen(false)
    setSubcontractorToEdit(null)
  }

  const filteredSubcontractors = subcontractors.filter(subcontractor => {
    if (subcontractor.role !== 'SUBCONTRACTOR') return false;
    const q = searchTerm.toLowerCase();
    const matchesSearch = (subcontractor.name || '').toLowerCase().includes(q) || 
                          (subcontractor.company || '').toLowerCase().includes(q) ||
                          (subcontractor.phone || '').toLowerCase().includes(q);
    let matchesDate = true;
    if (fromDate) matchesDate = matchesDate && new Date(subcontractor.created_at || subcontractor.updated_at || '') >= new Date(fromDate);
    if (toDate) matchesDate = matchesDate && new Date(subcontractor.created_at || subcontractor.updated_at || '') <= new Date(toDate + 'T23:59:59');
    return matchesSearch && matchesDate;
  });

  // Pagination logic
  const pageSize = 10;
  const totalPages = Math.ceil(filteredSubcontractors.length / pageSize);
  const paginatedSubcontractors = filteredSubcontractors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate]);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} subcontractors?`)) return;
    const success = await bulkDelete('people', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedSubcontractors.map(c => c.id));
    else setSelectedIds([]);
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const exportData = filteredSubcontractors.map(subcontractor => {
    const subcontractorProjects = projects.filter(p => p.subcontractor_id === subcontractor.id);
    return {
      "Name": subcontractor.name,
      "Company": subcontractor.company || '',
      "Budget": subcontractor.budget ? parseFloat(subcontractor.budget).toFixed(2) : '-',
      "Projects": subcontractorProjects.length > 0 ? subcontractorProjects.map(p => p.name).join(", ") : "-"
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subcontractors</h2>
          <p className="text-sm text-slate-500">Manage your subcontractor relationships.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Name", "Company", "Budget", "Projects"]}
            filename={`Subcontractors_${new Date().toISOString().split('T')[0]}`}
            title="Subcontractors Report"
          />
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => {
            setSubcontractorToEdit(null)
            setIsModalOpen(true)
          }} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Subcontractor
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/80 backdrop-blur-md p-4 rounded-xl border border-indigo-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search subcontractors, companies, or contacts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subcontractors</CardTitle>
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
                      checked={filteredSubcontractors.length > 0 && selectedIds.length === filteredSubcontractors.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Subcontractor Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Budget</TableHead>
                {user?.role === 'ADMIN' && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubcontractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'ADMIN' ? 6 : 5} className="text-center py-8 text-slate-500">
                    No subcontractors found.
                  </TableCell>
                </TableRow>
              ) : paginatedSubcontractors.map((subcontractor) => {
                const subcontractorProjectsCount = projects.filter(p => p.subcontractor_id === subcontractor.id).length;
                return (
                <TableRow key={subcontractor.id} className={selectedIds.includes(subcontractor.id) ? 'bg-rose-50/50' : 'hover:bg-indigo-50/20 transition-colors'}>
                  {user?.role === 'ADMIN' && (
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-slate-300 w-4 h-4"
                        checked={selectedIds.includes(subcontractor.id)}
                        onChange={() => toggleSelect(subcontractor.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{subcontractor.name}</TableCell>
                  <TableCell>{subcontractor.company || '--'}</TableCell>
                  <TableCell>
                    {subcontractorProjectsCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {projects.filter(p => p.subcontractor_id === subcontractor.id).map(p => (
                          <Badge key={p.id} variant="secondary">{p.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>{subcontractor.budget ? parseFloat(subcontractor.budget).toFixed(2) : '--'}</TableCell>
                  {user?.role === 'ADMIN' && (
                    <TableCell className="flex gap-3">
                      <button onClick={() => { setSubcontractorToEdit(subcontractor); setIsEditModalOpen(true); }} className="text-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all" title="Edit Subcontractor">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSubcontractorToDelete(subcontractor.id)} className="text-rose-400 hover:text-rose-600 hover:scale-110 transition-all" title="Delete Subcontractor">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              )})}
            </TableBody>
            </Table>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Subcontractor"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subcontractor Name</label>
            <input name="name" required className="w-full border rounded-md p-2" placeholder="E.g., John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input name="company" className="w-full border rounded-md p-2" placeholder="E.g., Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Budget</label>
            <input name="budget" type="number" step="0.01" className="w-full border rounded-md p-2" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Subcontractor</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Subcontractor"
      >
        {subcontractorToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subcontractor Name</label>
              <input name="name" defaultValue={subcontractorToEdit.name} required className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input name="company" defaultValue={subcontractorToEdit.company} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budget</label>
              <input name="budget" type="number" step="0.01" defaultValue={subcontractorToEdit.budget} className="w-full border rounded-md p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!subcontractorToDelete}
        onClose={() => setSubcontractorToDelete(null)}
        onConfirm={() => {
          deleteSubcontractor(subcontractorToDelete)
          setSubcontractorToDelete(null)
        }}
        title="Delete Subcontractor"
        message="Are you sure you want to delete this subcontractor? They will be moved to the recycle bin."
      />
    </div>
  )
}
