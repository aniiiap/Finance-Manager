import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { useData } from "../context/DataContext"
import { useState } from "react"
import { formatCurrency } from "../data/mock"
import { Link } from "react-router-dom"
import { IndianRupee, PieChart, Plus, Trash2, Edit2 } from "lucide-react"

export default function Projects() {
  const { projects, transactions, clients, addProject, updateProject, deleteProject } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-slate-500">Track and manage all your ongoing and completed projects.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const projectTxs = transactions.filter(t => t.project_id === project.id || t.project === project.name)
          const received = projectTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0)
          const expenses = projectTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0)
          const progress = project.budget > 0 ? Math.min(100, Math.round((expenses / project.budget) * 100)) : 0

          return (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1 pr-4">
                    <CardTitle className="text-lg truncate" title={project.name}>{project.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1 truncate" title={project.client}>{project.client}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={project.status === 'Active' ? 'success' : 'outline'}>{project.status || 'Active'}</Badge>
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <input name="name" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <select name="client_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
              <option value="">Select a Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated Budget (₹)</label>
            <input name="budget" type="number" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Create Project</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setProjectToEdit(null); }} title="Edit Project">
        {projectToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <input name="name" type="text" required defaultValue={projectToEdit.name} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <select name="client_id" required defaultValue={projectToEdit.client_id} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm">
                <option value="">Select a Client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Budget (₹)</label>
              <input name="budget" type="number" required defaultValue={projectToEdit.budget} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <Button type="submit" className="w-full">Update Project</Button>
          </form>
        )}
      </Modal>
    <ConfirmModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => deleteProject(projectToDelete)}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated transactions will also be lost. This action cannot be undone."
      />
    </div>
  )
}

