import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { io } from 'socket.io-client';

const API_URL = 'https://dial-flow-crm.onrender.com'; // Deployed live Render backend URL

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // App screen flow
  const [screen, setScreen] = useState('login'); // 'login' | 'dialer' | 'active_call' | 'disposition' | 'countdown'

  // Lead calling details
  const [currentLead, setCurrentLead] = useState(null);
  const [targetCalls, setTargetCalls] = useState(150);
  const [completedToday, setCompletedToday] = useState(0);

  // Dialer & Form states
  const [callTimer, setCallTimer] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const [disposition, setDisposition] = useState('interested');
  const [notes, setNotes] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const socketRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Setup sockets on login
  const connectSocket = (agentId, agentName) => {
    socketRef.current = io(API_URL);

    socketRef.current.emit('register_agent', { id: agentId, name: agentName });
    socketRef.current.emit('agent_status_change', {
      agentId,
      name: agentName,
      status: 'online'
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all credentials.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.user.id, data.user.name);
        fetchNextLead(data.token);
        setScreen('dialer');
      } else {
        Alert.alert('Error', data.message || 'Invalid credentials');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Ensure the server backend is running and URL is set correctly.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextLead = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/leads/next`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCurrentLead(data.lead);
        setTargetCalls(data.target || 150);
        setCompletedToday(data.completedToday || 0);
      }
    } catch (e) {
      console.log('Error fetching lead:', e);
    }
  };

  const handleStatusChange = async (status) => {
    setShowStatusMenu(false);
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setUser(prev => ({ ...prev, status }));
        if (socketRef.current) {
          socketRef.current.emit('agent_status_change', {
            agentId: user.id,
            name: user.name,
            status
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const startDialing = () => {
    if (!currentLead) return;
    setScreen('active_call');
    setCallTimer(0);

    // Open physical SIM card dialer automatically to make a real phone call!
    Linking.openURL(`tel:${currentLead.phone}`).catch(err => {
      console.log('Error opening native dialer:', err);
    });

    // Notify backend
    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: user.id,
        agentName: user.name,
        leadName: currentLead.name,
        phone: currentLead.phone,
        state: 'dialing'
      });
    }

    // Connect call after dummy ringing delay
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('call_state_change', {
          agentId: user.id,
          agentName: user.name,
          leadName: currentLead.name,
          phone: currentLead.phone,
          state: 'talking'
        });
      }

      timerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2000);
  };

  const endCall = () => {
    clearInterval(timerIntervalRef.current);
    setScreen('disposition');

    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: user.id,
        agentName: user.name,
        state: 'idle'
      });
    }
  };

  const handleSaveDisposition = async () => {
    try {
      const response = await fetch(`${API_URL}/api/calls/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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

        // Trigger countdown
        setCountdown(20);
        setScreen('countdown');
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              fetchNextLead(token);
              setScreen('dialer');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to log call.');
    }
  };

  const skipCountdown = () => {
    clearInterval(countdownIntervalRef.current);
    fetchNextLead(token);
    setScreen('dialer');
  };

  const handleLogout = () => {
    clearInterval(timerIntervalRef.current);
    clearInterval(countdownIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.emit('agent_status_change', {
        agentId: user.id,
        name: user.name,
        status: 'offline'
      });
      socketRef.current.close();
    }
    setToken('');
    setUser(null);
    setScreen('login');
  };

  const formatTime = (secs) => {
    const mm = Math.floor(secs / 60).toString().padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* LOGIN SCREEN */}
      {screen === 'login' && (
        <View style={styles.loginContainer}>
          <Text style={styles.brandTitle}>Dial Flow CRM</Text>
          <Text style={styles.brandSubtitle}>By Vipin - Agent App</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* AGENT APP SCREENS */}
      {screen !== 'login' && (
        <View style={styles.appContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Good Morning,</Text>
              <Text style={styles.agentName}>{user?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.statusBadge}
              onPress={() => setShowStatusMenu(!showStatusMenu)}
            >
              <View style={[styles.statusDot, user?.status === 'online' && styles.statusDotOnline]} />
              <Text style={styles.statusText}>{user?.status?.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Status Switcher Popover */}
          {showStatusMenu && (
            <View style={styles.statusMenu}>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => handleStatusChange('online')}>
                <Text style={styles.statusMenuText}>Online</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusMenuItem} onPress={() => handleStatusChange('paused')}>
                <Text style={styles.statusMenuText}>Paused</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusMenuItem} onPress={handleLogout}>
                <Text style={[styles.statusMenuText, { color: '#ef4444' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SCREEN CONTENT */}
          {screen === 'dialer' && (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Daily Target Progress */}
              <View style={styles.targetCard}>
                <Text style={styles.targetTitle}>Today's Target</Text>
                <Text style={styles.targetProgress}>{completedToday} / {targetCalls} Calls</Text>
              </View>

              {/* Current allocated lead details */}
              <Text style={styles.sectionHeader}>Current Lead</Text>
              {currentLead ? (
                <View style={styles.leadCard}>
                  <Text style={styles.leadName}>{currentLead.name}</Text>
                  <Text style={styles.leadPhone}>{currentLead.phone}</Text>
                  <Text style={styles.leadLoc}>{currentLead.city}, {currentLead.state}</Text>
                </View>
              ) : (
                <View style={styles.noLeadCard}>
                  <Text style={styles.noLeadText}>No Allocated Leads.</Text>
                  <Text style={styles.noLeadSub}>Waiting for lead distribution from Administrator.</Text>
                </View>
              )}

              {/* Call buttons */}
              <TouchableOpacity
                style={[styles.callBtn, !currentLead && styles.callBtnDisabled]}
                onPress={startDialing}
                disabled={!currentLead}
              >
                <Text style={styles.callBtnText}>Call Now</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ACTIVE CALL SCREEN */}
          {screen === 'active_call' && (
            <View style={styles.callContent}>
              <Text style={styles.callingHeader}>Active Call</Text>
              <Text style={styles.callingName}>{currentLead?.name}</Text>
              <Text style={styles.callingPhone}>{currentLead?.phone}</Text>

              <Text style={styles.callTimer}>{formatTime(callTimer)}</Text>

              <TouchableOpacity style={styles.hangupBtn} onPress={endCall}>
                <Text style={styles.hangupBtnText}>End Call</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DISPOSITION FORM */}
          {screen === 'disposition' && (
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.sectionHeader}>Log Call Disposition</Text>

              <TextInput
                style={styles.notesInput}
                placeholder="Enter call notes..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDisposition}>
                <Text style={styles.saveBtnText}>Save & Next Lead</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* COUNTDOWN BETWEEN LEADS */}
          {screen === 'countdown' && (
            <View style={styles.countdownContent}>
              <Text style={styles.countdownHeader}>Call Log Saved</Text>
              <Text style={styles.countdownTimer}>{countdown}s</Text>
              <Text style={styles.countdownSub}>Next lead loading automatically...</Text>

              <TouchableOpacity style={styles.skipBtn} onPress={skipCountdown}>
                <Text style={styles.skipBtnText}>Skip Countdown</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0f172a'
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center'
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#a78bfa',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 48
  },
  inputContainer: {
    gap: 16
  },
  input: {
    height: 54,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155'
  },
  loginBtn: {
    height: 54,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    height: 70,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 11
  },
  agentName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b'
  },
  statusDotOnline: {
    backgroundColor: '#10b981'
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  statusMenu: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    zIndex: 99,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  statusMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  statusMenuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  content: {
    padding: 16
  },
  targetCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  targetTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  targetProgress: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 4
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  leadPhone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4
  },
  leadLoc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  noLeadCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  noLeadText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b45309'
  },
  noLeadSub: {
    fontSize: 11,
    color: '#d97706',
    textAlign: 'center',
    marginTop: 4
  },
  callBtn: {
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  callBtnDisabled: {
    backgroundColor: '#cbd5e1'
  },
  callBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  callContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  callingHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  callingName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 12
  },
  callingPhone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 4
  },
  callTimer: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1e293b',
    marginVertical: 48,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace'
  },
  hangupBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  hangupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    fontSize: 14,
    color: '#334155',
    textAlignVertical: 'top',
    marginBottom: 24
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  countdownContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  countdownHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981'
  },
  countdownTimer: {
    fontSize: 72,
    fontWeight: '900',
    color: '#1e293b',
    marginVertical: 24
  },
  countdownSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 48
  },
  skipBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  skipBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
