import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Radio, Users, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const DistributeLeads = () => {
  const [stats, setStats] = useState({
    pendingLeads: 0,
    onlineAgents: 0
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const { token } = useAuth();

  const fetchDistributeStats = async () => {
    try {
      // 1. Fetch leads info
      const leadsRes = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const leadsData = await leadsRes.json();

      // 2. Fetch agents info
      const agentsRes = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const agentsData = await agentsRes.json();

      if (leadsData.success && agentsData.success) {
        const pending = leadsData.leads.filter(l => l.status === 'pending').length;
        const activeAgents = agentsData.agents.filter(a => a.status === 'online' || a.status === 'paused').length;

        setStats({
          pendingLeads: pending,
          onlineAgents: activeAgents
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDistributeStats();
  }, [token]);

  const handleDistribute = async () => {
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await fetch('/api/leads/distribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setMsg({ text: data.message, type: 'success' });
        fetchDistributeStats();
      } else {
        setMsg({ text: data.message || 'Error distributing leads', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Connection failed. Server might be offline.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Equal Lead Distribution</h1>
        <p className="text-sm text-slate-500 font-medium">Distribute pending leads equally among online agents using Round Robin routing</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-8 space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between h-32">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unassigned Leads</span>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.pendingLeads}</span>
              <span className="text-xs text-slate-400 font-semibold">Pending Allocation</span>
            </div>
          </div>

          <div className="p-6 bg-brand-50 rounded-2xl border border-brand-100 flex flex-col justify-between h-32">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Online/Paused Agents</span>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-4xl font-extrabold text-brand-600 tracking-tight">{stats.onlineAgents}</span>
              <span className="text-xs text-brand-400 font-semibold">Active Agents</span>
            </div>
          </div>
        </div>

        {msg.text && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${
            msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleDistribute}
            disabled={stats.pendingLeads === 0 || stats.onlineAgents === 0 || loading}
            className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed hover-scale transition-all"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Distribute Leads (Round Robin)</span>
              </>
            )}
          </button>

          {stats.pendingLeads === 0 && (
            <p className="text-xs text-slate-400 text-center font-medium">
              💡 Tip: Upload a CSV containing new leads before distributing.
            </p>
          )}

          {stats.onlineAgents === 0 && stats.pendingLeads > 0 && (
            <p className="text-xs text-amber-500 text-center font-bold">
              ⚠️ Warning: No agents are currently online or paused. Log in as an agent to receive leads!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributeLeads;
