import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { setImpersonationCallback, ImpersonationInfo } from '../api/client';
import { adminApi } from '../api/admin';
import { useAuth } from './useAuth';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonationInfo | null;
  startImpersonation: (userId: number) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonationInfo | null>(null);
  const wasImpersonating = useRef(false);
  const { token, refreshProfile, refreshSubscription } = useAuth();
  const navigate = useNavigate();

  // Register callback to detect impersonation from response headers
  useEffect(() => {
    setImpersonationCallback((data) => {
      setImpersonatedUser((prev) => {
        // Detect when impersonation expires (was impersonating, now not)
        if (wasImpersonating.current && data === null) {
          wasImpersonating.current = false;
          // Auto-navigate back and refresh on timeout
          refreshProfile();
          refreshSubscription();
          navigate('/admin/users');
        }
        wasImpersonating.current = data !== null;
        return data;
      });
    });

    return () => {
      setImpersonationCallback(() => {});
    };
  }, [navigate, refreshProfile, refreshSubscription]);

  const startImpersonation = useCallback(async (userId: number) => {
    if (!token) return;
    await adminApi.startImpersonation(userId, token);
    // Refresh profile — will now return the impersonated user's data
    // The next API call will set the impersonation header via callback
    await refreshProfile();
    await refreshSubscription();
    navigate('/dashboard');
  }, [token, refreshProfile, refreshSubscription, navigate]);

  const stopImpersonation = useCallback(async () => {
    if (!token) return;
    await adminApi.stopImpersonation(token);
    setImpersonatedUser(null);
    // Refresh profile — will now return the admin's own data
    await refreshProfile();
    await refreshSubscription();
    navigate('/admin/users');
  }, [token, refreshProfile, refreshSubscription, navigate]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: impersonatedUser !== null,
        impersonatedUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
