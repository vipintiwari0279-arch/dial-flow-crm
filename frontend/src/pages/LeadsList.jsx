import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, RefreshCw } from 'lucide-react';

const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dispFilter, setDispFilter] = useState('');
  const { token } = useAuth();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `/api/leads?search=${search}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (dispFilter) url += `&disposition=${dispFilter}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, dispFilter, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Leads Database</h1>
          <p className="text-sm text-slate-500 font-medium">Browse, search, and track statuses of all leads</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search leads by name, phone or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-700 placeholder-slate-400"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="allocated">Allocated</option>
            <option value="called">Called</option>
          </select>

          {/* Disposition select */}
          <select
            value={dispFilter}
            onChange={(e) => setDispFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
          >
            <option value="">All Dispositions</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="callback">Callback</option>
            <option value="dnc">DNC</option>
            <option value="wrong_number">Wrong Number</option>
            <option value="others">Others</option>
          </select>

          <button
            onClick={fetchLeads}
            className="p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-all"
            title="Refresh database"
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
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Disposition</th>
                  <th className="py-4 px-6">Allocated Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-700">{lead.name}</td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs font-medium">{lead.phone}</td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {lead.city || lead.state ? `${lead.city || '-'}, ${lead.state || '-'}` : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        lead.status === 'called'
                          ? 'bg-slate-100 text-slate-600'
                          : lead.status === 'allocated'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {lead.disposition ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          lead.disposition === 'interested'
                            ? 'bg-emerald-50 text-emerald-600'
                            : lead.disposition === 'not_interested'
                              ? 'bg-amber-50 text-amber-600'
                              : lead.disposition === 'callback'
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-rose-50 text-rose-600'
                        }`}>
                          {lead.disposition.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">{lead.agent?.name || 'Unassigned'}</td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                      No leads matched the filters. Try uploading some.
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

export default LeadsList;
