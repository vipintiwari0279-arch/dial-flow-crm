import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Radio, Users, ShieldAlert, Phone, PhoneCall, RefreshCw } from 'lucide-react';

const LiveMonitoring = () => {
  const [agents, setAgents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveCalls, setLiveCalls] = useState({});
  const socket = useSocket();
  const { token } = useAuth();

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
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const addEventLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    setLiveEvents(prev => [{ text: msg, time: timestamp }, ...prev].slice(0, 10)); // cap at 10 items
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('agent_status_change', (data) => {
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === data.agentId ? { ...agent, status: data.status } : agent
        )
      );
      addEventLog(`Agent ${data.name} went ${data.status}`);
    });

    socket.on('live_call_update', (data) => {
      setLiveCalls(prev => ({
        ...prev,
        [data.agentId]: data
      }));
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === data.agentId ? { ...agent, currentLead: data.state !== 'idle' ? data.phone : '-' } : agent
        )
      );

      if (data.state !== 'idle') {
        addEventLog(`Agent ${data.agentName} is ${data.state}ing ${data.phone} (${data.leadName})`);
      }
    });

    socket.on('call_logged', (data) => {
      fetchAgents();
      setLiveCalls(prev => {
        const next = { ...prev };
        delete next[data.agentId];
        return next;
      });
      addEventLog(`Agent ${data.agentName} logged call for ${data.leadName} (${data.phone}) as ${data.disposition.toUpperCase()}`);
    });

    return () => {
      socket.off('agent_status_change');
      socket.off('live_call_update');
      socket.off('call_logged');
    };
  }, [socket]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Live Agent Monitoring</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time supervision of active dialing campaigns</p>
        </div>
        <button
          onClick={fetchAgents}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Agent Cards Grid - 2 cols */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const liveCall = liveCalls[agent.id];
            const isCalling = liveCall && liveCall.state !== 'idle';
            const isOnline = agent.status === 'online';
            const isPaused = agent.status === 'paused';

            return (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6 flex flex-col justify-between h-44 relative overflow-hidden"
              >
                {/* Status Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{agent.name}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isOnline ? 'bg-emerald-50 text-emerald-600' : isPaused ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>

                {/* Call Status Details */}
                <div className="my-4">
                  {isCalling ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" />
                        <span>Current Active Call ({liveCall.state})</span>
                      </p>
                      <p className="text-sm font-extrabold text-slate-700">{liveCall.leadName}</p>
                      <p className="text-xs text-slate-400 font-mono font-medium">{liveCall.phone}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-semibold italic py-2">
                      {isOnline ? 'Waiting for next lead allocation...' : 'Agent is currently inactive.'}
                    </p>
                  )}
                </div>

                {/* Performance stats summary */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div>Calls today: <span className="text-slate-700 font-extrabold">{agent.callsToday}</span></div>
                  <div>Connected: <span className="text-emerald-600 font-extrabold">{agent.connected}</span></div>
                  <div>Duration: <span className="text-slate-700 font-mono font-extrabold">{agent.duration}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Event Activity Feed - 1 col */}
        <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-6 h-[450px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            <h3 className="font-extrabold text-sm text-white tracking-tight">Real-time Operations Log</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {liveEvents.map((event, idx) => (
              <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-mono font-semibold">{event.time}</span>
                <p className="text-slate-300 font-medium">{event.text}</p>
              </div>
            ))}
            {liveEvents.length === 0 && (
              <p className="text-slate-500 text-center italic py-12">
                Waiting for agent activities... Events will appear here in real-time.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
