import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mobileAuth, mobileStaff, setToken, type MobileUser } from '@360schoolerp/shared';
import { loadToken, saveToken } from '../lib/authStorage';
import { registerPushNotifications } from '../lib/pushNotifications';

type AuthContextValue = {
  user: MobileUser | null;
  isLoading: boolean;
  login: (employeeCode: string, registeredMobile: string, password: string) => Promise<MobileUser>;
  loginWithOtp: (employeeCode: string, registeredMobile: string, otp: string) => Promise<MobileUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<MobileUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const establishSession = useCallback(async (res: { token: string; user: MobileUser }) => {
    setToken(res.token);
    await saveToken(res.token);
    setUser(res.user);

    if (!res.user.mustResetPassword) {
      void registerPushNotifications().catch(() => undefined);
    }

    return res.user;
  }, []);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await loadToken();
      if (!token) {
        setUser(null);
        return;
      }
      setToken(token);
      const { user: me } = await mobileAuth.me();
      setUser(me);

      if (!me.mustResetPassword) {
        void registerPushNotifications().catch(() => undefined);
      }
    } catch {
      setToken(null);
      await saveToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (employeeCode: string, registeredMobile: string, password: string) => {
      const res = await mobileStaff.login({ employeeCode, registeredMobile, password });
      return establishSession(res);
    },
    [establishSession],
  );

  const loginWithOtp = useCallback(
    async (employeeCode: string, registeredMobile: string, otp: string) => {
      const res = await mobileAuth.verifyOtp({
        app: 'staff',
        employeeCode,
        registeredMobile,
        otp,
      });
      return establishSession(res);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    setToken(null);
    await saveToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await mobileAuth.changePassword({ currentPassword, newPassword });
    setToken(res.token);
    await saveToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, loginWithOtp, logout, changePassword }),
    [user, isLoading, login, loginWithOtp, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
