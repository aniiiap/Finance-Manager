import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button"
import { Modal } from "../components/ui/modal"
import { ShieldAlert, Building2, UserPlus, Power, Activity } from "lucide-react"
import { apiFetch } from '../lib/api'


export default function SuperAdminDashboard() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  
  const [companies, setCompanies] = useState([])
  const [createdCredentials, setCreatedCredentials] = useState(null)
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [companyToEdit, setCompanyToEdit] = useState(null)
  const [editError, setEditError] = useState("")

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

  const handleEditCompany = async (e) => {
    e.preventDefault()
    setEditError("")
    
    const formData = new FormData(e.target)
    const payload = {
      company_name: formData.get('company_name'),
      contact_name: formData.get('contact_name'),
      admin_email: formData.get('admin_email'),
      contact_phone: formData.get('contact_phone')
    }
    
    try {
      const res = await apiFetch(`/api/data/companies/${companyToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const refreshed = await apiFetch('/api/data/companies')
        const refreshedData = await refreshed.json()
        setCompanies(refreshedData)
        setIsEditModalOpen(false)
        setCompanyToEdit(null)
      } else {
        const data = await res.json()
        setEditError(data.error || "Failed to update company")
      }
    } catch (err) {
      setEditError("Network error connecting to backend")
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

  const handleRenewCompany = async (companyId) => {
    if (!window.confirm("Are you sure you want to renew this company's plan for 1 year?")) return;
    try {
      const res = await apiFetch(`/api/data/companies/${companyId}/renew`, {
        method: 'POST'
      });
      if (res.ok) {
        const refreshed = await apiFetch('/api/data/companies');
        setCompanies(await refreshed.json());
      } else {
        const data = await res.json();
        alert(data.error || "Failed to renew company");
      }
    } catch (err) {
      alert("Network error while renewing company");
    }
  }

  // Dynamic Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-purple-500 opacity-20 blur-[80px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500 opacity-20 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">Creator</span>
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base font-medium max-w-xl">
              Plan Today. Build Tomorrow.
            </p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/20 border border-white/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/10 to-purple-500/0 -translate-x-full animate-[shimmer_2s_infinite]"></div>
            <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Onboard Client</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Clients</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{companies.length}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Companies</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{companies.filter(c => c.status !== 'Suspended').length}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800">Client Directory</h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-600">Company</TableHead>
                <TableHead className="font-semibold text-slate-600">Primary Contact</TableHead>
                <TableHead className="font-semibold text-slate-600">Users</TableHead>
                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading directory...</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No client companies onboarded yet.</TableCell></TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span className="text-xs text-slate-500">{c.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{c.contact_name}</span>
                        <span className="text-xs text-slate-500">{c.contact_phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {c.users_count} users
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.status === 'Suspended' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.status === 'Suspended' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                        {c.status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => handleRenewCompany(c.id)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => { setCompanyToEdit(c); setIsEditModalOpen(true); }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/company/${c.id}/settings`)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c.id, c.status || 'Active')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${c.status === 'Suspended' ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}
                        >
                          {c.status === 'Suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Onboard New Client Company">
        <form onSubmit={handleCreateCompany} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input name="company_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="e.g. Metro Builders LLC" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary Contact Name</label>
            <input name="contact_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="e.g. Sarah Connor" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Email</label>
            <input name="contact_email" type="email" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="admin@metrobuilders.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Phone Number</label>
            <input name="contact_phone" type="tel" required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="+1234567890" />
            <p className="text-xs text-slate-500 mt-1">
              A secure temporary password will be generated and shown once after creation.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Company</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCompanyToEdit(null); }} title="Edit Client Company">
        <form onSubmit={handleEditCompany} className="space-y-4">
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input name="company_name" defaultValue={companyToEdit?.name} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary Contact Name</label>
            <input name="contact_name" defaultValue={companyToEdit?.contact_name} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Email (Login ID)</label>
            <input name="admin_email" type="email" defaultValue={companyToEdit?.admin_email} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
            <p className="text-xs text-amber-600 mt-1">Warning: Changing this email will change the admin's login credentials.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Admin Phone Number</label>
            <input name="contact_phone" type="tel" defaultValue={companyToEdit?.contact_phone} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => { setIsEditModalOpen(false); setCompanyToEdit(null); }}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Changes</Button>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Copy &amp; Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

