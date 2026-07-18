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
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Only fetch if standard user is logged in
    if (token && user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, txRes, catRes, clientsRes, usersRes, companyInfoRes, invItemsRes, invTxsRes] = await Promise.all([
        apiFetch('/api/data/projects'),
        apiFetch('/api/data/transactions'),
        apiFetch('/api/data/categories'),
        apiFetch('/api/data/people'),
        user && user.role === 'ADMIN' ? apiFetch('/api/data/users').catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
        apiFetch('/api/data/company-info').catch(() => ({ ok: false })),
        apiFetch('/api/data/inventory/items').catch(() => ({ ok: false })),
        apiFetch('/api/data/inventory/transactions').catch(() => ({ ok: false }))
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
      toast("Failed to add user", "error");
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

  const deleteInventoryTransaction = async (id) => {
    try {
      const res = await apiFetch(`/api/data/inventory/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast("Inventory transaction deleted!", "success");
      } else {
        toast("Failed to delete transaction", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error deleting transaction", "error");
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
      deleteTransaction,
      addInventoryItem,
      deleteInventoryItem,
      addInventoryTransaction,
      deleteInventoryTransaction,
      addProject, 
      updateProject,
      deleteProject,
      addCategory,
      deleteCategory,
      addClient,
      updateClient,
      deleteClient,
      addPerson,
      deletePerson: deleteClient,
      addUser,
      updateUser,
      deleteUser,
      refreshData: fetchData 
    }}>
      {children}
    </DataContext.Provider>
  );
};
