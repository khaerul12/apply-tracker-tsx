import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isTrialValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isAdminEmail = firebaseUser.email === 'khaerulusman68@gmail.com';
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          // If it's the admin email but role is not admin, update it
          if (isAdminEmail && data.role !== 'admin') {
            const updatedProfile = { ...data, role: 'admin' as const };
            await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile, { merge: true });
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          // Create new profile with 7-day trial
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 7);
          
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: isAdminEmail ? 'admin' : 'user',
            createdAt: Timestamp.now(),
            trialEndsAt: Timestamp.fromDate(trialEndsAt),
            isSubscribed: isAdminEmail, // Admins are subscribed by default
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === 'auth/user-not-found') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw new Error(authError.message || 'Unable to sign in with email');
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isTrialValid = profile ? profile.trialEndsAt.toDate() > new Date() || profile.isSubscribed === true : false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, logout, isTrialValid }}>
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
