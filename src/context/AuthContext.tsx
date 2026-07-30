import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, DEFAULT_SUPER_ADMIN, DEMO_USERS, seedFirestoreIfNeeded, safeSetDoc, safeGetDocs, safeDeleteDoc, upsertUserByEmail } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isGhostMode: boolean;
  originalAdminProfile: UserProfile | null;
  ghostTargetUser: UserProfile | null;
  loginAsUser: (userProfile: UserProfile) => Promise<void>;
  loginWithGoogle: () => Promise<UserProfile | null>;
  loginAsDemoUser: (uid: string) => Promise<void>;
  enterGhostMode: (targetUser: UserProfile) => void;
  exitGhostMode: () => void;
  updateProfileRole: (uid: string, newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Ghost Mode Impersonation State
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null);
  const [ghostTargetUser, setGhostTargetUser] = useState<UserProfile | null>(null);

  const resolveUserProfile = async (fbUser: User): Promise<UserProfile> => {
    const isSuperAdminEmail = fbUser.email?.toLowerCase() === 'thenajmulhuda@gmail.com';
    const userEmail = fbUser.email?.toLowerCase();

    // Query all users to see if pre-registered or existing document exists
    const allUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
    const matchingUsers = allUsers.filter((u) => u.email && u.email.toLowerCase().trim() === userEmail);

    let baseProfile: UserProfile;

    if (matchingUsers.length > 0) {
      const rolePriority: Record<string, number> = { super_admin: 4, principal: 3, teacher: 2, student: 1 };
      matchingUsers.sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
      const bestMatch = matchingUsers[0];

      baseProfile = {
        ...bestMatch,
        uid: fbUser.uid,
        name: fbUser.displayName || bestMatch.name || 'User',
        email: fbUser.email || bestMatch.email,
        role: isSuperAdminEmail ? 'super_admin' : bestMatch.role,
        status: 'active',
        lastLoginAt: new Date().toISOString()
      };
    } else {
      baseProfile = {
        uid: fbUser.uid,
        email: fbUser.email || 'user@example.com',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        role: isSuperAdminEmail ? 'super_admin' : 'student',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }

    const finalProfile = await upsertUserByEmail(baseProfile);
    return finalProfile;
  };

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!isGhostMode) {
        if (firebaseUser) {
          try {
            const loadedProfile = await resolveUserProfile(firebaseUser);
            setProfile(loadedProfile);
            localStorage.setItem('active_user_profile', JSON.stringify(loadedProfile));
          } catch (e) {
            console.error('Error loading user profile:', e);
          }
        } else {
          const explicitLogout = sessionStorage.getItem('explicit_logout');
          const savedActiveUser = localStorage.getItem('active_user_profile');

          if (savedActiveUser && !explicitLogout) {
            try {
              setProfile(JSON.parse(savedActiveUser));
            } catch (e) {
              setProfile(DEFAULT_SUPER_ADMIN);
            }
          } else if (explicitLogout) {
            setProfile(null);
          } else {
            // Default to Super Admin profile on first load
            setProfile(DEFAULT_SUPER_ADMIN);
          }
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login via Firebase Google Auth Popup
  const loginWithGoogle = async (): Promise<UserProfile | null> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const userProfile = await resolveUserProfile(fbUser);

      sessionStorage.removeItem('explicit_logout');
      localStorage.setItem('active_user_profile', JSON.stringify(userProfile));
      setProfile(userProfile);
      setLoading(false);
      return userProfile;
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setLoading(false);
      throw err;
    }
  };

  // Login as any UserProfile (newly created or registered in Firestore)
  const loginAsUser = async (userProfile: UserProfile) => {
    setLoading(true);

    // Enforce super_admin for thenajmulhuda@gmail.com
    if (userProfile.email?.toLowerCase() === 'thenajmulhuda@gmail.com') {
      userProfile.role = 'super_admin';
    }

    try {
      await safeSetDoc('users', userProfile.uid, 'uid', userProfile);
    } catch (e) {
      console.warn('Set user notice:', e);
    }

    sessionStorage.removeItem('explicit_logout');
    localStorage.setItem('active_user_profile', JSON.stringify(userProfile));
    setProfile(userProfile);
    setIsGhostMode(false);
    setOriginalAdminProfile(null);
    setGhostTargetUser(null);
    sessionStorage.removeItem('ghost_admin_profile');
    sessionStorage.removeItem('ghost_target_profile');
    setLoading(false);
  };

  // Login as one of the pre-configured Demo Roles
  const loginAsDemoUser = async (uid: string) => {
    const demo = DEMO_USERS.find((u) => u.uid === uid) || DEMO_USERS[0];
    await loginAsUser(demo);
  };

  // Master Impersonation (Ghost Mode) Engine
  const enterGhostMode = (targetUser: UserProfile) => {
    if (!profile || (profile.role !== 'super_admin' && !originalAdminProfile)) {
      alert('Strict Permission Error: Only Super Admin can enter Ghost Mode!');
      return;
    }

    const currentAdmin = originalAdminProfile || profile;

    setOriginalAdminProfile(currentAdmin);
    setGhostTargetUser(targetUser);
    setProfile(targetUser);
    setIsGhostMode(true);

    sessionStorage.setItem('ghost_admin_profile', JSON.stringify(currentAdmin));
    sessionStorage.setItem('ghost_target_profile', JSON.stringify(targetUser));
  };

  const exitGhostMode = () => {
    if (originalAdminProfile) {
      setProfile(originalAdminProfile);
    }
    setIsGhostMode(false);
    setGhostTargetUser(null);
    setOriginalAdminProfile(null);
    sessionStorage.removeItem('ghost_admin_profile');
    sessionStorage.removeItem('ghost_target_profile');
  };

  const updateProfileRole = async (uid: string, newRole: UserRole) => {
    try {
      if (profile && profile.uid === uid) {
        const updatedProfile = { ...profile, role: newRole };
        await safeSetDoc('users', uid, 'uid', updatedProfile);
        setProfile(updatedProfile);
        localStorage.setItem('active_user_profile', JSON.stringify(updatedProfile));
      } else {
        await safeSetDoc('users', uid, 'uid', { role: newRole });
      }
    } catch (e) {
      console.warn('Failed to update role notice:', e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setIsGhostMode(false);
    setOriginalAdminProfile(null);
    setGhostTargetUser(null);
    sessionStorage.removeItem('ghost_admin_profile');
    sessionStorage.removeItem('ghost_target_profile');
    localStorage.removeItem('active_user_profile');
    sessionStorage.setItem('explicit_logout', 'true');
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGhostMode,
        originalAdminProfile,
        ghostTargetUser,
        loginAsUser,
        loginWithGoogle,
        loginAsDemoUser,
        enterGhostMode,
        exitGhostMode,
        updateProfileRole,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
