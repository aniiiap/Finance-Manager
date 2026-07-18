import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { useData } from "../context/DataContext"
import { useState } from "react"
import { Plus, Trash2, Edit2 } from "lucide-react"

  export default function Clients() {
  const { clients, projects, addClient, updateClient, deleteClient } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    addClient({
      name: formData.get('name'),
      company: formData.get('company'),
      contact: formData.get('contact'),
      status: 'Active'
    })
    setIsModalOpen(false)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    updateClient(clientToEdit.id, {
      name: formData.get('name'),
      company: formData.get('company'),
      contact: formData.get('contact'),
      status: 'Active'
    })
    setIsEditModalOpen(false)
    setClientToEdit(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-slate-500">Manage your clients and their associated projects.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const clientProjectsCount = projects.filter(p => p.client_id === client.id).length;
                return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.company || '--'}</TableCell>
                  <TableCell>
                    {clientProjectsCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {projects.filter(p => p.client_id === client.id).map(p => (
                          <Badge key={p.id} variant="secondary">{p.name}</Badge>
                        ))}
                      </div>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>{client.phone || '--'}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'Active' ? 'success' : 'outline'}>
                      {client.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <button onClick={() => { setClientToEdit(client); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit Client">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setClientToDelete(client.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Client">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Client">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name</label>
            <input name="name" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <input name="company" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Email / Phone</label>
            <input name="contact" type="text" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
          </div>
          <Button type="submit" className="w-full">Save Client</Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setClientToEdit(null); }} title="Edit Client">
        {clientToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <input name="name" type="text" required defaultValue={clientToEdit.name} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <input name="company" type="text" required defaultValue={clientToEdit.company} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Email / Phone</label>
              <input name="contact" type="text" required defaultValue={clientToEdit.phone} className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
            </div>
            <Button type="submit" className="w-full">Update Client</Button>
          </form>
        )}
      </Modal>
      <ConfirmModal 
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={() => deleteClient(clientToDelete)}
        title="Delete Client"
        message="Are you sure you want to delete this client? All associated projects and transactions will also be lost. This action cannot be undone."
      />
    </div>
  )
}
