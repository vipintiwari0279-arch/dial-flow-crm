import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    totalCalled: 0,
    connected: 0,
    notInterested: 0,
    callback: 0
  });
  const [dispositionPieData, setDispositionPieData] = useState([]);
  const [weeklyOverview, setWeeklyOverview] = useState([]);
  const [agents, setAgents] = useState([]);
  const [liveCalls, setLiveCalls] = useState({});
  const socket = useSocket();
  const { token } = useAuth();

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);

        // Map pie chart data
        const pieMapped = [
          { name: 'Interested', value: data.dispositionSummary.interested, color: '#10b981' },
          { name: 'Not Interested', value: data.dispositionSummary.not_interested, color: '#f59e0b' },
          { name: 'Callback', value: data.dispositionSummary.callback, color: '#3b82f6' },
          { name: 'DNC', value: data.dispositionSummary.dnc, color: '#ef4444' },
          { name: 'Wrong Number', value: data.dispositionSummary.wrong_number, color: '#8b5cf6' },
          { name: 'Others', value: data.dispositionSummary.others, color: '#64748b' }
        ].filter(item => item.value > 0);

        setDispositionPieData(pieMapped.length > 0 ? pieMapped : [
          { name: 'No Calls Logged', value: 1, color: '#e2e8f0' }
        ]);

        setWeeklyOverview(data.weeklyCallsOverview);
      }
    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (e) {
      console.error('Failed to load agents list:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAgents();
  }, [token]);

  // Listen to Socket.io real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('agent_status_change', (data) => {
      // Update specific agent's status in agents list
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === data.agentId ? { ...agent, status: data.status } : agent
        )
      );
    });

    socket.on('live_call_update', (data) => {
      // Update live calling status overlay
      // data: { agentId, agentName, leadName, phone, state: 'dialing' | 'talking' | 'idle' }
      setLiveCalls(prev => ({
        ...prev,
        [data.agentId]: data
      }));

      // Update current lead value in the agents list
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === data.agentId
            ? { ...agent, currentLead: data.state !== 'idle' ? data.phone : '-' }
            : agent
        )
      );
    });

    socket.on('call_logged', (data) => {
      // Refresh dashboard analytics and agents counters
      fetchDashboardData();
      fetchAgents();

      // Clear the live calls entry
      setLiveCalls(prev => {
        const next = { ...prev };
        delete next[data.agentId];
        return next;
      });
    });

    socket.on('leads_distributed', () => {
      fetchDashboardData();
    });

    return () => {
      socket.off('agent_status_change');
      socket.off('live_call_update');
      socket.off('call_logged');
      socket.off('leads_distributed');
    };
  }, [socket]);

  // Formatting large numbers
  const formatNum = (num) => num.toLocaleString('en-IN');

  const cardData = [
    { title: 'Total Leads', val: metrics.totalLeads, color: 'bg-brand-500', text: 'text-white', icon: Layers },
    { title: 'Total Called', val: metrics.totalCalled, color: 'bg-emerald-500', text: 'text-white', icon: PhoneCall },
    { title: 'Connected', val: metrics.connected, color: 'bg-sky-500', text: 'text-white', icon: PhoneForwarded },
    { title: 'Not Interested', val: metrics.notInterested, color: 'bg-amber-500', text: 'text-white', icon: PhoneOff },
    { title: 'Callback', val: metrics.callback, color: 'bg-rose-500', text: 'text-white', icon: Calendar }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Welcome back, Admin</p>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {cardData.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`p-6 rounded-3xl ${card.color} ${card.text} shadow-premium hover-scale flex flex-col justify-between h-36 relative overflow-hidden`}
            >
              {/* Card background glowing circular overlays */}
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/10"></div>
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-bold uppercase tracking-wider opacity-85">{card.title}</span>
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="z-10 mt-auto">
                <span className="text-3xl font-extrabold tracking-tight">
                  {formatNum(card.val)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Monitoring Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping"></div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">Live Monitoring</h3>
          </div>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
            {agents.filter(a => a.status !== 'offline').length} Agents Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">Agent</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-center">Calls Today</th>
                <th className="py-4 px-4 text-center">Connected</th>
                <th className="py-4 px-4">Duration</th>
                <th className="py-4 px-4">Current Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {agents.map((agent) => {
                const liveCall = liveCalls[agent.id];
                const isCalling = liveCall && liveCall.state !== 'idle';
                
                return (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-slate-700">{agent.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                        agent.status === 'online'
                          ? 'bg-emerald-50 text-emerald-600'
                          : agent.status === 'paused'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'online'
                            ? 'bg-emerald-500'
                            : agent.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                        }`}></span>
                        {agent.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-700">{agent.callsToday}</td>
                    <td className="py-4 px-4 text-center font-semibold text-emerald-600">{agent.connected}</td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">{agent.duration}</td>
                    <td className="py-4 px-4">
                      {isCalling ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide animate-pulse ${
                            liveCall.state === 'dialing' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <Phone className="w-2.5 h-2.5" />
                            {liveCall.state}
                          </span>
                          <span className="font-mono text-xs text-slate-600 font-medium">{liveCall.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">{agent.currentLead || '-'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {agents.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">No agents added yet. Go to Agents tab to add one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Weekly Area Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-slate-800 tracking-tight">Calls Overview (This Week)</h3>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" /> Live performance
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="connColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}
                />
                <Area name="Total Calls" type="monotone" dataKey="totalCalls" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#totalColor)" />
                <Area name="Connected Calls" type="monotone" dataKey="connectedCalls" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#connColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disposition Summary Pie Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6">
          <h3 className="font-extrabold text-slate-800 tracking-tight mb-6">Disposition Summary</h3>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dispositionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dispositionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Custom Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 mt-2">
            {dispositionPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="truncate">{item.name} - {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
