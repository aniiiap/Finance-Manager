import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { ExportButtons } from "../components/ui/ExportButtons"
import { DateFilter } from "../components/ui/DateFilter"
import { useData } from "../context/DataContext"
import { useState } from "react"
import { Plus, Trash2, Edit2, Search } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Clients() {
  const { user } = useAuth()
  const { clients, projects, addClient, updateClient, deleteClient, bulkDelete } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)

  // Filters & Bulk Delete
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

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

  const filteredClients = clients.filter(client => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (client.name || '').toLowerCase().includes(q) || 
                          (client.company || '').toLowerCase().includes(q) ||
                          (client.phone || '').toLowerCase().includes(q);
    const matchesDate = filterDate ? (client.created_at || client.updated_at || '').startsWith(filterDate) : true;
    return matchesSearch && matchesDate;
  });

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} clients?`)) return;
    const success = await bulkDelete('people', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredClients.map(c => c.id));
    else setSelectedIds([]);
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const exportData = filteredClients.map(client => ({
    "Name": client.name,
    "Company": client.company || '',
    "Email": client.email || '',
    "Phone": client.phone || '',
    "Address": client.address || '',
    "Projects": projects.filter(p => p.client_id === client.id).length
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-slate-500">Manage your client relationships.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Name", "Company", "Email", "Phone", "Address", "Projects"]}
            filename={`Clients_${new Date().toISOString().split('T')[0]}`}
            title="Clients Report"
          />
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => {
            setClientToEdit(null)
            setIsModalOpen(true)
          }} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search clients, companies, or contacts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {user?.role === 'ADMIN' && (
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="cursor-pointer rounded border-slate-300 w-4 h-4"
                      checked={filteredClients.length > 0 && selectedIds.length === filteredClients.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Client Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                {user?.role === 'ADMIN' && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'ADMIN' ? 7 : 6} className="text-center py-8 text-slate-500">
                    No clients found.
                  </TableCell>
                </TableRow>
              ) : filteredClients.map((client) => {
                const clientProjectsCount = projects.filter(p => p.client_id === client.id).length;
                return (
                <TableRow key={client.id} className={selectedIds.includes(client.id) ? 'bg-red-50/50' : ''}>
                  {user?.role === 'ADMIN' && (
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-slate-300 w-4 h-4"
                        checked={selectedIds.includes(client.id)}
                        onChange={() => toggleSelect(client.id)}
                      />
                    </TableCell>
                  )}
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
                  {user?.role === 'ADMIN' && (
                    <TableCell className="flex gap-2">
                      <button onClick={() => { setClientToEdit(client); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit Client">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setClientToDelete(client.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Client">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              )})}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Client"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client Name</label>
            <input name="name" required className="w-full border rounded-md p-2" placeholder="E.g., John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input name="company" className="w-full border rounded-md p-2" placeholder="E.g., Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact / Email</label>
            <input name="contact" className="w-full border rounded-md p-2" placeholder="john@example.com" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Client</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
      >
        {clientToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input name="name" defaultValue={clientToEdit.name} required className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input name="company" defaultValue={clientToEdit.company} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact / Email</label>
              <input name="contact" defaultValue={clientToEdit.phone} className="w-full border rounded-md p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={() => {
          deleteClient(clientToDelete)
          setClientToDelete(null)
        }}
        title="Delete Client"
        message="Are you sure you want to delete this client? They will be moved to the recycle bin."
      />
    </div>
  )
}
