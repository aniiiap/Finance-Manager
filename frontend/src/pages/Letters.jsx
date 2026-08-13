import { useState, useEffect, useRef } from "react"
import { DateFilter } from "../components/ui/DateFilter"
import { useData } from "../context/DataContext"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Modal, ConfirmModal } from "../components/ui/modal"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { ExportButtons } from "../components/ui/ExportButtons"
import { Pagination } from "../components/ui/pagination"
import { Mail, Plus, Download, Edit2, Trash2, Search, Settings } from "lucide-react"
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import html2pdf from "html2pdf.js"
import LetterTemplate from "../components/LetterTemplate"
import { useToast } from "../context/ToastContext"
import { useAuth } from "../context/AuthContext"

export default function Letters() {
  const { user } = useAuth()
  const { letters, addLetter, updateLetter, deleteLetter, bulkDelete } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [letterToDelete, setLetterToDelete] = useState(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const { companyInfo, updateCompanyInfo } = useData()

  const [settingsForm, setSettingsForm] = useState({
    company_name: '', address: '', gstin: '', contact_email: '', contact_phone: ''
  })

  const handleSettingsClick = () => {
    setSettingsForm({
      company_name: companyInfo?.company_name || '',
      address: companyInfo?.address || '',
      gstin: companyInfo?.gstin || '',
      contact_email: companyInfo?.contact_email || '',
      contact_phone: companyInfo?.contact_phone || ''
    })
    setIsSettingsModalOpen(true)
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    const success = await updateCompanyInfo(settingsForm)
    if (success) setIsSettingsModalOpen(false)
  }
  
  // Form State
  const [currentLetter, setCurrentLetter] = useState(null)
  const [refNo, setRefNo] = useState('')
  const [letterDate, setLetterDate] = useState('')
  const [content, setContent] = useState('')

  const [activeLetter, setActiveLetter] = useState(null)
  const { toast } = useToast()

  // Filters & Bulk Delete
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} letters?`)) return;
    const success = await bulkDelete('letters', selectedIds);
    if (success) setSelectedIds([]);
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const filteredLetters = (letters || []).filter(l => {
    const searchMatch = (l.ref_no || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (l.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    let dateMatch = true;
    if (fromDate) dateMatch = dateMatch && new Date(l.letter_date) >= new Date(fromDate);
    if (toDate) dateMatch = dateMatch && new Date(l.letter_date) <= new Date(toDate + 'T23:59:59');
    return searchMatch && dateMatch;
  });

  // Pagination logic
  const pageSize = 10;
  const totalPages = Math.ceil(filteredLetters.length / pageSize);
  const paginatedLetters = filteredLetters.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedLetters.map(i => i.id));
    else setSelectedIds([]);
  }

  const exportData = filteredLetters.map(letter => ({
    "Date": new Date(letter.letter_date).toLocaleDateString(),
    "Ref No": letter.ref_no || '',
    "Content Snippet": letter.content ? letter.content.substring(0, 100) + '...' : ''
  }))

  const handleDownload = async (letter) => {
    setActiveLetter(letter)
    
    // Give state time to update the hidden template
    setTimeout(() => {
      const element = document.getElementById('letter-pdf-template');
      if (!element) return;
      
      const opt = {
        margin: 0,
        filename: `Letter_${letter.ref_no || 'Document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Temporarily remove 'hidden' to render
      element.classList.remove('hidden');
      
      html2pdf().set(opt).from(element).save().then(() => {
        element.classList.add('hidden');
        setActiveLetter(null);
      });
    }, 100);
  }

  const handleNewClick = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `REF/${currentYear}/`;
    
    // Find highest sequence number for current year
    let maxSeq = 0;
    if (letters) {
      letters.forEach(l => {
        if (l.ref_no && l.ref_no.startsWith(prefix)) {
          const parts = l.ref_no.split('/');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      });
    }
    
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    setRefNo(`${prefix}${nextSeq}`);
    
    setLetterDate(new Date().toISOString().split('T')[0])
    setContent('')
    setIsModalOpen(true)
  }

  const handleEditClick = (letter) => {
    setCurrentLetter(letter)
    setRefNo(letter.ref_no)
    setLetterDate(letter.letter_date ? new Date(letter.letter_date).toISOString().split('T')[0] : '')
    setContent(letter.content)
    setIsEditModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    addLetter({ ref_no: refNo, letter_date: letterDate, content })
    setIsModalOpen(false)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateLetter(currentLetter.id, { ref_no: refNo, letter_date: letterDate, content })
    setIsEditModalOpen(false)
    setCurrentLetter(null)
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link'],
      ['clean']
    ],
  }

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'link'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Letters</h2>
          <p className="text-sm text-slate-500">Manage and print official letters.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <ExportButtons 
            data={exportData} 
            columns={["Date", "Ref No", "Content Snippet"]}
            filename={`Letters_${new Date().toISOString().split('T')[0]}`}
            title="Letters Report"
          />
          {selectedIds.length > 0 && user?.role === 'ADMIN' && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <Button variant="outline" onClick={handleSettingsClick} className="gap-2 w-full sm:w-auto">
              <Settings className="w-4 h-4" /> Letterhead Profile
            </Button>
          )}
          <Button onClick={handleNewClick} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New Letter
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/80 backdrop-blur-md p-4 rounded-xl border border-indigo-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search letters by Ref No. or Content..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50/40">
                  {user?.role === 'ADMIN' && (
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="cursor-pointer rounded border-slate-300 w-4 h-4"
                        checked={paginatedLetters.length > 0 && selectedIds.length === paginatedLetters.length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Ref No.</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLetters.length === 0 ? (
                  <TableRow><TableCell colSpan={user?.role === 'ADMIN' ? 5 : 4} className="text-center py-4 text-slate-500">No letters found.</TableCell></TableRow>
                ) : paginatedLetters.map((l) => (
                  <TableRow key={l.id} className={selectedIds.includes(l.id) ? 'bg-red-50/50' : ''}>
                    {user?.role === 'ADMIN' && (
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="cursor-pointer rounded border-slate-300 w-4 h-4"
                          checked={selectedIds.includes(l.id)}
                          onChange={() => toggleSelect(l.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>{l.letter_date ? new Date(l.letter_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="font-medium">{l.ref_no}</TableCell>
                    <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <button 
                        onClick={() => handleDownload(l)}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <>
                          <button 
                            onClick={() => handleEditClick(l)}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all rounded-md hover:bg-slate-100 transition-colors"
                            title="Edit Letter"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setLetterToDelete(l.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:scale-110 transition-all rounded-md hover:bg-slate-100 transition-colors"
                            title="Delete Letter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {(!letters || letters.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    No letters found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      {/* Hidden Template for PDF Generation */}
      <LetterTemplate letter={activeLetter} />

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Letter" maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ref No.</label>
              <input 
                value={refNo} 
                onChange={e => setRefNo(e.target.value)} 
                type="text" 
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input 
                value={letterDate} 
                onChange={e => setLetterDate(e.target.value)} 
                type="date" 
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Letter Content</label>
            <div className="bg-white">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent} 
                modules={modules}
                formats={formats}
                className="h-64 mb-12"
              />
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">Save Letter</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Letter" maxWidth="max-w-4xl">
        {currentLetter && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ref No.</label>
                <input 
                  value={refNo} 
                  onChange={e => setRefNo(e.target.value)} 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <input 
                  value={letterDate} 
                  onChange={e => setLetterDate(e.target.value)} 
                  type="date" 
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 text-sm" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Letter Content</label>
              <div className="bg-white">
                <ReactQuill 
                  theme="snow" 
                  value={content} 
                  onChange={setContent} 
                  modules={modules}
                  formats={formats}
                  className="h-64 mb-12"
                />
              </div>
            </div>
            <div className="pt-4">
              <Button type="submit" className="w-full">Update Letter</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={!!letterToDelete}
        onClose={() => setLetterToDelete(null)}
        onConfirm={() => {
          deleteLetter(letterToDelete)
          setLetterToDelete(null)
        }}
        title="Delete Letter"
        message="Are you sure you want to delete this letter? This action cannot be undone."
      />

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Letterhead Profile" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 font-bold">🔒</div>
            <div>
              <h3 className="font-semibold text-sm">Profile is Read-Only</h3>
              <p className="text-sm mt-1">Company profile settings are managed centrally by your System Administrator. Please contact support to request any changes.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name *</label>
            <input
              readOnly
              type="text"
              value={settingsForm.company_name}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus-visible:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company Address *</label>
            <textarea
              readOnly
              value={settingsForm.address}
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">GSTIN</label>
              <input 
                type="text"
                readOnly
                value={settingsForm.gstin}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus-visible:outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Phone</label>
              <input 
                type="text"
                readOnly
                value={settingsForm.contact_phone}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus-visible:outline-none" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Email</label>
            <input 
              type="email"
              readOnly
              value={settingsForm.contact_email}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus-visible:outline-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsSettingsModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
