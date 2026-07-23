import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mobileAuth, mobileApp, setToken, type MobileUser } from '@360schoolerp/shared';
import { loadToken, saveToken } from '../lib/authStorage';
import { registerPushNotifications } from '../lib/pushNotifications';
import {
  StudentContext,
  type ChildSummary,
} from './StudentContext';
import { loadActiveStudentId, saveActiveStudentId } from '../lib/authStorage';

type AuthContextValue = {
  user: MobileUser | null;
  isLoading: boolean;
  login: (body: Record<string, unknown>) => Promise<MobileUser>;
  loginWithOtp: (body: Record<string, unknown>) => Promise<MobileUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<MobileUser>;
  refreshUser: () => Promise<void>;
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
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(null);
  const [childrenList, setChildrenList] = useState<ChildSummary[]>([]);

  const refreshChildren = useCallback(async () => {
    if (!user || user.role !== 'PARENT' || user.studentIds.length === 0) {
      setChildrenList([]);
      return;
    }

    const summaries = await Promise.all(
      user.studentIds.map(async (id) => {
        try {
          const profile = await mobileApp.profile({ studentId: id });
          return {
            id,
            name: profile.student.name,
            classGroup: profile.student.classGroup,
            admissionNumber: profile.student.admissionNumber,
          };
        } catch {
          return { id, name: 'Student', classGroup: '', admissionNumber: '' };
        }
      }),
    );
    setChildrenList(summaries);
  }, [user]);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await loadToken();
      const storedStudentId = await loadActiveStudentId();
      if (!token) {
        setUser(null);
        setActiveStudentIdState(null);
        return;
      }

      setToken(token);
      const { user: me } = await mobileAuth.me();
      setUser(me);

      if (me.role === 'PARENT') {
        const valid =
          storedStudentId && me.studentIds.includes(storedStudentId)
            ? storedStudentId
            : me.studentIds.length === 1
              ? me.studentIds[0]
              : me.activeStudentId && me.studentIds.includes(me.activeStudentId)
                ? me.activeStudentId
                : null;
        setActiveStudentIdState(valid);
        if (valid && valid !== storedStudentId) await saveActiveStudentId(valid);
      } else if (me.studentId) {
        setActiveStudentIdState(me.studentId);
      }

      if (!me.mustResetPassword) {
        void registerPushNotifications().catch(() => undefined);
      }
    } catch {
      setToken(null);
      await saveToken(null);
      setUser(null);
      setActiveStudentIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (user?.role === 'PARENT') {
      void refreshChildren();
    }
  }, [user, refreshChildren]);

  const establishSession = useCallback(async (res: { token: string; user: MobileUser }) => {
    setToken(res.token);
    await saveToken(res.token);
    setUser(res.user);

    if (res.user.role === 'PARENT' && res.user.studentIds.length === 1) {
      const id = res.user.studentIds[0];
      setActiveStudentIdState(id);
      await saveActiveStudentId(id);
    } else if (res.user.role === 'STUDENT' && res.user.studentId) {
      setActiveStudentIdState(res.user.studentId);
    }

    if (!res.user.mustResetPassword) {
      void registerPushNotifications().catch(() => undefined);
    }

    return res.user;
  }, []);

  const login = useCallback(async (body: Record<string, unknown>) => {
    const res = await mobileAuth.login({ ...body, app: 'student-parent' });
    return establishSession(res);
  }, [establishSession]);

  const loginWithOtp = useCallback(async (body: Record<string, unknown>) => {
    const res = await mobileAuth.verifyOtp({ ...body, app: 'student-parent' });
    return establishSession(res);
  }, [establishSession]);

  const logout = useCallback(async () => {
    setToken(null);
    await saveToken(null);
    await saveActiveStudentId(null);
    setUser(null);
    setActiveStudentIdState(null);
    setChildrenList([]);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await mobileAuth.changePassword({ currentPassword, newPassword });
    setToken(res.token);
    await saveToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: me } = await mobileAuth.me();
    setUser(me);
  }, []);

  const setActiveStudentId = useCallback(async (id: string) => {
    setActiveStudentIdState(id);
    await saveActiveStudentId(id);
  }, []);

  const studentParams = useMemo(() => {
    if (user?.role === 'PARENT' && activeStudentId) {
      return { studentId: activeStudentId };
    }
    return {};
  }, [user?.role, activeStudentId]);

  const authValue = useMemo(
    () => ({ user, isLoading, login, loginWithOtp, logout, changePassword, refreshUser }),
    [user, isLoading, login, loginWithOtp, logout, changePassword, refreshUser],
  );

  const studentValue = useMemo(
    () => ({
      activeStudentId,
      children: childrenList,
      setActiveStudentId,
      refreshChildren,
      studentParams,
    }),
    [activeStudentId, childrenList, setActiveStudentId, refreshChildren, studentParams],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <StudentContext.Provider value={studentValue}>{children}</StudentContext.Provider>
    </AuthContext.Provider>
  );
}
