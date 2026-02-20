import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authService, type User } from '../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  justLoggedIn: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    captchaId: string,
    captchaAnswer: string,
    options?: { onInvalidCaptcha?: () => void }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  clearError: () => void;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    justLoggedIn: false,
  });

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setUser = (user: User | null) => {
    setState((prev) => ({ ...prev, user }));
  };

  const checkAuth = useCallback(async () => {
    try {
      const { user } = await authService.me();
      setUser(user);
      // 页面刷新时的认证检查，不设置 justLoggedIn
    } catch (err) {
      console.log('Auth check failed (this is expected for unauthenticated users):', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authService.login({ email, password });
      setUser(user);
      setState((prev) => ({ ...prev, justLoggedIn: true }));
      // 1.1 秒后清除标志（略长于弹窗显示时间）
      setTimeout(() => {
        setState((prev) => ({ ...prev, justLoggedIn: false }));
      }, 1100);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'login_failed');
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    captchaId: string,
    captchaAnswer: string,
    options?: { onInvalidCaptcha?: () => void }
  ) => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authService.register({
        email,
        password,
        captchaId,
        captchaAnswer,
      });
      setUser(user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'register_failed';
      setError(msg);
      setUser(null);
      if (msg === 'invalid_captcha') options?.onInvalidCaptcha?.();
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (displayName: string) => {
    try {
      const { user } = await authService.updateProfile({ displayName });
      setUser(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request_failed');
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'logout_failed');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      await authService.refresh();
      await checkAuth();
    } catch {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refresh,
        updateProfile,
        clearError,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Context + hook in same file is intentional
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
