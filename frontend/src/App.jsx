import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Transactions from './pages/Transactions'
import Ledger from './pages/Ledger'
import ProfitAndLoss from './pages/ProfitAndLoss'
import Reports from './pages/Reports'
import Stock from './pages/Stock'
import Categories from './pages/Categories'
import Sales from './pages/Sales'
import Login from './pages/Login'
import SetPassword from './pages/SetPassword'
import AdminSettings from './pages/AdminSettings'
import Settings from './pages/Settings'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin, requireSuperAdmin, requireClient, requireModule }) => {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  
  // Super Admin cannot access client pages (Dashboard, Ledger, etc)
  if (requireClient && user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />
  
  if (requireSuperAdmin && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />
  if (requireAdmin && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />

  // USER role: enforce module access (ADMIN has all modules)
  if (requireModule && user.role === 'USER') {
    const accessArray = Array.isArray(user.access_modules)
      ? user.access_modules
      : (typeof user.access_modules === 'string' ? JSON.parse(user.access_modules || '[]') : []);
    if (!accessArray.includes(requireModule)) {
      return <Navigate to="/" replace />
    }
  }
  
  return children
}

import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  {/* Client Routes - Blocked for Super Admin */}
                  <Route index element={<ProtectedRoute requireClient={true}><Dashboard /></ProtectedRoute>} />
                  <Route path="clients" element={<ProtectedRoute requireClient={true} requireModule="Clients"><Clients /></ProtectedRoute>} />
                  <Route path="projects" element={<ProtectedRoute requireClient={true} requireModule="Projects"><Projects /></ProtectedRoute>} />
                  <Route path="projects/:id" element={<ProtectedRoute requireClient={true} requireModule="Projects"><ProjectDetail /></ProtectedRoute>} />
                  <Route path="transactions" element={<ProtectedRoute requireClient={true} requireModule="Transactions"><Transactions /></ProtectedRoute>} />
                  <Route path="sales" element={<ProtectedRoute requireClient={true} requireModule="Sales"><Sales /></ProtectedRoute>} />
                  <Route path="ledger" element={<ProtectedRoute requireClient={true} requireModule="Ledger"><Ledger /></ProtectedRoute>} />
                  <Route path="profit-and-loss" element={<ProtectedRoute requireClient={true} requireModule="Profit & Loss"><ProfitAndLoss /></ProtectedRoute>} />
                  <Route path="stock" element={<ProtectedRoute requireClient={true} requireModule="Stock"><Stock /></ProtectedRoute>} />
                  <Route path="reports" element={<ProtectedRoute requireClient={true} requireModule="Reports"><Reports /></ProtectedRoute>} />
                  <Route path="categories" element={<ProtectedRoute requireClient={true} requireModule="Categories"><Categories /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute requireAdmin={true} requireClient={true}><Settings /></ProtectedRoute>} />
                  <Route path="admin" element={<ProtectedRoute requireAdmin={true} requireClient={true}><AdminSettings /></ProtectedRoute>} />
                  
                  {/* Super Admin Route */}
                  <Route path="super-admin" element={<ProtectedRoute requireSuperAdmin={true}><SuperAdminDashboard /></ProtectedRoute>} />
                </Route>
              </Routes>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
