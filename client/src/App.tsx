import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import EmployeeDetails from './pages/EmployeeDetails';
import Leaves from './pages/Leaves';
import ManagerLeaves from './pages/ManagerLeaves';
import CreateUser from './pages/CreateUser';
import EditUser from './pages/EditUser';
import Attendance from './pages/Attendance';
import Timesheets from './pages/Timesheets';
import ShiftConfig from './pages/ShiftConfig';
import OnboardingForm from './pages/OnboardingForm';
import OnboardingList from './pages/OnboardingList';
import Offboarding from './pages/Offboarding';
import Performance from './pages/Performance';
import PerformanceReviews from './pages/PerformanceReviews';
import Jobs from './pages/Jobs';
import JobApplications from './pages/JobApplications';
import Expenses from './pages/Expenses';
import ExpenseApprovals from './pages/ExpenseApprovals';
import Assets from './pages/Assets';
import MyAssets from './pages/MyAssets';
import MyProfile from './pages/MyProfile';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Payslips from './pages/Payslips';
import SalaryConfig from './pages/SalaryConfig';
import IssueCertificate from './pages/IssueCertificate';
import Verification from './pages/Verification';
import OrgChart from './pages/OrgChart';

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
          <Route path="/org-chart" element={
            <ProtectedRoute>
              <OrgChart />
            </ProtectedRoute>
          } />
          <Route path="/employees/:id" element={
            <ProtectedRoute>
              <EmployeeDetails />
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
          <Route path="/timesheets" element={
            <ProtectedRoute>
              <Timesheets />
            </ProtectedRoute>
          } />
          <Route path="/admin/shifts" element={
            <ProtectedRoute>
              <ShiftConfig />
            </ProtectedRoute>
          } />
          <Route path="/manager/leaves" element={
            <ProtectedRoute>
              <ManagerLeaves />
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
          <Route path="/offboarding" element={
            <ProtectedRoute>
              <Offboarding />
            </ProtectedRoute>
          } />
          <Route path="/performance" element={
            <ProtectedRoute>
              <Performance />
            </ProtectedRoute>
          } />
          <Route path="/performance/reviews" element={
            <ProtectedRoute>
              <PerformanceReviews />
            </ProtectedRoute>
          } />
          <Route path="/recruitment/jobs" element={
            <ProtectedRoute>
              <Jobs />
            </ProtectedRoute>
          } />
          <Route path="/recruitment/applications" element={
            <ProtectedRoute>
              <JobApplications />
            </ProtectedRoute>
          } />
          <Route path="/expenses" element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          } />
          <Route path="/expenses/approvals" element={
            <ProtectedRoute>
              <ExpenseApprovals />
            </ProtectedRoute>
          } />
          <Route path="/assets" element={
            <ProtectedRoute>
              <Assets />
            </ProtectedRoute>
          } />
          <Route path="/my-assets" element={
            <ProtectedRoute>
              <MyAssets />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/payslips" element={
            <ProtectedRoute>
              <Payslips />
            </ProtectedRoute>
          } />
          <Route path="/admin/salary" element={
            <ProtectedRoute>
              <SalaryConfig />
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
