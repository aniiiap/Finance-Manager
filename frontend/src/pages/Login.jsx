import { useState, useEffect } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { API_BASE_URL } from "../lib/api"
import { Building2, Lock, Mail, Eye, EyeOff } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { companySlug } = useParams()
  
  const [companyBranding, setCompanyBranding] = useState(null)
  
  useEffect(() => {
    if (companySlug) {
      // Fetch public company info
      fetch(`${API_BASE_URL}/api/auth/company/${companySlug}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setCompanyBranding(data)
          }
        })
        .catch(console.error)
    }
  }, [companySlug])
  
  // Show success message if redirected from SetPassword
  const successMessage = location.state?.message

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    const result = await login(email.trim().toLowerCase(), password)
    
    if (result.success) {
      if (result.requiresPasswordChange) {
        navigate("/set-password", { state: { email, tempPassword: password } })
      } else if (result.role === 'SUPER_ADMIN') {
        navigate("/super-admin")
      } else {
        navigate("/")
      }
    } else {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-slate-900">
          {companyBranding?.logo_url ? (
            <img src={companyBranding.logo_url} alt={`${companyBranding.name} Logo`} className="w-auto h-24 max-w-full object-contain" />
          ) : (
            <img src="/logo.png" alt="FinManager Logo" className="w-24 h-24 object-contain" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          {companyBranding ? `Sign in to ${companyBranding.name}` : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enterprise Financial Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Id
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-slate-900 focus:border-slate-900 block w-full pl-10 sm:text-sm border-slate-300 rounded-md h-10 border"
                  placeholder="admin@finance.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-slate-900 focus:border-slate-900 block w-full pl-10 pr-10 sm:text-sm border-slate-300 rounded-md h-10 border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

