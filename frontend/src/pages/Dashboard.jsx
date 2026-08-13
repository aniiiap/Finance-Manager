import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CheckSquare, Users, FileText, Handshake, ArrowRightLeft, BookOpen } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { companyInfo } = useData()
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const userName = companyInfo?.admin_name ? companyInfo.admin_name.split(' ')[0] : 'User'

  const cards = [
    {
      title: 'Clients',
      description: 'Manage client details and communications',
      icon: Users,
      link: '/clients',
      imgSrc: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=500',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      title: 'My Projects',
      description: 'View and manage all your ongoing projects',
      icon: Building2,
      link: '/projects',
      imgSrc: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=500',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100'
    },
    {
      title: 'Transactions',
      description: 'Record and track all your income and expenses',
      icon: ArrowRightLeft,
      link: '/transactions',
      imgSrc: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=500',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100'
    },
    {
      title: 'Invoices',
      description: 'Create, send and track your sales invoices',
      icon: FileText,
      link: '/sales',
      imgSrc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=500',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100'
    },
    {
      title: 'Ledger Book',
      description: 'View detailed account statements and balances',
      icon: BookOpen,
      link: '/ledger',
      imgSrc: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=500',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100'
    }
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50 flex flex-col gap-4 md:gap-6 overflow-hidden">
      {/* Header Greeting */}
      <div className="flex justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xs md:text-sm text-indigo-600 font-bold uppercase tracking-widest mb-1">{companyInfo?.company_name || 'Finance Manager'}</h2>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            {greeting}, {userName}! <span className="animate-wave origin-bottom-right inline-block">👋</span>
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">Let's build something amazing today.</p>
        </div>
        
        <div className="shrink-0 bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-slate-100 mt-1 sm:mt-0">
          {companyInfo?.logo_url ? (
            <img src={companyInfo.logo_url} alt="Company Logo" className="h-16 sm:h-24 w-auto object-contain max-w-[240px]" crossOrigin="anonymous" />
          ) : (
            <img src="/logo.png" alt="Company Logo" className="h-16 sm:h-24 w-auto object-contain max-w-[240px]" onError={(e) => { e.target.style.display = 'none' }} />
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-[180px] md:h-[220px] rounded-3xl overflow-hidden shadow-lg group shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1600" 
          alt="Construction Site" 
          className="absolute inset-0 w-full h-full object-cover scale-150 origin-left group-hover:scale-[1.55] transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent"></div>
        
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12 w-full md:w-2/3">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-4 leading-tight drop-shadow-md">
            Streamline Your<br/>
            <span className="text-yellow-400">Construction Projects.</span>
          </h2>
          <p className="text-slate-200 text-xs md:text-sm max-w-sm drop-shadow hidden sm:block">
            Track progress, manage finances, and oversee your entire team from one unified dashboard.
          </p>
          <div className="mt-3 md:mt-4">
            <div className="w-12 md:w-16 h-1 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
          </div>
        </div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 pt-2 flex-1 items-start">
        {cards.map((card, idx) => {
          const isClickable = user?.role !== 'USER';
          return (
            <div 
              key={idx}
              onClick={() => isClickable && navigate(card.link)} 
              className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full ${
                isClickable 
                  ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group' 
                  : 'opacity-95'
              }`}
            >
              <div className="h-20 md:h-24 w-full overflow-hidden relative shrink-0">
                <img 
                  src={card.imgSrc} 
                  alt={card.title} 
                  className={`w-full h-full object-cover ${isClickable ? 'group-hover:scale-110 transition-transform duration-700' : ''}`} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
              </div>
              
              <div className="relative pt-6 md:pt-8 pb-3 px-3 text-center flex-1 flex flex-col bg-white">
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center ${card.bgColor} ${card.color} border ${card.borderColor} ${isClickable ? 'group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300' : ''} z-10`}>
                  <card.icon className="w-5 h-5" />
                </div>
                
                <h3 className="font-bold text-slate-800 text-sm md:text-base mb-1">{card.title}</h3>
                <p className="text-[10px] md:text-xs text-slate-500 mb-2 flex-1 leading-relaxed px-1 hidden md:block">{card.description}</p>
                
                {isClickable && (
                  <div className={`w-6 h-6 md:w-8 md:h-8 mx-auto mt-auto rounded-full ${card.bgColor} ${card.color} flex items-center justify-center group-hover:translate-x-1 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300`}>
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: rotate(0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate(0.0deg) }
          100% { transform: rotate(0.0deg) }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
        }
      `}} />
    </div>
  )
}
