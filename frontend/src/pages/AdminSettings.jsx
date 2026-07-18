import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { ShieldAlert, UserPlus, Shield, User } from "lucide-react"

export default function AdminSettings() {
  const { user } = useAuth()
  const { projects, users, addUser, updateUser, deleteUser } = useData() 
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState("USER")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [userToEdit, setUserToEdit] = useState(null)

  const availableModules = ["Clients", "Projects", "Transactions", "Sales", "Ledger", "Profit & Loss", "Stock", "Categories", "Reports"];

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500">You must be an Administrator to view this page.</p>
      </div>
    )
  }

  const handleCloseModal = () => {
    setIsUserModalOpen(false)
    setUserToEdit(null)
    setSelectedRole("USER")
  }

  const handleOpenEdit = (u) => {
    setUserToEdit(u)
    setSelectedRole(u.role)
    setIsUserModalOpen(true)
  }

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const role = formData.get('role')
    
    // Get all checked projects
    const project_ids = []
    const access_modules = []
    
    if (role === 'USER') {
      projects.forEach(p => {
        if (formData.get(`project_${p.id}`)) {
          project_ids.push(p.id)
        }
      })
      
      availableModules.forEach(mod => {
        if (formData.get(`module_${mod}`)) {
          access_modules.push(mod)
        }
      })
    } else {
      // Admins get everything
      availableModules.forEach(mod => access_modules.push(mod))
    }

    setIsSubmitting(true)

    const userData = {
      name: formData.get('name').trim(),
      email: formData.get('email').trim().toLowerCase(),
      role: role,
      project_ids: project_ids,
      access_modules: access_modules
    }
    
    if (!userToEdit) {
      userData.password = formData.get('password');
    }
    
    let success = false
    if (userToEdit) {
      success = await updateUser(userToEdit.id, userData)
    } else {
      success = await addUser(userData)
    }
    
    if (success) {
      handleCloseModal()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Settings</h2>
          <p className="text-sm text-slate-500">Manage system users, roles, and global configurations.</p>
        </div>
        <Button onClick={() => setIsUserModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add New User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'ADMIN' ? <Shield className="w-3 h-3 mr-1"/> : <User className="w-3 h-3 mr-1"/>}
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[250px] text-slate-500 text-sm">
                      {u.role === 'ADMIN' ? 'All Access' : (
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <div className="truncate" title={u.access?.length ? u.access.join(", ") : 'None'}>
                            <span className="font-medium">Projects:</span> {u.access?.length ? u.access.join(", ") : 'None'}
                          </div>
                          <div className="truncate" title={u.access_modules ? (Array.isArray(u.access_modules) ? u.access_modules.join(", ") : JSON.parse(u.access_modules).join(", ")) : 'None'}>
                            <span className="font-medium">Modules:</span> {u.access_modules ? (Array.isArray(u.access_modules) ? u.access_modules.join(", ") : JSON.parse(u.access_modules).join(", ")) : 'None'}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {u.id !== user?.id && (
                        <>
                          <Button onClick={() => handleOpenEdit(u)} variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">Edit</Button>
                          <Button onClick={() => setUserToDelete(u.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Delete</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isUserModalOpen} onClose={handleCloseModal} title={userToEdit ? "Edit User" : "Create New User"} maxWidth="max-w-2xl">
        <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input name="name" defaultValue={userToEdit?.name || ""} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="e.g. John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input name="email" type="email" defaultValue={userToEdit?.email || ""} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="john@company.com" />
          </div>
          {!userToEdit && (
            <div>
              <label className="block text-sm font-medium mb-1">Temporary Password</label>
              <input name="password" type="password" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="USER">Standard User (Restricted Access)</option>
              <option value="ADMIN">Administrator (Full System Access)</option>
            </select>
          </div>
          
          {selectedRole === "USER" && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium mb-2">Assign Projects</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-3 bg-slate-50">
                  {projects.map(p => {
                    const hasProject = userToEdit?.access?.includes(p.name);
                    return (
                      <div key={p.id} className="flex items-center">
                        <input type="checkbox" name={`project_${p.id}`} id={`project_${p.id}`} defaultChecked={hasProject} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                        <label htmlFor={`project_${p.id}`} className="ml-2 text-sm text-slate-700 font-medium">
                          {p.name}
                        </label>
                      </div>
                    );
                  })}
                  {projects.length === 0 && <p className="text-sm text-slate-500">No projects available.</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Assign Module Access</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-3 bg-slate-50">
                  {availableModules.map(mod => {
                    let hasModule = true;
                    if (userToEdit) {
                      const userMods = Array.isArray(userToEdit.access_modules) 
                        ? userToEdit.access_modules 
                        : (typeof userToEdit.access_modules === 'string' ? JSON.parse(userToEdit.access_modules) : []);
                      hasModule = userMods.includes(mod);
                    }
                    return (
                      <div key={mod} className="flex items-center">
                        <input type="checkbox" name={`module_${mod}`} id={`module_${mod}`} defaultChecked={hasModule} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                        <label htmlFor={`module_${mod}`} className="ml-2 text-sm text-slate-700 font-medium">
                          {mod}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">Uncheck modules you want to hide from this user.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (userToEdit ? "Save Changes" : "Create User")}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => deleteUser(userToDelete)}
        title="Delete User"
        message="Are you sure you want to completely delete this user? Their login credentials will be revoked and this action cannot be undone."
      />
    </div>
  )
}
