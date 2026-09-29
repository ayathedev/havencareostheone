// Haven OS Local Authentication Vault & Session Manager
// Provides guaranteed, fail-safe user account management without external network dependencies.

export interface HavenUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isLocal: boolean;
  role?: string;
  organization?: string;
  phone?: string;
  completedSetup?: boolean;
}

export interface LocalAccountRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  organization: string;
  password: string;
  createdAt: string;
  avatarColor: string;
  completedSetup: boolean;
}

const STORAGE_ACCOUNTS_KEY = 'haven_local_accounts_v1';
const STORAGE_CURRENT_USER_KEY = 'haven_active_session_v1';

export const DEFAULT_LOCAL_ACCOUNTS: LocalAccountRecord[] = [
  {
    id: 'local_aya',
    email: 'aya@havenos.local',
    name: 'Aya Kalimah Satya Ruane',
    role: 'Executive Director & Lead Clinician',
    organization: 'Haven Care Sanctuary',
    password: 'haven',
    createdAt: new Date().toISOString(),
    avatarColor: '#14b8a6', // Teal
    completedSetup: true
  },
  {
    id: 'local_admin',
    email: 'admin@havenos.local',
    name: 'System Administrator',
    role: 'Lead Systems Architect',
    organization: 'Haven Care OS Administration',
    password: 'admin',
    createdAt: new Date().toISOString(),
    avatarColor: '#6366f1', // Indigo
    completedSetup: true
  },
  {
    id: 'local_elena',
    email: 'caseworker@havenos.local',
    name: 'Elena Ramos, LCSW',
    role: 'Senior Case Manager',
    organization: 'Sanctuary Stabilization Services',
    password: 'haven',
    createdAt: new Date().toISOString(),
    avatarColor: '#f59e0b', // Amber
    completedSetup: false // Needs setup wizard so user can experience it!
  }
];

export function getLocalAccounts(): LocalAccountRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(DEFAULT_LOCAL_ACCOUNTS));
      return DEFAULT_LOCAL_ACCOUNTS;
    }
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(DEFAULT_LOCAL_ACCOUNTS));
      return DEFAULT_LOCAL_ACCOUNTS;
    }
    return accounts;
  } catch (e) {
    console.warn("Failed to load local accounts, using defaults:", e);
    return DEFAULT_LOCAL_ACCOUNTS;
  }
}

export function saveLocalAccounts(accounts: LocalAccountRecord[]): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent('haven_accounts_change', { detail: accounts }));
  } catch (e) {
    console.error("Failed to save local accounts to storage:", e);
  }
}

export function createLocalAccount(params: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  organization?: string;
  launchSetupWizard?: boolean;
}): HavenUser {
  const accounts = getLocalAccounts();
  const cleanEmail = params.email.trim().toLowerCase();
  
  // Check if exists
  const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    // If it exists, update it or switch to it
    const user: HavenUser = {
      uid: existing.id,
      email: existing.email,
      displayName: existing.name,
      isLocal: true,
      role: existing.role,
      organization: existing.organization,
      completedSetup: existing.completedSetup
    };
    setCurrentUser(user);
    return user;
  }

  const colors = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const id = `local_user_${Date.now()}`;
  const willRunWizard = params.launchSetupWizard !== false;

  const newAccount: LocalAccountRecord = {
    id,
    email: cleanEmail,
    name: params.name.trim() || 'Haven Clinician',
    role: params.role?.trim() || 'Case Manager',
    organization: params.organization?.trim() || 'Haven Care Sanctuary',
    password: params.password || 'haven123',
    createdAt: new Date().toISOString(),
    avatarColor,
    completedSetup: !willRunWizard
  };

  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const newUser: HavenUser = {
    uid: id,
    email: newAccount.email,
    displayName: newAccount.name,
    isLocal: true,
    role: newAccount.role,
    organization: newAccount.organization,
    completedSetup: newAccount.completedSetup
  };

  setCurrentUser(newUser);
  return newUser;
}

export function loginLocalAccount(emailOrId: string, password?: string): HavenUser {
  const accounts = getLocalAccounts();
  const query = emailOrId.trim().toLowerCase();
  
  const found = accounts.find(
    a => a.email.toLowerCase() === query || a.id.toLowerCase() === query || a.name.toLowerCase() === query
  );

  if (!found) {
    // Auto-create account if not found so user NEVER gets blocked!
    return createLocalAccount({
      name: emailOrId.split('@')[0] || 'Clinician',
      email: emailOrId.includes('@') ? emailOrId : `${emailOrId}@havenos.local`,
      password: password || 'haven123',
      launchSetupWizard: true
    });
  }

  const user: HavenUser = {
    uid: found.id,
    email: found.email,
    displayName: found.name,
    isLocal: true,
    role: found.role,
    organization: found.organization,
    completedSetup: found.completedSetup
  };

  setCurrentUser(user);
  return user;
}

export function loginGuest(role = 'Guest Clinician'): HavenUser {
  const id = `local_guest_${Date.now().toString(36)}`;
  const guestUser: HavenUser = {
    uid: id,
    email: 'guest@havenos.local',
    displayName: 'Guest Clinician (Offline)',
    isLocal: true,
    role,
    organization: 'Haven Emergency Sanctuary',
    completedSetup: true // Guests bypass setup for instantaneous zero-delay access!
  };

  setCurrentUser(guestUser);
  return guestUser;
}

export function getCurrentUser(): HavenUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user: HavenUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('haven_auth_change', { detail: user }));
  } catch (e) {
    console.error("Failed to update active session:", e);
  }
}

export function markUserSetupComplete(uid: string): void {
  const accounts = getLocalAccounts();
  const idx = accounts.findIndex(a => a.id === uid);
  if (idx !== -1) {
    accounts[idx].completedSetup = true;
    saveLocalAccounts(accounts);
  }
  const current = getCurrentUser();
  if (current && current.uid === uid) {
    current.completedSetup = true;
    setCurrentUser(current);
  }
}

export function clearUserSession(): void {
  setCurrentUser(null);
}
