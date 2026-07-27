import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Button } from "../components/ui/button";
import { ExportButtons } from "../components/ui/ExportButtons"
import { Folder, FileText, Image as ImageIcon, Upload, ArrowLeft, Plus, Trash2, ExternalLink, Loader2, X, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProgressReport() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('PDF');
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('PDF');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user]);

  useEffect(() => {
    if (currentFolder) {
      fetchFiles(currentFolder.id);
    }
  }, [currentFolder]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/folders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setFolders(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (folderId) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files?folder_id=${folderId}`, {
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

  const handleCreateFolderAndUpload = async () => {
    if (!uploadFile) return alert('Please select a file');
    if (uploadFolderId === 'new' && !newFolderName) return alert('Please enter a folder name');
    
    setIsUploading(true);
    
    let targetFolderId = uploadFolderId;
    
    if (targetFolderId === 'new') {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ name: newFolderName, type: uploadType })
        });
        if (res.ok) {
          const newFolder = await res.json();
          targetFolderId = newFolder.id;
          fetchFolders();
        } else {
          setIsUploading(false);
          return alert('Failed to create folder');
        }
      } catch (err) {
        console.error(err);
        setIsUploading(false);
        return alert('Error creating folder');
      }
    }
    
    // Now upload file
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('folder_id', targetFolderId);
    formData.append('upload_date', uploadDate);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setNewFolderName('');
        if (currentFolder && currentFolder.id === targetFolderId) {
          fetchFiles(currentFolder.id);
        }
      } else {
        alert('Upload failed.');
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
  
  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/progress/folders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const displayedFolders = folders.filter(f => f.type === activeTab);
  const modalFolders = folders.filter(f => f.type === uploadType);

  const folderExportData = displayedFolders.map(f => ({
    "Folder Name": f.name,
    "Type": f.type,
    "Created Date": new Date(f.created_at).toLocaleDateString()
  }));

  const fileExportData = files.map((f, idx) => ({
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

      {!currentFolder ? (
        // Folder View
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
            <div className="flex space-x-4">
              <Button 
                variant={activeTab === 'PDF' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('PDF')}
                className={activeTab === 'PDF' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                <FileText className="w-4 h-4 mr-2" /> PDFs
              </Button>
              <Button 
                variant={activeTab === 'IMAGE' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('IMAGE')}
                className={activeTab === 'IMAGE' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
              >
                <ImageIcon className="w-4 h-4 mr-2" /> Images
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center p-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : displayedFolders.length === 0 ? (
              <div className="text-center p-16 border-2 border-dashed rounded-lg text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No {activeTab} folders exist.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedFolders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder)}
                    className="flex flex-col items-center justify-center p-6 border rounded-lg hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all group relative"
                  >
                    <Folder className={`w-16 h-16 mb-3 ${activeTab === 'PDF' ? 'text-red-400' : 'text-blue-400'}`} fill="currentColor" opacity={0.2} />
                    <span className="font-medium text-center truncate w-full px-2" title={folder.name}>
                      {folder.name}
                    </span>
                    {user?.role === 'ADMIN' && (
                      <button 
                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
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
              <Folder className={`w-5 h-5 mr-2 ${currentFolder.type === 'PDF' ? 'text-red-500' : 'text-blue-500'}`} />
              <CardTitle>{currentFolder.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center p-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center p-16 border-2 border-dashed rounded-lg text-muted-foreground">
                {currentFolder.type === 'PDF' ? <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" /> : <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />}
                <p>No files in this folder.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-12">Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map(file => (
                      <TableRow key={file.id}>
                        <TableCell>
                          {currentFolder.type === 'PDF' ? <FileText className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]" title={file.file_name}>{file.file_name}</TableCell>
                        <TableCell>{file.upload_date ? new Date(file.upload_date).toLocaleDateString() : new Date(file.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => handleViewFile(file.id)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors" title="View File"><ExternalLink className="w-4 h-4" /></button>
                            <button onClick={() => handleDownloadFile(file.id, file.file_name)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors" title="Download File"><Download className="w-4 h-4" /></button>
                            {user?.role === 'ADMIN' && (
                               <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors" title="Delete File"><Trash2 className="w-4 h-4" /></button>
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
                <label className="block text-sm font-medium mb-1">File Type</label>
                <div className="flex space-x-2">
                  <Button 
                    variant={uploadType === 'PDF' ? 'default' : 'outline'}
                    onClick={() => { setUploadType('PDF'); setUploadFolderId(''); }}
                    className="w-full"
                  >
                    PDF
                  </Button>
                  <Button 
                    variant={uploadType === 'IMAGE' ? 'default' : 'outline'}
                    onClick={() => { setUploadType('IMAGE'); setUploadFolderId(''); }}
                    className="w-full"
                  >
                    Image
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select Folder</label>
                <select 
                  className="w-full border rounded-md p-2"
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                >
                  <option value="" disabled>-- Select a Folder --</option>
                  {modalFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  <option value="new">+ Create New Folder</option>
                </select>
              </div>

              {uploadFolderId === 'new' && (
                <div>
                  <label className="block text-sm font-medium mb-1">New Folder Name</label>
                  <input 
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full border rounded-md p-2"
                    placeholder="E.g., Phase 1 Designs"
                  />
                </div>
              )}

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
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full border rounded-md p-1.5"
                  accept={uploadType === 'PDF' ? '.pdf' : 'image/*'}
                />
              </div>

              <Button 
                onClick={handleCreateFolderAndUpload} 
                disabled={isUploading || !uploadFolderId || !uploadFile}
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
