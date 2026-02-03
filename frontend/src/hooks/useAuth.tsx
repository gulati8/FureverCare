import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { authApi, User } from '../api/client';
import { billingApi, SubscriptionInfo } from '../api/billing';

// Helper to decode JWT payload
function decodeJwtPayload(token: string): { userId: number; email: string; isAdmin?: boolean } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

type AuthModalType = 'login' | 'signup' | null;

export interface Subscription {
  status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';
  tier: 'free' | 'premium';
  currentPeriodEnd: Date | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  subscription: Subscription | null;
  isPremium: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
  authModal: AuthModalType;
  openAuthModal: (type: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'furevercare_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalType>(null);

  const openAuthModal = (type: 'login' | 'signup') => setAuthModal(type);
  const closeAuthModal = () => setAuthModal(null);

  // Computed property for premium status
  const isPremium = useMemo(() => {
    if (!subscription) return false;
    return subscription.tier === 'premium' && (subscription.status === 'active' || subscription.status === 'trialing');
  }, [subscription]);

  // Helper to convert API subscription info to local format
  const mapSubscriptionInfo = (info: SubscriptionInfo): Subscription => ({
    status: info.status,
    tier: info.tier,
    currentPeriodEnd: info.currentPeriodEnd ? new Date(info.currentPeriodEnd) : null,
  });

  // Function to refresh subscription status
  const refreshSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const info = await billingApi.getSubscription(token);
      setSubscription(mapSubscriptionInfo(info));
    } catch {
      // If fetching subscription fails, set to null (free tier)
      setSubscription(null);
    }
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      // Decode isAdmin from JWT
      const payload = decodeJwtPayload(savedToken);
      if (payload?.isAdmin) {
        setIsAdmin(true);
      }
      Promise.all([
        authApi.getProfile(savedToken),
        billingApi.getSubscription(savedToken).catch(() => null),
      ])
        .then(([userProfile, subscriptionInfo]) => {
          setUser(userProfile);
          if (subscriptionInfo) {
            setSubscription(mapSubscriptionInfo(subscriptionInfo));
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setIsAdmin(false);
          setSubscription(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    // Decode isAdmin from JWT
    const payload = decodeJwtPayload(response.token);
    setIsAdmin(payload?.isAdmin ?? false);
    // Fetch subscription status after successful login
    try {
      const info = await billingApi.getSubscription(response.token);
      setSubscription(mapSubscriptionInfo(info));
    } catch {
      setSubscription(null);
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const response = await authApi.register({ email, password, name, phone });
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    // Decode isAdmin from JWT
    const payload = decodeJwtPayload(response.token);
    setIsAdmin(payload?.isAdmin ?? false);
    // Fetch subscription status after successful registration
    try {
      const info = await billingApi.getSubscription(response.token);
      setSubscription(mapSubscriptionInfo(info));
    } catch {
      setSubscription(null);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    setSubscription(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin, subscription, isPremium, login, register, logout, refreshSubscription, authModal, openAuthModal, closeAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
