import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Only fetch if standard user is logged in and not Super Admin
    if (token && user && user.role !== 'SUPER_ADMIN') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, txRes, catRes, clientsRes, usersRes, companyInfoRes, invItemsRes, invTxsRes, lettersRes] = await Promise.all([
        apiFetch('/api/data/projects'),
        apiFetch('/api/data/transactions'),
        apiFetch('/api/data/categories'),
        apiFetch('/api/data/people'),
        user && user.role === 'ADMIN' ? apiFetch('/api/data/users').catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
        apiFetch('/api/data/company-info').catch(() => ({ ok: false })),
        apiFetch('/api/data/inventory/items').catch(() => ({ ok: false })),
        apiFetch('/api/data/inventory/transactions').catch(() => ({ ok: false })),
        apiFetch('/api/letters').catch(() => ({ ok: false }))
      ]);
      
      if (projRes.ok) {
        const rawProjects = await projRes.json();
        const parsedProjects = rawProjects.map(p => {
          if (!p.client) return p;
          try {
            let parsedClient = JSON.parse(p.client);
            if (typeof parsedClient === 'string') parsedClient = JSON.parse(parsedClient);
            if (parsedClient && typeof parsedClient === 'object' && parsedClient.name) {
              return { ...p, client: parsedClient.name };
            }
          } catch(e) {
            const match = p.client.match(/"name"\s*:\s*"([^"]+)"/);
            if (match) {
              return { ...p, client: match[1] };
            }
          }
          return p;
        });
        setProjects(parsedProjects);
      }
      if (txRes.ok) setTransactions(await txRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (clientsRes.ok) {
        const rawClients = await clientsRes.json();
        const parsedClients = rawClients.map(c => {
          let parsedName = c.name;
          try {
            let p = JSON.parse(c.name);
            if (typeof p === 'string') {
              p = JSON.parse(p);
            }
            if (p && typeof p === 'object' && p.name) {
              return { ...c, ...p, originalName: c.name, name: p.name };
            }
          } catch(e) {
            const match = c.name.match(/"name"\s*:\s*"([^"]+)"/);
            if (match) {
              return { ...c, originalName: c.name, name: match[1] };
            }
          }
          return c;
        });
        setClients(parsedClients);
      }

      if (usersRes.ok) setUsers(await usersRes.json());
      if (companyInfoRes.ok) setCompanyInfo(await companyInfoRes.json());
      if (invItemsRes.ok) setInventoryItems(await invItemsRes.json());
      if (invTxsRes.ok) setInventoryTransactions(await invTxsRes.json());
      if (lettersRes.ok) setLetters(await lettersRes.json());
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
    setLoading(false);
  };

  const addTransaction = async (tx) => {
    try {
      const res = await apiFetch('/api/data/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        fetchData();
        toast("Transaction added successfully!", "success");
      } else {
        toast("Failed to add transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding transaction", "error");
    }
  };

  const addProject = async (proj) => {
    try {
      const res = await apiFetch('/api/data/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proj)
      });
      if (res.ok) {
        fetchData();
        toast("Project created successfully!", "success");
      } else {
        toast("Failed to create project", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error creating project", "error");
    }
  };

  
  const bulkDelete = async (table, ids) => {
    try {
      const res = await apiFetch(`/api/data/bulk-delete/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        fetchData();
        toast(`Successfully deleted ${ids.length} items!`, "success");
        return true;
      } else {
        toast("Failed to perform bulk delete", "error");
        return false;
      }
    } catch (err) {
      console.error(err);
      toast("Error during bulk delete", "error");
      return false;
    }
  };

  const deleteProject = async (id) => {
    try {
      const res = await apiFetch(`/api/data/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Project deleted successfully!", "success");
      } else {
        toast("Failed to delete project", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting project", "error");
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const res = await apiFetch(`/api/data/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Transaction deleted successfully!", "success");
      } else {
        toast("Failed to delete transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting transaction", "error");
    }
  };

  const addCategory = async (categoryData) => {
    try {
      const res = await apiFetch('/api/data/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (res.ok) {
        fetchData();
        toast("Category added successfully!", "success");
      } else {
        toast("Failed to add category", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding category", "error");
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const res = await apiFetch(`/api/data/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (res.ok) {
        fetchData();
        toast("Category updated successfully!", "success");
      } else {
        toast("Failed to update category", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating category", "error");
    }
  };

  const deleteCategory = async (id) => {
    try {
      const res = await apiFetch(`/api/data/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Category deleted successfully!", "success");
      } else {
        toast("Failed to delete category", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting category", "error");
    }
  };

  const addClient = async (clientData) => {
    try {
      const nameString = JSON.stringify({ name: clientData.name, company: clientData.company });
      const res = await apiFetch('/api/data/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameString, phone: clientData.contact })
      });
      if (res.ok) {
        fetchData();
        toast("Client added successfully!", "success");
      } else {
        toast("Failed to add client", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding client", "error");
    }
  };

  const deleteClient = async (id) => {
    try {
      const res = await apiFetch(`/api/data/people/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Client deleted successfully!", "success");
      } else {
        toast("Failed to delete client", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting client", "error");
    }
  };

  const addPerson = async (personData) => {
    try {
      const nameString = JSON.stringify({ 
        name: personData.name, 
        role: personData.role,
        workAssigned: personData.workAssigned,
        project: personData.project
      });
      const res = await apiFetch('/api/data/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameString, phone: '' })
      });
      if (res.ok) {
        fetchData();
        toast("Person added successfully!", "success");
      } else {
        toast("Failed to add person", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding person", "error");
    }
  };

  const addUser = async (userData) => {
    try {
      const res = await apiFetch('/api/data/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        fetchData();
        toast("User added successfully!", "success");
        return true;
      }
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Failed to add user", "error");
      return false;
    } catch (err) {
      console.error(err);
      toast("Error adding user", "error");
      return false;
    }
  };

  const updateUser = async (id, userData) => {
    try {
      const res = await apiFetch(`/api/data/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error('Failed to update user');
      const data = await res.json();
      fetchData(); // Refresh list to get updated access arrays
      toast("User updated successfully!", "success");
      return true;
    } catch (err) {
      console.error(err);
      toast("Failed to update user", "error");
      return false;
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await apiFetch(`/api/data/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("User deleted successfully!", "success");
      } else {
        toast("Failed to delete user", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting user", "error");
    }
  };

  const updateClient = async (id, clientData) => {
    try {
      const nameString = JSON.stringify({ name: clientData.name, company: clientData.company });
      const res = await apiFetch(`/api/data/people/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameString, phone: clientData.contact })
      });
      if (res.ok) {
        fetchData();
        toast("Client details updated!", "success");
      } else {
        toast("Failed to update client details", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating client", "error");
    }
  };

  const updateProject = async (id, proj) => {
    try {
      const res = await apiFetch(`/api/data/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proj)
      });
      if (res.ok) {
        fetchData();
        toast("Project updated successfully!", "success");
      } else {
        toast("Failed to update project", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating project", "error");
    }
  };

  const updateInventoryItem = async (id, data) => {
    try {
      const res = await apiFetch(`/api/data/inventory/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setInventoryItems(prev => prev.map(i => i.id === id ? updated : i));
        return updated;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInventoryItem = async (item) => {
    try {
      const res = await apiFetch('/api/data/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchData();
        toast("Inventory item added successfully!", "success");
      } else {
        toast("Failed to add inventory item", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding inventory item", "error");
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      const res = await apiFetch(`/api/data/inventory/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Inventory item deleted!", "success");
      } else {
        toast("Failed to delete inventory item", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting inventory item", "error");
    }
  };

  const updateInventoryTransaction = async (id, data) => {
    try {
      const res = await apiFetch(`/api/data/inventory/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setInventoryTransactions(prev => prev.map(t => t.id === id ? updated : t));
        return updated;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInventoryTransaction = async (tx) => {
    try {
      const res = await apiFetch('/api/data/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        fetchData();
        toast("Inventory transaction added!", "success");
      } else {
        toast("Failed to add transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding transaction", "error");
    }
  };

  const updateTransaction = async (id, tx) => {
    try {
      const res = await apiFetch(`/api/data/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        fetchData();
        toast("Transaction updated successfully!", "success");
      } else {
        toast("Failed to update transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating transaction", "error");
    }
  };

  const deleteInventoryTransaction = async (id) => {
    try {
      const res = await apiFetch(`/api/data/inventory/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInventoryTransactions(prev => prev.filter(t => t.id !== id));
        toast("Inventory transaction deleted!", "success");
      } else {
        toast("Failed to delete transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting transaction", "error");
    }
  };

  const addLetter = async (letterData) => {
    try {
      const res = await apiFetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterData)
      });
      if (res.ok) {
        fetchData();
        toast("Letter added successfully!", "success");
      } else {
        toast("Failed to add letter", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error adding letter", "error");
    }
  };

  const updateLetter = async (id, letterData) => {
    try {
      const res = await apiFetch(`/api/letters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterData)
      });
      if (res.ok) {
        fetchData();
        toast("Letter updated successfully!", "success");
      } else {
        toast("Failed to update letter", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error updating letter", "error");
    }
  };

  const deleteLetter = async (id) => {
    try {
      const res = await apiFetch(`/api/letters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Letter deleted successfully!", "success");
      } else {
        toast("Failed to delete letter", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting letter", "error");
    }
  };

  const updateCompanyInfo = async (info) => {
    try {
      const res = await apiFetch('/api/data/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info)
      });
      if (res.ok) {
        fetchData();
        toast("Company info updated successfully!", "success");
        return true;
      }
      toast("Failed to update company info", "error");
      return false;
    } catch (err) {
      console.error(err);
      toast("Error updating company info", "error");
      return false;
    }
  };

  return (
    <DataContext.Provider value={{ 
      projects, 
      transactions, 
      categories, 
      clients, 
      people: clients,
      users,
      companyInfo,
      inventoryItems,
      inventoryTransactions,
      loading, 
      addTransaction, 
      updateTransaction,
      deleteTransaction,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      addInventoryTransaction,
      updateInventoryTransaction,
      deleteInventoryTransaction,
      addProject, 
      updateProject,
      deleteProject,
      addCategory,
      updateCategory,
      deleteCategory,
      addClient,
      updateClient,
      deleteClient,
      addPerson,
      deletePerson: deleteClient,
      addUser,
      updateUser,
      deleteUser,
      letters,
      addLetter,
      updateLetter,
      deleteLetter,
      bulkDelete,
      updateCompanyInfo,
      refreshData: fetchData 
    }}>
      {children}
    </DataContext.Provider>
  );
};
