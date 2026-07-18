import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Plus, Printer, ArrowLeft, Trash2, Eye, Download, Loader2, Settings } from "lucide-react"
import html2pdf from "html2pdf.js"

import InvoiceTemplate from "../components/InvoiceTemplate"
import { Modal } from "../components/ui/modal"
import { apiFetch } from '../lib/api'
import { useToast } from "../context/ToastContext"

const gstStateCodes = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

const blankCompanySettings = () => ({
  name: "",
  address: "",
  gstin: "",
  state_name: "",
  state_code: "",
  bank_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  authorised_signatory: "",
});

const isSettingsComplete = (s) =>
  Boolean(s?.name?.trim() && s?.address?.trim() && s?.bank_account_no?.trim());

export default function Sales() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const [view, setView] = useState("list") // 'list', 'create', 'print'
  const [invoices, setInvoices] = useState([])
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsThenCreate, setSettingsThenCreate] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [invoiceToGenerate, setInvoiceToGenerate] = useState(null)
  const printRef = useRef(null)
  
  const [formData, setFormData] = useState({
    invoice_no: "",
    date: new Date().toISOString().split('T')[0],
    buyer_name: "",
    buyer_address: "",
    buyer_gstin: "",
    buyer_state_name: "",
    buyer_state_code: "",
    delivery_note: "",
    payment_terms: "",
    reference_no: "",
    buyer_order_no: "",
    dispatch_doc_no: "",
    dispatch_through: "",
    destination: "",
    terms_of_delivery: ""
  })
  
  const [items, setItems] = useState([
    { description: "", hsn_sac: "", quantity: "", rate: "", per: "PCS", amount: "0", gst_rate: "18" }
  ])

  useEffect(() => {
    if (view === "list") fetchInvoices();
    if (view === "create") fetchNextInvoiceNo();
    fetchCompanySettings();
  }, [view, token])

  const fetchCompanySettings = async () => {
    try {
      const res = await apiFetch('/api/sales/company-settings')
      if (res.ok) {
        const data = await res.json()
        setCompanySettings(data || blankCompanySettings())
        return data || blankCompanySettings()
      }
    } catch (err) {}
    return null
  }

  const openSettingsModal = async (thenCreate = false) => {
    setSettingsThenCreate(thenCreate)
    const data = await fetchCompanySettings()
    if (!data) setCompanySettings(blankCompanySettings())
    setShowSettingsModal(true)
  }

  const handleCreateClick = () => {
    if (!isSettingsComplete(companySettings)) {
      openSettingsModal(true)
    } else {
      setView("create")
    }
  }

  const fetchInvoices = async () => {
    try {
      const res = await apiFetch('/api/sales/invoices')
      if (res.ok) setInvoices(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const fetchNextInvoiceNo = async () => {
    try {
      const res = await apiFetch('/api/sales/next-invoice-no')
      if (res.ok) {
        const data = await res.json()
        setFormData(prev => ({ ...prev, invoice_no: data.nextNo }))
      }
    } catch (err) {}
  }

  const handlePrint = async (id) => {
    try {
      const res = await apiFetch(`/api/sales/invoices/${id}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentInvoice(data)
        setView("print")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-populate state code and name from GSTIN
      if (name === 'buyer_gstin' && value.length >= 2) {
        const code = value.substring(0, 2);
        if (gstStateCodes[code]) {
          newData.buyer_state_code = code;
          newData.buyer_state_name = gstStateCodes[code];
        }
      }
      return newData;
    });
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    
    // Auto calculate amount if qty and rate are present
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(newItems[index].quantity) || 0
      const rate = parseFloat(newItems[index].rate) || 0
      if (qty && rate) {
        newItems[index].amount = (qty * rate).toFixed(2)
      }
    }
    setItems(newItems)
  }

  const addItemRow = () => {
    setItems([...items, { description: "", hsn_sac: "", quantity: "", rate: "", per: "PCS", amount: "0", gst_rate: "18" }])
  }
  
  const removeItemRow = (index) => {
    if (items.length > 1) {
      const newItems = [...items]
      newItems.splice(index, 1)
      setItems(newItems)
    }
  }

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setCompanySettings(prev => {
      const newData = { ...(prev || blankCompanySettings()), [name]: value };
      
      if (name === 'gstin' && value.length >= 2) {
        const code = value.substring(0, 2);
        if (gstStateCodes[code]) {
          newData.state_code = code;
          newData.state_name = gstStateCodes[code];
        }
      }
      return newData;
    });
  }

  const saveCompanySettings = async (e) => {
    e.preventDefault()
    setIsSavingSettings(true)
    try {
      const res = await apiFetch('/api/sales/company-settings', {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(companySettings)
      })
      if (res.ok) {
        await fetchCompanySettings()
        setShowSettingsModal(false)
        toast("Company settings saved successfully!", "success")
        if (settingsThenCreate) {
          setSettingsThenCreate(false)
          setView("create")
        }
      } else {
        toast("Failed to save settings", "error")
      }
    } catch (err) {
      toast("Network error", "error")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const closeSettingsModal = () => {
    setShowSettingsModal(false)
    setSettingsThenCreate(false)
    fetchCompanySettings()
  }

  const renderCompanyProfileForm = (submitLabel) => (
    <form onSubmit={saveCompanySettings} className="space-y-4">
      <p className="text-sm text-slate-500">
        These details appear on every tax invoice. Use your legal company name — not a personal name.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Company Name *</label>
        <input
          required
          type="text"
          name="name"
          value={companySettings?.name || ""}
          onChange={handleSettingsChange}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          placeholder="e.g. CPMR PROJECTS PRIVATE LIMITED"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Company Address *</label>
        <textarea
          required
          name="address"
          value={companySettings?.address || ""}
          onChange={handleSettingsChange}
          rows={3}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          placeholder={"e.g. HOUSE NO 22\nJATO KA MOHALLA\nBHILWARA"}
        />
        <p className="text-xs text-slate-500">Address lines only — do not repeat the company name here.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">GSTIN</label>
          <input type="text" name="gstin" value={companySettings?.gstin || ""} onChange={handleSettingsChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">State Name & Code</label>
          <div className="flex gap-2">
            <input type="text" name="state_name" value={companySettings?.state_name || ""} onChange={handleSettingsChange} placeholder="State Name" className="flex h-10 w-2/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
            <input type="text" name="state_code" value={companySettings?.state_code || ""} onChange={handleSettingsChange} placeholder="Code" className="flex h-10 w-1/3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
          </div>
        </div>
      </div>

      <h3 className="text-base font-medium pt-2">Bank Details</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Bank Name *</label>
          <input required type="text" name="bank_name" value={companySettings?.bank_name || ""} onChange={handleSettingsChange} placeholder="Bank Name" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Number *</label>
          <input required type="text" name="bank_account_no" value={companySettings?.bank_account_no || ""} onChange={handleSettingsChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Branch & IFSC Code *</label>
          <input required type="text" name="bank_ifsc" value={companySettings?.bank_ifsc || ""} onChange={handleSettingsChange} placeholder="IFSC" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Authorised Signatory Name</label>
        <input type="text" name="authorised_signatory" value={companySettings?.authorised_signatory || ""} onChange={handleSettingsChange} className="flex h-10 w-full sm:w-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={closeSettingsModal}>Cancel</Button>
        <Button type="submit" disabled={isSavingSettings}>
          {isSavingSettings ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )

  const companyProfileModal = (
    <Modal
      isOpen={showSettingsModal}
      onClose={closeSettingsModal}
      title="Company Invoice Profile"
      maxWidth="max-w-2xl"
    >
      {renderCompanyProfileForm(settingsThenCreate ? "Save & Create Invoice" : "Save Changes")}
    </Modal>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    if (!formData.invoice_no || !formData.date || !formData.buyer_name) {
      toast("Invoice No, Date, and Buyer Name are required.", "error")
      return
    }
    
    const payload = { ...formData, items }
    
    try {
      const res = await apiFetch('/api/sales/invoices', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        toast("Invoice saved! Generating PDF...", "info")
        // Start PDF Generation process
        await triggerPdfGeneration(data.invoice_id)
      } else {
        toast("Failed to create invoice", "error")
      }
    } catch (err) {
      toast("Network error", "error")
    }
  }

  const triggerPdfGeneration = async (id) => {
    setIsGeneratingPdf(true)
    try {
      const res = await apiFetch(`/api/sales/invoices/${id}`)
      if (res.ok) {
        const data = await res.json()
        setInvoiceToGenerate(data)
      }
    } catch (err) {
      console.error(err)
      setIsGeneratingPdf(false)
      setView("list")
    }
  }

  // Effect to automatically generate and upload PDF when invoiceToGenerate is set
  useEffect(() => {
    if (invoiceToGenerate && printRef.current) {
      generateAndUploadPdf(invoiceToGenerate.id)
    }
  }, [invoiceToGenerate])

  const [pdfInvoiceData, setPdfInvoiceData] = useState(null)
  const [pdfAction, setPdfAction] = useState(null) // 'view' or 'download'
  const pdfRef = useRef(null)

  const handleOpenPdf = async (invId, download = false) => {
    try {
      const res = await apiFetch(`/api/sales/invoices/${invId}`)
      if (!res.ok) throw new Error('Failed to fetch invoice data')
      const data = await res.json()
      setPdfAction(download ? 'download' : 'view')
      setPdfInvoiceData(data)
    } catch (err) {
      console.error(err)
      toast("Failed to load invoice data.", "error")
    }
  }

  useEffect(() => {
    if (pdfInvoiceData && pdfAction) {
      // Wait for React to render the hidden template so pdfRef is available
      const timer = setTimeout(() => {
        if (!pdfRef.current) {
          toast("Failed to generate PDF - template not ready.", "error")
          setPdfInvoiceData(null)
          setPdfAction(null)
          return
        }
        const element = pdfRef.current
        const opt = {
          margin:       [0.3, 0.3, 0.3, 0.3],
          filename:     `Invoice_${pdfInvoiceData.invoice_no.replace(/\//g, '-')}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, width: 760 },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        }

        html2pdf().set(opt).from(element).output('blob').then((blob) => {
          const url = URL.createObjectURL(blob)
          if (pdfAction === 'download') {
            const a = document.createElement('a')
            a.href = url
            a.download = opt.filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            toast("PDF downloaded successfully!", "success")
          } else {
            window.open(url, '_blank')
            toast("PDF opened successfully!", "success")
          }
          setTimeout(() => URL.revokeObjectURL(url), 5000)
          setPdfInvoiceData(null)
          setPdfAction(null)
        }).catch((err) => {
          console.error(err)
          toast("Failed to generate PDF.", "error")
          setPdfInvoiceData(null)
          setPdfAction(null)
        })
      }, 100) // Small delay to let React render the template
      return () => clearTimeout(timer)
    }
  }, [pdfInvoiceData, pdfAction])

  const generateAndUploadPdf = async (invoiceId) => {
    const element = printRef.current;
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3],
      filename:     `Invoice_${invoiceToGenerate.invoice_no.replace(/\//g, '-')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, width: 760 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      const formData = new FormData();
      formData.append('pdf', pdfBlob, opt.filename);

      const res = await apiFetch(`/api/sales/invoices/${invoiceId}/upload-pdf`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setInvoiceToGenerate(null)
        setIsGeneratingPdf(false)
        setView("list")
        fetchInvoices()
        toast("Invoice and PDF saved successfully!", "success")
      } else {
        toast("Failed to upload PDF to cloud.", "error")
        setInvoiceToGenerate(null)
        setIsGeneratingPdf(false)
        setView("list")
      }
    } catch (err) {
      console.error(err)
      toast("Error uploading PDF.", "error")
      setIsGeneratingPdf(false)
      setView("list")
    }
  }

  // Calculate running totals for form view
  const formTaxable = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  let formCgst = 0
  let formSgst = 0
  items.forEach(item => {
    const amt = parseFloat(item.amount) || 0
    const gstRate = parseFloat(item.gst_rate) || 0
    formCgst += amt * (gstRate / 2) / 100
    formSgst += amt * (gstRate / 2) / 100
  })
  const formRawTotal = formTaxable + formCgst + formSgst
  const formGrandTotal = Math.round(formRawTotal)
  const formRoundOff = (formGrandTotal - formRawTotal).toFixed(2)

  const deleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return
    try {
      const res = await apiFetch(`/api/sales/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchInvoices()
        toast("Invoice deleted successfully!", "success")
      } else {
        toast("Failed to delete invoice", "error")
      }
    } catch (err) {
      console.error(err)
      toast("Network error", "error")
    }
  }

  // -----------------------------------------------------
  // RENDER: LIST VIEW
  // -----------------------------------------------------
  if (view === "list") {
    return (
      <>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sales & Invoices</h2>
              <p className="text-sm text-slate-500">Manage tax invoices and sales records.</p>
            </div>
            <div className="flex gap-2">
              {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                <Button variant="outline" onClick={() => openSettingsModal(false)} className="gap-2">
                  <Settings className="w-4 h-4" /> Company Profile
                </Button>
              )}
              <Button onClick={handleCreateClick} className="gap-2">
                <Plus className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sr No</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-slate-500">No invoices found.</TableCell></TableRow>
                ) : invoices.map((inv, idx) => (
                  <TableRow key={inv.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                    <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.buyer_name}</TableCell>
                    <TableCell className="text-right font-medium">₹{parseFloat(inv.grand_total).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenPdf(inv.id, false)} className="h-8 w-8" title="View">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenPdf(inv.id, true)} className="h-8 w-8" title="Download">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteInvoice(inv.id)} className="h-8 w-8 text-red-500 hover:text-red-700" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Hidden Invoice Template for View/Download PDF */}
        {pdfInvoiceData && (
          <div className="absolute top-[-9999px] left-[-9999px]">
            <InvoiceTemplate invoice={pdfInvoiceData} innerRef={pdfRef} className="w-[760px]" />
          </div>
        )}
        </div>
        {companyProfileModal}
      </>
    )
  }

  // -----------------------------------------------------
  // RENDER: CREATE VIEW
  // -----------------------------------------------------
  if (view === "create") {
    return (
      <>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setView("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">Create Tax Invoice</h2>
          </div>
          {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
            <Button variant="outline" size="sm" onClick={() => openSettingsModal(false)} className="gap-2">
              <Settings className="w-4 h-4" /> Company Profile
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Invoice No *</label>
                <input type="text" name="invoice_no" required value={formData.invoice_no} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Date *</label>
                <input type="date" name="date" required value={formData.date} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Delivery Note</label>
                <input type="text" name="delivery_note" value={formData.delivery_note} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Mode/Terms of Payment</label>
                <input type="text" name="payment_terms" value={formData.payment_terms} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Reference No. & Date</label>
                <input type="text" name="reference_no" value={formData.reference_no} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Buyer Details (Bill to)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Buyer Name *</label>
                <input type="text" name="buyer_name" required value={formData.buyer_name} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">GSTIN/UIN</label>
                <input type="text" name="buyer_gstin" value={formData.buyer_gstin} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium">Address</label>
                <input type="text" name="buyer_address" value={formData.buyer_address} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" placeholder="e.g. Dist. Bhilwara, State Rajasthan" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">State Name</label>
                <input type="text" name="buyer_state_name" value={formData.buyer_state_name} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">State Code</label>
                <input type="text" name="buyer_state_code" value={formData.buyer_state_code} onChange={handleFormChange} className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}><Plus className="w-4 h-4 mr-2"/> Add Row</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-24">HSN/SAC</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-24">Rate</TableHead>
                    <TableHead className="w-20">Per</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-24">GST %</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell><input type="text" value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} required className="w-full h-8 px-2 border rounded text-sm" placeholder="Item Name"/></TableCell>
                      <TableCell><input type="text" value={item.hsn_sac} onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)} className="w-full h-8 px-2 border rounded text-sm"/></TableCell>
                      <TableCell><input type="number" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className="w-full h-8 px-2 border rounded text-sm" placeholder="Qty"/></TableCell>
                      <TableCell><input type="number" step="0.01" value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} className="w-full h-8 px-2 border rounded text-sm" placeholder="Rate"/></TableCell>
                      <TableCell><input type="text" value={item.per} onChange={(e) => handleItemChange(idx, 'per', e.target.value)} className="w-full h-8 px-2 border rounded text-sm"/></TableCell>
                      <TableCell><input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(idx, 'amount', e.target.value)} required className="w-full h-8 px-2 border rounded text-sm bg-slate-50"/></TableCell>
                      <TableCell>
                        <input type="number" step="0.01" value={item.gst_rate} onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)} className="w-full h-8 px-2 border rounded text-sm" placeholder="%" />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItemRow(idx)} className="text-red-500 hover:text-red-700 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-6 text-sm">
                <div className="space-y-2 text-right">
                  <div className="text-slate-500">Taxable Amount:</div>
                  <div className="text-slate-500">CGST Total:</div>
                  <div className="text-slate-500">SGST Total:</div>
                  <div className="text-slate-500">Round Off:</div>
                  <div className="font-bold text-base text-slate-900 mt-2">Grand Total:</div>
                </div>
                <div className="space-y-2 text-right font-medium">
                  <div>₹{formTaxable.toFixed(2)}</div>
                  <div>₹{formCgst.toFixed(2)}</div>
                  <div>₹{formSgst.toFixed(2)}</div>
                  <div>₹{formRoundOff}</div>
                  <div className="font-bold text-base text-slate-900 mt-2">₹{formGrandTotal.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setView("list")} disabled={isGeneratingPdf}>Cancel</Button>
            <Button type="submit" disabled={isGeneratingPdf}>
              {isGeneratingPdf ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</> : "Save & Generate Invoice"}
            </Button>
          </div>
        </form>

        {/* Hidden Invoice Template for PDF Generation */}
        {invoiceToGenerate && (
          <div className="absolute top-[-9999px] left-[-9999px]">
            <InvoiceTemplate invoice={invoiceToGenerate} innerRef={printRef} className="w-[760px]" />
          </div>
        )}

        {/* Hidden Invoice Template for View/Download PDF */}
        {pdfInvoiceData && (
          <div className="absolute top-[-9999px] left-[-9999px]">
            <InvoiceTemplate invoice={pdfInvoiceData} innerRef={pdfRef} className="w-[760px]" />
          </div>
        )}
      </div>
      {companyProfileModal}
      </>
    )
  }

  // -----------------------------------------------------
  // RENDER: PRINT VIEW
  // -----------------------------------------------------
  if (view === "print" && currentInvoice) {
    return (
      <div className="bg-white min-h-screen">
        <div className="print:hidden p-4 bg-slate-100 flex gap-4 justify-center border-b shadow-sm mb-8">
          <Button variant="outline" onClick={() => setView("list")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Print Invoice</Button>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { margin: 0.5cm; size: A4 portrait; }
              body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #sidebar, header, nav { display: none !important; }
              main { padding: 0 !important; margin: 0 !important; }
              .invoice-container { width: 100% !important; border: 1px solid black !important; }
            }
          `}} />
        </div>
        <InvoiceTemplate invoice={currentInvoice} className="max-w-[800px] mx-auto" />
      </div>
    )
  }


  return null
}
