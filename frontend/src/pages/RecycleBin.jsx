import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RefreshCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RecycleBin() {
  const { user } = useAuth();
  const [deletedItems, setDeletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [restoringAllType, setRestoringAllType] = useState(null);
  const [deletingAllType, setDeletingAllType] = useState(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchDeletedItems();
    }
  }, [user]);

  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recycle-bin`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDeletedItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type, id) => {
    if (!window.confirm('Are you sure you want to restore this item?')) return;
    setRestoringId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recycle-bin/restore/${type}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setDeletedItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to restore item.');
      }
    } catch (err) {
      console.error(err);
      alert('Error restoring item.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (type, id) => {
    if (!window.confirm('WARNING: Are you sure you want to PERMANENTLY delete this item? This CANNOT be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recycle-bin/permanent/${type}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setDeletedItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to permanently delete item.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting item.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreAll = async (type, items) => {
    if (!window.confirm(`Are you sure you want to restore all ${items.length} items in this category?`)) return;
    setRestoringAllType(type);
    try {
      const promises = items.map(item => fetch(`${import.meta.env.VITE_API_URL}/api/recycle-bin/restore/${type}/${item.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }));
      await Promise.all(promises);
      setDeletedItems(prev => prev.filter(item => item._type !== type));
    } catch (err) {
      console.error(err);
      alert('Error restoring items.');
    } finally {
      setRestoringAllType(null);
    }
  };

  const handleDeleteAll = async (type, items) => {
    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete all ${items.length} items? This CANNOT be undone.`)) return;
    setDeletingAllType(type);
    try {
      const promises = items.map(item => fetch(`${import.meta.env.VITE_API_URL}/api/recycle-bin/permanent/${type}/${item.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }));
      await Promise.all(promises);
      setDeletedItems(prev => prev.filter(item => item._type !== type));
    } catch (err) {
      console.error(err);
      alert('Error deleting items.');
    } finally {
      setDeletingAllType(null);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center">Access Denied. Admins only.</div>;
  }

  const getFriendlyTypeName = (type) => {
    const map = {
      'people': 'Client',
      'projects': 'Project',
      'transactions': 'Transaction',
      'categories': 'Category',
      'letters': 'Letter',
      'purchases': 'Purchase',
      'inventory_items': 'Stock Item',
      'inventory_transactions': 'Stock Transaction'
    };
    return map[type] || type.replace('_', ' ');
  };

  const getFriendlyPluralName = (type) => {
    const map = {
      'people': 'Clients',
      'inventory_items': 'Stock Items'
    };
    return map[type] || type.replace('_', ' ') + 's';
  };

  const groupedItems = deletedItems.reduce((acc, item) => {
    if (!acc[item._type]) acc[item._type] = [];
    acc[item._type].push(item);
    return acc;
  }, {});

  const getDisplayName = (item) => {
    const raw = item.name || item.reference || item.description || item.subject || item.file_name || `Item #${String(item.id).substring(0,8)}`;
    if (typeof raw === 'string' && raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.name || parsed.title || parsed.subject || parsed.reference || Object.values(parsed)[0] || raw;
      } catch (e) {
        return raw;
      }
    }
    return raw;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600">Recycle Bin</h1>
          <p className="text-muted-foreground mt-1">Restore soft-deleted items across the entire application.</p>
        </div>
        <Button onClick={fetchDeletedItems} variant="outline">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : deletedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-24 text-muted-foreground">
            <Trash2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">The recycle bin is empty.</p>
          </CardContent>
        </Card>
      ) : (
        Object.keys(groupedItems).map(type => (
          <Card key={type} className="mb-6 shadow-sm border-t-4 border-t-red-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="capitalize flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-500" />
                {getFriendlyPluralName(type).replace(/ss$/, 's')} ({groupedItems[type].length})
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => handleRestoreAll(type, groupedItems[type])}
                  disabled={restoringAllType === type || deletingAllType === type}
                >
                  <RefreshCcw className={`w-4 h-4 mr-2 ${restoringAllType === type ? 'animate-spin' : ''}`} />
                  {restoringAllType === type ? 'Restoring All...' : 'Restore All'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteAll(type, groupedItems[type])}
                  disabled={restoringAllType === type || deletingAllType === type}
                >
                  <Trash2 className={`w-4 h-4 mr-2 ${deletingAllType === type ? 'animate-bounce' : ''}`} />
                  {deletingAllType === type ? 'Deleting All...' : 'Delete All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-slate-50 uppercase border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item Details</th>
                      <th className="px-4 py-3 font-medium">Deleted On</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems[type].map(item => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{getDisplayName(item)}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 border capitalize">
                              {getFriendlyTypeName(item._type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(item.deleted_at || item.updated_at || item.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleRestore(type, item.id)}
                              disabled={restoringId === item.id || deletingId === item.id}
                            >
                              <RefreshCcw className={`w-4 h-4 mr-2 ${restoringId === item.id ? 'animate-spin' : ''}`} />
                              {restoringId === item.id ? 'Restoring...' : 'Restore'}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handlePermanentDelete(type, item.id)}
                              disabled={restoringId === item.id || deletingId === item.id}
                            >
                              <Trash2 className={`w-4 h-4 ${deletingId === item.id ? 'animate-bounce' : ''}`} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
