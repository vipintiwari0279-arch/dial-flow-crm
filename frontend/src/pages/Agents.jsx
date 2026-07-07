import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Target, X, ShieldAlert } from 'lucide-react';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetCalls, setTargetCalls] = useState(150);
  const [error, setError] = useState('');

  const { token } = useAuth();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (data.success) {
        setName('');
        setEmail('');
        setPassword('');
        setShowAddModal(false);
        fetchAgents();
      } else {
        setError(data.message || 'Error creating agent');
      }
    } catch (err) {
      setError('Server connection error');
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!window.confirm('Are you sure you want to remove this agent?')) return;

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openTargetModal = (agent) => {
    setSelectedAgent(agent);
    setTargetCalls(agent.targetCalls);
    setShowTargetModal(true);
  };

  const handleSetTarget = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/target`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetCalls })
      });
      const data = await res.json();
      if (data.success) {
        setShowTargetModal(false);
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agent Management</h1>
          <p className="text-sm text-slate-500 font-medium">Add, view, and configure calling targets for agents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/10 hover-scale"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Agent</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <span className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6 text-center">Daily Target</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-700">{agent.name}</td>
                    <td className="py-4 px-6 text-slate-500 font-medium">{agent.email}</td>
                    <td className="py-4 px-6 text-center font-bold text-slate-700">
                      <div className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-xs">
                        <Target className="w-3.5 h-3.5 text-brand-600" />
                        <span>{agent.targetCalls} Calls</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
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
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openTargetModal(agent)}
                          title="Set target limit"
                          className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          title="Remove agent"
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                      No agent profiles found. Click "Add New Agent" to register one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium-lg max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Add New Agent</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-500 text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vipin Kumar"
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@dialflow.com"
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/10 transition-all mt-4"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Set Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium-lg max-w-sm w-full overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Set Call Target</h3>
              <button onClick={() => setShowTargetModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetTarget} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <p className="text-xs font-semibold text-slate-400">Configure daily calling target for:</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedAgent?.name}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Target Calls Today</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={targetCalls}
                  onChange={(e) => setTargetCalls(parseInt(e.target.value, 10))}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/10 transition-all mt-4"
              >
                Apply Target
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
