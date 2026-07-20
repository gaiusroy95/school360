import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { isDemoVersion } from '../lib/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USER = {
  uid: 'demo-super-admin',
  email: 'demo@360schoolerp.com',
  displayName: 'Demo Super Admin',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  phoneNumber: null,
  providerId: 'demo',
  delete: async () => {},
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({}) as never,
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoVersion) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDocFromServer } = await import('firebase/firestore');
      const { auth, db } = await import('../lib/firebase');

      if (!auth || !db) {
        setLoading(false);
        return;
      }

      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }

      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    })();

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isDemoVersion) {
      setUser(DEMO_USER);
      return;
    }

    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const { auth } = await import('../lib/firebase');
    if (!auth) return;

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const logout = async () => {
    if (isDemoVersion) {
      // Stay signed in as demo user so the UI remains usable without a backend.
      setUser(DEMO_USER);
      return;
    }

    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../lib/firebase');
    if (!auth) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: isDemoVersion, signInWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
