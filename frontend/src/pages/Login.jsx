import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldAlert, KeyRound, Phone } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState(''); // Serves as Email or Phone on login
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forgot password flow states
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'verify' | 'reset'
  const [loginId, setLoginId] = useState(''); // email or phone for reset
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/admin');
      } else {
        setError(res.message || 'Invalid email/phone or password');
      }
    } catch (err) {
      setError('Connection failed. Server might be offline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId })
      });
      const data = await response.json();

      if (data.success) {
        setOtpSentMsg(data.message);
        if (data.testOtp) {
          alert(`TEST MODE OTP: ${data.testOtp} (Logged to terminal)`);
        }
        setMode('verify');
      } else {
        setError(data.message || 'Verification request failed');
      }
    } catch (err) {
      setError('Connection failed. Server offline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, otp })
      });
      const data = await response.json();

      if (data.success) {
        setMode('reset');
      } else {
        setError(data.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setError('Verification connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, otp, newPassword })
      });
      const data = await response.json();

      if (data.success) {
        alert('Password reset successfully! Please login with your new password.');
        setMode('login');
        setPassword('');
        setEmail(loginId);
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Reset connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (type) => {
    if (type === 'admin') {
      setEmail('admin@dialflow.com');
      setPassword('adminpassword');
    } else {
      setEmail('vipin@dialflow.com');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-brand-500 rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[120px] opacity-20 animate-pulse delay-1000"></div>
 
      <div className="max-w-md w-full space-y-8 p-10 bg-slate-950/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl relative z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 items-center justify-center shadow-xl shadow-brand-500/20 mb-4 hover:rotate-12 transition-transform duration-300">
            <PhoneCall className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Dial Flow CRM
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            {mode === 'login' && 'Secure agent & admin access portal'}
            {mode === 'forgot' && 'Account Recovery via OTP'}
            {mode === 'verify' && 'Verification Code Entered'}
            {mode === 'reset' && 'Create New Secure Password'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 text-center animate-shake">
            {error}
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <form className="mt-8 space-y-6 animate-fade-in" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-2">Email or Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    placeholder="Email address or Phone"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Password</label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setMode('forgot'); setLoginId(email); }}
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg shadow-brand-500/20 hover-glow hover-scale disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <form className="mt-8 space-y-6 animate-fade-in" onSubmit={handleForgotPassword}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-2">Email / Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Phone className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    placeholder="Registered Email or Phone Number"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">We will generate and send a 6-digit OTP to verify your account.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setError(''); setMode('login'); }}
                className="w-1/3 py-3 px-4 border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/10 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span>Send OTP Code</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 3. VERIFY OTP MODE */}
        {mode === 'verify' && (
          <form className="mt-8 space-y-6 animate-fade-in" onSubmit={handleVerifyOtp}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-2">Enter 6-Digit OTP</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent tracking-widest text-center text-lg font-bold"
                    placeholder="000000"
                  />
                </div>
                {otpSentMsg && (
                  <p className="text-[10px] text-emerald-400 mt-2 font-semibold">{otpSentMsg}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setError(''); setMode('forgot'); }}
                className="w-1/3 py-3 px-4 border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center"
              >
                Resend
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/10 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD MODE */}
        {mode === 'reset' && (
          <form className="mt-8 space-y-6 animate-fade-in" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-2">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span>Update Password & Login</span>
              )}
            </button>
          </form>
        )}

        {/* Demo Accounts Panel (Only visible on login screen) */}
        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-3">
              Quick Fill Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fillCredentials('admin')}
                className="px-3 py-2 text-xs font-semibold text-brand-400 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/10 rounded-xl transition-all"
              >
                System Admin
              </button>
              <button
                onClick={() => fillCredentials('agent')}
                className="px-3 py-2 text-xs font-semibold text-violet-400 bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 rounded-xl transition-all"
              >
                Agent (Vipin)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
