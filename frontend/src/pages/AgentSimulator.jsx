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
  AlertCircle,
  MapPin,
  Fingerprint
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
  const [activeTab, setActiveTab] = useState('calling'); // 'calling' | 'hrms'
  const [currentLead, setCurrentLead] = useState(null);
  const [targetCalls, setTargetCalls] = useState(150);
  const [completedToday, setCompletedToday] = useState(0);

  // Leave Form inputs
  const [leaveType, setLeaveType] = useState('sick');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

  // Extended Stats State
  const [stats, setStats] = useState({
    leadRemaining: 0,
    totalCalls: 0,
    connected: 0,
    callbacks: 0,
    notInterested: 0
  });

  // Attendance punch states
  const [attendance, setAttendance] = useState(null);
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchedOut, setPunchedOut] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);

  // Dialer & Call state
  const [callTimer, setCallTimer] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const [disposition, setDisposition] = useState('interested');
  const [notes, setNotes] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);
  const [showCallbacksDrawer, setShowCallbacksDrawer] = useState(false);
  const [callbacksList, setCallbacksList] = useState([]);
  const [outcomesList, setOutcomesList] = useState([]);
  const [manualPhone, setManualPhone] = useState('');

  // Refs for timers
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const socketRef = useRef(null);

  // Custom states added for welcome splash, support modal, call recording and VoIP calling
  const [showSplash, setShowSplash] = useState(true);
  const [voipCallMode, setVoipCallMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    // Pre-warm Render server in background during splash screen to prevent cold start latency
    fetch('/').catch(() => {});

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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
        fetchAttendanceStatus(data.token);
        fetchOutcomesList(data.token);
        fetchLeaveHistory(data.token);
      } else {
        setErrorMsg(data.message || 'Login failed. Check server status.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to authentication API.');
    }
  };

  const fetchOutcomesList = async (authToken) => {
    try {
      const response = await fetch('/api/dispositions', {
        headers: { 'Authorization': `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOutcomesList(data.outcomes);
        if (data.outcomes.length > 0) {
          setDisposition(data.outcomes[0].label);
        }
      }
    } catch (e) {
      console.error('Error fetching dispositions:', e);
    }
  };

  const fetchAttendanceStatus = async (authToken) => {
    try {
      const response = await fetch('/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPunchedIn(data.punchedIn);
        setPunchedOut(data.punchedOut);
        setAttendance(data.attendance);
      }
    } catch (e) {
      console.error('Error fetching attendance status:', e);
    }
  };

  const fetchLeaveHistory = async (authToken) => {
    try {
      const response = await fetch('/api/hrms/leave', {
        headers: { 'Authorization': `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLeaveHistory(data.leaves);
      }
    } catch (e) {
      console.error('Error fetching leave history:', e);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveError('');
    setLeaveSuccess('');
    try {
      const res = await fetch('/api/hrms/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeaveSuccess('Leave request submitted!');
        setLeaveReason('');
        setLeaveStart('');
        setLeaveEnd('');
        fetchLeaveHistory(token);
        // Refresh agent user profile to get updated balances
        const profileRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (profileData.success) {
          setAgentUser(profileData.user);
        }
      } else {
        setLeaveError(data.message || 'Failed to submit leave');
      }
    } catch (err) {
      setLeaveError('Server connection error');
    }
  };

  const handlePunch = async () => {
    setPunchLoading(true);
    try {
      if (!punchedIn) {
        // Punch In! Get browser Geolocation coordinates
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const res = await fetch('/api/attendance/punch-in', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude, longitude })
              });
              const data = await res.json();
              if (data.success) {
                setPunchedIn(true);
                setAttendance(data.attendance);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setPunchLoading(false);
            }
          },
          async (err) => {
            // Geolocation permission denied or failed, fallback to default coordinates (e.g. Kanpur coordinates)
            const latitude = 26.4499;
            const longitude = 80.3319;
            try {
              const res = await fetch('/api/attendance/punch-in', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude, longitude })
              });
              const data = await res.json();
              if (data.success) {
                setPunchedIn(true);
                setAttendance(data.attendance);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setPunchLoading(false);
            }
          }
        );
      } else {
        // Punch Out!
        const res = await fetch('/api/attendance/punch-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setPunchedOut(true);
          setAttendance(data.attendance);
        }
        setPunchLoading(false);
      }
    } catch (e) {
      console.error(e);
      setPunchLoading(false);
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
        if (data.stats) {
          setStats(data.stats);
        }
        return data.lead;
      }
    } catch (e) {
      console.error('Error fetching lead:', e);
    }
    return null;
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
  const handleDial = (leadToDial) => {
    const activeLead = leadToDial || currentLead;
    if (!activeLead) return;
    setScreen('dialing');
    setCallTimer(0);
    setIsRecording(false);

    // Notify sockets
    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: agentUser.id,
        agentName: agentUser.name,
        leadName: activeLead.name,
        phone: activeLead.phone,
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
          leadName: activeLead.name,
          phone: activeLead.phone,
          state: 'talking'
        });
      }

      // Start duration clock
      timerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2500);
  };

  const handleManualDial = (e) => {
    if (e) e.preventDefault();
    if (!manualPhone.trim()) return;

    const tempLead = {
      id: 'manual_' + Date.now(),
      name: 'Reference Lead',
      phone: manualPhone,
      city: 'Manual Dial',
      state: 'Reference'
    };

    setCurrentLead(tempLead);
    setManualPhone('');
    handleDial(tempLead);
  };

  const sendWhatsApp = (lead, disp) => {
    if (!lead) return;
    let message = '';
    if (disp === 'interested') {
      message = `Hello ${lead.name}, thank you for speaking with me today. Here is our product catalog link: https://example.com/catalog. Let us know if you have any questions!`;
    } else if (disp === 'callback') {
      message = `Hello ${lead.name}, as requested, I have scheduled your callback reminder. Talk to you soon!`;
    } else {
      message = `Hello ${lead.name}, thank you for your time today. Best regards.`;
    }

    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const fetchAndShowCallbacks = async () => {
    try {
      const response = await fetch('/api/leads/callbacks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCallbacksList(data.callbacks);
        setShowCallbacksDrawer(true);
      }
    } catch (e) {
      console.error('Failed to fetch callbacks:', e);
    }
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

  const handleCountdownExpiry = async () => {
    const nextLead = await fetchAgentNextLead(token);
    if (nextLead && autoDialEnabled) {
      handleDial(nextLead);
    } else {
      setScreen('home');
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
          callbackTime: disposition === 'callback' ? callbackTime : null,
          leadName: currentLead.name,
          phone: currentLead.phone,
          recordingUrl: isRecording ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setCompletedToday(prev => prev + 1);
        setNotes('');
        setCallbackTime('');
        setIsRecording(false); // Reset recording state

        // Trigger countdown clock for next lead (3s for auto-dial, 10s for manual)
        const count = autoDialEnabled ? 3 : 10;
        setCountdown(count);
        setScreen('countdown');
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              handleCountdownExpiry();
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
    handleCountdownExpiry();
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

  const getLeaveDaysCount = (startStr, endStr) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
      const diffTime = Math.abs(e - s);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 1;
    }
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background radial glowing effects */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-brand-500 rounded-full filter blur-[150px] opacity-15"></div>
        <div className="absolute bottom-0 -right-10 w-96 h-96 bg-indigo-500 rounded-full filter blur-[150px] opacity-15"></div>
        
        <div className="text-center z-10 space-y-6">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-brand-400 items-center justify-center shadow-2xl shadow-brand-500/20 mb-4">
            <PhoneCall className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-wider">
            DIAL FLOW CRM
          </h1>
          <p className="text-lg text-slate-500 font-bold uppercase tracking-[0.25em]">by</p>
          <h2 className="text-4xl font-extrabold text-brand-400 drop-shadow-[0_0_20px_rgba(139,92,246,0.3)] tracking-wide">
            VIPIN TIWARI
          </h2>
          
          <div className="pt-8">
            <div className="w-10 h-10 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

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
                    <button
                      onClick={() => setShowSupportModal(true)}
                      className="px-2 py-0.5 text-[8px] font-bold bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/35 transition-all"
                    >
                      SUPPORT
                    </button>
                    <button
                      onClick={fetchAndShowCallbacks}
                      className="px-2 py-0.5 text-[8px] font-bold bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/35 transition-all"
                    >
                      CALLBACKS
                    </button>
                    <span className={`w-2 h-2 rounded-full ${
                      agentUser?.status === 'online' ? 'bg-emerald-500 animate-pulse' : agentUser?.status === 'paused' ? 'bg-amber-500' : 'bg-slate-500'
                    }`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{agentUser?.status}</span>
                  </div>
                </header>

                {/* Tab Navigation */}
                <div className="flex bg-slate-900 border-b border-slate-800 shrink-0 text-[10px] font-bold uppercase tracking-wider text-center text-slate-400">
                  <button 
                    onClick={() => setActiveTab('calling')} 
                    className={`flex-1 py-2 transition-all ${activeTab === 'calling' ? 'border-b-2 border-brand-500 text-white bg-slate-850' : 'hover:text-white'}`}
                  >
                    Calling
                  </button>
                  <button 
                    onClick={async () => {
                      setActiveTab('hrms');
                      fetchLeaveHistory(token);
                      try {
                        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                        const data = await res.json();
                        if (data.success) setAgentUser(data.user);
                      } catch(err) {}
                    }} 
                    className={`flex-1 py-2 transition-all ${activeTab === 'hrms' ? 'border-b-2 border-brand-500 text-white bg-slate-850' : 'hover:text-white'}`}
                  >
                    HRMS Portal
                  </button>
                </div>

                {/* Display screens conditionally */}
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-between">
                  {/* HRMS View */}
                  {screen === 'home' && activeTab === 'hrms' && (
                    <div className="flex-1 flex flex-col justify-between space-y-4">
                      {/* Leave Balances Grid */}
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">My Leave Balances</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl text-center">
                            <p className="text-lg font-black text-rose-500">{agentUser.sickLeaveBalance !== undefined ? agentUser.sickLeaveBalance : 12}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Sick Left</p>
                          </div>
                          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl text-center">
                            <p className="text-lg font-black text-amber-500">{agentUser.casualLeaveBalance !== undefined ? agentUser.casualLeaveBalance : 12}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Casual Left</p>
                          </div>
                          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl text-center">
                            <p className="text-lg font-black text-blue-500">{agentUser.earnedLeaveBalance !== undefined ? agentUser.earnedLeaveBalance : 18}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Earned Left</p>
                          </div>
                        </div>
                      </div>

                      {/* Documents Section */}
                      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2.5 shadow-sm">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">My Documents</h4>
                        <div className="flex gap-2">
                          <a
                            href={agentUser.offerLetterUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            disabled={!agentUser.offerLetterUrl}
                            onClick={(e) => !agentUser.offerLetterUrl && e.preventDefault()}
                            className={`flex-1 flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                              agentUser.offerLetterUrl
                                ? 'bg-emerald-50/50 border-emerald-250 text-emerald-700 hover:bg-emerald-50'
                                : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[8px] font-bold uppercase tracking-wider">Offer Letter</span>
                            <span className="text-[9px] font-black mt-1">Download</span>
                          </a>
                          <a
                            href={agentUser.relievingLetterUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            disabled={!agentUser.relievingLetterUrl}
                            onClick={(e) => !agentUser.relievingLetterUrl && e.preventDefault()}
                            className={`flex-1 flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                              agentUser.relievingLetterUrl
                                ? 'bg-violet-50/50 border-violet-250 text-violet-700 hover:bg-violet-50'
                                : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[8px] font-bold uppercase tracking-wider">Relieving Letter</span>
                            <span className="text-[9px] font-black mt-1">Download</span>
                          </a>
                        </div>
                      </div>

                      {/* Leave Application Form */}
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Apply for Leave</h4>
                        
                        {leaveError && <p className="text-[9px] font-bold text-rose-500 text-center">{leaveError}</p>}
                        {leaveSuccess && <p className="text-[9px] font-bold text-emerald-600 text-center">{leaveSuccess}</p>}

                        <form onSubmit={handleApplyLeave} className="space-y-2.5 text-left">
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Leave Type</label>
                            <select
                              value={leaveType}
                              onChange={(e) => setLeaveType(e.target.value)}
                              className="block w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="sick">Sick Leave</option>
                              <option value="casual">Casual Leave</option>
                              <option value="earned">Earned Leave</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Start Date</label>
                              <input
                                type="date"
                                required
                                value={leaveStart}
                                onChange={(e) => setLeaveStart(e.target.value)}
                                className="block w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">End Date</label>
                              <input
                                type="date"
                                required
                                value={leaveEnd}
                                onChange={(e) => setLeaveEnd(e.target.value)}
                                className="block w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Reason</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Fever, Personal work"
                              value={leaveReason}
                              onChange={(e) => setLeaveReason(e.target.value)}
                              className="block w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm"
                          >
                            Submit Leave Request
                          </button>
                        </form>
                      </div>

                      {/* Leave History List */}
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Leave History</h4>
                        {leaveHistory.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-2 font-semibold">No leave applications found</p>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto pr-1">
                            {leaveHistory.map((item, idx) => (
                              <div key={item.id || idx} className="py-2.5 flex justify-between items-center text-left">
                                <div className="pr-2">
                                  <p className="text-xs font-bold text-slate-700 capitalize">
                                    {item.leaveType} Leave ({getLeaveDaysCount(item.startDate, item.endDate)} Days)
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                                    {item.startDate} to {item.endDate}
                                  </p>
                                  <p className="text-[9px] text-slate-400 italic mt-0.5 font-medium">
                                    Reason: {item.reason}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase shrink-0 ${
                                  item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : item.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {screen === 'home' && activeTab === 'calling' && (
                    /* 1. App home / Dial standby */
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
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

                        {/* Attendance Punch Section */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Fingerprint className="w-5 h-5 text-brand-600 animate-pulse" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-700">Attendance Status</p>
                                <p className="text-[9px] font-semibold text-slate-400">
                                  {punchedIn 
                                    ? punchedOut 
                                      ? 'Shift Ended' 
                                      : `Punched In at ${new Date(attendance?.punchInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                                    : 'Not Punched In'}
                                </p>
                              </div>
                            </div>
                            {punchedIn && attendance?.latitude && (
                              <div className="flex items-center gap-0.5 text-[8px] text-slate-400 font-bold bg-slate-100 py-1 px-2 rounded-lg">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                <span>{attendance.latitude.toFixed(2)}, {attendance.longitude.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {!punchedOut ? (
                            <button
                              onClick={handlePunch}
                              disabled={punchLoading}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover-scale flex justify-center items-center gap-2 ${
                                punchedIn 
                                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-md shadow-rose-500/10' 
                                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/10'
                              }`}
                            >
                              {punchLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              ) : (
                                <span>{punchedIn ? 'Punch Out' : 'Punch In (GPS Location)'}</span>
                              )}
                            </button>
                          ) : (
                            <div className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 flex items-center justify-center gap-2 border border-slate-200/40">
                              <span>Shift Ended</span>
                            </div>
                          )}
                        </div>

                        {/* Dashboard Rich Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-20">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Remaining Leads</span>
                            <span className="text-xl font-black text-slate-700 mt-auto leading-none">{stats.leadRemaining}</span>
                          </div>
                          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-20">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Calls</span>
                            <span className="text-xl font-black text-slate-700 mt-auto leading-none">{stats.totalCalls}</span>
                          </div>
                          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-20">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Connected</span>
                            <span className="text-xl font-black text-emerald-600 mt-auto leading-none">{stats.connected}</span>
                          </div>
                          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-20">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Callbacks</span>
                            <span className="text-xl font-black text-amber-500 mt-auto leading-none">{stats.callbacks}</span>
                          </div>
                        </div>

                        {/* Predictive Auto-Dialer Toggle Switch */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700">Predictive Auto-Dialer</p>
                            <p className="text-[9px] font-semibold text-slate-400">
                              {autoDialEnabled ? 'Automatic calling ACTIVE' : 'Manual calling active'}
                            </p>
                          </div>
                          <button
                            onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-extrabold text-white transition-all ${
                              autoDialEnabled ? 'bg-purple-600' : 'bg-slate-400'
                            }`}
                          >
                            {autoDialEnabled ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </div>

                        {/* In-App VoIP Dialer Toggle Switch */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700">In-App VoIP Mode (No Redirect)</p>
                            <p className="text-[9px] font-semibold text-slate-400">
                              {voipCallMode ? 'VoIP Simulated Call Active' : 'SIM Network Outbound Call'}
                            </p>
                          </div>
                          <button
                            onClick={() => setVoipCallMode(!voipCallMode)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-extrabold text-white transition-all ${
                              voipCallMode ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          >
                            {voipCallMode ? 'VOIP' : 'SIM'}
                          </button>
                        </div>

                        {/* Manual Reference Dialer Input */}
                        <form onSubmit={handleManualDial} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                          <div className="text-left">
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Manual Reference Dial</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="tel"
                              placeholder="Enter number..."
                              value={manualPhone}
                              onChange={(e) => setManualPhone(e.target.value.replace(/[^0-9]/g, ''))}
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              type="submit"
                              disabled={!manualPhone || !punchedIn}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold transition-all"
                            >
                              Dial
                            </button>
                          </div>
                        </form>

                        {/* Allocated Lead Card */}
                        <div>
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
                      </div>

                      {/* Dialer triggers */}
                      <button
                        onClick={handleManualDial}
                        disabled={!manualPhone || !punchedIn}
                        style={{ display: 'none' }} // hidden proxy button for form triggers
                      />
                      <button
                        onClick={() => handleDial()}
                        disabled={!currentLead || agentUser.status !== 'online' || !punchedIn}
                        className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover-scale mt-4"
                      >
                        <Phone className="w-4 h-4 fill-white" />
                        <span>{!punchedIn ? 'Punch In First to Call' : 'Call Now'}</span>
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
                    <div className="flex-1 flex flex-col justify-between py-6 text-center">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setIsRecording(!isRecording)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold w-fit mx-auto transition-all ${
                            isRecording 
                              ? 'bg-rose-50 border-rose-100 text-rose-500 animate-pulse' 
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rose-600' : 'bg-slate-400'}`}></span>
                          <span>{isRecording ? 'RECORDING ACTIVE (⚫ REC)' : 'TAP TO RECORD CALL'}</span>
                        </button>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active Call Connected</span>
                        </p>
                        <h3 className="text-2xl font-black text-slate-700 tracking-tight">{currentLead?.name}</h3>
                        <p className="text-sm font-mono font-bold text-slate-500">{currentLead?.phone}</p>
                        
                        {/* Compliance Warning Script */}
                        <div className="p-3 bg-amber-50 border border-amber-150 rounded-2xl text-[10px] font-bold text-amber-800 leading-relaxed text-left space-y-0.5 mx-auto max-w-[280px]">
                          <p className="text-amber-500 uppercase tracking-widest text-[8px]">📢 Compliance Script Announcement</p>
                          <p>"Inform customer: This call is being recorded for quality and training purposes."</p>
                        </div>
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
                            {outcomesList.length > 0 ? (
                              outcomesList.map((item) => (
                                <option key={item.id} value={item.label}>
                                  {item.label.replace(/_/g, ' ').toUpperCase()}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="interested">Interested</option>
                                <option value="not_interested">Not Interested</option>
                                <option value="callback">Callback Reminder</option>
                                <option value="dnc">DNC List</option>
                                <option value="wrong_number">Wrong Number</option>
                                <option value="others">Others</option>
                              </>
                            )}
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

                      <div className="space-y-2 mt-4">
                        <button
                          type="submit"
                          className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover-scale"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save & Next Lead</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => sendWhatsApp(currentLead, disposition)}
                          className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover-scale"
                        >
                          <span>Send WhatsApp Follow-up</span>
                        </button>
                      </div>
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
                  {/* Callbacks Drawer Slide-up Overlay */}
                  {showCallbacksDrawer && (
                    <div className="absolute inset-0 bg-slate-950/60 flex flex-col justify-end z-50 animate-fade-in pt-6">
                      <div className="bg-slate-50 rounded-t-[24px] h-[80%] flex flex-col overflow-hidden border-t border-slate-200">
                        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                          <h4 className="font-extrabold text-xs text-slate-800">Callbacks Reminder</h4>
                          <button 
                            type="button"
                            onClick={() => setShowCallbacksDrawer(false)}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg"
                          >
                            Close
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-left">
                          {callbacksList.length === 0 ? (
                            <p className="text-center text-[10px] font-medium text-slate-400 py-12">No callbacks scheduled.</p>
                          ) : (
                            callbacksList.map((cb) => (
                              <div key={cb.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                <div>
                                  <p className="font-extrabold text-[11px] text-slate-800">{cb.name}</p>
                                  <p className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">{cb.phone}</p>
                                  {cb.callbackTime && (
                                    <p className="text-[8px] font-bold text-amber-500 mt-1 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{new Date(cb.callbackTime).toLocaleString()}</span>
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCallbacksDrawer(false);
                                    setCurrentLead(cb);
                                    handleDial(cb);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold transition-all"
                                >
                                  Call
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Support Modal Slide-up Overlay */}
                  {showSupportModal && (
                    <div className="absolute inset-0 bg-slate-950/70 flex flex-col justify-end z-50 animate-fade-in pt-6">
                      <div className="bg-white rounded-t-[24px] h-[75%] flex flex-col overflow-hidden border-t border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-slate-800">Support & Helpdesk</h4>
                          <button 
                            type="button"
                            onClick={() => setShowSupportModal(false)}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg"
                          >
                            Close
                          </button>
                        </div>
                        
                        <div className="space-y-3 text-left">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Contact Details</p>
                          
                          <a 
                            href="tel:9702564894"
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all block"
                          >
                            <span className="text-xl">📞</span>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Phone Support</p>
                              <p className="text-xs font-black text-slate-700">9702564894</p>
                            </div>
                          </a>

                          <a 
                            href="mailto:vipintiwari0279@gmail.com"
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all block"
                          >
                            <span className="text-xl">✉️</span>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Email Helpdesk</p>
                              <p className="text-xs font-black text-slate-700">vipintiwari0279@gmail.com</p>
                            </div>
                          </a>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setShowSupportModal(false)}
                          className="w-full py-3 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
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
