import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { DateFilter } from "../components/ui/DateFilter"
import { ExportButtons } from "../components/ui/ExportButtons"
import { useData } from "../context/DataContext"
import { useState } from "react"
import { formatCurrency } from "../data/mock"
import { Link } from "react-router-dom"
import { IndianRupee, PieChart, Plus, Trash2, Edit2, Search } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Projects() {
  const { user } = useAuth()
  const { projects, transactions, clients, addProject, updateProject, deleteProject, bulkDelete } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)
  
  // New State for Filters and Bulk Delete
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addProject({
      name: formData.get('name'),
      client_id: formData.get('client_id'),
      budget: formData.get('budget'),
    })
    setIsModalOpen(false)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateProject(projectToEdit.id, {
      name: formData.get('name'),
      client_id: formData.get('client_id'),
      budget: formData.get('budget'),
    })
    setIsEditModalOpen(false)
    setProjectToEdit(null)
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} projects?`)) return;
    const success = await bulkDelete('projects', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelect = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const filteredProjects = projects.filter(p => {
    const searchMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = filterDate ? (p.created_at || p.updated_at || '').startsWith(filterDate) : true;
    return searchMatch && dateMatch;
  });

  const exportData = filteredProjects.map((project) => {
    const projectTxs = transactions.filter(t => t.project_id === project.id || t.project === project.name)
    const received = projectTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = projectTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0)
    
    return {
      "Project Name": project.name,
      "Client": project.client_name || project.client,
      "Status": project.status,
      "Income": received,
      "Expense": expenses,
      "Profit": received - expenses
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-slate-500">Manage your ongoing and completed projects.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Project Name", "Client", "Status", "Income", "Expense", "Profit"]}
            filename={`Projects_${new Date().toISOString().split('T')[0]}`}
            title="Projects Report"
          />
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <DateFilter value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => {
          const projectTxs = transactions.filter(t => t.project_id === project.id || t.project === project.name)
          const received = projectTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0)
          const expenses = projectTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0)
          const progress = project.budget > 0 ? Math.min(100, Math.round((expenses / project.budget) * 100)) : 0

          return (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col ${selectedIds.includes(project.id) ? 'ring-2 ring-red-500 bg-red-50/50' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    {user?.role === 'ADMIN' && (
                      <input 
                        type="checkbox" 
                        className="mt-1.5 cursor-pointer w-4 h-4"
                        checked={selectedIds.includes(project.id)}
                        onChange={(e) => toggleSelect(e, project.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate" title={project.name}>{project.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1 truncate" title={project.client}>{project.client}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={project.status === 'Active' ? 'success' : 'outline'}>{project.status || 'Active'}</Badge>
                    {user?.role === 'ADMIN' && (
                      <div className="flex gap-1 mt-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault()
                            setProjectToEdit(project)
                            setIsEditModalOpen(true)
                          }}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                          title="Edit Project"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault()
                            setProjectToDelete(project.id)
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3"/> Budget</div>
                    <div className="font-semibold text-sm">{formatCurrency(project.budget)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><PieChart className="w-3 h-3"/> Profit</div>
                    <div className="font-semibold text-sm text-green-600">{formatCurrency(received - expenses)}</div>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-medium text-slate-700">Progress</span>
                    <span className="text-xs text-slate-500">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          </Link>
        )})}
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed">
            No projects found matching your criteria.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input name="name" required className="w-full border rounded-md p-2" placeholder="E.g., Website Redesign" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select name="client_id" required className="w-full border rounded-md p-2">
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Budget</label>
            <input name="budget" type="number" step="0.01" required className="w-full border rounded-md p-2" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Project"
      >
        {projectToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <input name="name" defaultValue={projectToEdit.name} required className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <select name="client_id" defaultValue={projectToEdit.client_id} required className="w-full border rounded-md p-2">
                <option value="">Select a client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budget</label>
              <input name="budget" type="number" step="0.01" defaultValue={projectToEdit.budget} required className="w-full border rounded-md p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          deleteProject(projectToDelete)
          setProjectToDelete(null)
        }}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action can be reversed from the Recycle Bin."
      />
    </div>
  )
}
