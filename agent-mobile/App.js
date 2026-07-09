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
  Linking,
  Modal,
  PermissionsAndroid,
  AppState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import RNImmediatePhoneCall from 'react-native-immediate-phone-call';
import CallDetectorManager from 'react-native-call-detector';

const API_URL = 'https://dial-flow-crm.onrender.com'; // Deployed live Render backend URL

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // App screen flow
  const [screen, setScreen] = useState('login'); // 'login' | 'dialer' | 'active_call' | 'disposition' | 'countdown'
  const [activeTab, setActiveTab] = useState('calling'); // 'calling' | 'hrms'

  // Leave Form inputs
  const [leaveType, setLeaveType] = useState('sick');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveSuccess, setLeaveSuccess] = useState('');
  const [leaveError, setLeaveError] = useState('');

  // Call detector ref
  const callDetectorRef = useRef(null);

  // Dialer data
  const [currentLead, setCurrentLead] = useState(null);
  const [targetCalls, setTargetCalls] = useState(150);
  const [completedToday, setCompletedToday] = useState(0);

  // Calling Stats
  const [stats, setStats] = useState({
    leadRemaining: 0,
    totalCalls: 0,
    connected: 0,
    callbacks: 0,
    notInterested: 0
  });

  // Attendance Punch
  const [attendance, setAttendance] = useState(null);
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchedOut, setPunchedOut] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);

  // Advanced States
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);
  const [showCallbacksDrawer, setShowCallbacksDrawer] = useState(false);
  const [callbacksList, setCallbacksList] = useState([]);
  const [outcomesList, setOutcomesList] = useState([]);
  const [manualPhone, setManualPhone] = useState('');

  // Call & disposition timer state
  const [callTimer, setCallTimer] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const [disposition, setDisposition] = useState('interested');
  const [notes, setNotes] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Forgot password flow states
  const [loginMode, setLoginMode] = useState('login'); // 'login' | 'forgot' | 'verify' | 'reset'
  const [forgotLoginId, setForgotLoginId] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showPassMobile, setShowPassMobile] = useState(false);
  const [showConfirmPassMobile, setShowConfirmPassMobile] = useState(false);

  const socketRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // AppState change listener fallback for auto-disconnect detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        setScreen(currentScreen => {
          if (currentScreen === 'active_call') {
            console.log('App returned to active foreground from call. Redirecting to disposition outcome...');
            setTimeout(() => {
              endCall();
            }, 500);
          }
          return currentScreen;
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleMobileForgotPassword = async () => {
    if (!forgotLoginId.trim()) {
      Alert.alert('Error', 'Please enter email or phone number.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: forgotLoginId })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Verification OTP Sent', data.message);
        if (data.testOtp) {
          Alert.alert('TEST MODE OTP', `Your OTP code is: ${data.testOtp}`);
        }
        setLoginMode('verify');
      } else {
        Alert.alert('Error', data.message || 'Request failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileVerifyOtp = async () => {
    if (!forgotOtp.trim()) {
      Alert.alert('Error', 'Please enter OTP.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: forgotLoginId, otp: forgotOtp })
      });
      const data = await response.json();
      if (data.success) {
        setLoginMode('reset');
      } else {
        Alert.alert('Error', data.message || 'Invalid or expired OTP.');
      }
    } catch (e) {
      Alert.alert('Error', 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileResetPassword = async () => {
    if (!forgotNewPassword || !forgotConfirmPassword) {
      Alert.alert('Error', 'Please fill all password fields.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: forgotLoginId, otp: forgotOtp, newPassword: forgotNewPassword })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Password reset successfully! Please login.');
        setLoginMode('login');
        setPassword('');
        setEmail(forgotLoginId);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotOtp('');
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password.');
      }
    } catch (e) {
      Alert.alert('Error', 'Reset request failed.');
    } finally {
      setLoading(false);
    }
  };

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
        fetchAttendanceStatus(data.token);
        fetchOutcomesList(data.token);
        fetchLeaveHistory(data.token);
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

  const fetchOutcomesList = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/dispositions`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOutcomesList(data.outcomes);
        if (data.outcomes.length > 0) {
          setDisposition(data.outcomes[0].label);
        }
      }
    } catch (e) {
      console.log('Error fetching outcomes list:', e);
    }
  };

  const fetchAttendanceStatus = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPunchedIn(data.punchedIn);
        setPunchedOut(data.punchedOut);
        setAttendance(data.attendance);
      }
    } catch (e) {
      console.log('Error fetching attendance status:', e);
    }
  };

  const fetchLeaveHistory = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/hrms/leave`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLeaveHistory(data.leaves);
      }
    } catch (e) {
      console.log('Error fetching leave history:', e);
    }
  };

  const handleApplyLeave = async () => {
    setLeaveError('');
    setLeaveSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/hrms/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
        setLeaveSuccess('Leave request submitted successfully!');
        setLeaveReason('');
        setLeaveStart('');
        setLeaveEnd('');
        fetchLeaveHistory(token);
        // Refresh profile to get updated balances
        const profileRes = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (profileData.success) {
          setUser(profileData.user);
        }
      } else {
        setLeaveError(data.message || 'Failed to submit leave request');
      }
    } catch (err) {
      setLeaveError('Server connection error');
    }
  };

  const handlePunch = async () => {
    setPunchLoading(true);
    try {
      if (!punchedIn) {
        // Request GPS Location Permissions!
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'GPS Location permission is required to punch in.');
          setPunchLoading(false);
          return;
        }

        // Get coordinates
        const locationData = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = locationData.coords;

        const res = await fetch(`${API_URL}/api/attendance/punch-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ latitude, longitude })
        });
        const data = await res.json();
        if (data.success) {
          setPunchedIn(true);
          setAttendance(data.attendance);
          Alert.alert('Punched In', 'Successfully marked attendance.');
        } else {
          Alert.alert('Error', data.message || 'Failed to punch in.');
        }
      } else {
        // Punch Out
        const res = await fetch(`${API_URL}/api/attendance/punch-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setPunchedOut(true);
          setAttendance(data.attendance);
          Alert.alert('Punched Out', 'Shift completed successfully.');
        } else {
          Alert.alert('Error', data.message || 'Failed to punch out.');
        }
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Connection failed to record attendance.');
    } finally {
      setPunchLoading(false);
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
        if (data.stats) {
          setStats(data.stats);
        }
        return data.lead;
      }
    } catch (e) {
      console.log('Error fetching lead:', e);
    }
    return null;
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
    const url = `whatsapp://send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}&text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('Error', 'Could not open WhatsApp.');
      });
    });
  };

  const fetchAndShowCallbacks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leads/callbacks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCallbacksList(data.callbacks);
        setShowCallbacksDrawer(true);
      } else {
        Alert.alert('Error', 'Failed to fetch callbacks.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch callbacks.');
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

  const startDialing = (leadToDial) => {
    const activeLead = leadToDial || currentLead;
    if (!activeLead) return;
    setScreen('active_call');
    setCallTimer(0);

    // Make immediate phone call if permission is granted, otherwise open dialer as fallback
    const triggerPhoneCall = async (phoneNumber) => {
      if (Platform.OS === 'android') {
        try {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE
          );
          if (hasPermission) {
            RNImmediatePhoneCall.immediatePhoneCall(phoneNumber);
            return;
          }

          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
              title: 'Direct Calling Permission',
              message: 'This app needs calling permission to dial phone numbers instantly.',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel'
            }
          );

          if (status === PermissionsAndroid.RESULTS.GRANTED) {
            RNImmediatePhoneCall.immediatePhoneCall(phoneNumber);
          } else {
            Linking.openURL(`tel:${phoneNumber}`).catch(err => console.log(err));
          }
        } catch (err) {
          console.log('Immediate dial error, falling back:', err);
          Linking.openURL(`tel:${phoneNumber}`).catch(err => console.log(err));
        }
      } else {
        Linking.openURL(`tel:${phoneNumber}`).catch(err => {
          console.log('Error opening native dialer:', err);
        });
      }
    };

    triggerPhoneCall(activeLead.phone);

    // Initialize call state detector to auto-end call logs
    const startCallDetection = async () => {
      if (Platform.OS === 'android') {
        try {
          const hasReadPhoneState = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
          );
          if (!hasReadPhoneState) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
              {
                title: 'Call Status Auto-Detection',
                message: 'This app needs access to phone status to auto-detect when a call ends.',
                buttonPositive: 'OK',
                buttonNegative: 'Cancel'
              }
            );
          }
        } catch (err) {
          console.log('Error requesting READ_PHONE_STATE:', err);
        }
      }

      callDetectorRef.current = new CallDetectorManager(
        (event, phoneNumber) => {
          console.log('Call state event:', event);
          if (event === 'Disconnected') {
            console.log('Detected physical call end. Wrapping up...');
            endCall();
          }
        },
        false, // readPhoneNumber
        () => {}, // iOS permission callback
        {
          title: 'Phone State Permission',
          message: 'This app needs access to phone state to auto-end call logs.'
        }
      );
    };

    startCallDetection();

    // Notify backend
    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: user.id,
        agentName: user.name,
        leadName: activeLead.name,
        phone: activeLead.phone,
        state: 'dialing'
      });
    }

    // Connect call after dummy ringing delay
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('call_state_change', {
          agentId: user.id,
          agentName: user.name,
          leadName: activeLead.name,
          phone: activeLead.phone,
          state: 'talking'
        });
      }

      timerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2000);
  };

  const handleManualDial = () => {
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
    startDialing(tempLead);
  };

  const endCall = () => {
    clearInterval(timerIntervalRef.current);
    if (callDetectorRef.current) {
      callDetectorRef.current.dispose();
      callDetectorRef.current = null;
    }
    setScreen('disposition');

    if (socketRef.current) {
      socketRef.current.emit('call_state_change', {
        agentId: user.id,
        agentName: user.name,
        state: 'idle'
      });
    }
  };

  const handleCountdownExpiry = async () => {
    const nextLead = await fetchNextLead(token);
    if (nextLead && autoDialEnabled) {
      startDialing(nextLead);
    } else {
      setScreen('dialer');
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
          callbackTime: disposition === 'callback' ? callbackTime : null,
          leadName: currentLead.name,
          phone: currentLead.phone
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
              handleCountdownExpiry();
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
    handleCountdownExpiry();
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
          <Text style={styles.brandSubtitle}>
            {loginMode === 'login' && 'By Vipin - Agent App'}
            {loginMode === 'forgot' && 'Account Password Recovery'}
            {loginMode === 'verify' && 'Enter Verification OTP'}
            {loginMode === 'reset' && 'Create New Password'}
          </Text>

          {/* 1. LOGIN MODE */}
          {loginMode === 'login' && (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email or Phone Number"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassMobile}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 17,
                      padding: 4
                    }}
                    onPress={() => setShowPassMobile(!showPassMobile)}
                  >
                    <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>
                      {showPassMobile ? 'HIDE' : 'SHOW'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => { setLoginMode('forgot'); setForgotLoginId(email); }}
                style={{ alignSelf: 'flex-end', marginTop: 12 }}
              >
                <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 2. FORGOT PASSWORD MODE */}
          {loginMode === 'forgot' && (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Registered Email or Phone"
                  placeholderTextColor="#94a3b8"
                  value={forgotLoginId}
                  onChangeText={setForgotLoginId}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.loginBtn} onPress={handleMobileForgotPassword} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Send 6-Digit OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setLoginMode('login')}
                style={{ alignSelf: 'center', marginTop: 20 }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 'bold' }}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. VERIFY OTP MODE */}
          {loginMode === 'verify' && (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { letterSpacing: 6, fontSize: 18, textAlign: 'center', fontWeight: 'bold' }]}
                  placeholder="000000"
                  placeholderTextColor="#64748b"
                  value={forgotOtp}
                  onChangeText={(val) => setForgotOtp(val.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={styles.loginBtn} onPress={handleMobileVerifyOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Verify OTP Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setLoginMode('forgot')}
                style={{ alignSelf: 'center', marginTop: 20 }}
              >
                <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>Resend Code / Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4. RESET PASSWORD MODE */}
          {loginMode === 'reset' && (
            <View>
              <View style={styles.inputContainer}>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#94a3b8"
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry={!showPassMobile}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 17,
                      padding: 4
                    }}
                    onPress={() => setShowPassMobile(!showPassMobile)}
                  >
                    <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>
                      {showPassMobile ? 'HIDE' : 'SHOW'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#94a3b8"
                    value={forgotConfirmPassword}
                    onChangeText={setForgotConfirmPassword}
                    secureTextEntry={!showConfirmPassMobile}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 17,
                      padding: 4
                    }}
                    onPress={() => setShowConfirmPassMobile(!showConfirmPassMobile)}
                  >
                    <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: 'bold' }}>
                      {showConfirmPassMobile ? 'HIDE' : 'SHOW'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.loginBtn} onPress={handleMobileResetPassword} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.statusBadge, { marginRight: 8, backgroundColor: '#f59e0b' }]}
                onPress={fetchAndShowCallbacks}
              >
                <Text style={styles.statusText}>CALLBACKS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statusBadge}
                onPress={() => setShowStatusMenu(!showStatusMenu)}
              >
                <View style={[styles.statusDot, user?.status === 'online' && styles.statusDotOnline]} />
                <Text style={styles.statusText}>{user?.status?.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
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
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#0f172a',
              borderBottomWidth: 1,
              borderBottomColor: '#1e293b',
              paddingVertical: 4
            }}>
              <TouchableOpacity
                onPress={() => setActiveTab('calling')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderBottomWidth: activeTab === 'calling' ? 2 : 0,
                  borderBottomColor: '#8b5cf6',
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: activeTab === 'calling' ? '#ffffff' : '#94a3b8'
                }}>Calling Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('hrms');
                  fetchLeaveHistory(token);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderBottomWidth: activeTab === 'hrms' ? 2 : 0,
                  borderBottomColor: '#8b5cf6',
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: activeTab === 'hrms' ? '#ffffff' : '#94a3b8'
                }}>HRMS Portal</Text>
              </TouchableOpacity>
            </View>
          )}

          {screen === 'dialer' && activeTab === 'hrms' && (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Leave Balances Grid */}
              <Text style={styles.sectionHeader}>My Leave Balances</Text>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 20
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 16,
                  padding: 12,
                  marginHorizontal: 4,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#f43f5e' }}>{user?.sickLeaveBalance !== undefined ? user.sickLeaveBalance : 12}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Sick Left</Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 16,
                  padding: 12,
                  marginHorizontal: 4,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#d97706' }}>{user?.casualLeaveBalance !== undefined ? user.casualLeaveBalance : 12}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Casual Left</Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 16,
                  padding: 12,
                  marginHorizontal: 4,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2563eb' }}>{user?.earnedLeaveBalance !== undefined ? user.earnedLeaveBalance : 18}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Earned Left</Text>
                </View>
              </View>

              {/* Documents Downloader */}
              <Text style={styles.sectionHeader}>My HR Documents</Text>
              <View style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 20,
                padding: 16,
                marginBottom: 20
              }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => user?.offerLetterUrl && Linking.openURL(user.offerLetterUrl).catch(e => console.log(e))}
                    disabled={!user?.offerLetterUrl}
                    style={{
                      flex: 1,
                      backgroundColor: user?.offerLetterUrl ? '#ecfdf5' : '#f8fafc',
                      borderColor: user?.offerLetterUrl ? '#a7f3d0' : '#e2e8f0',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                      opacity: user?.offerLetterUrl ? 1 : 0.5
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Offer Letter</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: user?.offerLetterUrl ? '#047857' : '#94a3b8', marginTop: 4 }}>
                      {user?.offerLetterUrl ? 'Download PDF' : 'Not Uploaded'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => user?.relievingLetterUrl && Linking.openURL(user.relievingLetterUrl).catch(e => console.log(e))}
                    disabled={!user?.relievingLetterUrl}
                    style={{
                      flex: 1,
                      backgroundColor: user?.relievingLetterUrl ? '#f5f3ff' : '#f8fafc',
                      borderColor: user?.relievingLetterUrl ? '#ddd6fe' : '#e2e8f0',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                      opacity: user?.relievingLetterUrl ? 1 : 0.5
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Relieving Ltr</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: user?.relievingLetterUrl ? '#6d28d9' : '#94a3b8', marginTop: 4 }}>
                      {user?.relievingLetterUrl ? 'Download PDF' : 'Not Uploaded'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Apply Leave Form */}
              <Text style={styles.sectionHeader}>Apply for Leave</Text>
              <View style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 20,
                padding: 16,
                marginBottom: 20
              }}>
                {leaveError ? <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ef4444', textAlign: 'center', marginBottom: 8 }}>{leaveError}</Text> : null}
                {leaveSuccess ? <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10b981', textAlign: 'center', marginBottom: 8 }}>{leaveSuccess}</Text> : null}

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>LEAVE TYPE</Text>
                  <View style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    borderRadius: 12,
                    flexDirection: 'row'
                  }}>
                    {['sick', 'casual', 'earned'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setLeaveType(t)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          backgroundColor: leaveType === t ? '#8b5cf6' : 'transparent',
                          borderRadius: 10
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: leaveType === t ? '#ffffff' : '#64748b' }}>{t.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>START DATE</Text>
                    <TextInput
                      value={leaveStart}
                      onChangeText={setLeaveStart}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderColor: '#cbd5e1',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 12,
                        color: '#1e293b'
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>END DATE</Text>
                    <TextInput
                      value={leaveEnd}
                      onChangeText={setLeaveEnd}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderColor: '#cbd5e1',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 12,
                        color: '#1e293b'
                      }}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>REASON</Text>
                  <TextInput
                    value={leaveReason}
                    onChangeText={setLeaveReason}
                    placeholder="e.g. Fever, Personal emergency"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderColor: '#cbd5e1',
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12,
                      color: '#1e293b'
                    }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleApplyLeave}
                  style={{
                    backgroundColor: '#8b5cf6',
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ffffff' }}>Submit Leave Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {screen === 'dialer' && activeTab === 'calling' && (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Attendance Card */}
              <View style={styles.targetCard}>
                <Text style={styles.targetTitle}>Attendance Status</Text>
                <Text style={styles.attendanceStatusText}>
                  {punchedIn 
                    ? punchedOut 
                      ? 'Shift Completed' 
                      : `Punched In (GPS Lat/Lng: ${attendance?.latitude?.toFixed(2)}, ${attendance?.longitude?.toFixed(2)})`
                    : 'Not Punched In'}
                </Text>
                {!punchedOut ? (
                  <TouchableOpacity
                    style={[styles.punchBtn, punchedIn ? styles.punchOutBtn : styles.punchInBtn]}
                    onPress={handlePunch}
                    disabled={punchLoading}
                  >
                    {punchLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.punchBtnText}>{punchedIn ? 'Punch Out' : 'Punch In (Current Location)'}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.punchCompletedContainer}>
                    <Text style={styles.punchCompletedText}>Today's Shift Ended</Text>
                  </View>
                )}
              </View>

              {/* Call Stats Grid Card */}
              <View style={styles.statsCardGrid}>
                <View style={styles.statMiniCard}>
                  <Text style={styles.statLabel}>Lead Left</Text>
                  <Text style={styles.statNumber}>{stats.leadRemaining}</Text>
                </View>
                <View style={styles.statMiniCard}>
                  <Text style={styles.statLabel}>Total Call</Text>
                  <Text style={styles.statNumber}>{stats.totalCalls}</Text>
                </View>
                <View style={styles.statMiniCard}>
                  <Text style={styles.statLabel}>Connect</Text>
                  <Text style={[styles.statNumber, {color: '#10b981'}]}>{stats.connected}</Text>
                </View>
                <View style={styles.statMiniCard}>
                  <Text style={styles.statLabel}>Callbacks</Text>
                  <Text style={[styles.statNumber, {color: '#f59e0b'}]}>{stats.callbacks}</Text>
                </View>
              </View>

              {/* Predictive Auto-Dialer Toggle Switch */}
              <View style={[styles.targetCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.targetTitle}>Predictive Auto-Dialer</Text>
                  <Text style={styles.attendanceStatusText}>
                    {autoDialEnabled ? 'Automatic calling mode is ACTIVE' : 'Manual calling mode is active'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.punchBtn, 
                    { marginTop: 0, paddingHorizontal: 16 }, 
                    autoDialEnabled ? { backgroundColor: '#7c3aed' } : { backgroundColor: '#94a3b8' }
                  ]}
                  onPress={() => setAutoDialEnabled(!autoDialEnabled)}
                >
                  <Text style={styles.punchBtnText}>{autoDialEnabled ? 'ACTIVE' : 'INACTIVE'}</Text>
                </TouchableOpacity>
              </View>

              {/* Daily Target Progress */}
              <View style={styles.targetCard}>
                <Text style={styles.targetTitle}>Today's Target Progress</Text>
                <Text style={styles.targetProgress}>{completedToday} / {targetCalls} Calls</Text>
              </View>

              {/* Manual Reference Dialer Input */}
              <View style={styles.targetCard}>
                <Text style={styles.targetTitle}>Manual Reference Dial</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                    placeholder="Enter phone number..."
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={manualPhone}
                    onChangeText={(val) => setManualPhone(val.replace(/[^0-9]/g, ''))}
                  />
                  <TouchableOpacity
                    style={[
                      styles.punchBtn, 
                      { marginTop: 0, paddingHorizontal: 16, backgroundColor: '#2563eb' },
                      (!manualPhone || !punchedIn) && { opacity: 0.5 }
                    ]}
                    onPress={handleManualDial}
                    disabled={!manualPhone || !punchedIn}
                  >
                    <Text style={styles.punchBtnText}>Dial</Text>
                  </TouchableOpacity>
                </View>
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
                style={[
                  styles.callBtn, 
                  (!currentLead || user?.status !== 'online' || !punchedIn) && styles.callBtnDisabled
                ]}
                onPress={() => startDialing()}
                disabled={!currentLead || user?.status !== 'online' || !punchedIn}
              >
                <Text style={styles.callBtnText}>
                  {!punchedIn ? 'Punch In First to Call' : 'Call Now'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ACTIVE CALL SCREEN */}
          {screen === 'active_call' && (
            <View style={styles.callContent}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffe4e6',
                borderColor: '#fecdd3',
                borderWidth: 1,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 20,
                alignSelf: 'center'
              }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e11d48',
                  marginRight: 6
                }} />
                <Text style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: '#e11d48'
                }}>REC (Call Recording Active)</Text>
              </View>

              <Text style={styles.callingHeader}>Active Call</Text>
              <Text style={styles.callingName}>{currentLead?.name}</Text>
              <Text style={styles.callingPhone}>{currentLead?.phone}</Text>

              <View style={{
                backgroundColor: '#fef3c7',
                borderColor: '#fde68a',
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                marginTop: 20,
                marginBottom: 20,
                alignSelf: 'stretch'
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: '#d97706',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 2
                }}>📢 Compliance Script Announcement</Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#92400e',
                  lineHeight: 16
                }}>"Inform customer: This call is being recorded for quality and training purposes."</Text>
              </View>

              <Text style={styles.callTimer}>{formatTime(callTimer)}</Text>

              <TouchableOpacity style={styles.hangupBtn} onPress={endCall}>
                <Text style={styles.hangupBtnText}>End Call</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DISPOSITION FORM */}
          {screen === 'disposition' && (
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.sectionHeader}>Log Call Outcome</Text>
              <View style={styles.dispositionContainer}>
                {(outcomesList.length > 0 ? outcomesList.map(o => o.label) : ['interested', 'callback', 'not_interested', 'dnc']).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.dispositionBtn,
                      disposition === status && styles.dispositionBtnSelected
                    ]}
                    onPress={() => setDisposition(status)}
                  >
                    <Text style={[
                      styles.dispositionBtnText,
                      disposition === status && styles.dispositionBtnTextSelected
                    ]}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {disposition === 'callback' && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.sectionHeader}>Callback Time (e.g. YYYY-MM-DD HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', marginBottom: 10 }]}
                    placeholder="2026-07-08 17:00"
                    placeholderTextColor="#94a3b8"
                    value={callbackTime}
                    onChangeText={setCallbackTime}
                  />
                </View>
              )}

              <Text style={styles.sectionHeader}>Call Notes</Text>
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

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#25d366', marginTop: 12 }]} 
                onPress={() => sendWhatsApp(currentLead, disposition)}
              >
                <Text style={styles.saveBtnText}>Send WhatsApp Follow-up</Text>
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

      {/* Callbacks Drawer Modal */}
      {showCallbacksDrawer && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCallbacksDrawer}
          onRequestClose={() => setShowCallbacksDrawer(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Callback Reminders</Text>
                <TouchableOpacity onPress={() => setShowCallbacksDrawer(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1, padding: 16 }}>
                {callbacksList.length === 0 ? (
                  <Text style={styles.noCallbacksText}>No scheduled callbacks for today.</Text>
                ) : (
                  callbacksList.map((cb) => (
                    <View key={cb.id} style={styles.callbackItemCard}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.callbackLeadName}>{cb.name}</Text>
                        <Text style={styles.callbackLeadPhone}>{cb.phone}</Text>
                        {cb.callbackTime && (
                          <Text style={styles.callbackTimeText}>
                            Time: {new Date(cb.callbackTime).toLocaleString()}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.callbackCallBtn}
                        onPress={() => {
                          setShowCallbacksDrawer(false);
                          setCurrentLead(cb);
                          startDialing(cb);
                        }}
                      >
                        <Text style={styles.callbackCallBtnText}>Call</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  dispositionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  dispositionBtn: {
    width: '48%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 8
  },
  dispositionBtnSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed'
  },
  dispositionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b'
  },
  dispositionBtnTextSelected: {
    color: '#fff'
  },
  attendanceStatusText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500'
  },
  punchBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  punchInBtn: {
    backgroundColor: '#10b981'
  },
  punchOutBtn: {
    backgroundColor: '#ef4444'
  },
  punchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  punchCompletedContainer: {
    backgroundColor: '#f1f5f9',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  punchCompletedText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold'
  },
  statsCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statMiniCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContentContainer: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingTop: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  noCallbacksText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40
  },
  callbackItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  callbackLeadName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  callbackLeadPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  callbackTimeText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginTop: 4
  },
  callbackCallBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  callbackCallBtnText: {
    color: '#fff',
    fontSize: 12,
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
