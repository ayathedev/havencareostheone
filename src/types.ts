export type HubId = 
  | 'command' 
  | 'clients' 
  | 'programs' 
  | 'partnerships' 
  | 'funding' 
  | 'policies' 
  | 'meetings' 
  | 'strategy' 
  | 'executive' 
  | 'archive'
  | 'settings'
  | 'help'
  | 'notifications';

export interface Hub {
  id: HubId;
  name: string;
  icon: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  status: 'Low' | 'Med' | 'High';
  completed: boolean;
  hubId?: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: any;
  ownerId: string;
}

export interface Client {
  id: string;
  name: string;
  status: 'active' | 'high-priority' | 'crisis' | 'closed';
  summary: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: { lat: number; lng: number };
  dob?: string;
  pronouns?: string;
  emergencyContact?: string;
  intakeNotes?: string;
  hipaaConsent?: boolean;
  liabilityWaiver?: boolean;
  hipaaConsentDate?: any;
  liabilityWaiverDate?: any;
  sdoh?: {
    housing: string;
    food: string;
    transport: string;
    safety: string;
    health: string;
  };
  goals?: string[];
  safetyPlan?: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Grant {
  id: string;
  name: string;
  amount: number;
  deadline: string;
  status: string;
  progress: number;
  deliverables?: string[];
  ownerId: string;
}

export interface TriageItem {
  id: string;
  content: string;
  suggestedHub?: string;
  priority?: string;
  processed: boolean;
  ownerId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'update' | 'reminder';
  date: string;
}
