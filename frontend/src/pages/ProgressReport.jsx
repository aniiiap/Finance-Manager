import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button";
import { ExportButtons } from "../components/ui/ExportButtons"
import { Folder, FileText, Image as ImageIcon, Upload, ArrowLeft, Trash2, ExternalLink, Loader2, X, Download, Search } from 'lucide-react';
import { DateFilter } from '../components/ui/DateFilter';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function ProgressReport() {
  const { user } = useAuth();
  const { projects } = useData();
  const [activeTab, setActiveTab] = useState('ALL');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('PDF');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentFolder) {
      fetchFiles(currentFolder.id);
    }
  }, [currentFolder]);

  const fetchFiles = async (projectId) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setFiles(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return alert('Please select a file');
    if (!uploadFolderId) return alert('Please select a project folder');
    
    setIsUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', uploadFiles[i]);
        formData.append('project_id', uploadFolderId);
        formData.append('upload_date', uploadDate);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        setShowUploadModal(false);
        setUploadFiles([]);
        if (currentFolder && currentFolder.id === parseInt(uploadFolderId)) {
          fetchFiles(currentFolder.id);
        }
        if (successCount < uploadFiles.length) {
          alert(`Uploaded ${successCount} out of ${uploadFiles.length} files successfully.`);
        }
      } else {
        alert('Upload failed for all files.');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewFile = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files/${id}/url`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      } else {
        alert('Could not retrieve file link.');
      }
    } catch (err) {
      console.error(err);
      alert('Error viewing file.');
    }
  };

  const handleDownloadFile = async (id, fileName) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files/${id}/download?filename=${encodeURIComponent(fileName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        alert('Could not retrieve file for download.');
      }
    } catch (err) {
      console.error(err);
      alert('Error downloading file.');
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Delete this file permanently?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchFiles(currentFolder.id);
    } catch (err) {
      console.error(err);
    }
  };

  const displayedFolders = (projects || []).filter(folder => {
    let match = true;
    if (searchQuery) match = match && folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (fromDate || toDate) {
      let pDate = new Date(folder.created_at || folder.updated_at || new Date());
      if (fromDate) match = match && pDate >= new Date(fromDate);
      if (toDate) match = match && pDate <= new Date(toDate + 'T23:59:59');
    }
    return match;
  });

  const modalFolders = projects || [];

  const displayedFiles = files.filter(f => {
    const ext = f.file_name.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const matchesTab = activeTab === 'ALL' ? true : activeTab === 'PDF' ? isPdf : isImage;
    const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (fromDate) {
      matchesDate = matchesDate && new Date(f.upload_date) >= new Date(fromDate);
    }
    if (toDate) {
      matchesDate = matchesDate && new Date(f.upload_date) <= new Date(toDate + 'T23:59:59');
    }
    
    return matchesTab && matchesSearch && matchesDate;
  });

  const fileExportData = displayedFiles.map((f, idx) => ({
    "Sr No": idx + 1,
    "File Name": f.file_name,
    "Upload Date": new Date(f.upload_date).toLocaleDateString()
  }));

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress Reports</h1>
          <p className="text-muted-foreground mt-1">Manage, upload, and organize PDFs and Images in Cloudflare R2.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button onClick={() => setShowUploadModal(true)} className="gap-2 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white">
            <Upload className="w-4 h-4" /> Upload File
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/80 backdrop-blur-md p-4 rounded-xl border border-indigo-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search folders or files..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DateFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {!currentFolder ? (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
            <CardTitle>Project Folders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center p-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : displayedFolders.length === 0 ? (
              <div className="text-center p-16 border-b text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No project folders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-50/40 hover:bg-indigo-50/60">
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedFolders.map((folder) => (
                      <TableRow 
                        key={folder.id} 
                        className="cursor-pointer hover:bg-slate-50 group"
                        onClick={() => setCurrentFolder(folder)}
                      >
                        <TableCell>
                          <Folder className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                        </TableCell>
                        <TableCell className="font-medium">{folder.name}</TableCell>
                        <TableCell>{folder.client_name || folder.client || '--'}</TableCell>
                        <TableCell>{folder.status || 'Active'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // File View (Inside a Folder)
        <Card className="shadow-sm border-t-4 border-t-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50 flex-wrap gap-4">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => setCurrentFolder(null)} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Folder className={`w-5 h-5 mr-2 text-slate-500`} />
              <CardTitle>{currentFolder.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-row items-center justify-between mb-4">
              <div className="flex space-x-4">
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="ALL">All Files</option>
                  <option value="PDF">PDFs Only</option>
                  <option value="IMAGE">Images Only</option>
                </select>
              </div>
              <ExportButtons 
                data={fileExportData} 
                columns={["Sr No", "File Name", "Upload Date"]}
                filename={`Files_${currentFolder.name}_${new Date().toISOString().split('T')[0]}`}
                title={`Files for ${currentFolder.name}`}
              />
            </div>
            {loading ? (
              <div className="flex justify-center p-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center p-16 border-2 border-dashed rounded-lg text-muted-foreground">
                {activeTab === 'PDF' ? <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" /> : activeTab === 'IMAGE' ? <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" /> : <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />}
                <p>No files in this folder.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-50/40">
                      <TableHead className="w-12">Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedFiles.map(file => (
                      <TableRow key={file.id}>
                        <TableCell>
                          {file.file_name.split('.').pop().toLowerCase() === 'pdf' ? <FileText className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]" title={file.file_name}>{file.file_name}</TableCell>
                        <TableCell>{file.upload_date ? new Date(file.upload_date).toLocaleDateString() : new Date(file.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => handleViewFile(file.id)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors" title="View File"><ExternalLink className="w-4 h-4" /></button>
                            <button onClick={() => handleDownloadFile(file.id, file.file_name)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors" title="Download File"><Download className="w-4 h-4" /></button>
                            {user?.role === 'ADMIN' && (
                               <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:scale-110 transition-all rounded-md hover:bg-slate-100 transition-colors" title="Delete File"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button 
              onClick={() => setShowUploadModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Upload File</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Folder</label>
                <select 
                  className="w-full border rounded-md p-2"
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                >
                  <option value="" disabled>-- Select a Project Folder --</option>
                  {modalFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Upload Date</label>
                <input 
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  disabled={user?.role !== 'ADMIN'}
                  className="w-full border rounded-md p-2 disabled:bg-slate-100 disabled:text-slate-500"
                />
                {user?.role !== 'ADMIN' && (
                  <p className="text-xs text-muted-foreground mt-1">Only admins can edit the upload date.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select File</label>
                <input 
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  className="w-full border rounded-md p-1.5"
                  accept=".pdf,image/*"
                />
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={isUploading || !uploadFolderId || uploadFiles.length === 0}
                className="w-full mt-4"
              >
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
