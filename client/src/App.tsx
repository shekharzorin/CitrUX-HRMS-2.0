import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Leaves from './pages/Leaves';
import CreateUser from './pages/CreateUser';
import EditUser from './pages/EditUser';
import Attendance from './pages/Attendance';
import OnboardingForm from './pages/OnboardingForm';
import OnboardingList from './pages/OnboardingList';
import Payslips from './pages/Payslips';
import IssueCertificate from './pages/IssueCertificate';
import Verification from './pages/Verification';

import Layout from './components/Layout';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <Layout>{children}</Layout>; // Wrap protected content in Layout
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify/:id" element={<Verification />} /> {/* Public Route */}

          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/leaves" element={
            <ProtectedRoute>
              <Leaves />
            </ProtectedRoute>
          } />
          <Route path="/users/create" element={
            <ProtectedRoute>
              <CreateUser />
            </ProtectedRoute>
          } />
          <Route path="/users/edit/:id" element={
            <ProtectedRoute>
              <EditUser />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/submit" element={
            <ProtectedRoute>
              <OnboardingForm />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/admin" element={
            <ProtectedRoute>
              <OnboardingList />
            </ProtectedRoute>
          } />
          <Route path="/payslips" element={
            <ProtectedRoute>
              <Payslips />
            </ProtectedRoute>
          } />
          <Route path="/certificates/issue" element={
            <ProtectedRoute>
              <IssueCertificate />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
