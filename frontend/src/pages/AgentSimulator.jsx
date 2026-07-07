import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Smartphone,
  Phone,
  PhoneCall,
  User,
  CheckCircle,
  Play,
  Pause,
  Save,
  Clock,
  Volume2,
  Lock,
  ChevronRight,
  LogOut,
  Calendar,
  AlertCircle
} from 'lucide-react';

const AgentSimulator = () => {
  // Simulator configuration states
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [agentUser, setAgentUser] = useState(null);

  // Phone screen states
  const [screen, setScreen] = useState('home'); // 'home' | 'dialing' | 'talking' | 'disposition'
  const [currentLead, setCurrentLead] = useState(null);
  const [targetCalls, setTargetCalls] = useState(150);
  const [completedToday, setCompletedToday] = useState(0);

  // Dialer & Call state
  const [callTimer, setCallTimer] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const [disposition, setDisposition] = useState('interested');
  const [notes, setNotes] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Refs for timers
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const socketRef = useRef(null);

  // Load list of agents for dropdown
  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } // use admin auth to list agents
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
        if (data.agents.length > 0) {
          setSelectedAgentId(data.agents[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load agents for simulation:', e);
      // Fallback local agents if backend not responsive yet
      setAgents([
        { id: '1', name: 'Vipin Kumar', email: 'vipin@dialflow.com' },
        { id: '2', name: 'Amit Sharma', email: 'amit@dialflow.com' }
      ]);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Socket Connection for the simulated agent
  const connectSimulatorSocket = (userId, userName) => {
    // Connect new socket instance representing the agent
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.emit('register_agent', { id: userId, name: userName });
    socket.emit('agent_status_change', { agentId: userId, name: userName, status: 'online' });
  };

  const handleSimulatedLogin = async () => {
    setErrorMsg('');
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: agent.email,
          password: 'password123' // default password seeded in system
        })
      });
      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setAgentUser(data.user);
        setIsLoggedIn(true);

        connectSimulatorSocket(data.user.id, data.user.name);
        fetchAgentNextLead(data.token);
      } else {
        setErrorMsg(data.message || 'Login failed. Check server status.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to authentication API.');
    }
  };

  const fetchAgentNextLead = async (authToken) => {
    try {
      const response = await fetch('/api/leads/next', {
        headers: { 'Authorization': `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCurrentLead(data.lead);
        setTargetCalls(data.target || 150);
        setCompletedToday(data.completedToday || 0);
      }
    } catch (e) {
      console.error('Error fetching lead:', e);
    }
  };

  const handleSimulatedLogout = async () => {
    // Clear all intervals
    clearInterval(timerIntervalRef.current);
    clearInterval(countdownIntervalRef.current);

    if (socketRef.current) {
      socketRef.current.emit('agent_status_change', {
        agentId: agentUser.id,
        name: agentUser.name,
        status: 'offline'
      });
      socketRef.current.close();
    }

    try {
      await fetch('/api/auth/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'offline' })
      });
    } catch (e) {
      console.error(e);
    }

    setIsLoggedIn(false);
    setAgentUser(null);
    setCurrentLead(null);
    setScreen('home');
  };

  const handleToggleStatus = async (newStatus) => {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setAgentUser(prev => ({ ...prev, status: newStatus }));
        if (socketRef.current) {
          socketRef.current.emit('agent_status_change', {
            agentId: agentUser.id,
            name: agentUser.name,
            status: newStatus
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dial Call action
  const handleDial = () => {
    if (!currentLead) return;
    setScreen('dialing');
    setCallTimer(0);

    // Notify sockets
    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: agentUser.id,
        agentName: agentUser.name,
        leadName: currentLead.name,
        phone: currentLead.phone,
        state: 'dialing'
      });
    }

    // Auto-connect call after 2.5 seconds
    setTimeout(() => {
      setScreen('talking');

      // Start talking socket event
      if (socketRef.current) {
        socketRef.current.emit('call_state_change', {
          agentId: agentUser.id,
          agentName: agentUser.name,
          leadName: currentLead.name,
          phone: currentLead.phone,
          state: 'talking'
        });
      }

      // Start duration clock
      timerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2500);
  };

  // Hangup Action
  const handleHangup = () => {
    clearInterval(timerIntervalRef.current);
    setScreen('disposition');

    // Notify sockets
    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: agentUser.id,
        agentName: agentUser.name,
        state: 'idle'
      });
    }
  };

  // Submit Disposition form
  const handleSaveDisposition = async (e) => {
    if (e) e.preventDefault();
    clearInterval(countdownIntervalRef.current);

    try {
      const response = await fetch('/api/calls/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: currentLead.id,
          duration: callTimer,
          disposition,
          notes,
          callbackTime: disposition === 'callback' ? callbackTime : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setCompletedToday(prev => prev + 1);
        setNotes('');
        setCallbackTime('');

        // Trigger countdown clock for next lead
        setCountdown(20);
        setScreen('countdown');
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              // Trigger pull next lead
              fetchAgentNextLead(token);
              setScreen('home');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error('Error logging call:', err);
    }
  };

  const handleSkipCountdown = () => {
    clearInterval(countdownIntervalRef.current);
    fetchAgentNextLead(token);
    setScreen('home');
  };

  // Helper format seconds -> mm:ss
  const formatTime = (secs) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Circular progress math
  const radius = 40;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progressPercent = Math.min(Math.round((completedToday / targetCalls) * 100), 100) || 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background radial glowing effects */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-brand-500 rounded-full filter blur-[150px] opacity-15"></div>
      <div className="absolute bottom-0 -right-10 w-96 h-96 bg-indigo-500 rounded-full filter blur-[150px] opacity-15"></div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Simulator controls and setup */}
        <div className="lg:col-span-5 space-y-6 text-slate-100">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
              Agent Simulator
            </h1>
            <p className="text-sm text-slate-400 font-semibold mt-1">
              Simulate calling states in the browser. See live monitoring updates reflect in real-time.
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-white">Select Agent Profile</h3>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block mb-1">
                    Choose Agent
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-brand-500/5 rounded-2xl border border-brand-500/10 text-xs font-medium text-slate-400 leading-relaxed">
                  💡 Note: Selecting an agent profile simulates their login credentials. Ensure the backend server is running so it can connect sockets and parse lead databases.
                </div>

                <button
                  onClick={handleSimulatedLogin}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/10 transition-all hover-scale"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Start Simulation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                  {agentUser?.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Simulating Active Session</p>
                  <p className="text-sm font-extrabold text-white">{agentUser?.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controls</p>

                {/* Status switches */}
                <div className="grid grid-cols-3 gap-2">
                  {['online', 'paused', 'offline'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleToggleStatus(st)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        agentUser?.status === st
                          ? 'bg-brand-500 border-brand-500 text-white font-bold shadow-md shadow-brand-500/15'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSimulatedLogout}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-all hover-scale mt-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Simulation</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: The gorgeous Smartphone Frame Mockup */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-80 h-[640px] bg-slate-900 border-[8px] border-slate-800 rounded-[48px] shadow-2xl overflow-hidden flex flex-col ring-[12px] ring-slate-950">
            {/* Phone Notch/Speaker */}
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
              <div className="bg-slate-800 w-32 h-4 rounded-b-2xl"></div>
            </div>

            {!isLoggedIn ? (
              /* Offline Phone Screen */
              <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-500">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-slate-100 font-extrabold text-lg">App Locked</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Select an agent profile from the left panel controls and click "Start Simulation" to launch the client.
                  </p>
                </div>
              </div>
            ) : (
              /* Active Phone Screen Container */
              <div className="flex-1 flex flex-col bg-slate-50 text-slate-800 relative pt-6">
                {/* Header */}
                <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {agentUser?.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight">Dial Flow CRM</h4>
                      <p className="text-[8px] font-semibold text-slate-400 font-mono">By Vipin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      agentUser?.status === 'online' ? 'bg-emerald-500 animate-pulse' : agentUser?.status === 'paused' ? 'bg-amber-500' : 'bg-slate-500'
                    }`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{agentUser?.status}</span>
                  </div>
                </header>

                {/* Display screens conditionally */}
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-between">
                  {screen === 'home' && (
                    /* 1. App home / Dial standby */
                    <div className="flex-1 flex flex-col justify-between">
                      {/* Welcome card & wheel */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400">Good Morning,</p>
                          <p className="text-sm font-extrabold text-slate-700 mt-0.5">{agentUser.name}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-semibold">Today's Target Progress</p>
                          <p className="text-xs font-extrabold text-slate-700 mt-0.5">{completedToday} / {targetCalls} Calls</p>
                        </div>
                        {/* Target circular tracker */}
                        <div className="relative flex items-center justify-center">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle className="text-slate-100" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                            <circle className="text-emerald-500" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                          </svg>
                          <span className="absolute font-black text-xs text-slate-700">{progressPercent}%</span>
                        </div>
                      </div>

                      {/* Allocated Lead Card */}
                      <div className="my-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Allocated Lead</p>
                        {currentLead ? (
                          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h5 className="font-extrabold text-sm text-slate-800">{currentLead.name}</h5>
                                <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{currentLead.phone}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400 border-t border-slate-50 pt-3">
                              <div>City: <span className="text-slate-600 font-bold">{currentLead.city || '-'}</span></div>
                              <div>State: <span className="text-slate-600 font-bold">{currentLead.state || '-'}</span></div>
                              <div className="col-span-2">Lead ID: <span className="text-slate-600 font-mono font-bold">{currentLead.id.slice(0, 8)}</span></div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded-3xl border border-amber-100 p-5 text-center text-amber-700 shadow-sm space-y-2">
                            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                            <h5 className="font-extrabold text-xs">No Allocated Leads</h5>
                            <p className="text-[10px] font-medium text-amber-600 leading-relaxed">
                              You do not have any allocated leads. Please ask Admin to distribute leads to trigger updates.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Dialer triggers */}
                      <button
                        onClick={handleDial}
                        disabled={!currentLead || agentUser.status !== 'online'}
                        className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover-scale"
                      >
                        <Phone className="w-4 h-4 fill-white" />
                        <span>Call Now</span>
                      </button>
                    </div>
                  )}

                  {screen === 'dialing' && (
                    /* 2. Dialing overlay */
                    <div className="flex-1 flex flex-col justify-between py-12 text-center">
                      <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Dialing...</p>
                        <h3 className="text-2xl font-black text-slate-700 tracking-tight">{currentLead?.name}</h3>
                        <p className="text-sm font-mono font-bold text-slate-500">{currentLead?.phone}</p>
                      </div>

                      {/* Avatar container */}
                      <div className="w-28 h-28 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-500 shadow-inner mx-auto my-6 animate-pulse">
                        <User className="w-12 h-12" />
                      </div>

                      {/* Waveform indicator */}
                      <div className="flex items-center justify-center gap-1 h-8 mb-6">
                        <div className="wave-bar h-4"></div>
                        <div className="wave-bar h-6"></div>
                        <div className="wave-bar h-3"></div>
                        <div className="wave-bar h-5"></div>
                      </div>

                      <button
                        onClick={handleHangup}
                        className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover-scale"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>Cancel Dial</span>
                      </button>
                    </div>
                  )}

                  {screen === 'talking' && (
                    /* 3. Call active talking screen */
                    <div className="flex-1 flex flex-col justify-between py-12 text-center">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active Call Connected</span>
                        </p>
                        <h3 className="text-2xl font-black text-slate-700 tracking-tight">{currentLead?.name}</h3>
                        <p className="text-sm font-mono font-bold text-slate-500">{currentLead?.phone}</p>
                      </div>

                      {/* Timer */}
                      <div className="text-3xl font-black text-slate-800 tracking-tight my-6 font-mono">
                        {formatTime(callTimer)}
                      </div>

                      {/* Audio waveform pulsing */}
                      <div className="flex items-center justify-center gap-1.5 h-10 mb-8">
                        <div className="wave-bar h-6"></div>
                        <div className="wave-bar h-8"></div>
                        <div className="wave-bar h-10"></div>
                        <div className="wave-bar h-5"></div>
                        <div className="wave-bar h-7"></div>
                        <div className="wave-bar h-9"></div>
                      </div>

                      <button
                        onClick={handleHangup}
                        className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover-scale"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>End Call</span>
                      </button>
                    </div>
                  )}

                  {screen === 'disposition' && (
                    /* 4. Log call / Disposition entry */
                    <form onSubmit={handleSaveDisposition} className="flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">
                          Log Call Details
                        </h4>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Call Status (Disposition)
                          </label>
                          <select
                            value={disposition}
                            onChange={(e) => setDisposition(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="interested">Interested</option>
                            <option value="not_interested">Not Interested</option>
                            <option value="callback">Callback Reminder</option>
                            <option value="dnc">DNC List</option>
                            <option value="wrong_number">Wrong Number</option>
                            <option value="others">Others</option>
                          </select>
                        </div>

                        {disposition === 'callback' && (
                          <div className="animate-scale-up">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Callback Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={callbackTime}
                              onChange={(e) => setCallbackTime(e.target.value)}
                              className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Notes / Comments
                          </label>
                          <textarea
                            rows="4"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter call notes..."
                            className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
                          ></textarea>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover-scale mt-4"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save & Next Lead</span>
                      </button>
                    </form>
                  )}

                  {screen === 'countdown' && (
                    /* 5. Post log auto-call countdown clock */
                    <div className="flex-1 flex flex-col justify-between py-12 text-center">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 mx-auto">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-700">Call Log Saved!</h4>
                      </div>

                      {/* Giant circular countdown clock */}
                      <div className="my-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next lead in</p>
                        <p className="text-5xl font-black text-slate-800 font-mono tracking-tight mt-2 animate-bounce">
                          {countdown}s
                        </p>
                      </div>

                      <button
                        onClick={handleSkipCountdown}
                        className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all hover-scale"
                      >
                        <span>Skip Countdown</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSimulator;
