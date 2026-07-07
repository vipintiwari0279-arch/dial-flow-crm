import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, RefreshCw } from 'lucide-react';

const Callbacks = () => {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchCallbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/callbacks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCallbacks(data.callbacks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Callback Leads</h1>
          <p className="text-sm text-slate-500 font-medium">Scheduled callback reminders set by calling agents</p>
        </div>
        <button
          onClick={fetchCallbacks}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
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
                  <th className="py-4 px-6">Lead Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Agent assigned</th>
                  <th className="py-4 px-6">Scheduled Time</th>
                  <th className="py-4 px-6">Call Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {callbacks.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold text-slate-700">{lead.name}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs font-medium">{lead.phone}</td>
                    <td className="py-4 px-6 text-slate-500 font-medium">{lead.agent?.name || 'Unassigned'}</td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {lead.callbackTime ? new Date(lead.callbackTime).toLocaleString('en-IN') : 'Not scheduled'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium italic truncate max-w-xs" title={lead.notes}>
                      {lead.notes || 'No comments'}
                    </td>
                  </tr>
                ))}
                {callbacks.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">
                      No scheduled callback leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Callbacks;
