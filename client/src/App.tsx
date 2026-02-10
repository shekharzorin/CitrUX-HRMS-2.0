import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import EmployeeDetails from './pages/EmployeeDetails';
import Leaves from './pages/Leaves';
import ManagerLeaves from './pages/ManagerLeaves';
import CreateUser from './pages/CreateUser';
import EditUser from './pages/EditUser';
import Attendance from './pages/Attendance';
import Timesheets from './pages/Timesheets';
import TimesheetApprovals from './pages/TimesheetApprovals';
import AttendanceApprovals from './pages/AttendanceApprovals';
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
import AssetInventory from './pages/AssetInventory';
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
import DesignSystem from './pages/DesignSystem';
import Payroll from './pages/admin/Payroll';

import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />; // Or a generic "Unauthorized" page
  }

  return <Layout>{children}</Layout>;
};

import { ToastProvider } from './contexts/ToastContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify/:id" element={<Verification />} /> {/* Public Route */}
              <Route path="/design-system" element={<DesignSystem />} /> {/* Public Design System */}

              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />


              <Route path="/users" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']}>
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
                <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
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
              <Route path="/attendance/approvals" element={
                <ProtectedRoute>
                  <AttendanceApprovals />
                </ProtectedRoute>
              } />
              <Route path="/timesheets" element={
                <ProtectedRoute>
                  <Timesheets />
                </ProtectedRoute>
              } />
              <Route path="/timesheets/approvals" element={
                <ProtectedRoute>
                  <TimesheetApprovals />
                </ProtectedRoute>
              } />
              <Route path="/admin/shifts" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                  <ShiftConfig />
                </ProtectedRoute>
              } />
              <Route path="/manager/leaves" element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'HR']}>
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
                  <AssetInventory />
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

              <Route path="/admin/salary" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                  <SalaryConfig />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/certificates/issue" element={
                <ProtectedRoute>
                  <IssueCertificate />
                </ProtectedRoute>
              } />
              <Route path="/payslips" element={
                <ProtectedRoute>
                  <Payslips />
                </ProtectedRoute>
              } />
              <Route path="/admin/payroll" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                  <Payroll />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
