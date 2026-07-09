import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, FileText, Check, X, ShieldAlert, Award, FileDown, UploadCloud, UserCheck } from 'lucide-react';

const HRMSPortal = () => {
  const [leaves, setLeaves] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingAgent, setEditingAgent] = useState(null);
  
  // Document form inputs
  const [offerUrl, setOfferUrl] = useState('');
  const [relievingUrl, setRelievingUrl] = useState('');

  const { token } = useAuth();

  const fetchHRMSData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch leave requests
      const leaveRes = await fetch('/api/hrms/leave', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const leaveData = await leaveRes.json();
      if (leaveData.success) {
        setLeaves(leaveData.leaves);
      }

      // 2. Fetch agents to link documents
      const agentRes = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const agentData = await agentRes.json();
      if (agentData.success) {
        setAgents(agentData.agents);
      }
    } catch (err) {
      setError('Failed to fetch HRMS portal records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRMSData();
  }, [token]);

  const handleUpdateStatus = async (id, status) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/hrms/leave/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Leave request has been successfully ${status}!`);
        fetchHRMSData();
      } else {
        setError(data.message || 'Failed to update leave status');
      }
    } catch (err) {
      setError('Connection failed. Server offline.');
    }
  };

  const handleOpenEditDocs = (agent) => {
    setEditingAgent(agent);
    setOfferUrl(agent.offerLetterUrl || '');
    setRelievingUrl(agent.relievingLetterUrl || '');
  };

  const handleSaveDocuments = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/hrms/agent/${editingAgent.id}/documents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          offerLetterUrl: offerUrl,
          relievingLetterUrl: relievingUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Documents updated successfully for ${editingAgent.name}`);
        setEditingAgent(null);
        fetchHRMSData();
      } else {
        setError(data.message || 'Failed to update documents');
      }
    } catch (err) {
      setError('Server connection error');
    }
  };

  // Helper to generate simulated mock PDF template link
  const autoGenerateMockDoc = (type, name) => {
    const formattedName = name.replace(/\s+/g, '-').toLowerCase();
    const mockUrl = `https://res.cloudinary.com/dialflow-crm/docs/${type}-${formattedName}.pdf`;
    if (type === 'offer') {
      setOfferUrl(mockUrl);
    } else {
      setRelievingUrl(mockUrl);
    }
  };

  // Calculate statistics metrics
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const activeLeaves = leaves.filter(l => l.status === 'approved').length;
  const docCount = agents.filter(a => a.offerLetterUrl || a.relievingLetterUrl).length;

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">HRMS Portal</h1>
        <p className="text-sm text-slate-500 font-semibold">Manage leave approvals, document tracking, and agent profiles</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-500 text-center animate-shake">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-600 text-center animate-fade-in">
          {successMsg}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Agents</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{agents.length}</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Leaves</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{pendingLeaves}</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved Leaves</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{activeLeaves}</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Documents</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{docCount} Agents</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Side: Leave approvals list (8 cols) */}
        <div className="col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 tracking-tight">Active Leave Requests</h3>
            
            {loading ? (
              <div className="py-8 flex justify-center">
                <span className="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin"></span>
              </div>
            ) : leaves.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs font-semibold">No leave applications submitted yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Agent Name</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                    {leaves.map((leave) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/30 transition-all">
                          <td className="py-3.5 px-4 font-bold text-slate-800">{leave.user?.name || 'Unknown Agent'}</td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              leave.leaveType === 'sick' ? 'bg-rose-50 text-rose-500' :
                              leave.leaveType === 'casual' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                            }`}>{leave.leaveType}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold block">{days} Days</span>
                            <span className="text-[10px] text-slate-400">{leave.startDate} to {leave.endDate}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-[150px] truncate text-slate-500" title={leave.reason}>{leave.reason}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              leave.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                            }`}>{leave.status.toUpperCase()}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {leave.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleUpdateStatus(leave.id, 'approved')}
                                  title="Approve request"
                                  className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                                  title="Reject request"
                                  className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Employee Documents Manager (4 cols) */}
        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 tracking-tight">Agent Documents List</h3>

            {loading ? (
              <div className="py-8 flex justify-center">
                <span className="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin"></span>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-slate-700 truncate">{agent.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">{agent.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          agent.offerLetterUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-150 text-slate-400'
                        }`}>
                          Offer Ltr
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          agent.relievingLetterUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-150 text-slate-400'
                        }`}>
                          Relieving Ltr
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEditDocs(agent)}
                      className="px-2.5 py-1.5 rounded-xl border border-brand-100 text-[10px] font-bold text-brand-600 bg-white hover:bg-brand-50 transition-all shrink-0 hover-scale"
                    >
                      Assign Docs
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload/Assign Documents Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium-lg max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Assign Documents</h3>
              <button onClick={() => setEditingAgent(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocuments} className="p-6 space-y-4">
              <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Editing Profile For</p>
                <p className="text-sm font-black text-slate-700 mt-0.5">{editingAgent.name}</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Offer Letter PDF URL</label>
                  <button
                    type="button"
                    onClick={() => autoGenerateMockDoc('offer', editingAgent.name)}
                    className="text-[9px] font-bold text-brand-600 hover:underline"
                  >
                    Auto Generate Mock PDF
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={offerUrl}
                    onChange={(e) => setOfferUrl(e.target.value)}
                    placeholder="https://example.com/offer-letter.pdf"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-500 tracking-wide uppercase">Relieving Letter PDF URL</label>
                  <button
                    type="button"
                    onClick={() => autoGenerateMockDoc('relieving', editingAgent.name)}
                    className="text-[9px] font-bold text-brand-600 hover:underline"
                  >
                    Auto Generate Mock PDF
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={relievingUrl}
                    onChange={(e) => setRelievingUrl(e.target.value)}
                    placeholder="https://example.com/relieving-letter.pdf"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/10 transition-all mt-4"
              >
                Save Document Links
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRMSPortal;
