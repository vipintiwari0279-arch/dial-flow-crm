import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AdminLayout from './components/AdminLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import UploadLeads from './pages/UploadLeads';
import Agents from './pages/Agents';
import DistributeLeads from './pages/DistributeLeads';
import Reports from './pages/Reports';
import LiveMonitoring from './pages/LiveMonitoring';
import Callbacks from './pages/Callbacks';
import DncList from './pages/DncList';
import AgentSimulator from './pages/AgentSimulator';
import AttendanceLogs from './pages/AttendanceLogs';
import ManageDispositions from './pages/ManageDispositions';
import HRMSPortal from './pages/HRMSPortal';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <span className="w-10 h-10 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/simulator" element={
          <ProtectedRoute allowedRoles={['agent', 'admin']}>
            <AgentSimulator />
          </ProtectedRoute>
        } />

        {/* Admin Dashboard Routes wrapped in AdminLayout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/leads" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <LeadsList />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/upload" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <UploadLeads />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/agents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Agents />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/distribute" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <DistributeLeads />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/attendance" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <AttendanceLogs />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Reports />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/live" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <LiveMonitoring />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/callbacks" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Callbacks />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/dnc" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <DncList />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/dispositions" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <ManageDispositions />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/hrms" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <HRMSPortal />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Redirect Root */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
