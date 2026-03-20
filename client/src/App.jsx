import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Login from './pages/Login';
import UnloadingForm from './pages/UnloadingForm';
import ManagerDashboard from './pages/ManagerDashboard';
import Records from './pages/Records';
import EmployeeReports from './pages/EmployeeReports';
import EmployeeDetail from './pages/EmployeeDetail';
import './App.css';

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'manager') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/unloading" replace />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <div className="app-layout">
        <Sidebar />
        <main className={isAuthenticated ? 'main-content' : 'full-content'}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/unloading"
              element={
                <ProtectedRoute allowedRoles={['employee', 'manager']}>
                  <UnloadingForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-records"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <Records scope="mine" title="My Records" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-records"
              element={
                <ProtectedRoute allowedRoles={['employee', 'manager']}>
                  <Records scope="all" title="Unloading Reports" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-reports"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <EmployeeReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-reports/:employeeId"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <EmployeeDetail />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
