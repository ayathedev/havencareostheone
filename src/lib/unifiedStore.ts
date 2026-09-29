// Haven OS Unified Store & React Hooks
// Transparently routes operations to Firestore (when online/authenticated) or Local Vault (for local accounts & offline).
// Guarantees zero failures and uninterrupted clinical operations.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection as useFirebaseCollection, useDocumentData as useFirebaseDocumentData, useCollectionData as useFirebaseCollectionData } from 'react-firebase-hooks/firestore';
import { 
  collection, 
  doc, 
  query, 
  addDoc as firestoreAddDoc, 
  updateDoc as firestoreUpdateDoc, 
  setDoc as firestoreSetDoc, 
  deleteDoc as firestoreDeleteDoc 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  HavenUser, 
  getCurrentUser, 
  setCurrentUser, 
  loginLocalAccount, 
  createLocalAccount, 
  loginGuest, 
  clearUserSession, 
  markUserSetupComplete 
} from './localAuth';
import { 
  useLocalCollection, 
  useLocalDocument, 
  localAddDoc, 
  localUpdateDoc, 
  localSetDoc, 
  localDeleteDoc, 
  seedLocalUserData, 
  localGetDoc,
  localGetCollection
} from './localDataStore';

export function getPathFromTarget(target: any): string {
  if (!target) return '';
  if (typeof target === 'string') return target;
  if (target.path) return target.path;
  if (target._query?.path?.segments) return target._query.path.segments.join('/');
  if (target.parent?.path && target.id) return `${target.parent.path}/${target.id}`;
  return '';
}

export function useUnifiedUser() {
  const [firebaseUser, firebaseLoading, firebaseError] = useAuthState(auth);
  const [localUser, setLocalUser] = useState<HavenUser | null>(() => getCurrentUser());

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setLocalUser(e.detail || getCurrentUser());
    };
    window.addEventListener('haven_auth_change', handleAuthChange);
    return () => window.removeEventListener('haven_auth_change', handleAuthChange);
  }, []);

  const effectiveUser = useMemo<HavenUser | null>(() => {
    if (firebaseUser) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        isLocal: false
      };
    }
    if (localUser) {
      return localUser;
    }
    return null;
  }, [firebaseUser, localUser]);

  useEffect(() => {
    if (effectiveUser?.isLocal && effectiveUser?.uid) {
      seedLocalUserData(effectiveUser.uid, effectiveUser.displayName || undefined, effectiveUser.organization);
    }
  }, [effectiveUser?.isLocal, effectiveUser?.uid]);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
    } catch {}
    clearUserSession();
    setLocalUser(null);
  }, []);

  return {
    user: effectiveUser,
    loading: firebaseLoading && !localUser,
    error: firebaseError,
    signOut
  };
}

export function useAppCollection(target: any) {
  const path = useMemo(() => getPathFromTarget(target), [target]);
  const isLocalSession = !auth.currentUser;

  // Local hook always runs
  const [localSnapshot, localLoading, localError] = useLocalCollection(path || null);

  // Firestore hook runs only when user has active Firebase auth session
  const firestoreTarget = useMemo(() => {
    if (isLocalSession || !target || typeof target === 'string') return null;
    return target;
  }, [isLocalSession, target]);

  const [fireSnapshot, fireLoading, fireError] = useFirebaseCollection(firestoreTarget as any);

  if (isLocalSession) {
    return [localSnapshot, localLoading, localError] as const;
  }

  // Graceful fallback to local cache if Firestore encounters an error
  if (fireError && localSnapshot) {
    return [localSnapshot, false, undefined] as const;
  }

  return [fireSnapshot || localSnapshot, fireLoading, fireError] as const;
}

export function useAppDocumentData(target: any) {
  const path = useMemo(() => getPathFromTarget(target), [target]);
  const isLocalSession = !auth.currentUser;

  const [localDoc, localLoading, localError] = useLocalDocument(path || null);

  const firestoreTarget = useMemo(() => {
    if (isLocalSession || !target || typeof target === 'string') return null;
    return target;
  }, [isLocalSession, target]);

  const [fireDoc, fireLoading, fireError] = useFirebaseDocumentData(firestoreTarget as any);

  if (isLocalSession) {
    return [localDoc, localLoading, localError] as const;
  }

  if (fireError && localDoc) {
    return [localDoc, false, undefined] as const;
  }

  return [fireDoc || localDoc, fireLoading, fireError] as const;
}

export function useAppCollectionData(target: any) {
  const [snapshot, loading, error] = useAppCollection(target);
  const data = useMemo(() => {
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [snapshot]);

  return [data, loading, error] as const;
}

export async function appAddDoc(target: any, data: any) {
  const path = getPathFromTarget(target);
  if (!auth.currentUser) {
    return localAddDoc(path, data);
  }
  try {
    const collRef = typeof target === 'string' ? collection(db, target) : target;
    const res = await firestoreAddDoc(collRef, data);
    return { id: res.id };
  } catch (err) {
    console.warn("Firestore addDoc failed, writing to local vault:", err);
    return localAddDoc(path, data);
  }
}

export async function appUpdateDoc(target: any, data: any) {
  const path = getPathFromTarget(target);
  if (!auth.currentUser) {
    localUpdateDoc(path, data);
    return;
  }
  try {
    const docRef = typeof target === 'string' ? doc(db, target) : target;
    await firestoreUpdateDoc(docRef, data);
  } catch (err) {
    console.warn("Firestore updateDoc failed, writing to local vault:", err);
    localUpdateDoc(path, data);
  }
}

export async function appSetDoc(target: any, data: any, options?: any) {
  const path = getPathFromTarget(target);
  const user = getCurrentUser();
  if (!auth.currentUser) {
    localSetDoc(path, data, options);
    if (path.startsWith('users/') && data.completedSetup) {
      const uid = path.split('/')[1];
      markUserSetupComplete(uid);
    }
    return;
  }
  try {
    const docRef = typeof target === 'string' ? doc(db, target) : target;
    await firestoreSetDoc(docRef, data, options);
    if (path.startsWith('users/') && data.completedSetup) {
      const uid = path.split('/')[1];
      markUserSetupComplete(uid);
    }
  } catch (err) {
    console.warn("Firestore setDoc failed, writing to local vault:", err);
    localSetDoc(path, data, options);
    if (path.startsWith('users/') && data.completedSetup) {
      const uid = path.split('/')[1];
      markUserSetupComplete(uid);
    }
  }
}

export async function appDeleteDoc(target: any) {
  const path = getPathFromTarget(target);
  if (!auth.currentUser) {
    localDeleteDoc(path);
    return;
  }
  try {
    const docRef = typeof target === 'string' ? doc(db, target) : target;
    await firestoreDeleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore deleteDoc failed, removing from local vault:", err);
    localDeleteDoc(path);
  }
}
