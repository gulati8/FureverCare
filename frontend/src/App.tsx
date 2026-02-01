import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import Homepage from './pages/Homepage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PetDetail from './pages/PetDetail';
import PublicCard from './pages/PublicCard';
import TokenCard from './pages/TokenCard';
import AcceptInvite from './pages/AcceptInvite';
import AdminLayout from './pages/admin/AdminLayout';
import CMSEditor from './pages/admin/CMSEditor';

// Redirects to homepage and opens the auth modal
function AuthRedirect({ mode }: { mode: 'login' | 'signup' }) {
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    if (!user) {
      openAuthModal(mode);
    }
  }, [user, mode, openAuthModal]);

  return <Navigate to="/" replace />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      openAuthModal('login');
    }
  }, [isLoading, user, openAuthModal]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public homepage */}
      <Route path="/" element={<Homepage />} />

      {/* Auth routes - redirect to homepage with modal */}
      <Route path="/login" element={<AuthRedirect mode="login" />} />
      <Route path="/register" element={<AuthRedirect mode="signup" />} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />

      {/* Public sharing routes */}
      <Route path="/card/:shareId" element={<PublicCard />} />
      <Route path="/share/:token" element={<TokenCard />} />
      <Route path="/invite/:inviteCode" element={<AcceptInvite />} />

      {/* Private app routes with Layout */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pets/:id" element={<PetDetail />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/cms" replace />} />
        <Route path="cms" element={<CMSEditor />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
