import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useAuth } from "../context/AuthContext"
import { apiFetch } from '../lib/api'
import { ArrowLeft } from "lucide-react"

export default function SuperAdminCompanySettings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  
  const [settings, setSettings] = useState({
    name: "",
    address: "",
    gstin: "",
    state_name: "",
    state_code: "",
    bank_name: "",
    bank_account_no: "",
    bank_ifsc: "",
    authorised_signatory: "",
    contact_name: "",
    contact_email: "",
    admin_email: "",
    contact_phone: "",
    logo_url: "",
    signature_url: ""
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [message, setMessage] = useState("")

  const [logoFile, setLogoFile] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)

  const fetchSettings = async () => {
    setIsFetching(true)
    try {
      const res = await apiFetch(`/api/data/companies/${id}/settings?t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setSettings({
            name: data.name || "",
            address: data.address || "",
            gstin: data.gstin || "",
            state_name: data.state_name || "",
            state_code: data.state_code || "",
            bank_name: data.bank_name || "",
            bank_account_no: data.bank_account_no || "",
            bank_ifsc: data.bank_ifsc || "",
            authorised_signatory: data.authorised_signatory || "",
            payment_methods: data.payment_methods || "",
            contact_name: data.contact_name || "",
            contact_email: data.contact_email || "",
            admin_email: data.admin_email || "",
            contact_phone: data.contact_phone || "",
            logo_url: data.logo_url || "",
            signature_url: data.signature_url || ""
          })
        }
      }
    } catch (err) {
      console.error("Failed to load settings")
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (token) fetchSettings()
  }, [token, id])

  const handleSave = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")
    try {
      const { logo_url, signature_url, ...payload } = settings;
      const res = await apiFetch(`/api/data/companies/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setMessage("Settings saved successfully!")
      } else {
        setMessage("Failed to save settings.")
      }
    } catch (err) {
      setMessage("Error connecting to server.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setIsUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', logoFile)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data/companies/${id}/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      if (res.ok) {
        fetchSettings()
        setLogoFile(null)
      } else {
        alert('Upload failed')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleUploadSignature = async () => {
    if (!signatureFile) return
    setIsUploadingSignature(true)
    const formData = new FormData()
    formData.append('file', signatureFile)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data/companies/${id}/upload-signature`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      if (res.ok) {
        fetchSettings()
        setSignatureFile(null)
      } else {
        alert('Upload failed')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUploadingSignature(false)
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="p-4">You do not have permission to view this page.</div>
  }

  if (isFetching) {
    return <div className="p-8 text-center text-slate-500">Loading company profile...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/super-admin')} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-purple-900">Manage Company Profile</h2>
          <p className="text-sm text-slate-500">Edit {settings.name || 'this company'}'s settings, logos, and bank details.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Company Logo</h3>
                <p className="text-sm text-slate-500">Used on letterheads and invoices.</p>
              </div>
              {settings.logo_url ? (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32">
                  <img src={settings.logo_url} alt="Company Logo" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32 text-slate-400 text-sm">
                  No logo uploaded
                </div>
              )}
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="text-sm w-full border p-1.5 rounded-md" />
                <Button onClick={handleUploadLogo} disabled={!logoFile || isUploadingLogo} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white">
                  {isUploadingLogo ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Authorized Signature</h3>
                <p className="text-sm text-slate-500">Used on invoices and official documents.</p>
              </div>
              {settings.signature_url ? (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32">
                  <img src={settings.signature_url} alt="Company Signature" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32 text-slate-400 text-sm">
                  No signature uploaded
                </div>
              )}
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={(e) => setSignatureFile(e.target.files[0])} className="text-sm w-full border p-1.5 rounded-md" />
                <Button onClick={handleUploadSignature} disabled={!signatureFile || isUploadingSignature} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white">
                  {isUploadingSignature ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Contact Information</CardTitle>
            <CardDescription>Primary contact details for this company's administrator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Name</label>
                <input type="text" name="contact_name" value={settings.contact_name} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <input type="tel" name="contact_phone" value={settings.contact_phone} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Login Email (Login ID)</label>
              <input type="email" name="admin_email" value={settings.admin_email} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              <p className="text-xs text-amber-600">Warning: Changing this email will change the admin's login credentials.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Invoice Profile</CardTitle>
            <CardDescription>These details will appear on the client's Tax Invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <input type="text" name="name" value={settings.name} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" placeholder="e.g. ORBIT PROJECTS PRIVATE LIMITED" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company Contact Email</label>
              <input type="email" name="contact_email" value={settings.contact_email} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" placeholder="e.g. contact@orbitprojects.com" />
              <p className="text-xs text-slate-500">This email will appear on invoices, letters, and reports.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company Address</label>
              <textarea name="address" value={settings.address} onChange={handleChange} rows={3} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">GSTIN</label>
                <input type="text" name="gstin" value={settings.gstin} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State Name & Code</label>
                <div className="flex gap-2">
                  <input type="text" name="state_name" value={settings.state_name} onChange={handleChange} placeholder="Rajasthan" className="flex h-10 w-2/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
                  <input type="text" name="state_code" value={settings.state_code} onChange={handleChange} placeholder="08" className="flex h-10 w-1/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-medium pt-4">Bank Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Name</label>
                <input type="text" name="bank_name" value={settings.bank_name} onChange={handleChange} placeholder="Punjab National Bank" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <input type="text" name="bank_account_no" value={settings.bank_account_no} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch & IFSC Code</label>
                <input type="text" name="bank_ifsc" value={settings.bank_ifsc} onChange={handleChange} placeholder="PUNB0090800" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-medium">Authorised Signatory Name</label>
              <input type="text" name="authorised_signatory" value={settings.authorised_signatory} onChange={handleChange} className="flex h-10 w-full sm:w-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
            </div>

            <h3 className="text-lg font-medium pt-4">Payment Options</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Payment Methods</label>
              <input type="text" name="payment_methods" value={settings.payment_methods} onChange={handleChange} placeholder="e.g. Net Banking, UPI, Cash, GPay, HDFC Corporate" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
              <p className="text-xs text-slate-500">Provide a comma-separated list of payment methods.</p>
            </div>

            {message && <p className={`text-sm font-medium ${message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            <Button type="submit" disabled={isLoading} className="mt-4 bg-purple-700 hover:bg-purple-800 text-white">
              {isLoading ? "Saving..." : "Save Invoice Settings"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
