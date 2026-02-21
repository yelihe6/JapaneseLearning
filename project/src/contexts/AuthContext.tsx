import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authService, type User } from '../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  justLoggedIn: boolean;
  /** 登录成功但尚未完成跳转时的用户，用于先显示成功弹窗再跳转 */
  pendingLoginUser: User | null;
}

interface AuthContextValue extends AuthState {
  completePendingLogin: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    captchaId: string,
    captchaAnswer: string,
    options?: { onInvalidCaptcha?: () => void }
  ) => Promise<boolean>;
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
    pendingLoginUser: null,
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
      // 先设置 pendingLoginUser，让 App 在登录页显示成功弹窗，弹窗关闭后再完成跳转
      setState((prev) => ({ ...prev, pendingLoginUser: user, justLoggedIn: false }));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'login_failed';
      // 登录失败时统一显示「邮箱或密码错误」，避免泄露用户是否存在
      const credentialErrors = ['user_not_found', 'wrong_password', 'invalid_input'];
      const displayError = credentialErrors.includes(msg) ? 'invalid_credentials' : msg;
      setError(displayError);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completePendingLogin = useCallback(() => {
    setState((prev) => {
      if (!prev.pendingLoginUser) return prev;
      return {
        ...prev,
        user: prev.pendingLoginUser,
        pendingLoginUser: null,
      };
    });
  }, []);

  const register = async (
    email: string,
    password: string,
    captchaId: string,
    captchaAnswer: string,
    options?: { onInvalidCaptcha?: () => void }
  ) => {
    setError(null);
    // 不设置全局 loading，避免 App 显示全屏加载导致 LoginPage 被卸载，从而无法显示注册成功弹窗
    try {
      await authService.register({
        email,
        password,
        captchaId,
        captchaAnswer,
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'register_failed';
      setError(msg);
      setUser(null);
      if (msg === 'invalid_captcha') options?.onInvalidCaptcha?.();
      return false;
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
        completePendingLogin,
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
