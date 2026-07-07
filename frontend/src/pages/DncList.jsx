import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Plus, RefreshCw, Trash2 } from 'lucide-react';

const DncList = () => {
  const [dncList, setDncList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token } = useAuth();

  const fetchDncList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calls/dnc', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDncList(data.dncList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDncList();
  }, [token]);

  const handleAddDnc = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/calls/dnc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Number successfully added to DNC compliance list.');
        setPhone('');
        fetchDncList();
      } else {
        setError(data.message || 'Error adding number to DNC list');
      }
    } catch (err) {
      setError('Connection failed. Server might be offline.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
      {/* Left panel: Add number */}
      <div className="space-y-6 md:col-span-1">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">DNC Compliance</h1>
          <p className="text-sm text-slate-500 font-medium">Manage numbers blacklisted from dialers</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Add Blocked Number</span>
          </h3>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-500 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600 text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleAddDnc} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add to DNC List</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: View DNC entries */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 tracking-tight">Active Blacklist ({dncList.length} numbers)</h3>
          <button
            onClick={fetchDncList}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></span>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium overflow-hidden">
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-6">Phone Number</th>
                    <th className="py-3 px-6">Blocked Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {dncList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-6 font-mono text-xs font-bold text-slate-700">{item.phone}</td>
                      <td className="py-3 px-6 text-slate-400 text-xs font-medium">
                        {new Date(item.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {dncList.length === 0 && (
                    <tr>
                      <td colSpan="2" className="py-8 text-center text-slate-400 font-medium">
                        DNC blacklist is currently empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DncList;
