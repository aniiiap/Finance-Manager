import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { useAuth } from "../context/AuthContext"
import { useData } from "../context/DataContext"
import { apiFetch } from '../lib/api'
import { Lock } from 'lucide-react'


export default function Settings() {
  const { token, user } = useAuth()
  const { companyInfo } = useData()
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

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-4">You do not have permission to view this page.</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500">View your application preferences and company profile.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-sm">Profile is Read-Only</h3>
          <p className="text-sm mt-1">Company profile settings (including logos and bank details) are managed centrally by the System Administrator. Please contact support to request any changes.</p>
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
              {companyInfo?.logo_url ? (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32">
                  <img src={companyInfo.logo_url} alt="Company Logo" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32 text-slate-400 text-sm">
                  No logo uploaded
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Authorized Signature</h3>
                <p className="text-sm text-slate-500">Used on invoices and official documents.</p>
              </div>
              {companyInfo?.signature_url ? (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32">
                  <img src={companyInfo.signature_url} alt="Company Signature" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-slate-50 flex justify-center items-center h-32 text-slate-400 text-sm">
                  No signature uploaded
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Invoice Profile</CardTitle>
          <CardDescription>These details appear on your Tax Invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name</label>
            <input type="text" name="name" value={settings.name} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company Address</label>
            <textarea name="address" value={settings.address} readOnly rows={3} className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">GSTIN</label>
              <input type="text" name="gstin" value={settings.gstin} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State Name & Code</label>
              <div className="flex gap-2">
                <input type="text" name="state_name" value={settings.state_name} readOnly className="flex h-10 w-2/3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
                <input type="text" name="state_code" value={settings.state_code} readOnly className="flex h-10 w-1/3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              </div>
            </div>
          </div>

          <h3 className="text-lg font-medium pt-4">Bank Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Name</label>
              <input type="text" name="bank_name" value={settings.bank_name} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
              <input type="text" name="bank_account_no" value={settings.bank_account_no} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch & IFSC Code</label>
              <input type="text" name="bank_ifsc" value={settings.bank_ifsc} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-sm font-medium">Authorised Signatory Name</label>
            <input type="text" name="authorised_signatory" value={settings.authorised_signatory} readOnly className="flex h-10 w-full sm:w-1/2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
          </div>

          <h3 className="text-lg font-medium pt-4">Payment Options</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Payment Methods</label>
            <input type="text" name="payment_methods" value={settings.payment_methods} readOnly className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
