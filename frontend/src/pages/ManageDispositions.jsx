import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, PhoneCall } from 'lucide-react';

const ManageDispositions = () => {
  const [outcomes, setOutcomes] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { token } = useAuth();

  const fetchOutcomes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispositions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOutcomes(data.outcomes);
      } else {
        setErrorMsg(data.message || 'Failed to load dispositions.');
      }
    } catch (err) {
      setErrorMsg('Connection failed to load dispositions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutcomes();
  }, [token]);

  const handleAddOutcome = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/dispositions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ label: newLabel })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Outcome added successfully.');
        setNewLabel('');
        fetchOutcomes();
      } else {
        setErrorMsg(data.message || 'Failed to add outcome.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to add outcome.');
    }
  };

  const handleDeleteOutcome = async (id) => {
    if (!window.confirm('Are you sure you want to remove this outcome option? Current logs using this outcome will remain intact.')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/dispositions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Outcome removed successfully.');
        fetchOutcomes();
      } else {
        setErrorMsg(data.message || 'Failed to remove outcome.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to remove outcome.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Call Outcomes Manager</h1>
        <p className="text-sm text-slate-500 font-medium">Add, activate, or deactivate custom status labels for agent dialer outcomes</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Add Outcome Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-premium h-fit space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-5 h-5 text-brand-600" />
            <h3 className="font-extrabold text-slate-800 text-sm">Add New Outcome Option</h3>
          </div>

          <form onSubmit={handleAddOutcome} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Outcome Label</label>
              <input
                type="text"
                placeholder="e.g. Ringing, Switch Off, Busy"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/10 transition-all hover-scale"
            >
              Add Outcome
            </button>
          </form>
        </div>

        {/* Outcomes List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-premium overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-slate-500" />
              <h3 className="font-extrabold text-slate-800 text-sm">Active Outcome Statuses</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{outcomes.length} Options</span>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <span className="w-10 h-10 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></span>
              <p className="text-xs text-slate-400 font-bold">Loading outcome templates...</p>
            </div>
          ) : outcomes.length === 0 ? (
            <div className="py-24 text-center text-slate-400">No active outcomes found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {outcomes.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                  <div>
                    <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      {item.label.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">Value: {item.label}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteOutcome(item.id)}
                    className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all hover:scale-105"
                    title="Remove from options"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDispositions;
