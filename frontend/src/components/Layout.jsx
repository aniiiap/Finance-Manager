import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Building2, LayoutDashboard, WalletCards, FolderKanban, BookOpen, BarChart3, Tags, Settings, LogOut, Users, ArrowRightLeft, TrendingUp, ShieldAlert, Package, Menu, X, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { 
    name: 'Accounts', 
    icon: WalletCards,
    children: [
      { name: 'Sales', href: '/sales', icon: FileText },
      { name: 'Stock', href: '/stock', icon: Package },
    ]
  },
  { name: 'Ledger', href: '/ledger', icon: BookOpen },
  { name: 'Profit & Loss', href: '/profit-and-loss', icon: TrendingUp },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAccountsOpen, setIsAccountsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  // Parse user access modules
  const accessArray = Array.isArray(user?.access_modules) 
    ? user.access_modules 
    : (typeof user?.access_modules === 'string' ? JSON.parse(user.access_modules) : []);

  // Filter navigation items based on access permissions
  const filteredNavigation = navigation.map(item => {
    if (item.children) {
      const filteredChildren = item.children.filter(child => {
        if (user?.role === 'ADMIN') return true;
        return accessArray.includes(child.name);
      });
      return { ...item, children: filteredChildren };
    }
    return item;
  }).filter(item => {
    if (user?.role === 'ADMIN') return true;
    if (item.children) {
      return item.children.length > 0;
    }
    if (item.name === 'Dashboard') return true;
    return accessArray.includes(item.name);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 sm:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out sm:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 sm:h-16 flex items-center px-6 border-b border-slate-200 justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="FinManager" className="w-16 h-16 -mr-1 -ml-2" />
            <span className="text-xl font-bold text-slate-900">FinManager</span>
          </div>
          <button onClick={closeSidebar} className="sm:hidden text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {/* Only show standard app navigation to Clients (Admins and Users) */}
          {user?.role !== 'SUPER_ADMIN' && filteredNavigation.map((item) => {
            if (item.children) {
              const hasActiveChild = item.children.some(child => location.pathname === child.href);
              const isOpen = isAccountsOpen || hasActiveChild;

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => setIsAccountsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <div className="flex items-center">
                      <item.icon className="w-5 h-5 mr-3 text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="pl-6 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={closeSidebar}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                              isChildActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <child.icon className="w-4 h-4 mr-2.5 text-slate-400" />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeSidebar}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3 text-slate-400" />
                {item.name}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-4 mt-4 border-t border-slate-200"></div>
              <Link
                to="/settings"
                onClick={closeSidebar}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === "/settings"
                    ? "bg-purple-100 text-purple-900"
                    : "text-purple-600 hover:bg-purple-50 hover:text-purple-900"
                }`}
              >
                <Building2 className="w-5 h-5 mr-3" />
                Company Profile
              </Link>
              <Link
                to="/admin"
                onClick={closeSidebar}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mt-1 ${
                  location.pathname === "/admin"
                    ? "bg-purple-100 text-purple-900"
                    : "text-purple-600 hover:bg-purple-50 hover:text-purple-900"
                }`}
              >
                <Users className="w-5 h-5 mr-3" />
                User Management
              </Link>
            </>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <>
              <div className="pt-4 mt-4 border-t border-slate-200"></div>
              <Link
                to="/super-admin"
                onClick={closeSidebar}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === "/super-admin"
                    ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                    : "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900"
                }`}
              >
                <ShieldAlert className="w-5 h-5 mr-3" />
                Super Admin Panel
              </Link>
            </>
          )}
        </nav>
        
        {/* User / Logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium text-slate-900 truncate pr-2">{user?.name}</span>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 p-1" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 sm:pl-64 flex flex-col w-full">
        <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 sticky top-0 z-10">
          <button 
            onClick={toggleSidebar} 
            className="sm:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center font-semibold text-slate-900 sm:hidden">
            <img src="/logo.png" alt="FinManager" className="w-14 h-14 -mr-1 -ml-2" />
            <span className="text-lg">FinManager</span>
          </div>
          <div className="flex-1 hidden sm:block">
             {/* Desktop breadcrumbs/title space */}
          </div>
          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
               {user?.name?.charAt(0)?.toUpperCase() || 'U'}
             </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-8 w-full max-w-full overflow-x-hidden">
           <Outlet />
        </div>
      </main>
    </div>
  )
}
