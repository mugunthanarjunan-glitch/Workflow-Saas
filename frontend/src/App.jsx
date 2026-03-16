import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import WorkflowsPage from './pages/WorkflowsPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import ExecuteWorkflowPage from './pages/ExecuteWorkflowPage';
import ExecutionsPage from './pages/ExecutionsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/workflows" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/workflows" /> : <LoginPage />} />
          <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
          <Route path="/workflows/:id/execute" element={<ProtectedRoute><ExecuteWorkflowPage /></ProtectedRoute>} />
          <Route path="/executions" element={<ProtectedRoute><ExecutionsPage /></ProtectedRoute>} />
          <Route path="/executions/:id" element={<ProtectedRoute><ExecutionDetailPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AdminRoute><UsersPage /></AdminRoute></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/workflows" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
