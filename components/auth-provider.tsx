'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, googleProvider, db, isConfigured } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile
} from 'firebase/auth';

type User = {
  name: string;
  email: string;
  uid: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (email: string, link: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isConfigured || !auth) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          uid: firebaseUser.uid,
        };
        setUser(userData);

        if (db) {
          try {
            const { doc, getDoc, setDoc } = await import('firebase/firestore');
            const userRef = doc(db, 'users', firebaseUser.uid);
            const existing = await getDoc(userRef);
            const existingData = existing.data();

            if (!existing.exists()
              || existingData?.name !== userData.name
              || existingData?.email !== userData.email) {
              await setDoc(userRef, userData, { merge: true });
            }
          } catch (e) {
            console.error('Failed to save user to Firestore', e);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user && pathname !== '/' && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const loginWithGoogle = async () => {
    if (!isConfigured || !auth || !googleProvider) {
      alert('Firebase is not configured. Please set up your environment variables in AI Studio.');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const sendMagicLink = async (email: string) => {
    if (!isConfigured || !auth) {
      alert('Firebase is not configured. Please set up your environment variables in AI Studio.');
      return;
    }
    const actionCodeSettings = {
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };

  const verifyMagicLink = useCallback(async (email: string, link: string) => {
    if (!isConfigured || !auth) return false;
    if (isSignInWithEmailLink(auth, link)) {
      const result = await signInWithEmailLink(auth, email, link);
      window.localStorage.removeItem('emailForSignIn');

      const savedName = window.localStorage.getItem('nameForSignUp');
      if (savedName && result.user) {
        await updateProfile(result.user, { displayName: savedName });
        window.localStorage.removeItem('nameForSignUp');
        setUser(prev => prev ? { ...prev, name: savedName } : null);
      }

      router.push('/');
      return true;
    }
    return false;
  }, [router]);

  const logout = async () => {
    if (!isConfigured || !auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, loginWithGoogle, sendMagicLink, verifyMagicLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
