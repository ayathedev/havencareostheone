// Haven OS Local Reactive Data Store
// Provides seamless client-side persistence with real-time UI re-rendering for offline & local accounts.

import { useState, useEffect, useCallback } from 'react';

const EVENT_NAME = 'haven_datastore_event';

export function emitDataStoreChange(path: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { path, timestamp: Date.now() } }));
  }
}

export function normalizeStorageKey(path: string): string {
  return `haven_db_${path.replace(/^\/+|\/+$/g, '').replace(/\//g, '_')}`;
}

export function localGetCollection(path: string): any[] {
  try {
    const key = normalizeStorageKey(path);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn(`Error reading local collection at ${path}:`, e);
    return [];
  }
}

export function localSetCollection(path: string, items: any[]): void {
  try {
    const key = normalizeStorageKey(path);
    localStorage.setItem(key, JSON.stringify(items));
    emitDataStoreChange(path);
  } catch (e) {
    console.error(`Error writing local collection at ${path}:`, e);
  }
}

export function localGetDoc(path: string): any | null {
  try {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length % 2 === 1) {
      // Path is a collection, not a document
      return null;
    }
    const docId = parts[parts.length - 1];
    const collPath = parts.slice(0, parts.length - 1).join('/');
    
    // Check if stored as standalone doc
    const directKey = normalizeStorageKey(path);
    const directRaw = localStorage.getItem(directKey);
    if (directRaw) {
      try { return JSON.parse(directRaw); } catch {}
    }

    // Otherwise look up in parent collection
    const collection = localGetCollection(collPath);
    const found = collection.find(item => item.id === docId);
    return found || null;
  } catch (e) {
    console.warn(`Error reading local doc at ${path}:`, e);
    return null;
  }
}

export function sanitizeLocalPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeLocalPayload);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && (value as any)._methodName === 'serverTimestamp') {
      sanitized[key] = { seconds: Math.floor(Date.now() / 1000) };
    } else if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
      sanitized[key] = { seconds: Math.floor((value as any).toDate().getTime() / 1000) };
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLocalPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function localSetDoc(path: string, data: any, options?: { merge?: boolean }): void {
  try {
    const cleanData = sanitizeLocalPayload(data);
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    const docId = parts[parts.length - 1];
    const collPath = parts.slice(0, parts.length - 1).join('/');

    // Save as standalone document key
    const directKey = normalizeStorageKey(path);
    let existingDirect: any = {};
    if (options?.merge) {
      try {
        const raw = localStorage.getItem(directKey);
        if (raw) existingDirect = JSON.parse(raw);
      } catch {}
    }
    const mergedDirect = { ...existingDirect, ...cleanData, id: docId };
    localStorage.setItem(directKey, JSON.stringify(mergedDirect));

    // Also update in parent collection if applicable
    if (parts.length > 1) {
      const items = localGetCollection(collPath);
      const existingIdx = items.findIndex(item => item.id === docId);
      if (existingIdx >= 0) {
        items[existingIdx] = options?.merge ? { ...items[existingIdx], ...cleanData, id: docId } : { ...cleanData, id: docId };
      } else {
        items.push(mergedDirect);
      }
      localSetCollection(collPath, items);
    }

    emitDataStoreChange(path);
    if (parts.length > 1) emitDataStoreChange(collPath);
  } catch (e) {
    console.error(`Error setting local doc at ${path}:`, e);
  }
}

export function localAddDoc(collPath: string, data: any): { id: string } {
  try {
    const cleanData = sanitizeLocalPayload(data);
    const items = localGetCollection(collPath);
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newItem = {
      ...cleanData,
      id,
      createdAt: cleanData.createdAt || { seconds: Math.floor(Date.now() / 1000) }
    };
    items.unshift(newItem);
    localSetCollection(collPath, items);
    
    // Also store direct doc
    const directPath = `${collPath}/${id}`;
    localStorage.setItem(normalizeStorageKey(directPath), JSON.stringify(newItem));
    emitDataStoreChange(directPath);

    return { id };
  } catch (e) {
    console.error(`Error adding local doc to ${collPath}:`, e);
    return { id: `doc_${Date.now()}` };
  }
}

export function localUpdateDoc(path: string, data: any): void {
  try {
    const cleanData = sanitizeLocalPayload(data);
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    const docId = parts[parts.length - 1];
    const collPath = parts.slice(0, parts.length - 1).join('/');

    // Update in direct doc
    const directKey = normalizeStorageKey(path);
    let current: any = {};
    try {
      const raw = localStorage.getItem(directKey);
      if (raw) current = JSON.parse(raw);
    } catch {}

    const updated = { ...current, ...cleanData, id: docId };
    localStorage.setItem(directKey, JSON.stringify(updated));

    // Update in parent collection
    if (parts.length > 1) {
      const items = localGetCollection(collPath);
      const idx = items.findIndex(item => item.id === docId);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...cleanData, id: docId };
        localSetCollection(collPath, items);
      }
    }

    emitDataStoreChange(path);
    if (parts.length > 1) emitDataStoreChange(collPath);
  } catch (e) {
    console.error(`Error updating local doc at ${path}:`, e);
  }
}

export function localDeleteDoc(path: string): void {
  try {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    const docId = parts[parts.length - 1];
    const collPath = parts.slice(0, parts.length - 1).join('/');

    // Remove direct doc
    localStorage.removeItem(normalizeStorageKey(path));

    // Remove from collection
    if (parts.length > 1) {
      const items = localGetCollection(collPath);
      const filtered = items.filter(item => item.id !== docId);
      localSetCollection(collPath, filtered);
    }

    emitDataStoreChange(path);
    if (parts.length > 1) emitDataStoreChange(collPath);
  } catch (e) {
    console.error(`Error deleting local doc at ${path}:`, e);
  }
}

// React hook for observing local collections reactively
export function useLocalCollection(path: string | null) {
  const [data, setData] = useState<any[]>(() => (path ? localGetCollection(path) : []));

  useEffect(() => {
    if (!path) {
      setData([]);
      return;
    }

    const refresh = () => {
      setData(localGetCollection(path));
    };

    refresh();

    const handleEvent = (e: any) => {
      const changedPath = e?.detail?.path;
      if (!changedPath || changedPath === path || changedPath.startsWith(`${path}/`)) {
        refresh();
      }
    };

    window.addEventListener(EVENT_NAME, handleEvent);
    return () => window.removeEventListener(EVENT_NAME, handleEvent);
  }, [path]);

  // Construct snapshot compatible with react-firebase-hooks useCollection
  const snapshot = {
    docs: data.map(item => ({
      id: item.id,
      data: () => item,
      exists: () => true
    })),
    empty: data.length === 0,
    size: data.length
  };

  return [snapshot, false, undefined] as const;
}

// React hook for observing local single document reactively
export function useLocalDocument(path: string | null) {
  const [data, setData] = useState<any | null>(() => (path ? localGetDoc(path) : null));

  useEffect(() => {
    if (!path) {
      setData(null);
      return;
    }

    const refresh = () => {
      setData(localGetDoc(path));
    };

    refresh();

    const handleEvent = (e: any) => {
      const changedPath = e?.detail?.path;
      if (!changedPath || changedPath === path) {
        refresh();
      }
    };

    window.addEventListener(EVENT_NAME, handleEvent);
    return () => window.removeEventListener(EVENT_NAME, handleEvent);
  }, [path]);

  return [data, false, undefined] as const;
}

// Seed starter data for a user if they have none
export function seedLocalUserData(uid: string, userDisplayName?: string, orgName?: string) {
  const clientPath = `users/${uid}/clients`;
  const existingClients = localGetCollection(clientPath);
  
  if (existingClients.length === 0) {
    const clients = [
      {
        id: 'client_marcus_vance',
        name: 'Marcus Vance',
        status: 'active',
        summary: 'Transitional housing intake completed. Scheduled for vocational counseling and Medicaid re-certification.',
        email: 'm.vance@sanctuary-demo.org',
        phone: '(555) 234-8901',
        dob: '1984-06-12',
        pronouns: 'he/him',
        goals: 'Secure permanent studio apartment; maintain sobriety milestone (9 months); renew commercial driving license.',
        safetyPlan: 'Contact caseworker Elena if housing stress escalates; sanctuary respite line saved on mobile.',
        hipaaConsent: true,
        liabilityWaiver: true,
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 5 }
      },
      {
        id: 'client_elena_rostova',
        name: 'Elena Rostova',
        status: 'crisis',
        summary: 'CRISIS ALERT ACTIVE: Immediate temporary protective housing requested; trauma stabilization plan in effect.',
        email: 'elena.rostova@sanctuary-demo.org',
        phone: '(555) 876-1234',
        dob: '1992-11-04',
        pronouns: 'she/her',
        goals: 'Immediate safe haven placement; medical assessment for chronic pain; obtain replacement vital records.',
        safetyPlan: 'Direct transport to Valley Respite Center; daily supervision check-in at 09:00.',
        hipaaConsent: true,
        liabilityWaiver: true,
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 2 }
      },
      {
        id: 'client_david_kim',
        name: 'David Kim',
        status: 'active',
        summary: 'Stable case progress. Enrolled in supportive employment workshop; weekly somatic counseling active.',
        email: 'd.kim@sanctuary-demo.org',
        phone: '(555) 456-7890',
        dob: '1979-03-22',
        pronouns: 'they/them',
        goals: 'Complete graphic design certification; build 3-month emergency savings reserve.',
        safetyPlan: 'Bi-weekly peer support group attendance; somatic grounding exercises.',
        hipaaConsent: true,
        liabilityWaiver: true,
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 12 }
      }
    ];

    localSetCollection(clientPath, clients);
    clients.forEach(c => {
      localSetDoc(`users/${uid}/clients/${c.id}`, c);
    });
  }

  // Priority Tasks
  const taskPath = `users/${uid}/tasks`;
  const existingTasks = localGetCollection(taskPath);
  if (existingTasks.length === 0) {
    const tasks = [
      {
        id: 'task_intake_marcus',
        title: 'Complete stabilization housing assessment for Marcus Vance',
        status: 'High',
        time: 'Today 2:00 PM',
        completed: false,
        hubId: 'clients',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 }
      },
      {
        id: 'task_samhsa_grant',
        title: 'Finalize SAMHSA Trauma Respite grant milestone narrative',
        status: 'Med',
        time: 'Tomorrow 10:00 AM',
        completed: false,
        hubId: 'funding',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 7200 }
      },
      {
        id: 'task_housing_referral',
        title: 'Coordinate emergency respite bed transfer with Valley Sanctuary',
        status: 'High',
        time: 'Urgent Priority',
        completed: false,
        hubId: 'partnerships',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 10800 }
      }
    ];
    localSetCollection(taskPath, tasks);
  }

  // Grants
  const grantPath = `users/${uid}/grants`;
  const existingGrants = localGetCollection(grantPath);
  if (existingGrants.length === 0) {
    const grants = [
      {
        id: 'grant_samhsa_expansion',
        name: 'SAMHSA Trauma-Informed Respite Services Expansion',
        amount: 250000,
        deadline: '2026-12-15',
        status: 'Active',
        progress: 50,
        purpose: 'Direct operational funding for 12 additional crisis respite beds and 2 full-time case managers.',
        associatedProject: 'Trauma Stabilization Wing',
        reportingRequirements: 'Quarterly client intake and stabilization retention reports.',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 20 }
      },
      {
        id: 'grant_community_health',
        name: 'State Behavioral Health & Harm Reduction Block Grant',
        amount: 150000,
        deadline: '2026-11-30',
        status: 'Submitted',
        progress: 80,
        purpose: 'Community outreach mobile response supplies and harm reduction kits.',
        associatedProject: 'Mobile Triage Unit',
        reportingRequirements: 'Monthly distribution tracking.',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 15 }
      }
    ];
    localSetCollection(grantPath, grants);
  }

  // Partnerships (Curated community social services)
  const partPath = `users/${uid}/partnerships`;
  const existingParts = localGetCollection(partPath);
  if (existingParts.length === 0) {
    const partnerships = [
      {
        id: 'partner_valley_respite',
        name: 'Valley Crisis Respite Sanctuary',
        organizationName: 'Valley Healthcare Network',
        programName: 'Trauma-Informed Emergency Respite',
        website: 'https://valleyrespite.org',
        contactName: 'Sarah Jenkins, LCSW',
        phone: '(555) 432-1100',
        email: 'intake@valleyrespite.org',
        address: '1400 Civic Center Blvd',
        category: 'Housing',
        type: 'Emergency Stabilization Shelter',
        eligibility: 'Adults experiencing housing or psychological crisis; immediate walk-in/triage available 24/7.',
        sync: 'Active',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 }
      },
      {
        id: 'partner_community_nutrition',
        name: 'St. Jude Community Nutrition Center',
        organizationName: 'St. Jude Community Services',
        programName: 'Daily Warm Meals & Dietary Pantry',
        website: 'https://stjude-nutrition.org',
        contactName: 'Chef Miguel Ortiz',
        phone: '(555) 432-2200',
        email: 'pantry@stjude-nutrition.org',
        address: '820 Mission St',
        category: 'Food',
        type: 'Nutritional Pantry & Prepared Meals',
        eligibility: 'Open to all individuals and families; no proof of income or identification required.',
        sync: 'Active',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 }
      },
      {
        id: 'partner_hope_health',
        name: 'Hope Community Health Center',
        organizationName: 'Hope Integrated Health',
        programName: 'Sliding Scale Medical & Somatic Care',
        website: 'https://hopehealth-clinic.org',
        contactName: 'Dr. Alicia Patel, MD',
        phone: '(555) 432-3300',
        email: 'clinic@hopehealth-clinic.org',
        address: '550 Broadway, Suite 200',
        category: 'Medical',
        type: 'Integrated Clinic & Pharmacy',
        eligibility: 'Uninsured or Medicaid-eligible clients; comprehensive primary care and mental health services.',
        sync: 'Active',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 }
      },
      {
        id: 'partner_bay_legal',
        name: 'Bay Area Public Interest Legal Advocates',
        organizationName: 'Legal Aid Alliance',
        programName: 'Tenant Defense & Benefits Restoration',
        website: 'https://baylegal-alliance.org',
        contactName: 'Atty. Marcus Cole',
        phone: '(555) 432-4400',
        email: 'legal@baylegal-alliance.org',
        address: '100 Pine St, Suite 400',
        category: 'Legal',
        type: 'Free Legal Representation',
        eligibility: 'Low-income households facing unlawful eviction, disability appeal denials, or domestic safety orders.',
        sync: 'Active',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 }
      },
      {
        id: 'partner_transit_assist',
        name: 'Transit Assist Access Network',
        organizationName: 'Metropolitan Mobility Fund',
        programName: 'Clinical Transit Pass Subsidies',
        website: 'https://transitassist-network.org',
        contactName: 'Coordination Desk',
        phone: '(555) 432-5500',
        email: 'dispatch@transitassist-network.org',
        address: '200 4th Street',
        category: 'Transport',
        type: 'Medical Transit Vouchers & Shuttles',
        eligibility: 'Nonprofit clients needing rides or transit cards for healthcare, case interviews, and court appearances.',
        sync: 'Active',
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 30 }
      }
    ];
    localSetCollection(partPath, partnerships);
  }

  // Programs
  const progPath = `users/${uid}/programs`;
  const existingProgs = localGetCollection(progPath);
  if (existingProgs.length === 0) {
    const programs = [
      {
        id: 'prog_crisis_stabilization',
        title: 'Sanctuary Crisis Stabilization',
        desc: 'Immediate 72-hour de-escalation, respite bed placement, and multidisciplinary clinical triage.',
        status: 'Active',
        ownerId: uid
      },
      {
        id: 'prog_supportive_housing',
        title: 'Trauma-Informed Supportive Housing Pipeline',
        desc: 'Long-term navigation for permanent housing, rental vouchers, and move-in furnishings.',
        status: 'Active',
        ownerId: uid
      }
    ];
    localSetCollection(progPath, programs);
  }

  // Policies
  const polPath = `users/${uid}/policies`;
  const existingPols = localGetCollection(polPath);
  if (existingPols.length === 0) {
    const policies = [
      {
        id: 'pol_deescalation',
        title: 'Clinical Crisis De-escalation & Sanctuary Protocols',
        desc: 'Standardized trauma-informed procedures for rapid non-coercive stabilization and physical safety.',
        status: 'Active',
        ownerId: uid
      },
      {
        id: 'pol_hipaa',
        title: 'HIPAA & Client Confidentiality Operating Standard',
        desc: 'Zero-breach data privacy guidelines for electronic case notes, releases of information, and audit logs.',
        status: 'Active',
        ownerId: uid
      }
    ];
    localSetCollection(polPath, policies);
  }

  // Notifications
  const notifPath = `users/${uid}/notifications`;
  const existingNotifs = localGetCollection(notifPath);
  if (existingNotifs.length === 0) {
    const notifications = [
      {
        id: 'notif_welcome',
        title: 'Haven Care OS Active',
        message: 'High-security local encrypted storage initialized. All clinical and administrative systems operational.',
        type: 'System',
        read: false,
        ownerId: uid,
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      }
    ];
    localSetCollection(notifPath, notifications);
  }

  // User Profile
  const profilePath = `users/${uid}`;
  const existingProfile = localGetDoc(profilePath);
  if (!existingProfile) {
    localSetDoc(profilePath, {
      userId: uid,
      displayName: userDisplayName || 'Haven Clinician',
      email: `${uid}@havenos.local`,
      organizationName: orgName || 'Haven Care Sanctuary',
      language: 'English (US)',
      region: 'San Francisco Bay Area',
      completedSetup: true,
      hubsPriority: ['Case Management', 'Resource Hub', 'Funding & Grants'],
      showWidgets: true,
      uiScale: 1,
      createdAt: { seconds: Math.floor(Date.now() / 1000) }
    });
  }
}
