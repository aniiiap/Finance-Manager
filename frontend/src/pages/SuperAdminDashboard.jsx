import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal } from "../components/ui/modal"
import { ShieldAlert, Building2, UserPlus, Power } from "lucide-react"
import { apiFetch } from '../lib/api'


export default function SuperAdminDashboard() {
  const { user, token } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  
  const [companies, setCompanies] = useState([])
  const [createdCredentials, setCreatedCredentials] = useState(null)

  // Fetch Companies on load
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await apiFetch('/api/data/companies')
        const data = await res.json()
        if (res.ok) setCompanies(data)
      } catch (err) {
        console.error("Failed to fetch companies")
      } finally {
        setIsLoading(false)
      }
    }
    if (token) fetchCompanies()
  }, [token])

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900">System Access Denied</h2>
        <p className="text-slate-500">You must be the System Creator (Super Admin) to view this page.</p>
      </div>
    )
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    setError("")
    
    const formData = new FormData(e.target)
    const payload = {
      company_name: formData.get('company_name'),
      contact_name: formData.get('contact_name'),
      contact_email: formData.get('contact_email'),
      contact_phone: formData.get('contact_phone')
    }
    
    try {
      const res = await apiFetch('/api/auth/onboard-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        const refreshed = await apiFetch('/api/data/companies')
        const refreshedData = await refreshed.json()
        setCompanies(refreshedData)
        setIsModalOpen(false)
        setCreatedCredentials({
          email: data.admin_email,
          password: data.temporary_password,
        })
      } else {
        setError(data.error || "Failed to create company")
      }
    } catch (err) {
      setError("Network error connecting to backend")
    }
  }

  const handleToggleStatus = async (companyId, currentStatus) => {
    const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended'
    try {
      const res = await apiFetch(`/api/data/companies/${companyId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setCompanies(companies.map(c => c.id === companyId ? { ...c, status: newStatus } : c))
      }
    } catch (err) {
      console.error("Failed to toggle status")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-purple-900">Super Admin Dashboard</h2>
          <p className="text-sm text-slate-500">Manage your SaaS clients, onboarding, and platform access.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-purple-700 hover:bg-purple-800 text-white">
          <Building2 className="w-4 h-4" /> Onboard New Client Company
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Total Client Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
<Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Platform Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-slate-500">No client companies onboarded yet.</TableCell></TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-slate-900">{c.name}</TableCell>
                    <TableCell>{c.contact_name}</TableCell>
                    <TableCell className="text-slate-500">{c.contact_email}</TableCell>
                    <TableCell>{c.users_count} users</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.status === 'Suspended' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {c.status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => handleToggleStatus(c.id, c.status || 'Active')}
                        variant="outline" 
                        size="sm" 
                        className={`gap-2 ${c.status === 'Suspended' ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                      >
                         <Power className="w-3 h-3" /> {c.status === 'Suspended' ? 'Activate' : 'Suspend'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Onboard New Client Company">
        <form onSubmit={handleCreateCompany} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input name="company_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600" placeholder="e.g. Metro Builders LLC" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary Contact Name</label>
            <input name="contact_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600" placeholder="e.g. Sarah Connor" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Email</label>
            <input name="contact_email" type="email" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600" placeholder="admin@metrobuilders.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Phone Number</label>
            <input name="contact_phone" type="tel" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600" placeholder="+1234567890" />
            <p className="text-xs text-slate-500 mt-1">
              A secure temporary password will be generated and shown once after creation.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-purple-700 hover:bg-purple-800 text-white">Create Company</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Share these login credentials"
      >
        <div className="space-y-3 text-sm">
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Copy now — the temporary password will not be shown again.
          </p>
          <div>
            <div className="text-slate-500">Admin email</div>
            <div className="font-mono font-medium">{createdCredentials?.email}</div>
          </div>
          <div>
            <div className="text-slate-500">Temporary password</div>
            <div className="font-mono font-medium break-all">{createdCredentials?.password}</div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                )
                setCreatedCredentials(null)
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white"
            >
              Copy &amp; Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

