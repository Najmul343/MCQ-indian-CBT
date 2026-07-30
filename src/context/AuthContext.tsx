import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
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

const logAuthDiagnostic = (
  stage: string,
  userProfile: UserProfile | null,
  extra?: Record<string, any>
) => {
  console.groupCollapsed(`🔍 [AuthContext Diagnostic] - ${stage}`);
  if (userProfile) {
    console.info('👤 User ID (UID):', userProfile.uid);
    console.info('📧 Email:', userProfile.email);
    console.info('🏷️ Verified Role:', userProfile.role);
    console.info('🏫 Tenant ID:', userProfile.tenant_id || '(Global)');
    console.info('🏢 Tenant Name:', userProfile.tenant_name || '(Unassigned)');
    console.info('⚡ Account Status:', userProfile.status || 'active');
    if (userProfile.trade) console.info('⚙️ Trade:', userProfile.trade);
    if (userProfile.rollNo) console.info('🆔 Roll No:', userProfile.rollNo);
  } else {
    console.info('👤 User Profile: Unauthenticated / Null');
  }
  if (extra) {
    console.info('📋 Diagnostic Context:', extra);
  }
  console.groupEnd();
};

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
    const userEmail = fbUser.email?.toLowerCase().trim();

    // Query all users from Firestore to verify pre-registered role or existing document
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
        role: isSuperAdminEmail ? 'super_admin' : (bestMatch.role || 'student'),
        tenant_id: bestMatch.tenant_id,
        tenant_name: bestMatch.tenant_name,
        status: bestMatch.status || 'active',
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
    logAuthDiagnostic('Resolved User Profile From Firestore/Auth', finalProfile, {
      matchingDocumentsCount: matchingUsers.length,
      isSuperAdminOverride: isSuperAdminEmail
    });

    return finalProfile;
  };

  useEffect(() => {
    // 1. Check if Ghost Mode was active before page reload
    const savedGhostAdmin = sessionStorage.getItem('ghost_admin_profile');
    const savedGhostTarget = sessionStorage.getItem('ghost_target_profile');

    if (savedGhostAdmin && savedGhostTarget) {
      try {
        const adminP = JSON.parse(savedGhostAdmin);
        const targetP = JSON.parse(savedGhostTarget);
        setOriginalAdminProfile(adminP);
        setGhostTargetUser(targetP);
        setProfile(targetP);
        setIsGhostMode(true);
        logAuthDiagnostic('Restored Active Ghost Mode Session', targetP, { impersonatedBy: adminP.email });
      } catch (e) {
        sessionStorage.removeItem('ghost_admin_profile');
        sessionStorage.removeItem('ghost_target_profile');
      }
    }

    // 2. Catch Google Auth Redirect Result if returning from OAuth redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const loadedProfile = await resolveUserProfile(result.user);
          sessionStorage.removeItem('explicit_logout');
          sessionStorage.setItem('active_user_profile', JSON.stringify(loadedProfile));
          localStorage.setItem('active_user_profile', JSON.stringify(loadedProfile));
          setProfile(loadedProfile);
          logAuthDiagnostic('Redirect Auth Login Succeeded', loadedProfile);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result check:', err);
      });

    // 3. Firebase Auth Listener & Firestore Session Persistence
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Only update profile if NOT currently in Ghost Mode
      if (!sessionStorage.getItem('ghost_admin_profile')) {
        if (firebaseUser) {
          try {
            const loadedProfile = await resolveUserProfile(firebaseUser);
            setProfile(loadedProfile);
            sessionStorage.removeItem('explicit_logout');
            sessionStorage.setItem('active_user_profile', JSON.stringify(loadedProfile));
            localStorage.setItem('active_user_profile', JSON.stringify(loadedProfile));
            logAuthDiagnostic('Firebase Listener Verified Authenticated State', loadedProfile);
          } catch (e) {
            console.error('Error loading user profile:', e);
          }
        } else {
          const explicitLogout = sessionStorage.getItem('explicit_logout');
          const sessionActiveUser = sessionStorage.getItem('active_user_profile') || localStorage.getItem('active_user_profile');

          if (explicitLogout === 'true') {
            setProfile(null);
            logAuthDiagnostic('Explicit Logout Flag Present - Login Required', null);
          } else if (sessionActiveUser) {
            try {
              const parsedCached = JSON.parse(sessionActiveUser);
              // Set cached profile immediately for fast UI rendering
              setProfile(parsedCached);
              logAuthDiagnostic('Restored Local Cached Session', parsedCached);

              // Asynchronously verify with Firestore to fetch latest authoritative role/tenant metadata
              safeGetDocs<UserProfile>('users', DEMO_USERS)
                .then((allDbUsers) => {
                  const dbMatch = allDbUsers.find(
                    (u) =>
                      u.uid === parsedCached.uid ||
                      (u.email && u.email.toLowerCase() === parsedCached.email?.toLowerCase())
                  );

                  if (dbMatch) {
                    const verifiedProfile: UserProfile = {
                      ...parsedCached,
                      ...dbMatch,
                      role: parsedCached.email?.toLowerCase() === 'thenajmulhuda@gmail.com' ? 'super_admin' : (dbMatch.role || parsedCached.role || 'student')
                    };
                    setProfile(verifiedProfile);
                    sessionStorage.setItem('active_user_profile', JSON.stringify(verifiedProfile));
                    localStorage.setItem('active_user_profile', JSON.stringify(verifiedProfile));
                    logAuthDiagnostic('Firestore Persistence Verification Complete', verifiedProfile);
                  }
                })
                .catch((err) => {
                  console.warn('Firestore session verification notice:', err);
                });
            } catch (e) {
              setProfile(null);
            }
          } else {
            // Fresh launch / unauthenticated: Default to clean Login Screen
            setProfile(null);
            logAuthDiagnostic('No Active Session Found - Initialized to Login Screen', null);
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
    sessionStorage.removeItem('explicit_logout');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const userProfile = await resolveUserProfile(result.user);

        sessionStorage.setItem('active_user_profile', JSON.stringify(userProfile));
        localStorage.setItem('active_user_profile', JSON.stringify(userProfile));

        setIsGhostMode(false);
        setOriginalAdminProfile(null);
        setGhostTargetUser(null);
        sessionStorage.removeItem('ghost_admin_profile');
        sessionStorage.removeItem('ghost_target_profile');

        setProfile(userProfile);
        setLoading(false);
        return userProfile;
      }
    } catch (popupErr: any) {
      console.warn('Google Popup login notice:', popupErr?.message || popupErr);
      setLoading(false);
      throw popupErr;
    }

    setLoading(false);
    return null;
  };

  // Login as any UserProfile (instant UI update + background Firestore sync)
  const loginAsUser = async (userProfile: UserProfile) => {
    // Enforce super_admin for thenajmulhuda@gmail.com
    if (userProfile.email?.toLowerCase() === 'thenajmulhuda@gmail.com') {
      userProfile.role = 'super_admin';
    }

    // 1. Instant UI & Session Update
    sessionStorage.removeItem('explicit_logout');
    sessionStorage.setItem('active_user_profile', JSON.stringify(userProfile));
    localStorage.setItem('active_user_profile', JSON.stringify(userProfile));
    
    setProfile(userProfile);
    setIsGhostMode(false);
    setOriginalAdminProfile(null);
    setGhostTargetUser(null);
    sessionStorage.removeItem('ghost_admin_profile');
    sessionStorage.removeItem('ghost_target_profile');
    setLoading(false);

    logAuthDiagnostic('Direct / Custom User Sign-In', userProfile, {
      method: 'loginAsUser',
      assignedRole: userProfile.role,
      tenantId: userProfile.tenant_id || 'Global'
    });

    // 2. Background Firestore Sync (non-blocking)
    safeSetDoc('users', userProfile.uid, 'uid', userProfile).catch((e) => {
      console.warn('Background user sync notice:', e);
    });
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

    logAuthDiagnostic('Entered Ghost Mode Impersonation', targetUser, {
      impersonatedBy: currentAdmin.email,
      targetRole: targetUser.role
    });
  };

  const exitGhostMode = () => {
    if (originalAdminProfile) {
      setProfile(originalAdminProfile);
      logAuthDiagnostic('Exited Ghost Mode - Restored Super Admin Session', originalAdminProfile);
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
        logAuthDiagnostic('Updated Profile Role', updatedProfile);
      } else {
        await safeSetDoc('users', uid, 'uid', { role: newRole });
      }
    } catch (e) {
      console.warn('Failed to update role notice:', e);
    }
  };

  const logout = async () => {
    logAuthDiagnostic('User Signed Out', null, { previousEmail: profile?.email });
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
    sessionStorage.removeItem('active_user_profile');
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
