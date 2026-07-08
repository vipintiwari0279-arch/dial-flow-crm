import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Upload,
  Radio,
  FileSpreadsheet,
  Settings,
  LogOut,
  Calendar,
  ShieldAlert,
  Smartphone,
  PhoneCall,
  Activity,
  Fingerprint
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Leads', path: '/admin/leads', icon: FileSpreadsheet },
    { name: 'Upload Leads', path: '/admin/upload', icon: Upload },
    { name: 'Agents', path: '/admin/agents', icon: Users },
    { name: 'Distribute Leads', path: '/admin/distribute', icon: Radio },
    { name: 'Attendance Logs', path: '/admin/attendance', icon: Fingerprint },
    { name: 'Call Reports', path: '/admin/reports', icon: PhoneCall },
    { name: 'Live Monitoring', path: '/admin/live', icon: Activity },
    { name: 'Callback Leads', path: '/admin/callbacks', icon: Calendar },
    { name: 'DNC List', path: '/admin/dnc', icon: ShieldAlert },
    { name: 'Agent Simulator', path: '/simulator', icon: Smartphone, highlight: true }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Dial Flow CRM
            </h1>
            <p className="text-xs text-brand-400 font-medium">By Vipin</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15'
                    : item.highlight
                      ? 'bg-brand-950/50 text-brand-300 border border-brand-800/30 hover:bg-brand-900/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : item.highlight ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-brand-400 border border-slate-700">
              A
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-slate-500 font-mono">System Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/80 bg-white/70 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Admin Panel
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-medium text-slate-500">Live Systems Online</span>
          </div>
        </header>

        {/* Content body */}
        <main className="p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
