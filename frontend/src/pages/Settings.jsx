import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { useAuth } from "../context/AuthContext"
import { apiFetch } from '../lib/api'


export default function Settings() {
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
    payment_methods: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiFetch('/api/sales/company-settings')
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
              payment_methods: data.payment_methods || ""
            })
          }
        }
      } catch (err) {
        console.error("Failed to load settings")
      }
    }
    fetchSettings()
  }, [token])

  const handleSave = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")
    try {
      const res = await apiFetch('/api/sales/company-settings', {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
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

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-4">You do not have permission to view this page.</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500">Manage your application preferences and company profile.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Company Invoice Profile</CardTitle>
            <CardDescription>These details will appear on your Tax Invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <input type="text" name="name" value={settings.name} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" placeholder="e.g. ORBIT PROJECTS PRIVATE LIMITED" />
              <p className="text-xs text-slate-500">Legal company name only — shown on the invoice header (not a personal name).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company Address</label>
              <textarea name="address" value={settings.address} onChange={handleChange} rows={3} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" placeholder={"e.g. HOUSE NO 22\nJATO KA MOHALLA\nBHILWARA"} />
              <p className="text-xs text-slate-500">Address lines only — do not repeat the company name here.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">GSTIN</label>
                <input type="text" name="gstin" value={settings.gstin} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State Name & Code</label>
                <div className="flex gap-2">
                  <input type="text" name="state_name" value={settings.state_name} onChange={handleChange} placeholder="Rajasthan" className="flex h-10 w-2/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
                  <input type="text" name="state_code" value={settings.state_code} onChange={handleChange} placeholder="08" className="flex h-10 w-1/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-medium pt-4">Bank Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Name</label>
                <input type="text" name="bank_name" value={settings.bank_name} onChange={handleChange} placeholder="Punjab National Bank" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <input type="text" name="bank_account_no" value={settings.bank_account_no} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch & IFSC Code</label>
                <input type="text" name="bank_ifsc" value={settings.bank_ifsc} onChange={handleChange} placeholder="PUNB0090800" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-medium">Authorised Signatory Name</label>
              <input type="text" name="authorised_signatory" value={settings.authorised_signatory} onChange={handleChange} className="flex h-10 w-full sm:w-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
            </div>

            <h3 className="text-lg font-medium pt-4">Payment Options</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Payment Methods</label>
              <input type="text" name="payment_methods" value={settings.payment_methods} onChange={handleChange} placeholder="e.g. Net Banking, UPI, Cash, GPay, HDFC Corporate" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
              <p className="text-xs text-slate-500">Provide a comma-separated list of payment methods (e.g. Net Banking, UPI, Cash, GPay, Bank Transfer).</p>
            </div>

            {message && <p className="text-sm text-green-600 font-medium">{message}</p>}
            <Button type="submit" disabled={isLoading} className="mt-4">
              {isLoading ? "Saving..." : "Save Invoice Settings"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

