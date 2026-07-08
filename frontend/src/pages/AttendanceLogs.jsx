import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, User, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const AttendanceLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { token } = useAuth();

  const fetchAttendanceLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        setErrorMsg(data.message || 'Failed to fetch attendance logs.');
      }
    } catch (err) {
      setErrorMsg('Connection failed. Server might be offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [token]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Attendance Logs</h1>
        <p className="text-sm text-slate-500 font-medium">Monitor agent punch-in times, shift ends, and map geolocation coordinates</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <span className="w-10 h-10 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></span>
            <p className="text-xs text-slate-400 font-bold">Loading attendance records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-extrabold text-sm text-slate-600">No Attendance Records Yet</h4>
            <p className="text-xs text-slate-400">Punches made by agents will reflect here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Agent</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Punch In</th>
                  <th className="py-4 px-6">Punch Out</th>
                  <th className="py-4 px-6">Geolocation</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Map View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                          {log.agent?.name?.slice(0, 2) || 'AG'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800">{log.agent?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400">{log.agent?.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {formatDate(log.punchInTime)}
                    </td>
                    <td className="py-4 px-6 text-slate-800">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(log.punchInTime)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-800">
                      {log.punchOutTime ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTime(log.punchOutTime)}</span>
                        </div>
                      ) : (
                        <span className="text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">Active Shift</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.punchOutTime
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${log.punchOutTime ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                        {log.punchOutTime ? 'Shift Completed' : 'Punched In'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <a
                        href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100/50 hover:scale-105 transition-all"
                      >
                        <span>Open Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
