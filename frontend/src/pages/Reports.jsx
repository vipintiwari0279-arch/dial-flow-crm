import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileDown, RefreshCw, PhoneCall } from 'lucide-react';

const Reports = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCalls(data.calls);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleExportCSV = () => {
    if (calls.length === 0) return;

    // Define CSV columns
    const headers = ['Agent Name', 'Lead Name', 'Phone', 'Duration (secs)', 'Disposition', 'Notes', 'Call Timestamp'];
    const rows = calls.map(c => [
      c.agent?.name || 'Unknown',
      c.lead?.name || 'Unknown',
      c.lead?.phone || '-',
      c.duration,
      c.disposition,
      (c.notes || '').replace(/"/g, '""'), // escape quotes
      new Date(c.createdAt).toLocaleString('en-IN')
    ]);

    // Build CSV Content
    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dialflow_call_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Call Reports</h1>
          <p className="text-sm text-slate-500 font-medium">Export and audit outbound calling history logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={calls.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-500/10 hover-scale transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchReports}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
                  <th className="py-4 px-6">Agent</th>
                  <th className="py-4 px-6">Lead</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6 text-center">Duration</th>
                  <th className="py-4 px-6">Disposition</th>
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-700">{call.agent?.name}</td>
                    <td className="py-4 px-6 font-semibold text-slate-700">{call.lead?.name}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs font-medium">{call.lead?.phone || '-'}</td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-500 font-mono text-xs">
                      {call.duration}s
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        call.disposition === 'interested'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : call.disposition === 'not_interested'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : call.disposition === 'callback'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {call.disposition.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium text-xs">
                      {new Date(call.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium italic truncate max-w-xs" title={call.notes}>
                      {call.notes || 'No notes logged'}
                    </td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                      No call records logged yet.
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

export default Reports;
