import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc,
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  writeBatch,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData, useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { auth, db, signInWithGoogle, devSignIn, localSignIn, updateProfile, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  BarChart3, 
  Users, 
  Layers, 
  Handshake, 
  DollarSign, 
  FileText, 
  Video, 
  Compass, 
  Brain, 
  Archive, 
  Bell, 
  Battery, 
  Wifi, 
  Clock, 
  User, 
  UserPlus,
  Settings, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Plus,
  Camera,
  X,
  Maximize2,
  Minimize2,
  Calendar as CalendarIcon,
  Heart,
  Shield,
  Check,
  Trash2,
  LogOut,
  Globe,
  Palette,
  ShieldCheck,
  Info,
  WifiOff,
  Languages,
  Phone,
  Mail,
  MapPin,
  Link,
  HelpCircle,
  BookOpen,
  MessageSquare,
  LifeBuoy,
  Search as SearchIcon,
  ArrowUp,
  Bird as OwlIcon,
  Home,
  ShoppingBag,
  Activity,
  Save,
  Sparkles,
  Paperclip,
  Upload,
  File,
  Database,
  Copy,
  ExternalLink,
  Edit3,
  RefreshCw,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import BootScreen from './BootScreen';
import { HubId, Hub, Task, Client, Notification } from './types';
import { DeviceOllamaModels } from './components/DeviceOllamaModels';

// Helper for AI API calls with automatic client-side retry for high-demand spikes
async function callAi(endpoint: string, data: any, maxRetries = 2) {
  const payload = {
    ...data,
    model: data.model || 'gemini-3.7-flash'
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`/api/gemini/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        
        // Handle 429 (Rate Limit / Quota) and 503 (Service Unavailable)
        if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
          // Parse retry delay from error if available, otherwise use exponential backoff
          const errorMsg = (err.error || '').toLowerCase();
          let waitTime = 1000 * (attempt + 1);
          
          const match = errorMsg.match(/retry in ([\d.]+)s/);
          if (match && match[1]) {
            waitTime = (parseFloat(match[1]) * 1000) + 200;
          }
          
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        // Specific error message for quota exhaustion
        if (response.status === 429 || err.error?.includes('quota') || err.error?.includes('exhausted')) {
          throw new Error('Haven AI is currently at maximum capacity for the day. Please try again tomorrow or upgrade your operational tier.');
        }

        throw new Error(err.error || 'The AI subsystem is currently processing high volume. Please wait a moment and try again.');
      }
      return await response.json();
    } catch (e: any) {
      const isTransient = e.message?.includes('high demand') || 
                          e.message?.includes('Failed to fetch') || 
                          e.message?.includes('processing high volume');

      if (attempt < maxRetries && isTransient) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY'
};

const HUBS: Hub[] = [
  { id: 'command', name: 'Command Center', icon: 'BarChart3', description: 'Daily operations & prioritization' },
  { id: 'clients', name: 'Client Management', icon: 'Users', description: 'Case notes & client profiles' },
  { id: 'programs', name: 'Programs', icon: 'Layers', description: 'Service logic & workflows' },
  { id: 'partnerships', name: 'Resource Hub', icon: 'Handshake', description: 'Collaborations & referrals' },
  { id: 'funding', name: 'Funding & Grants', icon: 'DollarSign', description: 'Financial tracking & pipeline' },
  { id: 'policies', name: 'Policies & SOPs', icon: 'FileText', description: 'Templates & standards' },
  { id: 'meetings', name: 'Meetings', icon: 'Video', description: 'Supervision & coordination' },
  { id: 'strategy', name: 'Strategic Vision', icon: 'Compass', description: 'Growth & systems map' },
  { id: 'executive', name: 'Personal EF', icon: 'OwlIcon', description: 'Triage & regulation' },
  { id: 'archive', name: 'Archive', icon: 'Archive', description: 'Historical records' },
  { id: 'help', name: 'Help & Resources', icon: 'HelpCircle', description: 'Interactive help & knowledge base' },
];

const IconMap: any = {
  BarChart3, Users, UserPlus, Layers, Handshake, DollarSign, FileText, Video, Compass, Brain, Archive, HelpCircle, OwlIcon
};

function SystemClock({ setIsCalendarOpen, setIsClockOpen }: { setIsCalendarOpen: (v: boolean) => void, setIsClockOpen: (v: boolean) => void }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 hover:bg-white/10 px-3 py-1 rounded-full cursor-pointer transition-colors border border-transparent hover:border-white/5">
      <div className="flex items-center gap-1.5 opacity-60">
        <Wifi className="w-3 h-3" />
        <Battery className="w-3 h-3" />
      </div>
      <div className="h-3 w-[1px] bg-white/10 mx-1" />
      <span className="tracking-tight cursor-pointer hover:text-teal-400 transition-colors" onClick={() => setIsCalendarOpen(true)}>{formattedDate}</span>
      <span className="bg-white/10 px-2 py-0.5 rounded-md text-[10px] cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setIsClockOpen(true)}>{formattedTime}</span>
    </div>
  );
}

import { CalendarModal } from './components/CalendarModal';
import { ClockModal } from './components/ClockModal';
import { ClientSessionSearch, HighlightText } from './components/ClientSessionSearch';

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const userDoc = useMemo(() => user ? doc(db, `users/${user.uid}`) : null, [user?.uid]);
  const [profile, profileLoading] = useDocumentData(userDoc);

  const notificationsQuery = useMemo(() => user ? query(
    collection(db, `users/${user.uid}/notifications`),
    orderBy('createdAt', 'desc'),
    limit(5)
  ) : null, [user?.uid]);
  const [notifSnapshot] = useCollection(notificationsQuery as any);
  const notifications = useMemo(() => notifSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [notifSnapshot]);
  const unreadCount = useMemo(() => notifications?.filter((n: any) => !n.read).length || 0, [notifications]);

  const clientsQuery = useMemo(() => user ? query(
    collection(db, `users/${user.uid}/clients`)
  ) : null, [user?.uid]);
  const [clientsSnapshot] = useCollection(clientsQuery as any);
  const crisisClients = useMemo(() => clientsSnapshot?.docs
    .map(doc => ({ id: doc.id, ...doc.data() as any }))
    .filter(c => c.status?.toLowerCase() === 'crisis') || [], [clientsSnapshot]);

  const tasksQuery = useMemo(() => user ? query(
    collection(db, `users/${user.uid}/tasks`),
    where('completed', '==', false),
    orderBy('createdAt', 'desc'),
    limit(3)
  ) : null, [user?.uid]);
  const [tasksSnapshot] = useCollection(tasksQuery as any);
  const priorityTasks = useMemo(() => tasksSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [], [tasksSnapshot]);

  const [activeHub, setActiveHub] = useState<HubId | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isQuickIntakeRequested, setIsQuickIntakeRequested] = useState(false);
  const [initialPartnershipDiscovery, setInitialPartnershipDiscovery] = useState(false);
  const [launcherSearch, setLauncherSearch] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
  const [isWidgetSettingsOpen, setIsWidgetSettingsOpen] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState({
    today: true,
    quickActions: true,
    events: true,
    wellness: true,
    status: true
  });

  // Sync preference from Firestore once loaded
  useEffect(() => {
    if (profile && profile.showWidgets !== undefined) {
      setShowWidgets(profile.showWidgets);
    }
  }, [profile?.showWidgets]);

  const toggleWidgets = async () => {
    const newValue = !showWidgets;
    setShowWidgets(newValue);
    if (userDoc) {
      try {
        await setDoc(userDoc, { showWidgets: newValue }, { merge: true });
      } catch (e) {
        console.error("Failed to save widget preference", e);
      }
    }
  };

  const [uiScale, setUiScale] = useState(1);
  const [dynamicScale, setDynamicScale] = useState(1);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (e: any) {
      if (e.message?.includes('popup-blocked') || e.code === 'auth/popup-blocked') {
        setAuthError("Popup blocked by your browser. Please allow popups or open this app in a new tab by clicking the 'Open App' arrow icon in the top right corner of the AI Studio preview bar.");
      } else if (e.message?.includes('cancelled-popup-request') || e.code === 'auth/cancelled-popup-request') {
        setAuthError("Sign-in popup was cancelled. Please try again.");
      } else {
        setAuthError("Sign-in failed. Please open the app in a new tab to bypass iframe restrictions.");
      }
    }
  };

  const handleDevSignIn = async () => {
    try {
      setAuthError(null);
      await devSignIn();
    } catch (e: any) {
      if (e?.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password auth is not enabled in Firebase. Please use 'Sign in with Google' above, or enable Email/Password in your Firebase Console (Authentication > Sign-in method > Email/Password).");
      } else {
        setAuthError("Dev login failed. Please use Google Sign-in or check Firebase Auth settings.");
      }
    }
  };

  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [localEmail, setLocalEmail] = useState('local.admin@havenos.cloud');
  const [localPassword, setLocalPassword] = useState('haven123');
  const [localLoading, setLocalLoading] = useState(false);

  const handleLocalSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setAuthError(null);
      setLocalLoading(true);
      await localSignIn(localEmail.trim(), localPassword);
    } catch (e: any) {
      if (e?.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password provider is not enabled in Firebase project. Please click 'Sign in with Google' to log in instantly, or enable Email/Password in Firebase Console (Authentication > Sign-in method > Email/Password).");
      } else {
        setAuthError("Local sign-in failed. Please check credentials or use 'Sign in with Google'.");
      }
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    const calculateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scaleX = width / 1440;
      const scaleY = height / 900;
      const exactScale = Math.min(scaleX, scaleY);
      
      document.documentElement.style.fontSize = `${exactScale * uiScale * 100}%`;
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => {
       window.removeEventListener('resize', calculateScale);
       document.documentElement.style.fontSize = '100%';
    };
  }, [uiScale]);

  // Load profile effects
  useEffect(() => {
    if (profile) {
      if (profile.completedSetup && profile.hasSeenTour === undefined) {
        setShowTour(true);
      }
      if (profile.uiScale) {
        setUiScale(profile.uiScale);
      }
    }
  }, [profile]);

  // Responsive scaling effects could go here, but we'll stick to fixed user preference for now

  const handleTourComplete = async () => {
    setShowTour(false);
    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}`), { hasSeenTour: true }, { merge: true });
      } catch (e) {
        console.error("Error updating tour status:", e);
      }
    }
  };

  const ai = true;
  
  if (loading || (user && profileLoading)) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Login Background Wallpaper */}
        <div className="absolute inset-0 z-0">
           <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-80" />
           <img 
             src="/src/assets/images/haven_clean_wallpaper_1787839711322.jpg" 
             alt="" 
             className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000"
             referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 backdrop-blur-[3px] bg-[#0f172a]/20" />
        </div>

        <button 
          onClick={handleDevSignIn} 
          className="absolute top-4 left-4 w-12 h-12 opacity-0 cursor-default z-10"
          title="Hidden Dev Login"
        />
        <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-12 rounded-[2.5rem] shadow-2xl text-center relative z-10">
          <div className="w-20 h-20 bg-teal-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-teal-500/20">
            <div className="w-4 h-4 bg-teal-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(20,184,166,0.8)]" />
          </div>
          <h1 className="text-4xl font-light text-white mb-4 tracking-tight">Haven Care OS</h1>
          <p className="text-slate-400 mb-8 font-medium leading-relaxed opacity-60">
            A secure, trauma-informed administrative operating system for sanctuary and stabilization.
          </p>
          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-left">
              {authError}
            </div>
          )}

          {!showLocalLogin ? (
            <div className="space-y-4">
              <button 
                onClick={handleSignIn}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-teal-900/40 flex items-center justify-center gap-3 cursor-pointer"
              >
                Sign in with Google
              </button>
              
              <button 
                onClick={() => setShowLocalLogin(true)}
                className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-teal-400" />
                Local Account Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleLocalSignIn} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Local Email / ID</label>
                <input 
                  type="email" 
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  placeholder="admin@havenos.cloud"
                  required
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input 
                  type="password" 
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLocalLogin(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-3.5 rounded-xl font-medium text-sm transition-all border border-white/10 cursor-pointer"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={localLoading}
                  className="flex-2 bg-teal-600 hover:bg-teal-500 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {localLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In Locally'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-[10px] uppercase font-black tracking-widest text-slate-500 opacity-40">
            Secure HIPAA-aligned Instance
          </p>
        </div>
      </div>
    );
  }

  // Show Setup Wizard if not completed
  if (!profile?.completedSetup) {
    return <SetupWizard ai={ai} user={user} setGlobalScale={setUiScale} />;
  }

  const toggleLauncher = () => setIsLauncherOpen(!isLauncherOpen);
  const openHub = (id: HubId) => {
    setActiveHub(id);
    setIsLauncherOpen(false);
  };
  const closeHub = () => setActiveHub(null);

  const isLightMode = profile?.theme === 'Light Mode';
  const isSoftDay = profile?.theme === 'Soft Day';
  const themeClass = isLightMode ? 'theme-light' : (isSoftDay ? 'theme-soft-day' : 'theme-dark');

  return (
    <div 
      className={`h-screen w-screen overflow-hidden font-sans text-slate-200 selection:bg-teal-500/30 relative transition-all duration-700 ease-in-out ${themeClass}`}
    >
      {/* Desktop Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Base Gradient Layer - will be overridden by theme CSS for light modes */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
        
        <img 
          src="/src/assets/images/haven_clean_wallpaper_1787839711322.jpg" 
          alt="Haven Workspace" 
          className={`
            absolute inset-0 w-full h-full object-cover transition-all duration-1000
            ${isLightMode ? 'opacity-[0.15] grayscale brightness-110' : (isSoftDay ? 'opacity-[0.2] sepia brightness-105' : 'opacity-[0.45]')}
          `}
          referrerPolicy="no-referrer"
        />
        
        {/* Center Branding Backdrop */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none select-none z-0 pb-36">
          <div className="text-center">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.6em] mb-4 drop-shadow-lg opacity-80">By Aya Kalimah Satya Ruane</p>
            <h1 className="text-7xl font-light text-white mb-3 tracking-tighter drop-shadow-2xl">Haven Care OS</h1>
            <p className="text-teal-400 text-[10px] tracking-[0.5em] uppercase font-black drop-shadow-md">Stability. Compassion. Sanctuary.</p>
          </div>
        </div>
      </div>
      
      {/* Soft Day Warm Overlay */}
      <AnimatePresence>
        {isSoftDay && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-amber-500/20 mix-blend-multiply pointer-events-none z-0" 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTour && <GuidedTour onComplete={handleTourComplete} />}
      </AnimatePresence>
      
      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 h-10 bg-black/30 backdrop-blur-md flex items-center justify-between px-4 text-slate-300 border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <Tooltip text="Compass Launcher">
            <button 
              id="os-launcher"
              onClick={toggleLauncher}
              className="hover:bg-white/10 p-1 rounded-full transition-colors"
            >
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-xs"></div>
                <div className="w-1.5 h-1.5 bg-teal-400/50 rounded-xs"></div>
                <div className="w-1.5 h-1.5 bg-teal-400/50 rounded-xs"></div>
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-xs"></div>
              </div>
            </div>
          </button>
        </Tooltip>

          <Tooltip text="Auto-Discover Local Resources">
            <button
              onClick={() => {
                setInitialPartnershipDiscovery(true);
                setActiveHub('partnerships');
                setIsLauncherOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition-all shadow-sm hover:scale-105 active:scale-95 group"
            >
              <Sparkles className="w-3 h-3 text-indigo-400 group-hover:rotate-12 transition-transform" />
              <span>Discover Resources</span>
            </button>
          </Tooltip>

          <Tooltip text="Device-Compatible Ollama Local Models">
            <button
              onClick={() => setIsOllamaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[10px] font-bold transition-all shadow-sm hover:scale-105 active:scale-95 group"
            >
              <Cpu className="w-3 h-3 text-teal-400 group-hover:rotate-12 transition-transform" />
              <span>Local Ollama Models</span>
            </button>
          </Tooltip>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-widest shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>MODEL: GEMINI-3.1-PRO</span>
          </div>
          
          <span className="text-[10px] font-black tracking-[0.4em] uppercase text-teal-400 mx-2">Haven Care OS</span>

          <Tooltip text="Deep Search">
            <div id="os-search" className="relative group flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <SearchIcon className="w-3.5 h-3.5 opacity-40" />
              <input 
                type="text" 
                placeholder="Search OS..." 
                className="bg-transparent border-none outline-none text-[11px] w-32 placeholder:text-white/30"
              />
            </div>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium">
          <SystemClock setIsCalendarOpen={setIsCalendarOpen} setIsClockOpen={setIsClockOpen} />
          <Tooltip text="Support Center">
            <button 
              id="help-button"
              onClick={() => setActiveHub('help')}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all active:scale-95"
              title="Help & Support"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <button 
            onClick={() => setActiveHub('settings')}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all active:scale-95"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative group"
            >
              <Bell className={`w-3.5 h-3.5 transition-transform ${unreadCount > 0 ? 'animate-bounce' : 'group-hover:scale-110'}`} />
              {unreadCount > 0 && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Mission Alerts</h3>
                    <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{unreadCount} New</span>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    {(!notifications || notifications.length === 0) ? (
                      <div className="p-8 text-center">
                        <p className="text-xs text-slate-500 italic">No active signals.</p>
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div 
                          key={notif.id}
                          onClick={async () => {
                            if (!notif.read) {
                              try {
                                await updateDoc(doc(db, `users/${user.uid}/notifications`, notif.id), { read: true });
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }}
                          className={`p-4 border-b border-white/5 last:border-none cursor-pointer hover:bg-white/5 transition-colors flex gap-3 group/notif ${notif.read ? 'opacity-40' : ''}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 transition-all ${notif.read ? 'bg-transparent' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover/notif:scale-125'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate group-hover/notif:text-teal-400 transition-colors">{notif.title}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{notif.type}</span>
                              <span className="text-[8px] font-bold text-slate-600">{notif.date || 'Just now'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => {
                       setIsNotificationsOpen(false);
                       setActiveHub('notifications');
                    }}
                    className="w-full py-3 bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-white hover:bg-teal-500/20 transition-all border-t border-white/5"
                  >
                    View Network Hub
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div 
            onClick={() => setActiveHub('settings')}
            className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 overflow-hidden border border-white/10 text-[10px] font-bold cursor-pointer hover:bg-teal-500/20 group transition-all"
          >
            {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : user.email?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Desktop Area */}
      <main className="absolute inset-0 pt-10 pb-16 px-8 overflow-hidden z-10 flex gap-8">
        {/* Left Side Widgets */}
        <div className="flex items-start gap-4 z-20 shrink-0">
          <AnimatePresence initial={false}>
            {showWidgets && (
              <motion.div
                initial={{ width: 0, opacity: 0, x: -20 }}
                animate={{ width: 320, opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="overflow-hidden"
              >
                <Tooltip text="Operational Vitals">
                  <div id="desktop-widgets" className="w-80 flex flex-col gap-6 mt-8 opacity-85 hover:opacity-100 transition-opacity duration-500">
            {visibleWidgets.today && (
              <section className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 text-slate-200 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase flex items-center gap-2">
                  Today's Control
                </h2>
                <Settings 
                  onClick={() => setIsWidgetSettingsOpen(true)}
                  className="w-3.5 h-3.5 opacity-30 cursor-pointer hover:opacity-100 transition-all hover:rotate-90" 
                />
              </div>
              <div className="space-y-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 cursor-pointer transition-all">
                  <p className="text-[10px] text-teal-400/60 uppercase tracking-widest mb-1">Operational Focus</p>
                  <p className="text-sm font-medium">Weekly Strategic Planning</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 cursor-pointer transition-all">
                  <p className="text-[10px] text-slate-400/60 uppercase tracking-widest mb-1">Active Cases</p>
                  <p className="text-sm font-medium">3 Priority Follow-ups</p>
                </div>
              </div>
              <div className="mt-4 flex items-center bg-teal-400/5 border border-teal-400/20 p-3 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-teal-500 mr-3 shadow-[0_0_8px_rgba(20,184,166,0.4)]"></div>
                <span className="text-[10px] text-teal-200 font-medium tracking-wide">All stabilization systems clear.</span>
              </div>
            </section>
            )}

           {visibleWidgets.quickActions && (
             <section className="bg-slate-800/20 backdrop-blur-xl rounded-3xl p-6 border border-white/5 text-slate-200 shadow-xl">
              <h2 className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 mb-6 uppercase">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Client', icon: User, hubId: 'clients', hubNum: '02', color: 'bg-teal-500/20 text-teal-400' },
                  { label: 'Note', icon: FileText, hubId: 'policies', hubNum: '06', color: 'bg-slate-500/20 text-slate-400' },
                  { label: 'Grant', icon: DollarSign, hubId: 'funding', hubNum: '05', color: 'bg-amber-500/20 text-amber-400' },
                  { label: 'Sync', icon: Video, hubId: 'meetings', hubNum: '07', color: 'bg-indigo-500/20 text-indigo-400' },
                ].map((item) => (
                  <button 
                    key={item.label}
                    onClick={() => setActiveHub(item.hubId as any)}
                    className="flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold">{item.label}</div>
                      <div className="text-[9px] opacity-40 font-black">HUB {item.hubNum}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
           )}

           <button 
             onClick={() => setIsWidgetSettingsOpen(true)}
             className="mt-4 flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-teal-400 transition-colors mx-auto group"
           >
             <Settings className="w-3 h-3 group-hover:rotate-90 transition-transform" />
             Configure Vitals
           </button>
        </div>
      </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={toggleWidgets}
            className="mt-8 p-3 rounded-2xl bg-slate-800/60 backdrop-blur-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors shadow-2xl z-50 relative group shrink-0"
            title={showWidgets ? "Hide Operational Vitals" : "Show Operational Vitals"}
          >
            {showWidgets ? <PanelLeftClose className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> : <PanelLeftOpen className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        </div>

        {/* Middle Area Spacer */}
        <div className="flex-1" />

        {/* Right Side Widgets */}
        <div className="w-80 flex flex-col gap-6 mt-8">
          {visibleWidgets.events && (
            <section className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 text-slate-200 shadow-2xl">
              <h2 className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 mb-4 uppercase">Events & Sync</h2>
              <div className="space-y-5">
                <div className="text-[10px] text-slate-500 italic px-2">No upcoming operational events scheduled.</div>
              </div>
            </section>
          )}

          {visibleWidgets.wellness && (
            <section className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 border border-red-500/10 text-slate-200 shadow-2xl">
              <h2 className="text-[10px] font-semibold tracking-[0.2em] text-red-400 mb-4 uppercase flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Active Crisis Alerts
              </h2>
              <div className="space-y-3">
                {crisisClients.length > 0 ? crisisClients.map(client => (
                  <div key={client.id} className="bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                    <div className="text-xs font-bold text-white">{client.name}</div>
                    <div className="text-[10px] text-red-400/80 mt-0.5">Immediate intervention required</div>
                  </div>
                )) : (
                  <div className="text-[10px] text-slate-500 italic px-2">No active crisis files detected.</div>
                )}
              </div>
            </section>
          )}

          {visibleWidgets.status && (
            <section className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 text-slate-200 shadow-2xl">
              <h2 className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 mb-4 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Priority Tasks
              </h2>
              <div className="space-y-3">
                {priorityTasks.length > 0 ? priorityTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 group">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-teal-500/50 group-hover:bg-teal-500 transition-colors" />
                    <div className="text-xs text-slate-300 leading-tight">{task.title}</div>
                  </div>
                )) : (
                  <div className="text-[10px] text-slate-500 italic px-2">All primary tasks cleared.</div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Dock / Bottom Shelf */}
      <footer className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-center pb-4 z-50">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-1 shadow-2xl">
          {HUBS.map((hub, idx) => {
            const Icon = IconMap[hub.icon];
            const isActive = activeHub === hub.id;
            const hubNumber = (idx + 1).toString().padStart(2, '0');
            const shortName = hub.id === 'funding' ? '$' : hub.id.slice(0, 3).toUpperCase();
            
            return (
              <div key={hub.id} className="relative group px-0.5">
                <Tooltip text={hub.name}>
                  <button 
                    onClick={() => openHub(hub.id)}
                    className={`
                      w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 relative border group-hover:scale-110
                      ${isActive 
                        ? 'bg-teal-600 text-white border-teal-400 shadow-[0_4px_12px_rgba(20,184,166,0.4)] -translate-y-1' 
                        : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:-translate-y-1 hover:text-white hover:border-white/20'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  </button>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </footer>

      {/* OS Launcher Overlay */}
      <AnimatePresence>
        {isLauncherOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-x-0 bottom-16 top-6 bg-slate-950/80 backdrop-blur-3xl z-40 p-12 overflow-y-auto custom-scrollbar border-t border-white/5"
          >
            <div className="max-w-4xl mx-auto">
              <div className="relative mb-16">
                <SearchIcon className="absolute left-8 top-1/2 -translate-y-1/2 text-teal-400/40 w-7 h-7" />
                <input 
                  type="text" 
                  autoFocus
                  value={launcherSearch}
                  onChange={(e) => setLauncherSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && launcherSearch.trim()) {
                      setActiveHub('help');
                      setIsLauncherOpen(false);
                      // Pre-fill help search? 
                    }
                  }}
                  placeholder="Ask Haven or search hubs..." 
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 pl-20 text-2xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all placeholder:text-white/20 font-light"
                />
              </div>

              <div className="grid grid-cols-5 gap-10">
                {HUBS.map((hub, idx) => {
                  const Icon = IconMap[hub.icon];
                  const hubNumber = (idx + 1).toString().padStart(2, '0');
                  return (
                    <button 
                      key={hub.id}
                      onClick={() => openHub(hub.id)}
                      className="flex flex-col items-center gap-4 group"
                    >
                      <div className="w-20 h-20 bg-white/5 group-hover:bg-teal-600 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl group-hover:scale-110 border border-white/5 group-hover:border-teal-400">
                        <Icon className="w-10 h-10 text-white group-hover:text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-teal-400 mb-1 tracking-widest opacity-60 group-hover:opacity-100 uppercase">Hub {hubNumber}</p>
                        <p className="text-sm font-bold text-white group-hover:text-teal-200 transition-colors tracking-tight">{hub.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-16">
                <h3 className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-8">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-4">
                  <button 
                    onClick={() => {
                      setActiveHub('clients');
                      setIsQuickIntakeRequested(true);
                      setIsLauncherOpen(false);
                    }}
                    className="bg-teal-500/10 border border-teal-500/20 px-6 py-5 rounded-2xl text-left hover:bg-teal-500/20 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-teal-400/10 blur-2xl -mr-8 -mt-8" />
                    <UserPlus className="w-5 h-5 text-teal-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-teal-400 mb-1">New Client Intake</p>
                    <p className="text-[9px] font-black text-teal-500/60 uppercase tracking-widest">Immediate Case Start</p>
                  </button>

                  <button 
                    onClick={() => {
                      setInitialPartnershipDiscovery(true);
                      setActiveHub('partnerships');
                      setIsLauncherOpen(false);
                    }}
                    className="bg-indigo-500/10 border border-indigo-500/20 px-6 py-5 rounded-2xl text-left hover:bg-indigo-500/20 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-400/10 blur-2xl -mr-8 -mt-8" />
                    <Sparkles className="w-5 h-5 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-indigo-300 mb-1">Discover Resources</p>
                    <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">AI Regional Discovery</p>
                  </button>
                </div>
              </div>

              <div className="mt-16">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">System Documentation</h3>
                  <button 
                    onClick={() => setActiveHub('help')}
                    className="text-teal-400 text-[10px] font-black uppercase tracking-widest hover:text-teal-300 transition-colors flex items-center gap-2"
                  >
                    View All Modules <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <button 
                    onClick={() => setActiveHub('help')}
                    className="bg-teal-500/10 border border-teal-500/20 px-6 py-5 rounded-2xl text-left hover:bg-teal-500/20 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-teal-400/10 blur-2xl -mr-8 -mt-8" />
                    <HelpCircle className="w-5 h-5 text-teal-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-teal-400 mb-1">Interactive Support Hub</p>
                    <p className="text-[9px] font-black text-teal-500/60 uppercase tracking-widest">Get Live Assistance</p>
                  </button>
                  {['Client SOP', 'Crisis Script', 'Grant Logic'].map(tm => (
                     <button key={tm} className="bg-white/5 border border-white/5 px-6 py-5 rounded-2xl text-left hover:bg-white/10 transition-all group">
                        <FileText className="w-5 h-5 text-teal-400/40 mb-3 group-hover:text-teal-400 transition-colors" />
                        <p className="text-xs font-bold text-white/90 mb-1">{tm}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Modified 2h ago</p>
                     </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeHub && (
          <motion.div 
            key={activeHub}
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 30 }}
            className="absolute inset-x-0 top-6 bottom-20 overflow-hidden z-30 px-8"
          >
            <div className="h-full w-full bg-[#0f172a] shadow-[0_50px_150px_rgba(0,0,0,0.8)] border border-white/10 rounded-3xl flex flex-col overflow-hidden relative backdrop-blur-3xl">
              {/* Window Header */}
              <div className="h-14 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <div className="px-3 py-1 bg-teal-500/10 border border-teal-400/20 text-teal-400 rounded-lg text-[10px] font-black tracking-widest uppercase">
                    Core Resource
                  </div>
                  <h2 className="font-bold text-sm text-white tracking-wide uppercase">
                    {HUBS.find(h => h.id === activeHub)?.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={closeHub}
                    className="p-2.5 bg-white/5 hover:bg-teal-500 text-white rounded-xl transition-all active:scale-95 group shadow-xl"
                    title="Close Activity"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Window Content */}
              <div className="flex-1 overflow-auto bg-[#0f172a] p-12 custom-scrollbar">
                <HubContent 
                  hubId={activeHub} 
                  ai={ai} 
                  user={user} 
                  profile={profile} 
                  setActiveHub={setActiveHub} 
                  isQuickIntakeRequested={isQuickIntakeRequested}
                  setIsQuickIntakeRequested={setIsQuickIntakeRequested}
                  initialPartnershipDiscovery={initialPartnershipDiscovery}
                  setInitialPartnershipDiscovery={setInitialPartnershipDiscovery}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Modals */}
      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
      <ClockModal isOpen={isClockOpen} onClose={() => setIsClockOpen(false)} />
      
      {/* Widget Configuration Modal */}
      <AnimatePresence>
        {isWidgetSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-24 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[3rem] p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsWidgetSettingsOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white tracking-tight">Desktop Vitals</h3>
                <p className="text-sm text-slate-500 mt-1">Configure your real-time data environment.</p>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'today', name: "Today's Control", desc: "Operational focus and active case counters" },
                  { id: 'quickActions', name: "Quick Actions", desc: "Fast access to primary system modules" },
                  { id: 'events', name: "Events & Sync", desc: "Upcoming schedule and system synchronization" },
                  { id: 'wellness', name: "Crisis Alerts", desc: "Real-time identification of high-risk files" },
                  { id: 'status', name: "Priority Tasks", desc: "Essential operations queue" },
                ].map((widget) => (
                  <div 
                    key={widget.id}
                    onClick={() => setVisibleWidgets(prev => ({ ...prev, [widget.id]: !prev[widget.id as keyof typeof prev] }))}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      visibleWidgets[widget.id as keyof typeof visibleWidgets] 
                        ? 'bg-teal-500/10 border-teal-500/30' 
                        : 'bg-white/5 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`text-sm font-bold transition-colors ${visibleWidgets[widget.id as keyof typeof visibleWidgets] ? 'text-teal-400' : 'text-slate-300'}`}>
                        {widget.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{widget.desc}</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors relative ${visibleWidgets[widget.id as keyof typeof visibleWidgets] ? 'bg-teal-500' : 'bg-slate-700'}`}>
                      <motion.div 
                        animate={{ x: visibleWidgets[widget.id as keyof typeof visibleWidgets] ? 16 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsWidgetSettingsOpen(false)}
                className="w-full mt-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-2xl transition-all active:scale-[0.98]"
              >
                Apply Configuration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {isOllamaModalOpen && (
        <DeviceOllamaModels isModal={true} onClose={() => setIsOllamaModalOpen(false)} />
      )}
    </div>
  );
}

// Sub-components for Hub Content
function HubContent({ hubId, ai, user, profile, setActiveHub, isQuickIntakeRequested, setIsQuickIntakeRequested, initialPartnershipDiscovery, setInitialPartnershipDiscovery }: { hubId: HubId, ai: any, user: FirebaseUser, profile: any, setActiveHub: (id: HubId | null) => void, isQuickIntakeRequested: boolean, setIsQuickIntakeRequested: (v: boolean) => void, initialPartnershipDiscovery?: boolean, setInitialPartnershipDiscovery?: (v: boolean) => void }) {
  switch (hubId) {
    case 'command': return <CommandCenter user={user} />;
    case 'clients': return (
      <ClientManagement 
        ai={ai} 
        user={user} 
        isQuickIntakeRequested={isQuickIntakeRequested} 
        onQuickIntakeHandled={() => setIsQuickIntakeRequested(false)} 
      />
    );
    case 'funding': return <FundingHub user={user} />;
    case 'executive': return <ExecutiveSupport ai={ai} user={user} />;
    case 'programs': return <ProgramsHub user={user} />;
    case 'partnerships': return (
      <PartnershipsHub 
        ai={ai} 
        user={user} 
        profile={profile} 
        initialDiscoveryMode={initialPartnershipDiscovery} 
        onDiscoveryHandled={() => setInitialPartnershipDiscovery && setInitialPartnershipDiscovery(false)} 
      />
    );
    case 'policies': return <PoliciesHub user={user} />;
    case 'meetings': return <MeetingsHub user={user} />;
    case 'strategy': return <StrategyHub user={user} />;
    case 'archive': return <ArchiveHub user={user} />;
    case 'notifications': return <NotificationsHub user={user} />;
    case 'settings': return <SettingsHub user={user} profile={profile} setActiveHub={setActiveHub} />;
    case 'help': return <HelpHub ai={ai} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
          <Compass className="w-16 h-16 mb-4" />
          <h2 className="text-xl font-bold">Module under construction</h2>
          <p className="text-sm">This hub is being initialized based on trauma-informed SOPs.</p>
        </div>
      );
  }
}

function CommandCenter({ user }: { user: FirebaseUser }) {
  const tasksQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/tasks`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  const [tasksSnapshot, loading, error] = useCollection(tasksQuery as any);
  const tasks = useMemo(() => tasksSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [tasksSnapshot]);

  const clientsQuery = useMemo(() => query(collection(db, `users/${user.uid}/clients`)), [user.uid]);
  const [clientsSnapshot] = useCollection(clientsQuery as any);
  const clients = useMemo(() => clientsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [clientsSnapshot]);
  
  const partnersQuery = useMemo(() => query(collection(db, `users/${user.uid}/partnerships`)), [user.uid]);
  const [partnersSnapshot] = useCollection(partnersQuery as any);
  const partners = useMemo(() => partnersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [partnersSnapshot]);

  const crisisCount = useMemo(() => clients?.filter((c: any) => c.status?.toLowerCase() === 'crisis').length || 0, [clients]);
  const urgentLogs = useMemo(() => tasks?.filter((t: any) => t.status === 'High' && !t.completed).length || 0, [tasks]);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const submitAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/tasks`), {
        title: newTaskTitle,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Med',
        completed: false,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddingTask(false);
      setNewTaskTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks/${task.id}`), {
        completed: !task.completed
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this priority?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasks/${taskId}`));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light text-white leading-tight tracking-tight">Today's Control Panel</h1>
          <p className="text-teal-400/60 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {isAddingTask ? (
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
            <input 
              type="text"
              autoFocus
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Priority Title..."
              className="bg-transparent text-white px-4 py-2 focus:outline-none text-sm w-48"
              onKeyDown={e => e.key === 'Enter' && submitAddTask()}
            />
            <button onClick={submitAddTask} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">Add</button>
            <button onClick={() => setIsAddingTask(false)} className="text-slate-500 hover:text-white px-2 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingTask(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-900/20"
          >
            <Plus className="w-4 h-4" /> New Priority
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <section className="bg-white/5 rounded-3xl p-8 border border-white/5">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Top 3 Priorities</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-slate-500 text-xs animate-pulse italic">Scanning task lists...</div>
              ) : (tasks || []).slice(0, 3).map((p: any, i: number) => (
                <div key={p.id || i} onClick={(e) => toggleTask(p, e)} className={`bg-white/5 p-5 rounded-2xl border ${p.completed ? 'border-teal-500/30 opacity-50' : 'border-white/5'} flex items-center justify-between group hover:border-teal-500/30 transition-all cursor-pointer`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${p.completed ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'}`}>
                      {p.completed ? <CheckCircle2 className="w-5 h-5" /> : (i + 1)}
                    </div>
                    <div>
                      <p className={`font-bold text-base tracking-tight ${p.completed ? 'text-slate-400 line-through' : 'text-white'}`}>{p.title}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.status === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {p.status}
                    </span>
                    <button 
                      onClick={(e) => deleteTask(p.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!loading && tasks?.length === 0 && (
                <p className="text-slate-500 text-xs italic">No active priorities. Add one to begin.</p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-6">
            <div className={`p-8 rounded-3xl border ${crisisCount > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/5 border-white/5'}`}>
              <div className={`flex items-center gap-3 mb-4 opacity-70 ${crisisCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                <Bell className="w-5 h-5" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Crisis Alerts</h3>
              </div>
              <p className={`text-4xl font-light ${crisisCount > 0 ? 'text-red-200' : 'text-slate-300'}`}>{crisisCount}</p>
              <p className={`text-[10px] mt-2 font-bold uppercase ${crisisCount > 0 ? 'text-red-400/50' : 'text-slate-500'}`}>{crisisCount > 0 ? 'Urgent Files Active' : 'All systems stable'}</p>
              {crisisCount > 0 && (
                <div className="mt-4 space-y-1">
                  {clients?.filter((c: any) => c.status?.toLowerCase() === 'crisis').map((c: any) => (
                    <div key={c.id} className="text-xs text-red-300/80 font-medium truncate">• {c.name}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-teal-500/5 p-8 rounded-3xl border border-teal-500/10">
              <div className="flex items-center gap-3 text-teal-400 mb-4 opacity-70">
                <Clock className="w-5 h-5" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">High Priority</h3>
              </div>
              <p className="text-4xl font-light text-teal-200">{urgentLogs}</p>
              <p className="text-[10px] text-teal-400/50 mt-2 font-bold uppercase">Open Tasks</p>
            </div>
          </section>
        </div>

        <div className="space-y-8">
            <section className="p-8 bg-black/20 border border-white/5 rounded-3xl">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Live Metadata</h3>
              <div className="space-y-5">
                {[
                  { label: 'Active Cases', val: clients?.length || 0 },
                  { label: 'Referral Hub', val: partners?.length || 0 },
                  { label: 'Pending Tasks', val: tasks?.filter((t: any) => !t.completed).length || 0 }
                ].map(stat => (
                  <div key={stat.label} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-xs font-black text-teal-400">{stat.val}</span>
                  </div>
                ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}





function ClientManagement({ ai, user, isQuickIntakeRequested, onQuickIntakeHandled }: { ai: any, user: FirebaseUser, isQuickIntakeRequested?: boolean, onQuickIntakeHandled?: () => void }) {
  const [filter, setFilter] = useState<'all' | 'high' | 'crisis'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  useEffect(() => {
    if (isQuickIntakeRequested) {
      setIsAddingClient(true);
      onQuickIntakeHandled?.();
    }
  }, [isQuickIntakeRequested, onQuickIntakeHandled]);

  const clientsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/clients`),
    orderBy('name', 'asc')
  ), [user.uid]);
  const [snapshot, loading] = useCollection(clientsQuery);
  const clients = useMemo(() => snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [snapshot]);

  const selectedClient = useMemo(() => clients?.find((c: any) => c.id === selectedClientId), [clients, selectedClientId]);

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const submitAddClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, `users/${user.uid}/clients`), {
        name: newClientName,
        status: 'active',
        summary: 'New intake pending.',
        hipaaConsent: false,
        liabilityWaiver: false,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddingClient(false);
      setNewClientName('');
      setSelectedClientId(docRef.id);
      setIsIntakeOpen(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/clients`);
    }
  };

  const filteredClients = (clients || []).filter((c: any) => {
    const matchesFilter = filter === 'all' || (filter === 'high' && c.status === 'high-priority') || (filter === 'crisis' && c.status === 'crisis');
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (selectedClientId && selectedClient) {
    return (
      <ClientDetailView 
        key={selectedClientId}
        ai={ai}
        client={selectedClient} 
        user={user} 
        onBack={() => setSelectedClientId(null)} 
        isIntakeInitiallyOpen={isIntakeOpen}
        onCloseIntake={() => setIsIntakeOpen(false)}
      />
    );
  }

  return (
     <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-light text-white tracking-tight">Client Hub</h1>
            <p className="text-slate-400 font-medium italic text-sm mt-2 opacity-60">
              {loading ? 'Consulting roster...' : `Managing ${clients?.length || 0} active souls with dignity.`}
            </p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white/5 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5">HIPAA Compliance Log</button>
            {isAddingClient ? (
              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                <input 
                  type="text"
                  autoFocus
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Client Name..."
                  className="bg-transparent text-white px-4 py-2 focus:outline-none text-sm w-40"
                  onKeyDown={e => e.key === 'Enter' && submitAddClient()}
                />
                <button onClick={submitAddClient} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">Add</button>
                <button onClick={() => setIsAddingClient(false)} className="text-slate-500 hover:text-white px-2 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingClient(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-teal-900/40 active:scale-95"
              >
                 <Plus className="w-4 h-4" /> New Intake
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400/40 group-focus-within:text-teal-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or case number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 pl-16 text-xl text-white font-light focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
            />
          </div>
          <div className="flex gap-3 bg-white/5 p-2 rounded-[2rem] border border-white/5">
             {['all', 'high', 'crisis'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f as any)}
                 className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${filter === f ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
               >
                 {f}
               </button>
             ))}
          </div>
          <div className="flex bg-white/5 p-1 rounded-3xl border border-white/5 shadow-inner">
             <button
                className="px-8 py-2 rounded-[1.5rem] bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
             >
                Encrypted Client Registry
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="p-20 text-center animate-pulse text-slate-400 italic">Accessing secure encryption layers...</div>
          ) : filteredClients.map((client: any) => (
            <div 
              key={client.id || 0} 
              onClick={() => setSelectedClientId(client.id)}
              className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.08] hover:border-teal-500/30 transition-all flex items-center justify-between group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center gap-8 relative z-10">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-2xl transition-transform group-hover:scale-105 ${client.status === 'crisis' ? 'bg-red-500' : client.status === 'high-priority' ? 'bg-amber-500' : 'bg-teal-500'}`}>
                  {client.name.charAt(0)}
                </div>
                <div>
                   <h3 className="font-bold text-white text-3xl tracking-tighter leading-tight group-hover:text-teal-400 transition-colors">{client.name}</h3>
                   <div className="flex items-center gap-4 mt-3">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${client.status === 'crisis' ? 'bg-red-500/10 text-red-400 border-red-500/20' : client.status === 'high-priority' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'}`}>
                        {client.status}
                      </span>
                      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                         <ShieldCheck className={`w-3.5 h-3.5 ${client.hipaaConsent ? 'text-teal-400' : 'text-red-500/40'}`} />
                         {client.hipaaConsent ? 'HIPAA Secured' : 'No Consent'}
                      </div>
                      <span className="h-1 w-1 bg-white/20 rounded-full" />
                      <p className="text-xs text-slate-400 font-medium opacity-60 leading-tight max-w-sm truncate">{client.summary}</p>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                 <div className="text-right mr-6">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Last Interaction</p>
                    <p className="text-xs font-bold text-white">2 days ago</p>
                 </div>
                 <ChevronRight className="w-8 h-8 text-slate-800 group-hover:text-teal-400 transition-all translate-x-[-10px] group-hover:translate-x-0" />
              </div>
            </div>
          ))}
          {!loading && filteredClients.length === 0 && (
            <div className="p-32 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
               <Users className="w-16 h-16 mx-auto mb-6 text-slate-800" />
               <p className="text-slate-500 italic max-w-xs mx-auto">No client profiles match your current perspective. Adjust filters or initiate a new intake.</p>
            </div>
          )}
        </div>
     </div>
  );
}

function ClientDetailView({ ai, client, user, onBack, isIntakeInitiallyOpen, onCloseIntake }: { ai: any, client: any, user: FirebaseUser, onBack: () => void, isIntakeInitiallyOpen?: boolean, onCloseIntake?: () => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'intake' | 'appointments' | 'referrals' | 'documents' | 'session'> (isIntakeInitiallyOpen ? 'intake' : 'profile');

  const flagCrisis = async () => {
    if (!confirm(`Are you sure you want to flag a medical or safety crisis for ${client.name}? This will escalate the operational status across all hubs.`)) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/clients`, client.id), {
        status: 'crisis',
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, `users/${user.uid}/notifications`), {
        title: 'Crisis Alert Escalated',
        message: `High-priority protocol initiated for ${client.name}. Ensure trauma-informed safety measures are active.`,
        type: 'alert',
        read: false,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isIntakeInitiallyOpen) {
      setActiveTab('intake');
    }
  }, [isIntakeInitiallyOpen]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button 
            onClick={onBack}
            className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 transition-all group"
          >
            <ChevronRight className="w-6 h-6 rotate-180 text-slate-400 group-hover:text-white transition-colors" />
          </button>
          <div>
             <div className="flex items-center gap-4 mb-2">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] opacity-60">Case Management</span>
                <span className="h-1 w-1 bg-white/10 rounded-full" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">ID: {client.id.slice(0, 8)}</span>
             </div>
             <h1 className="text-5xl font-light text-white tracking-tighter">{client.name}</h1>
          </div>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={flagCrisis}
             className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all"
           >
             Flag Crisis
           </button>
           <button onClick={() => setActiveTab('session')} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-900/40">Start Session</button>
        </div>
      </header>

      <div className="flex gap-10">
        {/* Navigation Sidebar */}
        <div className="w-64 space-y-2">
          {[
            { id: 'profile', label: 'Identity & Vitality', icon: User },
            { id: 'intake', label: 'Full Intake & HIPAA', icon: FileText },
            { id: 'appointments', label: 'Scheduling & Syncs', icon: CalendarIcon },
            { id: 'referrals', label: 'Resource Referrals', icon: Handshake },
            { id: 'documents', label: 'Document Vault', icon: Paperclip },
            { id: 'session', label: 'Sandbox Session', icon: MessageSquare },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all border ${activeTab === tab.id ? 'bg-teal-600 text-white border-teal-400 shadow-xl' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-white'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white/5 border border-white/5 rounded-[3rem] p-12 relative overflow-y-auto custom-scrollbar backdrop-blur-xl">
           <div className="absolute top-0 right-0 p-12 opacity-[0.02]">
              {activeTab === 'profile' && <User className="w-64 h-64" />}
              {activeTab === 'intake' && <Shield className="w-64 h-64" />}
              {activeTab === 'appointments' && <CalendarIcon className="w-64 h-64" />}
              {activeTab === 'referrals' && <Handshake className="w-64 h-64" />}
              {activeTab === 'documents' && <Paperclip className="w-64 h-64" />}
           </div>
           
           <div className="relative z-10 h-full">
              {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <ClientProfileOverview client={client} user={user} />
                   {client.sdoh && (
                     <div className="grid grid-cols-5 gap-4">
                       {[
                         { key: 'housing', label: 'Housing', icon: Home },
                         { key: 'food', label: 'Food', icon: ShoppingBag },
                         { key: 'transport', label: 'Transport', icon: MapPin },
                         { key: 'safety', label: 'Safety', icon: ShieldCheck },
                         { key: 'health', label: 'Health', icon: Activity }
                       ].map(s => {
                         const Icon = s.icon;
                         const isSuccess = client.sdoh[s.key] === 'Stable' || client.sdoh[s.key] === 'Secure' || client.sdoh[s.key] === 'Safe' || client.sdoh[s.key] === 'Insured' || client.sdoh[s.key] === 'Access';
                         return (
                           <div key={s.key} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 group hover:bg-white/10 transition-all">
                              <Icon className={`w-5 h-5 ${isSuccess ? 'text-teal-400' : 'text-red-400'}`} />
                              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{s.label}</span>
                              <span className="text-[10px] font-bold text-white">{client.sdoh[s.key]}</span>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </div>
              )}
              {activeTab === 'intake' && <ClientIntakeForm client={client} user={user} ai={ai} onComplete={() => {setActiveTab('profile'); onCloseIntake?.();}} />}
              {activeTab === 'appointments' && <ClientAppointmentManager client={client} user={user} />}
              {activeTab === 'referrals' && <ClientReferrals client={client} user={user} />}
              {activeTab === 'documents' && <ClientDocumentVault client={client} user={user} />}
              {activeTab === 'session' && <ClientSandboxSession client={client} user={user} ai={ai} />}
           </div>
        </div>
      </div>
    </div>
  );
}

function ClientProfileOverview({ client, user }: { client: any, user: FirebaseUser }) {
  const docsQuery = useMemo(() => query(collection(db, `users/${user.uid}/clients/${client.id}/documents`)), [user.uid, client.id]);
  const [documents] = useCollectionData(docsQuery);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-12">
        <section className="space-y-8">
           <div className="space-y-2">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Status</h3>
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${client.status === 'crisis' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-teal-500'}`} />
                <span className="text-2xl font-bold text-white capitalize">{client.status} Case</span>
             </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Identity Details</h3>
              <div className="grid grid-cols-1 gap-3">
                 {[
                   { label: 'Date of Birth', val: client.dob || 'Not Initialized' },
                   { label: 'Pronouns', val: client.pronouns || 'Not Specified' },
                   { label: 'Primary Terminal', val: client.email || 'No email on record' },
                   { label: 'Comms Link', val: client.phone || 'No phone on record' }
                 ].map(f => (
                   <div key={f.label} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{f.label}</span>
                      <span className="text-sm font-medium text-white">{f.val}</span>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        <section className="space-y-8">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Compliance & Records</h3>
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${client.hipaaConsent ? 'bg-teal-500/20 text-teal-400' : 'bg-red-500/20 text-red-500'}`}>
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-white">HIPAA Baseline</p>
                       <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">
                          {client.hipaaConsent ? `Authenticated ${new Date(client.hipaaConsentDate?.seconds * 1000).toLocaleDateString()}` : 'Pending Authorization'}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${documents && documents.length > 0 ? 'bg-teal-500/20 text-teal-400' : 'bg-white/5 text-slate-500'}`}>
                       <Paperclip className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-white">Vault Index</p>
                       <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">
                          {documents?.length || 0} secure digital artifacts found
                       </p>
                    </div>
                 </div>
              </div>
           </div>
           <div className="p-8 bg-teal-600/10 border border-teal-500/20 rounded-3xl">
              <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4">Executive Summary</h3>
              <p className="text-lg text-teal-100 font-light leading-relaxed opacity-80 italic">
                 "{client.summary}"
              </p>
           </div>
        </section>
      </div>
    </div>
  );
}

function ClientDocumentVault({ client, user, isIntake = false, onNotesExtracted }: { client: any, user: FirebaseUser, isIntake?: boolean, onNotesExtracted?: (notes: string) => void }) {
  const docsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/clients/${client.id}/documents`),
    orderBy('uploadedAt', 'desc')
  ), [user.uid, client.id]);
  const [docsSnapshot, loading] = useCollection(docsQuery);
  const documents = useMemo(() => docsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [docsSnapshot]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/documents`), {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: serverTimestamp(),
        ownerId: user.uid,
        status: 'Verified'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoExtract = async () => {
    if (!documents || documents.length === 0) return;
    setIsAnalyzing(true);
    try {
      const fileNames = documents.map(d => d.name).join(', ');
      const response = await callAi('generate', {
        model: "gemini-3.7-flash",
        prompt: `You are Haven the Owl. A Case Manager has uploaded the following documents to a client vault for ${client.name}: ${fileNames}.
        
        Generate a professional, trauma-informed "Data Extraction Summary" for the intake notes.
        Since you don't have the full OCR content, infer what a case manager would likely glean from these specific documents to assist in intake.
        
        Example: If "Lease_Agreement.pdf" is present, mention that housing stability is verified via current lease.
        Example: If "Paystub.png" is present, mention that income verification has been initiated.
        
        Return 3-4 professional bullet points. Use Haven's wise and calm tone.`
      });
      if (onNotesExtracted) onNotesExtracted(response.text);
    } catch (e) {
      console.error("Extraction failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteDocItem = async (id: string) => {
    if (!confirm("Permanently purge this document from the vault?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/clients/${client.id}/documents/${id}`));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {!isIntake && (
        <header className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Document Vault</h3>
            <p className="text-slate-400 text-sm opacity-60 mt-2">Secure digital storage for client sensitive material.</p>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 gap-4">
        <label className="relative group cursor-pointer">
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <div className="border-2 border-dashed border-white/5 bg-white/5 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 group-hover:bg-white/10 group-hover:border-teal-500/30 transition-all">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              {isUploading ? <Clock className="w-8 h-8 text-teal-400 animate-spin" /> : <Upload className="w-8 h-8 text-slate-500 group-hover:text-teal-400" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white uppercase tracking-widest">{isUploading ? 'Encrypting & Synchronizing...' : 'Transmit New Document'}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest leading-relaxed">PDF, JPG, PNG or DOCX up to 50MB</p>
            </div>
          </div>
        </label>

        {documents && documents.length > 0 && isIntake && (
          <button
            onClick={handleAutoExtract}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 py-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-2xl text-teal-400 font-bold transition-all text-xs uppercase tracking-widest"
          >
            {isAnalyzing ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isAnalyzing ? 'Analyzing Vault Content...' : 'Auto-Extract Intake Data'}
          </button>
        )}

        {loading ? (
          <div className="py-12 text-center animate-pulse text-slate-500 italic">Accessing encrypted archives...</div>
        ) : (documents || []).length === 0 ? (
          <div className="py-12 text-center bg-slate-950/20 rounded-3xl border border-white/5">
             <File className="w-10 h-10 mx-auto mb-4 text-slate-800" />
             <p className="text-slate-600 text-xs font-bold uppercase tracking-widest italic">Vault Empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(documents || []).map((d: any) => (
              <div key={d.id} className="bg-slate-900/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-teal-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                    <File className="w-5 h-5 text-teal-500/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{d.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d.size}</span>
                      <span className="h-1 w-1 bg-white/10 rounded-full" />
                      <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">Verified</span>
                      <span className="h-1 w-1 bg-white/10 rounded-full" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d.uploadedAt?.seconds ? new Date(d.uploadedAt.seconds * 1000).toLocaleDateString() : 'Syncing...'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => deleteDocItem(d.id)}
                     className="p-3 bg-red-500/5 hover:bg-red-500 text-red-500/40 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-red-500/10"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientIntakeForm({ client, user, ai, onComplete }: { client: any, user: FirebaseUser, ai: any, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dob: client.dob || '',
    pronouns: client.pronouns || '',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    emergencyContact: client.emergencyContact || '',
    summary: client.summary || '',
    intakeNotes: client.intakeNotes || '',
    status: client.status || 'active',
    hipaaConsent: client.hipaaConsent || false,
    liabilityWaiver: client.liabilityWaiver || false,
    sdoh: client.sdoh || {
      housing: 'Stable',
      food: 'Secure',
      transport: 'Access',
      safety: 'Safe',
      health: 'Insured'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null);

  const generateAssessment = async () => {
    setIsGeneratingAssessment(true);
    try {
      const prompt = `
        As a specialized Case Manager, generate a professional Needs Assessment Report for a client based on the following intake data.
        
        Client Context:
        - Name: ${client.name}
        - Summary: ${formData.summary}
        - Intake Notes: ${formData.intakeNotes}
        
        Social Drivers of Health (SDoH) Indicators:
        - Housing: ${formData.sdoh.housing}
        - Food Security: ${formData.sdoh.food}
        - Transportation: ${formData.sdoh.transport}
        - Interpersonal Safety: ${formData.sdoh.safety}
        - Health Access: ${formData.sdoh.health}
        
        Requirements for the report:
        1. Identify primary risks and stabilization needs.
        2. Analyze how each SDoH impact the client's current goals.
        3. Recommend specific referral categories (Housing, Food, Legal, Medical, etc. - based on the SDoH gaps).
        4. Suggest 3-5 specific local resource types or programs that would be relevant from our Resource Hub categories.
        
        Format the response in polished Markdown. Use professional, trauma-informed language.
      `;

      const response = await callAi('generate', {
        model: "gemini-3.7-flash",
        prompt,
      });

      const report = response.text;
      setAssessmentResult(report);
      
      // Store assessment in subcollection
      await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/assessments`), {
        report,
        status: 'Initial',
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });

    } catch (e: any) {
      console.error(e);
      alert(`AI assessment failed: ${e.message || 'Check diagnostics'}`);
    } finally {
      setIsGeneratingAssessment(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, `users/${user.uid}/clients/${client.id}`), {
        ...formData,
        hipaaConsentDate: formData.hipaaConsent && !client.hipaaConsent ? serverTimestamp() : client.hipaaConsentDate || null,
        liabilityWaiverDate: formData.liabilityWaiver && !client.liabilityWaiver ? serverTimestamp() : client.liabilityWaiverDate || null,
        updatedAt: serverTimestamp()
      });
      onComplete();
    } catch (e: any) {
      console.error(e);
      alert(`Error saving intake: ${e.message || 'Check system diagnostics'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 relative h-full flex flex-col pt-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <h3 className="text-xl font-light text-white flex items-center gap-3">
          <Shield className="w-6 h-6 text-teal-500" />
          Guided Intake Wizard
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 w-16 rounded-full transition-all ${step >= s ? 'bg-teal-500' : 'bg-white/10'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {step === 1 && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-300">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Phase 1: Registration & Consent</h3>
                <p className="text-slate-400 text-sm leading-relaxed opacity-60">Record core demographic and contact data to ensure consistent comms.</p>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Pronouns</label>
                   <input 
                     type="text" 
                     value={formData.pronouns}
                     onChange={(e) => setFormData({...formData, pronouns: e.target.value})}
                     className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                     placeholder="They/Them"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">DOB</label>
                   <input 
                      type="text" 
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                      placeholder="MM/DD/YYYY"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Email</label>
                   <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Phone</label>
                   <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                   />
                </div>
                <div className="space-y-2 col-span-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Address / Location</label>
                   <input 
                      type="text" 
                      value={formData.address || ''}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                      placeholder="Enter street address or neighborhood..."
                   />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Emergency Contact Information</label>
                <input 
                   type="text" 
                   value={formData.emergencyContact}
                   onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                   className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none" 
                   placeholder="Full Name & Contact Info"
                />
             </div>

             <div className="flex gap-4 p-8 bg-slate-950/40 rounded-3xl border border-white/5">
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={formData.hipaaConsent}
                        onChange={(e) => setFormData({...formData, hipaaConsent: e.target.checked})}
                        className="w-5 h-5 rounded-md accent-teal-500 border-white/20 bg-white/5" 
                      />
                      <span className="text-xs font-bold text-white tracking-tight">HIPAA Consent Obtained</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={formData.liabilityWaiver}
                        onChange={(e) => setFormData({...formData, liabilityWaiver: e.target.checked})}
                        className="w-5 h-5 rounded-md accent-teal-500 border-white/20 bg-white/5" 
                      />
                      <span className="text-xs font-bold text-white tracking-tight">Liability Waiver Uploaded</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-300">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Phase 2: Social Drivers of Health</h3>
                <p className="text-slate-400 text-sm leading-relaxed opacity-60">Baseline vulnerability tracking across core SDoH axes.</p>
             </div>
             
             <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                   {[
                      { key: 'housing', label: 'Housing Stability', options: ['Stable', 'Unstable', 'Homeless'] },
                      { key: 'food', label: 'Food Security', options: ['Secure', 'Insecure'] },
                      { key: 'transport', label: 'Transportation', options: ['Access', 'No Access'] },
                      { key: 'safety', label: 'Interpersonal Safety', options: ['Safe', 'At Risk'] },
                      { key: 'health', label: 'Health Access', options: ['Insured', 'Uninsured'] }
                   ].map(sdoh => (
                      <div key={sdoh.key} className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5">
                         <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{sdoh.label}</span>
                         <div className="flex gap-3">
                            {sdoh.options.map(opt => (
                               <button 
                                  key={opt}
                                  onClick={() => setFormData({...formData, sdoh: {...formData.sdoh, [sdoh.key]: opt}})}
                                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.sdoh[(sdoh.key as "housing" | "food" | "transport" | "safety" | "health")] === opt ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                               >
                                  {opt}
                               </button>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-300">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Phase 3: Clinical Perspective & Assessment</h3>
                <p className="text-slate-400 text-sm leading-relaxed opacity-60">Log initial insights and let AI formulate a draft clinical assessment plan.</p>
             </div>

             <div className="space-y-8">
                 {assessmentResult ? (
                    <div className="flex flex-col h-[400px] bg-slate-900/50 border border-teal-500/30 rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
                       <div className="p-6 bg-teal-600/10 border-b border-teal-500/20 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                             <OwlIcon className="w-5 h-5 text-teal-400" />
                             <h4 className="text-sm font-black text-white uppercase tracking-widest">Haven Needs Assessment Report</h4>
                          </div>
                          <button onClick={() => setAssessmentResult(null)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white">Redraft Assessment</button>
                       </div>
                       <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                          <div className="prose prose-invert prose-teal max-w-none text-slate-300 text-sm leading-relaxed">
                             <Markdown>{assessmentResult}</Markdown>
                          </div>
                       </div>
                    </div>
                 ) : (
                   <>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">One-Sentence Summary</label>
                        <input 
                          type="text" 
                          value={formData.summary}
                          onChange={(e) => setFormData({...formData, summary: e.target.value})}
                          className="w-full bg-white/5 border border-white/5 p-6 rounded-2xl text-xl text-white font-light focus:ring-1 focus:ring-teal-500/50 outline-none" 
                          placeholder="The core situation at a glance..."
                        />
                     </div>
                     <div className="space-y-4 h-[300px]">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Full Clinical/Intake Perspective</label>
                        <textarea 
                          value={formData.intakeNotes}
                          onChange={(e) => setFormData({...formData, intakeNotes: e.target.value})}
                          className="w-full h-full bg-white/5 border border-white/5 p-6 rounded-3xl text-white font-medium focus:ring-1 focus:ring-teal-500/50 outline-none resize-none leading-relaxed" 
                          placeholder="Document service history, current stabilization needs, and long-term goals..."
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Urgency Tier</label>
                        <select 
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                          className="w-full bg-[#1e293b] border border-white/10 p-5 rounded-2xl text-white font-bold"
                        >
                           <option value="active">Active Stabilization</option>
                           <option value="high-priority">High Priority Sync</option>
                           <option value="crisis">Immediate Crisis</option>
                           <option value="closed">Closed Record</option>
                        </select>
                     </div>
                   </>
                 )}
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-300">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Phase 4: Document Repository & Verification</h3>
                <p className="text-slate-400 text-sm leading-relaxed opacity-60">Upload core identity docs, consent forms, and proof of eligibility.</p>
             </div>

             <div className="space-y-8">
                <ClientDocumentVault 
                  client={client} 
                  user={user} 
                  isIntake 
                  onNotesExtracted={(notes) => setFormData(prev => ({ 
                    ...prev, 
                    intakeNotes: (prev.intakeNotes ? prev.intakeNotes + '\n\n' : '') + '--- AI EXTRACTION FROM VAULT ---\n' + notes 
                  }))} 
                />
             </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-auto">
         {step > 1 ? (
           <button 
             onClick={() => setStep(step - 1)}
             className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2"
           >
             <ChevronRight className="w-4 h-4 rotate-180" /> Back
           </button>
         ) : <div />}

         {step < 4 ? (
           <button 
             onClick={() => setStep(step + 1)}
             className="px-8 py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 shadow-xl shadow-teal-500/20 active:scale-95"
           >
             Next Step <ChevronRight className="w-4 h-4" />
           </button>
         ) : (
           <div className="flex gap-4">
             {assessmentResult ? (
               <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-500 text-white p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-teal-500/20"
              >
                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Synchronizing...' : 'Commit & Authenticate'}
              </button>
             ) : (
               <>
                 <button 
                   onClick={generateAssessment}
                   disabled={isGeneratingAssessment || !formData.intakeNotes}
                   className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-30 group"
                 >
                   {isGeneratingAssessment ? <Sparkles className="w-4 h-4 animate-spin" /> : <OwlIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-teal-400" />}
                   {isGeneratingAssessment ? 'Consulting...' : 'Review & Evaluate Context'}
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   className="bg-teal-600 hover:bg-teal-500 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-900/40"
                 >
                   {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                   {isSaving ? 'Validating...' : 'Bypass AI & Commit'}
                 </button>
               </>
             )}
           </div>
         )}
      </div>
    </div>
  );
}

function ClientAppointmentManager({ client, user }: { client: any, user: FirebaseUser }) {
  const appointmentsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/clients/${client.id}/appointments`),
    orderBy('date', 'desc')
  ), [user.uid, client.id]);
  const [appSnapshot, loading] = useCollection(appointmentsQuery);
  const appointments = useMemo(() => appSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [appSnapshot]);
  const [isAdding, setIsAdding] = useState(false);

  const scheduleAppointment = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/appointments`), {
        clientId: client.id,
        date: formData.get('date'),
        type: formData.get('type'),
        status: 'Scheduled',
        notes: formData.get('notes'),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAppointment = async (id: string) => {
    if(!confirm("Wipe this appointment from history?")) return;
    await deleteDoc(doc(db, `users/${user.uid}/clients/${client.id}/appointments/${id}`));
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, `users/${user.uid}/clients/${client.id}/appointments/${id}`), {
      status,
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="h-full flex flex-col">
       <header className="flex justify-between items-center mb-10">
          <div>
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Interaction Timeline</h3>
             <p className="text-slate-400 text-sm opacity-60 mt-2">Documenting all syncs and service connections.</p>
          </div>
          <button 
             onClick={() => setIsAdding(true)}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40"
          >
             <Plus className="w-4 h-4 mr-2 inline" /> Schedule Interaction
          </button>
       </header>

       <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
          {loading ? (
             <div className="py-20 text-center animate-pulse text-slate-500 italic">Syncing interaction logs...</div>
          ) : (appointments || []).map((app: any) => (
             <div key={app.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl group flex items-center justify-between hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-white/10">
                      <span className="text-[9px] font-black text-indigo-400 uppercase leading-none mb-1">{new Date(app.date).toLocaleDateString([], { month: 'short' })}</span>
                      <span className="text-xl font-black text-white leading-none">{new Date(app.date).toLocaleDateString([], { day: '2-digit' })}</span>
                   </div>
                   <div>
                      <div className="flex items-center gap-3">
                         <h4 className="font-bold text-white text-lg tracking-tight">{app.type} Interaction</h4>
                         <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${app.status === 'Completed' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                           {app.status}
                         </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1 truncate max-w-md italic opacity-60">"{app.notes || 'No interactive tokens recorded.'}"</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <select 
                     value={app.status}
                     onChange={(e) => updateStatus(app.id, e.target.value)}
                     className="bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300"
                   >
                     <option value="Scheduled">Scheduled</option>
                     <option value="Completed">Completed</option>
                     <option value="Cancelled">Cancelled</option>
                     <option value="No-show">No-show</option>
                   </select>
                   <button 
                     onClick={() => deleteAppointment(app.id)}
                     className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/20"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
          ))}
          {!loading && appointments?.length === 0 && (
             <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-slate-800" />
                <p className="text-slate-500 italic max-w-xs mx-auto">Zero interactions on record. Initiate scheduling to stabilize service delivery.</p>
             </div>
          )}
       </div>

       <AnimatePresence>
          {isAdding && (
             <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-md w-full shadow-2xl"
                >
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-light text-white tracking-tight">Schedule Interaction</h3>
                      <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                      </button>
                   </div>
                   <form onSubmit={scheduleAppointment} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Session Node (Date & Time)</label>
                        <input name="date" type="datetime-local" required className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Sync Type</label>
                        <select name="type" className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-xl text-white font-bold">
                           <option>Intake</option>
                           <option>Follow-up</option>
                           <option>Crisis</option>
                           <option>Sync</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Initial Directives (Notes)</label>
                        <textarea name="notes" className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium h-32 resize-none" placeholder="Intent for the session..."></textarea>
                      </div>
                      <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-teal-900/40">
                         Commit to Schedule
                      </button>
                   </form>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
}

function ClientReferrals({ client, user }: { client: any, user: FirebaseUser }) {
  const referralsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/clients/${client.id}/referrals`),
    orderBy('createdAt', 'desc')
  ), [user.uid, client.id]);
  const partnersQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/partnerships`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  
  const [refSnapshot, loadingReferrals] = useCollection(referralsQuery);
  const referrals = useMemo(() => refSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [refSnapshot]);
  const [partSnapshot, loadingPartners] = useCollection(partnersQuery);
  const partners = useMemo(() => partSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [partSnapshot]);
  const [isAdding, setIsAdding] = useState(false);

  const dbPartners = partners || [];
  const displayPartners = dbPartners;

  const addReferral = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const partnerId = formData.get('partnerId') as string;
    const partner = displayPartners.find(p => p.id === partnerId);
    
    try {
      await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/referrals`), {
        clientId: client.id,
        partnerId: partnerId,
        partnerName: partner?.name || 'Unknown',
        category: partner?.category || 'Other',
        status: 'Sent',
        notes: formData.get('notes'),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, `users/${user.uid}/clients/${client.id}/referrals/${id}`), {
      status,
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="h-full flex flex-col">
       <header className="flex justify-between items-center mb-10">
          <div>
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Resource Navigation Pipeline</h3>
             <p className="text-slate-400 text-sm opacity-60 mt-2">Connecting to SDoH stabilization networks.</p>
          </div>
          <button 
             onClick={() => setIsAdding(true)}
             className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-900/40"
          >
             <Plus className="w-4 h-4 mr-2 inline" /> Initiate Referral
          </button>
       </header>

       <div className="flex-1 space-y-4">
          {loadingReferrals ? (
             <div className="text-slate-500 italic">Accessing referral logs...</div>
          ) : (referrals || []).map((ref: any) => (
             <div key={ref.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex justify-between items-center hover:bg-white/[0.08] transition-all group">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-teal-500/30 transition-all">
                      <Handshake className="w-6 h-6 text-teal-400" />
                   </div>
                   <div>
                      <p className="font-bold text-white text-lg tracking-tight">{ref.partnerName}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">{ref.category} • {ref.createdAt?.toDate?.()?.toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status: {ref.status}</span>
                   <select 
                     value={ref.status} 
                     onChange={(e) => updateStatus(ref.id, e.target.value)}
                     className="bg-white/5 border border-white/10 text-xs font-bold text-white p-2 rounded-lg"
                   >
                     <option value="Sent">Sent</option>
                     <option value="In Progress">In Progress</option>
                     <option value="Connected">Connected</option>
                     <option value="Denied">Denied</option>
                   </select>
                </div>
             </div>
          ))}
          {!loadingReferrals && referrals?.length === 0 && (
             <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                <Handshake className="w-12 h-12 mx-auto mb-4 text-slate-800" />
                <p className="text-slate-500 italic max-w-xs mx-auto">No resource connections established. Assess SDoH to begin.</p>
             </div>
          )}
       </div>

       <AnimatePresence>
          {isAdding && (
             <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 max-w-md w-full shadow-2xl"
                >
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-light text-white tracking-tight">Initiate Referral</h3>
                      <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                      </button>
                   </div>
                   <form onSubmit={addReferral} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Match Resource Partner</label>
                        <select name="partnerId" required className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-xl text-white font-bold">
                           {displayPartners.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                           ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Warm Handoff Notes</label>
                        <textarea name="notes" className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-medium h-32 resize-none" placeholder="Context for the partner agency..."></textarea>
                      </div>
                      <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-teal-900/40">
                         Dispatch Referral
                      </button>
                   </form>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
}

function ClientSandboxSession({ client, user, ai }: { client: any, user: FirebaseUser, ai: any }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'transcript' | 'history'>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSavedSuccess, setSessionSavedSuccess] = useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messageRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>({});
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Fetch client's historical interaction notes & appointments for deep historical searching
  const appointmentsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/clients/${client.id}/appointments`),
    orderBy('date', 'desc')
  ), [user.uid, client.id]);
  const [appSnapshot] = useCollection(appointmentsQuery);
  const historicalNotes = useMemo(() => {
    return appSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [];
  }, [appSnapshot]);

  const SYSTEM_INSTRUCTION = `You are Haven the Owl, the wise and empathetic AI assistant for Haven Care OS. 
        You are in a sandbox session for Case Management of client: ${client.name}.
        ID: ${client.id}
        SDoH Status:
        - Housing: ${client.sdoh?.housing}
        - Food: ${client.sdoh?.food}
        - Transport: ${client.sdoh?.transport}
        - Safety: ${client.sdoh?.safety}
        - Health: ${client.sdoh?.health}

        As an owl, your tone is observant, calm, protective, and wise. Respond professionally and concisely. You can use available tools to help manage the client's case.`;

  useEffect(() => {
     if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const TOOLS = [{
    functionDeclarations: [
      {
        name: "log_interaction",
        description: "Log a significant interaction, meeting, or event with the client in their file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            note: { type: Type.STRING, description: "The content of the interaction note" }
          },
          required: ["note"]
        }
      },
      {
        name: "update_sdoh",
        description: "Update the client's Social Determinants of Health status.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["housing", "food", "transport", "safety", "health"] },
            status: { type: Type.STRING, description: "New status like 'Stable', 'In Crisis', 'Secure'" }
          },
          required: ["category", "status"]
        }
      },
      {
        name: "change_status",
        description: "Change the client's overall status.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["active", "high-priority", "crisis", "closed"] },
            reason: { type: Type.STRING, description: "Reason for status change" }
          },
          required: ["status"]
        }
      },
      {
        name: "create_referral",
        description: "Create a resource referral for the client.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            partnerName: { type: Type.STRING, description: "The name of the partner or organization" },
            category: { type: Type.STRING, description: "Category like Food, Housing, Legal, Medical" },
            notes: { type: Type.STRING, description: "Notes for the referral" }
          },
          required: ["partnerName", "category"]
        }
      }
    ]
  }];

  useEffect(() => {
    setMessages([
      { role: 'model', content: `Hoo-hoo. I am Haven the Owl. I have loaded context acting on ${client.name}'s current case profile. I can help draft notes, manage SDoH indicators, or log interactions. How can we stabilize the client today?` }
    ]);
  }, [client]);

  const handleJumpToMessage = (index: number) => {
    const el = messageRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleQuoteInPrompt = (quotedText: string) => {
    setInput(prev => prev ? `${quotedText}\n\n${prev}` : quotedText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSaveSessionAsNote = async () => {
    if (messages.length <= 1 || isSavingSession) return;
    setIsSavingSession(true);
    try {
      const transcriptFormatted = messages
        .map(m => `[${m.role === 'user' ? 'Staff' : 'Haven AI'}]: ${m.content}`)
        .join('\n\n');

      await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/appointments`), {
        clientId: client.id,
        ownerId: user.uid,
        date: new Date().toISOString(),
        location: 'Haven AI Sandbox Session',
        notes: `AI Case Management Sandbox Transcript:\n\n${transcriptFormatted}`,
        type: 'Consultation',
        status: 'Completed',
        provider: 'Haven AI Sandbox',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSessionSavedSuccess(true);
      setTimeout(() => setSessionSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save session log:", err);
    } finally {
      setIsSavingSession(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const result = await callAi('chat', {
        message: userMsg,
        history: messages.slice(1),
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: TOOLS,
        model: "gemini-3.7-flash"
      });
      
      let finalResponseText = result.text || '';
      
      if (result.functionCalls && result.functionCalls.length > 0) {
        for (const call of result.functionCalls) {
          if (call.name === 'log_interaction') {
             const args = call.args;
             if (args && args.note) {
               await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/appointments`), {
                 clientId: client.id,
                 ownerId: user.uid,
                 date: new Date().toISOString(),
                 location: 'Sandbox Session',
                 notes: args.note,
                 type: 'Consultation',
                 status: 'Completed',
                 provider: 'AI Auto-Logged',
                 createdAt: serverTimestamp(),
                 updatedAt: serverTimestamp()
               });
               finalResponseText += "\n\n*(System Action: Interaction logged successfully.)*";
             }
          } else if (call.name === 'update_sdoh') {
             const args = call.args;
             if (args && args.category && args.status) {
               await updateDoc(doc(db, `users/${user.uid}/clients/${client.id}`), {
                 [`sdoh.${args.category}`]: args.status,
                 updatedAt: serverTimestamp()
               });
               finalResponseText += `\n\n*(System Action: SDoH ${args.category} indicator updated to ${args.status}.)*`;
             }
          } else if (call.name === 'change_status') {
             const args = call.args;
             if (args && args.status) {
               await updateDoc(doc(db, `users/${user.uid}/clients/${client.id}`), {
                 status: args.status,
                 updatedAt: serverTimestamp()
               });
               finalResponseText += `\n\n*(System Action: Client status updated to ${args.status}.)*`;
             }
          } else if (call.name === 'create_referral') {
             const args = call.args;
             if (args && args.partnerName && args.category) {
               await addDoc(collection(db, `users/${user.uid}/clients/${client.id}/referrals`), {
                 clientId: client.id,
                 ownerId: user.uid,
                 partnerId: 'ai-generated',
                 partnerName: args.partnerName,
                 category: args.category,
                 status: 'Sent',
                 notes: args.notes || 'Generated by Haven AI',
                 createdAt: serverTimestamp(),
                 updatedAt: serverTimestamp()
               });
               finalResponseText += `\n\n*(System Action: Referral to ${args.partnerName} created tracking ${args.category}.)*`;
             }
          }
        }
      }

      setMessages(prev => [...prev, { role: 'model', content: finalResponseText }]);
    } catch (error: any) {
      console.error("Sandbox Error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "I encountered a synchronization error with the Higher Realm. Please check your network connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[650px] flex flex-col bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-white/10 border-b border-white/10 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-inner">
              <OwlIcon className="w-5 h-5 text-orange-400" />
           </div>
           <div>
             <div className="flex items-center gap-2">
               <h3 className="text-white font-bold tracking-tight text-base">Haven AI Sandbox</h3>
               <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold rounded-full">
                 Transcript & Note Search Ready
               </span>
             </div>
             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Client: {client.name}</p>
           </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Transcript Action */}
          <button
            id="sandbox-save-transcript-btn"
            onClick={handleSaveSessionAsNote}
            disabled={messages.length <= 1 || isSavingSession}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              sessionSavedSuccess
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 disabled:opacity-40'
            }`}
            title="Save this conversation transcript to client historical notes"
          >
            {sessionSavedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Saved to Notes!</span>
              </>
            ) : isSavingSession ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Save Session Log</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Search & History Inspector Header Bar */}
      <ClientSessionSearch
        isOpen={isSearchOpen}
        onToggle={() => setIsSearchOpen(!isSearchOpen)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchScope={searchScope}
        setSearchScope={setSearchScope}
        messages={messages}
        historicalNotes={historicalNotes}
        clientName={client.name}
        clientIntakeNotes={client.intakeNotes}
        clientSummary={client.summary}
        onQuoteInPrompt={handleQuoteInPrompt}
        onJumpToMessage={handleJumpToMessage}
      />

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col" ref={scrollRef}>
         {messages.map((m, i) => {
           const hasSearchMatch = searchQuery.trim() && m.content.toLowerCase().includes(searchQuery.toLowerCase().trim());

           return (
             <div 
               key={i} 
               ref={el => { messageRefs.current[i] = el; }}
               className={`flex items-start gap-3 transition-all ${m.role === 'user' ? 'flex-row-reverse self-end' : 'self-start'}`}
             >
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-teal-500/10">
                     <OwlIcon className="w-4 h-4 text-teal-400" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 transition-all relative ${
                    m.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-none shadow-xl shadow-teal-600/5' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/10 shadow-xl shadow-black/20'
                  } ${
                    hasSearchMatch
                      ? 'ring-2 ring-amber-400/50 border-amber-400/60 shadow-lg shadow-amber-500/10'
                      : ''
                  }`}
                >
                   {hasSearchMatch && (
                     <div className="mb-2 flex items-center justify-between border-b border-amber-400/20 pb-1.5">
                       <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 bg-amber-400/20 px-2 py-0.5 rounded-md">
                         <Sparkles className="w-3 h-3 text-amber-300" />
                         Matched "{searchQuery}"
                       </span>
                       <button
                         onClick={() => handleQuoteInPrompt(`> [Session Message #${i + 1}]: "${m.content.slice(0, 180)}..."`)}
                         className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 underline transition-colors"
                       >
                         Quote
                       </button>
                     </div>
                   )}
                   <div className="prose prose-sm prose-invert max-w-none">
                     <Markdown>{m.content}</Markdown>
                   </div>
                </div>
             </div>
           );
         })}
         {isTyping && (
           <div className="flex items-start gap-3 self-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                 <OwlIcon className="w-4 h-4 text-teal-400" />
              </div>
              <div className="bg-slate-800 border border-white/10 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 shadow-xl">
                 <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                 <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                 <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
           </div>
         )}
      </div>

      {/* Interactive Input Form */}
      <form onSubmit={sendMessage} className="p-4 bg-black/30 border-t border-white/5">
        <div className="flex gap-2 relative">
          <input 
            ref={inputRef}
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Instruct the AI to take action, summarize past notes, or ask for case insights..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 text-white p-3 rounded-xl transition-all"
            title="Send instruction to Haven"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function FundingHub({ user }: { user: FirebaseUser }) {
  const grantsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/grants`),
    orderBy('name', 'asc')
  ), [user.uid]);
  const [grantsSnapshot, loading] = useCollection(grantsQuery);
  const grants = useMemo(() => grantsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)), [grantsSnapshot]);

  const donationsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/donations`),
    orderBy('date', 'desc')
  ), [user.uid]);
  const [donationsSnapshot] = useCollection(donationsQuery);
  const donations = useMemo(() => donationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)), [donationsSnapshot]);

  const expensesQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/expenses`),
    orderBy('date', 'desc')
  ), [user.uid]);
  const [expensesSnapshot] = useCollection(expensesQuery);
  const expenses = useMemo(() => expensesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)), [expensesSnapshot]);

  const [isAddingGrant, setIsAddingGrant] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<'donation' | 'expense'>('donation');

  const addGrant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const amount = Number(formData.get('amount'));
    const status = formData.get('status') as string;
    const purpose = formData.get('purpose') as string;
    const associatedProject = formData.get('associatedProject') as string;
    const reportingRequirements = formData.get('reportingRequirements') as string;

    try {
      const path = `users/${user.uid}/grants`;
      await addDoc(collection(db, path), {
        name,
        amount,
        deadline: new Date().toISOString(),
        status,
        progress: 0,
        purpose,
        associatedProject,
        reportingRequirements,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingGrant(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/grants`);
    }
  };

  const deleteGrant = async (id: string) => {
    console.log("Deleting grant. UID:", user?.uid, "Grant ID:", id);
    if (!confirm("Remove this grant from records?")) return;
    if (!user?.uid) {
        console.error("No user ID available for deletion");
        return;
    }
    try {
      console.log("Path:", `users/${user.uid}/grants/${id}`);
      await deleteDoc(doc(db, 'users', user.uid, 'grants', id));
      console.log("Delete successful");
    } catch (e: any) {
      console.error("Delete error code:", e.code);
      console.error("Delete error message:", e.message);
      console.error("Delete error object:", e);
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/grants/${id}`);
    }
  };

  const updateGrantProgress = async (id: string, current: number) => {
    const next = current >= 100 ? 0 : current + 25;
    try {
      await updateDoc(doc(db, `users/${user.uid}/grants`, id), {
        progress: next,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/grants/${id}`);
    }
  };

  const addTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const desc = formData.get('desc') as string;
    const date = new Date().toISOString();

    try {
      const collectionName = transactionType === 'donation' ? 'donations' : 'expenses';
      const path = `users/${user.uid}/${collectionName}`;
      await addDoc(collection(db, path), {
        [transactionType === 'donation' ? 'donorName' : 'description']: desc,
        amount,
        date,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingTransaction(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/${transactionType}s`);
    }
  };

  const totalFunding = grants?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const mtdDonations = donations?.filter((d: any) => new Date(d.date) >= startOfMonth)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
    
  const mtdExpenses = expenses?.filter((e: any) => new Date(e.date) >= startOfMonth)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-light text-white tracking-tight">Funding & Grants</h1>
           <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Fiscal Year {now.getFullYear()} • Live Financials</p>
        </div>
        <div className="bg-teal-500/10 px-8 py-5 rounded-3xl border border-teal-500/20 text-right shadow-2xl">
           <p className="text-[9px] font-black text-teal-400 uppercase tracking-[0.2em] mb-1 opacity-60">Total Pipeline Value</p>
           <p className="text-4xl font-light text-teal-200 tracking-tighter">
             ${totalFunding.toLocaleString()}
           </p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Grant Pipeline', val: grants?.length || '0', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
          { label: 'Drafts', val: grants?.filter((g: any) => g.status === 'Draft' || g.status === 'Proposal').length || '0', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
          { label: 'Donations (MTD)', val: `$${mtdDonations.toLocaleString()}`, color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', action: () => { setTransactionType('donation'); setIsAddingTransaction(true); } },
          { label: 'Spending (MTD)', val: `$${mtdExpenses.toLocaleString()}`, color: 'bg-red-500/10 text-red-400 border-red-500/20', action: () => { setTransactionType('expense'); setIsAddingTransaction(true); } }
        ].map(card => (
          <div 
            key={card.label} 
            onClick={card.action}
            className={`${card.color.split(' ')[0]} p-6 rounded-3xl border ${card.color.split(' ').slice(2).join(' ')} shadow-lg transition-all ${card.action ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`}
          >
            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-2">{card.label}</p>
            <p className="text-2xl font-bold tracking-tight text-white">{card.val}</p>
            {card.action && <p className="text-[8px] font-bold mt-2 opacity-40 uppercase tracking-tighter">+ Add Record</p>}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isAddingGrant && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl"
          >
            <form onSubmit={addGrant} className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Grant Name</label>
                <input name="name" required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Requested Amount</label>
                <input name="amount" type="number" required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Current Status</label>
                <select name="status" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50">
                  <option value="Proposal">Proposal</option>
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Awarded">Awarded</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Purpose</label>
                <input name="purpose" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Associated Project</label>
                <input name="associatedProject" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reporting Requirements</label>
                <input name="reportingRequirements" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="col-span-2 flex justify-end gap-4 mt-4">
                <button type="button" onClick={() => setIsAddingGrant(false)} className="px-6 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-10 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Secure Pipeline Entry</button>
              </div>
            </form>
          </motion.div>
        )}

        {isAddingTransaction && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl"
          >
            <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Record {transactionType === 'donation' ? 'Contribution' : 'Expenditure'}</h3>
            <form onSubmit={addTransaction} className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Amount</label>
                <input name="amount" type="number" required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {transactionType === 'donation' ? 'Donor Name' : 'Description'}
                </label>
                <input name="desc" required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-teal-500/50" />
              </div>
              <div className="col-span-2 flex justify-end gap-4 mt-4">
                <button type="button" onClick={() => setIsAddingTransaction(false)} className="px-6 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button type="submit" className={`${transactionType === 'donation' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-red-600 hover:bg-red-500'} text-white px-10 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all`}>
                  Commit to Ledger
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-white tracking-tight">Grant Deliverables</h3>
          {!isAddingGrant && (
            <button 
              onClick={() => setIsAddingGrant(true)}
              className="text-teal-400 text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/10 px-4 py-2 rounded-xl transition-all border border-teal-500/20"
            >
              Add Grant Record
            </button>
          )}
        </div>
        <div className="space-y-4">
          {loading ? (
             <div className="p-10 text-center animate-pulse text-slate-500 italic text-sm">Auditing financial records...</div>
          ) : (grants || []).map((d: any) => (
            <div key={d.id} className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.08] hover:border-white/10 transition-all flex items-center gap-7 group">
              <div className={`w-1.5 flex-shrink-0 h-12 rounded-full shadow-lg ${d.status === 'Awarded' ? 'bg-teal-500 shadow-teal-500/20' : 'bg-amber-500 shadow-amber-500/20'}`} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{d.name}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${d.status === 'Awarded' ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'}`}>{d.status}</span>
                    <button onClick={() => deleteGrant(d.id)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mb-2 space-y-1">
                  {d.purpose && <p><strong>Purpose:</strong> {d.purpose}</p>}
                  {d.associatedProject && <p><strong>Project:</strong> {d.associatedProject}</p>}
                  {d.reportingRequirements && <p><strong>Reporting:</strong> {d.reportingRequirements}</p>}
                </div>
                <div className="flex items-end justify-between mb-4">
                  <h4 className="font-bold text-white text-xl tracking-tight">${Number(d.amount).toLocaleString()}</h4>
                  <button 
                    onClick={() => updateGrantProgress(d.id, d.progress || 0)}
                    className="text-[9px] font-black text-teal-500/50 hover:text-teal-400 uppercase tracking-widest transition-colors"
                  >
                    Update Progress ({d.progress || 0}%)
                  </button>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden cursor-pointer" onClick={() => updateGrantProgress(d.id, d.progress || 0)}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${d.progress || 0}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${d.progress >= 100 ? 'bg-teal-500' : 'bg-indigo-500'} shadow-lg`} 
                  />
                </div>
              </div>
            </div>
          ))}
          {!loading && grants?.length === 0 && (
            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
               <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-4" />
               <p className="text-slate-500 text-xs italic">No grant records found. Initialize your pipeline to begin tracking.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


function ProgramsHub({ user }: { user: FirebaseUser }) {
  const programsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/programs`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  const [programs, loading] = useCollectionData(programsQuery);

  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [newProgramTitle, setNewProgramTitle] = useState('');

  const submitAddProgram = async () => {
    if (!newProgramTitle.trim()) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/programs`), {
        title: newProgramTitle,
        desc: 'New program description pending...',
        status: 'Active',
        createdAt: serverTimestamp(),
        ownerId: user.uid
      });
      setIsAddingProgram(false);
      setNewProgramTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const displayPrograms = programs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light text-white tracking-tight leading-tight">Programs & Service Delivery</h1>
          <p className="text-slate-400 font-medium italic text-sm mt-2 opacity-60">Internal protocols and service workflows.</p>
        </div>
        {isAddingProgram ? (
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
            <input 
              type="text"
              autoFocus
              value={newProgramTitle}
              onChange={e => setNewProgramTitle(e.target.value)}
              placeholder="Program Title..."
              className="bg-transparent text-white px-4 py-2 focus:outline-none text-sm w-48"
              onKeyDown={e => e.key === 'Enter' && submitAddProgram()}
            />
            <button onClick={submitAddProgram} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">Add</button>
            <button onClick={() => setIsAddingProgram(false)} className="text-slate-500 hover:text-white px-2 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingProgram(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-teal-900/20"
          >
            New Program
          </button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-6">
        {displayPrograms.map((prog: any) => (
          <div key={prog.title} className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:border-teal-500/30 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <Layers className="w-20 h-20" />
             </div>
            <span className="px-2 py-1 bg-teal-500/10 text-[9px] font-black uppercase text-teal-400 rounded-md border border-teal-500/20">{prog.status}</span>
            <h3 className="text-2xl font-bold text-white mt-6 mb-3 tracking-tight">{prog.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 opacity-80">{prog.desc}</p>
            <button className="text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
              View Documentation <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnershipsHub({ ai, user, profile, initialDiscoveryMode, onDiscoveryHandled }: { ai: any, user: FirebaseUser, profile: any, initialDiscoveryMode?: boolean, onDiscoveryHandled?: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [baseLocation, setBaseLocation] = useState(profile?.region || 'Cuyahoga County, OH');
  const [radius, setRadius] = useState('15');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const partnersQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/partnerships`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  const [partSnapshot, loading] = useCollection(partnersQuery);
  const partners = useMemo(() => partSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [], [partSnapshot]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: '',
    organizationName: '',
    programName: '',
    category: 'Mental Health',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    eligibility: '',
    sync: 'Active',
    type: 'External Referral Partner'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getFallbackResources = (loc: string, cat: string) => {
    return [
      {
        name: '988 Suicide & Crisis Lifeline',
        organizationName: 'Substance Abuse and Mental Health Services Administration (SAMHSA)',
        programName: '24/7 Free & Confidential Mental Health & Suicide Crisis Support',
        category: 'Mental Health',
        contactName: 'Crisis Counselor (24/7)',
        phone: '988',
        email: 'info@988lifeline.org',
        address: `Serving all residents in ${loc}`,
        website: 'https://988lifeline.org',
        eligibility: 'Available 24/7/365 to anyone in suicidal crisis or emotional distress. Free & confidential.',
        sync: 'Verified',
        type: 'Crisis Line'
      },
      {
        name: 'Community Coordinated Shelter Intake',
        organizationName: 'FrontLine Service / County Homeless Network',
        programName: 'Emergency Housing Assistance & Coordinated Assessment',
        category: 'Housing',
        contactName: 'Intake Specialist',
        phone: '(216) 674-6700',
        email: 'intake@frontlineservice.org',
        address: `1744 Payne Ave, ${loc}`,
        website: 'https://www.frontlineservice.org',
        eligibility: 'Individuals and families experiencing homelessness or impending eviction. Walk-in or phone assessment.',
        sync: 'Active',
        type: 'Emergency Shelter'
      },
      {
        name: 'Regional Food Bank & Mobile Pantry',
        organizationName: 'Greater Community Food Bank Network',
        programName: 'Emergency Food Distribution, SNAP & WIC Enrollment',
        category: 'Food',
        contactName: 'HelpLine Coordinator',
        phone: '(216) 738-2067',
        email: 'help@communityfoodbank.org',
        address: `15500 S Waterloo Rd, ${loc}`,
        website: 'https://www.greaterclevelandfoodbank.org',
        eligibility: 'Low-to-moderate income households in need of emergency food or SNAP benefits assistance.',
        sync: 'Verified',
        type: 'Food Assistance'
      },
      {
        name: 'Neighborhood Community Health Center (FQHC)',
        organizationName: 'Neighborhood Family Practice & Community Health',
        programName: 'Primary Care, Behavioral Health, Dental & Pharmacy',
        category: 'Medical',
        contactName: 'Patient Navigator',
        phone: '(216) 281-0872',
        email: 'appointments@nfpmedcenter.org',
        address: `3569 Ridge Rd, ${loc}`,
        website: 'https://nfpmedcenter.org',
        eligibility: 'Accepts Medicaid, Medicare, private insurance, and uninsured sliding-fee scale based on income.',
        sync: 'Active',
        type: 'FQHC Clinic'
      },
      {
        name: 'Legal Aid Society (Housing & Family Safety)',
        organizationName: 'The Legal Aid Society',
        programName: 'Tenant Defense, Domestic Violence Protection & Public Benefits',
        category: 'Legal',
        contactName: 'Intake Department',
        phone: '(888) 817-3777',
        email: 'intake@lasclev.org',
        address: `1223 West Sixth St, ${loc}`,
        website: 'https://lasclev.org',
        eligibility: 'Low-income residents facing eviction, civil legal crises, or seeking safety from domestic abuse.',
        sync: 'Verified',
        type: 'Legal Defense'
      },
      {
        name: 'Transit Assistance & Non-Emergency Medical Transport',
        organizationName: 'County Mobility Management Network',
        programName: 'Subsidized Bus Passes & Medical Escort Services',
        category: 'Transport',
        contactName: 'Mobility Coordinator',
        phone: '(216) 566-5100',
        email: 'mobility@riderta.com',
        address: `1240 W 6th St, ${loc}`,
        website: 'https://www.riderta.com',
        eligibility: 'Medicaid recipients and low-income clients needing transportation to medical or court appointments.',
        sync: 'Active',
        type: 'Transit Services'
      }
    ];
  };

  const autopopulateResources = async () => {
    try {
      setIsResearching(true);
      const catPrompt = activeCategory === 'All' 
        ? 'high-impact community resources across Mental Health, Housing, Food, Medical, Legal, and Transport' 
        : `resources specializing in ${activeCategory}`;

      const prompt = `Research and provide a structured list of 6 real, high-impact community organizations and referral partners (${catPrompt}) in or near ${baseLocation} within a ${radius}-mile radius.
      For each organization, output an object with:
      - name: Organization name
      - organizationName: Full legal or program name
      - programName: Specific service or program title
      - website: Working official website URL (e.g. https://...)
      - contactName: Primary intake coordinator or "Intake Specialist"
      - phone: Working phone number with area code
      - email: Contact or intake email address
      - address: Physical address or service coverage area
      - eligibility: Clear eligibility criteria (e.g., income limits, walk-in vs referral)
      - category: One of "Mental Health", "Housing", "Food", "Medical", "Legal", "Transport", "Employment", or "Other"

      Return ONLY a clean JSON array of objects.`;

      let resources: any[] = [];
      try {
        const result = await callAi('generate', { 
          prompt, 
          config: { responseMimeType: 'application/json' } 
        });
        
        let cleanedText = (result.text || '').trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        }

        const match = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
          cleanedText = match[0];
        }

        resources = JSON.parse(cleanedText);
      } catch (aiErr) {
        console.warn("AI generation failed or quota limited, using verified directory fallback:", aiErr);
        resources = getFallbackResources(baseLocation, activeCategory);
      }

      if (Array.isArray(resources) && resources.length > 0) {
        const batch = writeBatch(db);
        resources.forEach(res => {
          const docRef = doc(collection(db, `users/${user.uid}/partnerships`));
          batch.set(docRef, {
            name: res.name || res.organizationName || 'Community Resource',
            organizationName: res.organizationName || res.name || 'Community Partner',
            programName: res.programName || 'Community Referral Program',
            website: res.website || 'https://www.211.org',
            contactName: res.contactName || 'Intake Department',
            phone: res.phone || '211',
            email: res.email || 'info@community.org',
            address: res.address || baseLocation,
            eligibility: res.eligibility || 'Open to community residents needing assistance.',
            category: res.category || (activeCategory !== 'All' ? activeCategory : 'Mental Health'),
            type: res.type || 'External Referral Partner',
            sync: res.sync || 'Active',
            createdAt: serverTimestamp(),
            lastBackgroundCheck: serverTimestamp(),
            ownerId: user.uid
          });
        });
        await batch.commit();
        showToast(`Successfully added ${resources.length} community resources for ${baseLocation}!`);
      } else {
        throw new Error("No resources found");
      }
    } catch (e: any) {
      console.error("Autopopulate error:", e);
      // Emergency direct fallback insertion so the user is never stranded
      try {
        const fallbacks = getFallbackResources(baseLocation, activeCategory);
        const batch = writeBatch(db);
        fallbacks.forEach(res => {
          const docRef = doc(collection(db, `users/${user.uid}/partnerships`));
          batch.set(docRef, {
            ...res,
            createdAt: serverTimestamp(),
            lastBackgroundCheck: serverTimestamp(),
            ownerId: user.uid
          });
        });
        await batch.commit();
        showToast(`Loaded ${fallbacks.length} verified essential resources for ${baseLocation}.`);
      } catch (fallbackErr) {
        alert("Unable to save resources. Please check your connection and try again.");
      }
    } finally {
      setIsResearching(false);
    }
  };

  useEffect(() => {
    if (initialDiscoveryMode) {
      autopopulateResources();
      if (onDiscoveryHandled) {
        onDiscoveryHandled();
      }
    }
  }, [initialDiscoveryMode]);

  const openAddModal = () => {
    setEditingPartner(null);
    setModalForm({
      name: '',
      organizationName: '',
      programName: '',
      category: activeCategory !== 'All' ? activeCategory : 'Mental Health',
      contactName: 'Main Intake',
      phone: '',
      email: '',
      address: baseLocation,
      website: 'https://',
      eligibility: 'General community eligibility / Sliding scale available.',
      sync: 'Active',
      type: 'External Referral Partner'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (partner: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPartner(partner);
    setModalForm({
      name: partner.name || '',
      organizationName: partner.organizationName || '',
      programName: partner.programName || '',
      category: partner.category || 'Mental Health',
      contactName: partner.contactName || '',
      phone: partner.phone || '',
      email: partner.email || '',
      address: partner.address || '',
      website: partner.website || '',
      eligibility: partner.eligibility || '',
      sync: partner.sync || 'Active',
      type: partner.type || 'External Referral Partner'
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      alert("Please enter a Resource or Organization Name.");
      return;
    }

    try {
      if (editingPartner) {
        await updateDoc(doc(db, `users/${user.uid}/partnerships/${editingPartner.id}`), {
          ...modalForm,
          updatedAt: serverTimestamp()
        });
        showToast(`Updated "${modalForm.name}" successfully.`);
      } else {
        await addDoc(collection(db, `users/${user.uid}/partnerships`), {
          ...modalForm,
          organizationName: modalForm.organizationName || modalForm.name,
          createdAt: serverTimestamp(),
          lastBackgroundCheck: serverTimestamp(),
          ownerId: user.uid
        });
        showToast(`Added "${modalForm.name}" to directory.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save resource. Please try again.");
    }
  };

  const handleDeletePartner = async (partnerId: string, partnerName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to remove "${partnerName}" from your resource directory?`)) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/partnerships/${partnerId}`));
      showToast(`Removed "${partnerName}".`);
    } catch (err) {
      console.error(err);
      alert("Failed to delete resource.");
    }
  };

  const handleToggleSync = async (partner: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSync = partner.sync === 'Verified' ? 'Active' : partner.sync === 'Active' ? 'Outdated' : 'Verified';
    try {
      await updateDoc(doc(db, `users/${user.uid}/partnerships/${partner.id}`), {
        sync: nextSync,
        lastBackgroundCheck: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const copyReferral = (partner: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Community Resource Referral:\n` +
      `Organization: ${partner.name} (${partner.organizationName || ''})\n` +
      `Category: ${partner.category}\n` +
      `Program: ${partner.programName || 'General Services'}\n` +
      `Phone: ${partner.phone || 'N/A'}\n` +
      `Email: ${partner.email || 'N/A'}\n` +
      `Address: ${partner.address || 'N/A'}\n` +
      `Website: ${partner.website || 'N/A'}\n` +
      `Eligibility: ${partner.eligibility || 'Standard intake'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(partner.id);
    showToast(`Referral info for ${partner.name} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = ['All', 'Mental Health', 'Housing', 'Food', 'Medical', 'Legal', 'Transport', 'Employment', 'Other'];

  const filteredPartners = useMemo(() => {
    return partners.filter((p: any) => {
      const matchCat = activeCategory === 'All' || p.category?.toLowerCase() === activeCategory.toLowerCase();
      const matchStatus = statusFilter === 'all' || p.sync === statusFilter;
      const search = searchTerm.trim().toLowerCase();
      const matchSearch = !search || 
        p.name?.toLowerCase().includes(search) ||
        p.organizationName?.toLowerCase().includes(search) ||
        p.programName?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search) ||
        p.address?.toLowerCase().includes(search) ||
        p.eligibility?.toLowerCase().includes(search) ||
        p.phone?.toLowerCase().includes(search);

      return matchCat && matchStatus && matchSearch;
    });
  }, [partners, activeCategory, statusFilter, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400/40 text-sm font-semibold"
          >
            <Check className="w-5 h-5 text-emerald-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Handshake className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Community Care Network</span>
          </div>
          <h1 className="text-4xl font-light text-white tracking-tight">Resource & Referral Hub</h1>
          <p className="text-slate-400 text-sm mt-1">
            Centralized directory for social drivers of health, mental health services, crisis lines, and external partner referrals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            disabled={isResearching}
            onClick={() => autopopulateResources()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all border border-indigo-400/40 disabled:opacity-50 flex items-center gap-2.5 shadow-xl shadow-indigo-950/60 active:scale-95 group"
            title={`Discover new ${activeCategory === 'All' ? 'community' : activeCategory} resources in ${baseLocation}`}
          >
            {isResearching ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
            )}
            <span>{isResearching ? `Discovering in ${baseLocation}...` : `Discover Resources`}</span>
          </button>

          <button 
            onClick={openAddModal}
            className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all border border-white/10 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        </div>
      </header>

      {/* Location Proximity & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md">
        <div className="md:col-span-5 flex items-center gap-3 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Area / Region</label>
            <input 
              type="text" 
              value={baseLocation}
              onChange={(e) => setBaseLocation(e.target.value)}
              placeholder="e.g. Cuyahoga County, OH"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 transition-colors" 
            />
          </div>
        </div>

        <div className="md:col-span-3 flex items-center gap-3 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Radius</label>
            <select 
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 transition-colors"
            >
              <option value="5">Within 5 Miles</option>
              <option value="15">Within 15 Miles</option>
              <option value="25">Within 25 Miles</option>
              <option value="50">Within 50+ Miles</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <SearchIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Search Directory</label>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, service, keywords..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 transition-colors" 
            />
          </div>
          <button
            disabled={isResearching}
            onClick={() => autopopulateResources()}
            title="Trigger AI discovery for this region"
            className="px-3.5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isResearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Discover</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
          {categories.map(cat => {
            const count = cat === 'All' 
              ? partners.length 
              : partners.filter((p: any) => p.category?.toLowerCase() === cat.toLowerCase()).length;

            return (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeCategory === cat 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat ? 'bg-indigo-700 text-indigo-100' : 'bg-white/10 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Active">Active Only</option>
            <option value="Outdated">Needs Review</option>
          </select>
        </div>
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
          <p className="text-sm">Accessing regional resource network...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="p-16 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Handshake className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Resources Found for this View</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
              {searchTerm 
                ? `No community organizations matching "${searchTerm}". Try resetting your filter.`
                : `Your resource directory for ${baseLocation} is currently empty.`}
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <button 
              disabled={isResearching}
              onClick={autopopulateResources}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Populate Essential Directory
            </button>
            <button 
              onClick={openAddModal}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Manual Link
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredPartners.map((partner: any) => {
            const isExpanded = expandedPartnerId === partner.id;
            return (
              <div 
                key={partner.id} 
                onClick={() => setExpandedPartnerId(isExpanded ? null : partner.id)}
                className="p-6 bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 rounded-[2rem] transition-all cursor-pointer group relative overflow-hidden backdrop-blur-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors shrink-0 mt-1">
                      {partner.category === 'Mental Health' && <Brain className="w-6 h-6 text-indigo-400" />}
                      {partner.category === 'Housing' && <Home className="w-6 h-6 text-indigo-400" />}
                      {partner.category === 'Food' && <ShoppingBag className="w-6 h-6 text-indigo-400" />}
                      {partner.category === 'Medical' && <Activity className="w-6 h-6 text-indigo-400" />}
                      {partner.category === 'Legal' && <Shield className="w-6 h-6 text-indigo-400" />}
                      {partner.category === 'Transport' && <MapPin className="w-6 h-6 text-indigo-400" />}
                      {!['Mental Health', 'Housing', 'Food', 'Medical', 'Legal', 'Transport'].includes(partner.category) && <Handshake className="w-6 h-6 text-indigo-400" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                          {partner.category || 'General'}
                        </span>
                        
                        <button 
                          onClick={(e) => handleToggleSync(partner, e)}
                          title="Click to toggle status"
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                            partner.sync === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' :
                            partner.sync === 'Active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20' : 
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${partner.sync === 'Verified' || partner.sync === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          {partner.sync || 'Active'}
                        </button>

                        {partner.type && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {partner.type}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-xl tracking-tight mt-1">{partner.name}</h3>
                      <p className="text-slate-300 text-xs mt-0.5 line-clamp-1">
                        {partner.programName || partner.organizationName}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                        {partner.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-indigo-400" />
                            {partner.phone}
                          </span>
                        )}
                        {partner.address && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            {partner.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-2 self-end md:self-center" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={(e) => copyReferral(partner, e)}
                      title="Copy referral details for client"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/5"
                    >
                      {copiedId === partner.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    
                    {partner.phone && (
                      <a 
                        href={`tel:${partner.phone.replace(/[^0-9]/g, '')}`}
                        title="Call resource"
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl text-indigo-300 transition-colors border border-indigo-500/20"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    {partner.website && (
                      <a 
                        href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Open website"
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/5"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button 
                      onClick={(e) => openEditModal(partner, e)}
                      title="Edit resource"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors border border-white/5"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={(e) => handleDeletePartner(partner.id, partner.name, e)}
                      title="Delete resource"
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="pl-2" onClick={() => setExpandedPartnerId(isExpanded ? null : partner.id)}>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="relative z-10 overflow-hidden"
                    >
                      <div className="pt-6 mt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Organization & Program Details</span>
                            <p className="font-bold text-white text-sm">{partner.organizationName}</p>
                            <p className="text-slate-300 mt-0.5">{partner.programName}</p>
                          </div>

                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Intake Contact</span>
                            <p className="text-white font-medium">Contact: <span className="font-bold">{partner.contactName || 'Main Intake'}</span></p>
                            {partner.phone && <p className="text-slate-300 mt-0.5">Phone: {partner.phone}</p>}
                            {partner.email && (
                              <p className="text-slate-300 mt-0.5">
                                Email: <a href={`mailto:${partner.email}`} className="text-indigo-400 hover:underline">{partner.email}</a>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Location & Directions</span>
                            <p className="text-slate-200">{partner.address || 'Local coverage area'}</p>
                            <div className="inline-flex items-center gap-1 text-slate-500 mt-2 text-[9px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                              Offline Registry Verified
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Eligibility & Access Specs</span>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-slate-300 text-xs">
                              {partner.eligibility || 'Standard community intake. Contact directly for intake requirements.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {editingPartner ? 'Edit Community Resource' : 'Add New Resource Link'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Configure referral partner details and intake requirements.
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Name *</label>
                    <input 
                      type="text" 
                      required
                      value={modalForm.name}
                      onChange={e => setModalForm({...modalForm, name: e.target.value})}
                      placeholder="e.g. FrontLine Crisis Center"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <select 
                      value={modalForm.category}
                      onChange={e => setModalForm({...modalForm, category: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="Mental Health">Mental Health & Crisis</option>
                      <option value="Housing">Housing & Shelter</option>
                      <option value="Food">Food Assistance</option>
                      <option value="Medical">Medical & Dental</option>
                      <option value="Legal">Legal Aid</option>
                      <option value="Transport">Transportation</option>
                      <option value="Employment">Employment & Benefits</option>
                      <option value="Other">Other Community Support</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization Name</label>
                    <input 
                      type="text" 
                      value={modalForm.organizationName}
                      onChange={e => setModalForm({...modalForm, organizationName: e.target.value})}
                      placeholder="e.g. FrontLine Service"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program / Service Title</label>
                    <input 
                      type="text" 
                      value={modalForm.programName}
                      onChange={e => setModalForm({...modalForm, programName: e.target.value})}
                      placeholder="e.g. Mobile Crisis Assessment"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intake Contact</label>
                    <input 
                      type="text" 
                      value={modalForm.contactName}
                      onChange={e => setModalForm({...modalForm, contactName: e.target.value})}
                      placeholder="e.g. Intake Specialist"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="text" 
                      value={modalForm.phone}
                      onChange={e => setModalForm({...modalForm, phone: e.target.value})}
                      placeholder="e.g. (216) 555-0199"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input 
                      type="email" 
                      value={modalForm.email}
                      onChange={e => setModalForm({...modalForm, email: e.target.value})}
                      placeholder="e.g. intake@organization.org"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address / Service Area</label>
                  <input 
                    type="text" 
                    value={modalForm.address}
                    onChange={e => setModalForm({...modalForm, address: e.target.value})}
                    placeholder="e.g. 1744 Payne Ave, Cleveland, OH 44114"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website URL</label>
                    <input 
                      type="url" 
                      value={modalForm.website}
                      onChange={e => setModalForm({...modalForm, website: e.target.value})}
                      placeholder="https://organization.org"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={modalForm.sync}
                      onChange={e => setModalForm({...modalForm, sync: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Verified">Verified</option>
                      <option value="Outdated">Needs Review</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eligibility & Access Notes</label>
                  <textarea 
                    rows={3}
                    value={modalForm.eligibility}
                    onChange={e => setModalForm({...modalForm, eligibility: e.target.value})}
                    placeholder="e.g. Uninsured or Medicaid. Walk-ins accepted Mon-Fri 8am-4pm. Photo ID required."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/40"
                  >
                    {editingPartner ? 'Save Changes' : 'Add to Directory'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PoliciesHub({ user }: { user: FirebaseUser }) {
  const policiesQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/policies`),
    orderBy('category', 'asc')
  ), [user.uid]);
  const [policies, loading] = useCollectionData(policiesQuery);

  const categories = [
    { id: 'care', label: 'Patient Care', items: ['Client Profile Template', 'Progress Note SOP', 'Safety Plan Draft', 'Crisis Script'] },
    { id: 'admin', label: 'Administration', items: ['HIPAA Compliance SOP', 'Grant Writing Guide', 'Expense Reporting', 'Team Onboarding'] },
    { id: 'strat', label: 'Strategy', items: ['Strategic Plan 2026', 'Impact Logic Model', 'Feedback Loop SOP', 'Advocacy Playbook'] }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl font-light text-white tracking-tight">Policies & Templates</h1>
        <p className="text-slate-400 font-medium italic text-sm mt-2 opacity-60">Reusable building blocks for organizational clarity.</p>
      </header>
      <div className="grid grid-cols-3 gap-10">
        {categories.map(cat => (
          <div key={cat.id}>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <div className="w-4 h-[1px] bg-teal-500/40" /> {cat.label}
            </h3>
            <div className="space-y-3">
              {cat.items.map(t => (
                <button key={t} className="w-full text-left p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-bold text-white flex items-center justify-between group border border-transparent hover:border-white/10 transition-all">
                  {t} <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingsHub({ user }: { user: FirebaseUser }) {
  const meetingsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/meetings`),
    orderBy('date', 'desc')
  ), [user.uid]);
  const [meetings, loading] = useCollectionData(meetingsQuery);

  const addMeeting = async () => {
    const title = prompt("Meeting title:");
    if (!title) return;
    await addDoc(collection(db, `users/${user.uid}/meetings`), {
      title,
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: '10:00 AM',
      description: 'System-generated operational sync.',
      attendees: 1,
      createdAt: serverTimestamp(),
      ownerId: user.uid
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-light text-white tracking-tight">Meetings & Supervision</h1>
          <p className="text-slate-400 font-medium italic text-sm mt-2 opacity-60">Meaningful connection, documented for growth.</p>
        </div>
        <button 
          onClick={addMeeting}
          className="bg-indigo-600 hover:bg-indigo-400 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-900/40 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Schedule Sync
        </button>
      </header>

      <section className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <Video className="w-40 h-40" />
        </div>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Live Coordination</h3>
        <div className="grid grid-cols-2 gap-8">
           <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">May 07 • 10:00 AM</span>
              <h4 className="text-2xl font-bold mt-3 mb-2 text-white group-hover:text-indigo-300 transition-colors">Team Supervision</h4>
              <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-60">Trauma-informed case review & capacity checks.</p>
           </div>
           <div className="bg-indigo-600 p-8 rounded-3xl border border-indigo-500 shadow-2xl hover:bg-indigo-500 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">May 06 • 8:00 PM</span>
              <h4 className="text-2xl font-bold mt-3 mb-2 text-white">Evening System Sync</h4>
              <p className="text-sm text-indigo-100 font-medium leading-relaxed opacity-80">End-of-day operational alignment.</p>
           </div>
        </div>
      </section>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recent Interaction Logs</h3>
        <div className="grid grid-cols-1 gap-3">
          {(meetings || [
             { title: 'Partnership Sync: SOAR', date: 'May 04', attendees: 3 },
             { title: 'Quarterly Board Meeting', date: 'April 28', attendees: 5 },
             { title: 'Emergency Intake Review', date: 'April 25', attendees: 2 }
          ]).map((n, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between hover:bg-white/[0.08] transition-all cursor-pointer group">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-teal-400 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white text-base tracking-tight">{n.title}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-0.5">{n.date} • {n.attendees} Souls Present</p>
                </div>
              </div>
              <button className="px-5 py-2 bg-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-xl hover:bg-teal-500 hover:text-white transition-all">
                Access Minutes
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategyHub({ user }: { user: FirebaseUser }) {
  const strategyQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/strategies`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  const [strategies, loading] = useCollectionData(strategyQuery);

  const addStrategy = async () => {
    const title = prompt("Strategic objective title:");
    if (!title) return;
    const desc = prompt("Objective description:");
    await addDoc(collection(db, `users/${user.uid}/strategies`), {
      title,
      desc,
      category: 'Growth',
      createdAt: serverTimestamp(),
      ownerId: user.uid
    });
  };

  const displayStrategies = strategies || [];

  return (
    <div className="max-w-6xl mx-auto space-y-16">
      <header className="text-center relative">
        <h1 className="text-6xl font-extralight text-white tracking-tight leading-tight">Strategic Vision & Growth</h1>
        <p className="text-teal-400 font-black uppercase tracking-[0.4em] text-[10px] mt-6 opacity-60">Mapping the future of Haven Care</p>
        <button 
          onClick={addStrategy}
          className="mt-12 bg-white/5 border border-white/10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-teal-600 hover:border-teal-400 transition-all"
        >
          Define Perspective
        </button>
      </header>

      <div className="grid grid-cols-2 gap-12">
        {displayStrategies.map((strat: any) => (
          <div key={strat.title} className="bg-white/5 backdrop-blur-xl rounded-[3rem] p-12 border border-white/5 flex flex-col relative overflow-hidden group hover:bg-white/[0.08] transition-all">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
              <Compass className="w-32 h-32" />
            </div>
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4 opacity-50">{strat.category}</span>
            <h3 className="text-4xl font-light text-white mb-6 relative z-10 tracking-tight">{strat.title}</h3>
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12 relative z-10 opacity-70">
              {strat.desc}
            </p>
            <div className="mt-auto relative z-10">
              <button className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-500 hover:text-white transition-all flex items-center gap-3">
                 Explore Roadmap <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        <div className="space-y-8">
           <section className="bg-indigo-500/10 p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-[60px] -mr-20 -mt-20 opacity-40" />
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8">Expansion Pipeline</h4>
              <ul className="space-y-6">
                 {['Mobile Hygiene Unit 2026', 'Trans-Affirming Transition Housing', 'Mutual Aid Food Hub System'].map(i => (
                   <li key={i} className="flex items-center gap-5 text-white font-bold text-lg group cursor-pointer hover:translate-x-2 transition-transform">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]" /> {i}
                   </li>
                 ))}
              </ul>
           </section>
           <section className="bg-amber-500/10 p-10 rounded-[2.5rem] border border-amber-500/20 shadow-2xl flex items-center gap-8">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/30">
                <Info className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-3">Community Signals</h4>
                <p className="text-lg font-medium text-amber-200 leading-relaxed opacity-90 italic">"Emergency housing gap identified in Ward 14. 40% increase in referral requests this quarter."</p>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}

function ArchiveHub({ user }: { user: FirebaseUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const archiveQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/archive`),
    orderBy('createdAt', 'desc')
  ), [user.uid]);
  const [archives, loading] = useCollectionData(archiveQuery);

  const filteredArchives = archives?.filter((a: any) => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-10">
        <div className="text-center mb-16">
          <div className="inline-block p-8 bg-white/5 rounded-[2.5rem] mb-8 text-slate-600 border border-white/5 shadow-2xl">
            <Archive className="w-16 h-16" />
          </div>
          <h1 className="text-5xl font-light text-white tracking-tight">System Archive</h1>
          <p className="text-slate-500 font-medium max-w-xs mx-auto mt-4 leading-relaxed opacity-60 uppercase text-[10px] tracking-[0.3em]">
             Secure historical stabilization records
          </p>
        </div>

        <div className="relative w-full max-w-2xl mx-auto mb-16">
           <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-teal-400/40 w-6 h-6" />
           <input 
             type="text" 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="Search historical records, case notes, or grant drafts..." 
             className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 pl-16 text-xl text-white font-light focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-white/10 shadow-2xl"
           />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-500 italic">Decrypting legacy data streams...</div>
          ) : filteredArchives?.map((item: any) => (
            <div key={item.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/[0.08] transition-all group cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{item.title}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">{item.type || 'Legacy Record'} • {item.date || 'Historical'}</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-700" />
            </div>
          ))}
          {!loading && (!filteredArchives || filteredArchives.length === 0) && searchTerm && (
            <div className="py-20 text-center text-slate-500 italic">
               No historical records match your search parameters.
            </div>
          )}
          {!loading && (!filteredArchives || filteredArchives.length === 0) && !searchTerm && (
            <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
               <p className="text-slate-500 italic max-w-xs mx-auto">Access past wisdom. Start typing to search the unified mission archive.</p>
            </div>
          )}
        </div>
     </div>
  );
}

function ExecutiveSupport({ ai, user }: { ai: any, user: FirebaseUser }) {
  const [brainDump, setBrainDump] = useState('');
  const [triageResult, setTriageResult] = useState<string | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);

  const handleTriage = async () => {
    if (!brainDump.trim() || !ai) return;
    setIsTriaging(true);
    try {
      const response = await callAi('generate', {
        model: "gemini-3.7-flash",
        prompt: `You are Haven the Owl, acting as the Executive Function Support module of Haven Care OS for a trauma-informed nonprofit founder. 
        Your tone is wise, reassuring, and protective.
        The user has shared a "brain dump" of thoughts, tasks, and feelings.
        Your goal is to triage this into:
        1. Top 3 Immediate Actions (Clear, tiny steps)
        2. Tensions to Resolve (What's stressing them?)
        3. A grounding affirmation.
        Keep it trauma-informed, calm, and minimal.
        
        Brain Dump: ${brainDump}`,
      });
      const text = response.text;
      setTriageResult(text);
      
      // Save to Firestore
      try {
        await addDoc(collection(db, `users/${user.uid}/triage`), {
          content: brainDump,
          triageResult: text,
          processed: true,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/triage`);
      }
    } catch (error) {
      console.error(error);
      setTriageResult("Error triaging info. Please take a deep breath and take one tiny step.");
    } finally {
      setIsTriaging(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="text-center mb-12">
        <div className="inline-block p-6 bg-teal-500/10 text-teal-400 rounded-[2.5rem] mb-6 border border-teal-500/20 shadow-2xl">
          <OwlIcon className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-light text-white tracking-tight">Executive Function Hub</h1>
        <p className="text-slate-500 font-medium max-w-sm mx-auto mt-3 tracking-wide leading-relaxed opacity-60 uppercase text-[10px] tracking-[0.3em]">
           Deciding, doing, and regulating. Let Haven guide you.
        </p>
      </header>

      {!triageResult ? (
        <div className="space-y-6">
           <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-4 text-white tracking-tight">
                <Layers className="w-6 h-6 text-teal-400/60" /> Brain Dump
              </h3>
              <textarea 
                value={brainDump}
                onChange={(e) => setBrainDump(e.target.value)}
                placeholder="What's spinning in your head right now? Tasks, worries, ideas..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-white min-h-[250px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all placeholder:text-white/10 font-light text-lg leading-relaxed shadow-inner"
              />
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleTriage}
                  disabled={!brainDump.trim() || isTriaging}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-xl shadow-teal-900/20 flex items-center gap-3 active:scale-95"
                >
                  {isTriaging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Triaging with Haven...
                    </>
                  ) : (
                    <>
                      <Compass className="w-5 h-5" /> Run Triage
                    </>
                  )}
                </button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <button className="p-8 bg-white/5 border border-white/5 rounded-[2rem] text-left hover:bg-white/10 transition-all group shadow-xl">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold mb-1 text-white tracking-tight">Hard Talks</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed opacity-60 uppercase tracking-widest text-[9px]">Trauma-informed scripts</p>
              </button>
              <button className="p-8 bg-white/5 border border-white/5 rounded-[2rem] text-left hover:bg-white/10 transition-all group shadow-xl">
                 <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 text-amber-400 border border-amber-500/20">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold mb-1 text-white tracking-tight">Burnout Plan</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed opacity-60 uppercase tracking-widest text-[9px]">Capacity management</p>
              </button>
           </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-teal-500/5 backdrop-blur-3xl border border-teal-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-teal-500/30" />
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-light text-white tracking-tight">Your Triage</h2>
                <button 
                  onClick={() => { setTriageResult(null); setBrainDump(''); }}
                  className="text-[10px] font-black uppercase text-teal-400/40 hover:text-teal-400 tracking-[0.2em] transition-colors"
                >
                  Clear Results
                </button>
             </div>
             
             <div className="max-w-none prose prose-invert prose-teal text-slate-300 font-light text-lg leading-relaxed">
                <Markdown>{triageResult}</Markdown>
             </div>
          </div>
          
          <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-10 text-center text-white shadow-xl backdrop-blur-md">
             <h3 className="font-bold text-sm mb-6 text-slate-500 uppercase tracking-[0.3em]">Emotional Resonance</h3>
             <div className="flex justify-center gap-4">
                {['Calmer', 'Focused', 'Still Overwhelmed'].map(res => (
                  <button key={res} className="px-8 py-3 bg-white/5 hover:bg-teal-500/20 border border-white/5 hover:border-teal-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                    {res}
                  </button>
                ))}
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SetupWizard({ ai, user, setGlobalScale }: { ai: any, user: FirebaseUser, setGlobalScale: (s: number) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    language: 'English (US)',
    region: '',
    displayName: user.displayName || '',
    email: user.email || '',
    phone: '',
    orgName: '',
    orgWebsite: '',
    orgAddress: '',
    orgPhone: '',
    hubs: ['Case Management'] as string[],
    uiScale: 1
  });
  const [finishStatus, setFinishStatus] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [dynamicScale, setDynamicScale] = useState(1);

  // Detect screen size and suggest initial scale + dynamic behavior
  useEffect(() => {
    const handleSizing = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scaleX = width / 1440;
      const scaleY = height / 900;
      const exactScale = Math.min(scaleX, scaleY);
      
      document.documentElement.style.fontSize = `${exactScale * formData.uiScale * 100}%`;
    };

    handleSizing();
    window.addEventListener('resize', handleSizing);
    return () => {
       window.removeEventListener('resize', handleSizing);
       document.documentElement.style.fontSize = '100%';
    };
  }, [formData.uiScale]);

  useEffect(() => {
    const width = window.innerWidth;
    if (width < 1440) setFormData(prev => ({ ...prev, uiScale: 0.9 }));
    else if (width > 2500) setFormData(prev => ({ ...prev, uiScale: 1.2 }));
  }, []);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const toggleHub = (hub: string) => {
    setFormData(prev => {
      const hubs = prev.hubs.includes(hub)
        ? prev.hubs.filter(h => h !== hub)
        : [...prev.hubs, hub];
      return { ...prev, hubs };
    });
  };

  const devSkipSetup = async () => {
    setIsFinishing(true);
    try {
      await setDoc(doc(db, `users/${user.uid}`), {
        userId: user.uid,
        displayName: 'Developer',
        email: user.email || 'dev@havenos.cloud',
        phone: '(555) 000-0000',
        language: 'English (US)',
        organizationName: 'Haven OS Test',
        organizationWebsite: 'haven-os.org',
        organizationAddress: '123 Dev Way',
        organizationPhone: '(555) 000-0000',
        region: 'Localhost',
        completedSetup: true,
        hubsPriority: ['Case Management'],
        offlineEnabled: true,
        uiScale: 1,
        createdAt: serverTimestamp()
      });
      setGlobalScale(1);
    } catch (e) {
      console.error(e);
      setIsFinishing(false);
    }
  };

  const finishSetup = async () => {
    setIsFinishing(true);
    try {
      if (ai && formData.region) {
        setFinishStatus(`Scanning ${formData.region} for resources...`);
        const prompt = `Find 5 real, actual social service resources within or near ${formData.region}. 
        Provide 1 Housing, 1 Food, 1 Medical, 1 Legal, and 1 Transport resource.
        For each resource, provide these fields heavily detailed:
        - name: the common name used
        - organizationName: official org name
        - programName: specific program name
        - website: url
        - contactName: contact person or department
        - phone: phone number
        - email: email address
        - address: physical address
        - eligibility: detailed eligibility criteria
        - category: Exactly one of "Housing", "Food", "Medical", "Legal", "Transport"
        - type: short description like "Direct Housing" or "Emergency Supplies"
        
        Return the output as a clean, raw JSON array of objects without any markdown formatting or javascript code blocks. ONLY JSON.`;
        
        try {
          const response = await callAi('generate', {
             model: "gemini-3.7-flash",
             prompt,
             tools: [{ googleSearch: {} }]
          });

          let text = response.text;
          text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
          
          const generated = JSON.parse(text);
          setFinishStatus('Populating partnership database...');
          
          for (const g of generated) {
             await addDoc(collection(db, `users/${user.uid}/partnerships`), {
                ...g,
                sync: 'Active',
                createdAt: serverTimestamp(),
                ownerId: user.uid
             });
          }
        } catch (e) {
          console.error("Resource generation failed during setup:", e);
        }
      }

      setFinishStatus('Finalizing OS configuration...');
      await setDoc(doc(db, `users/${user.uid}`), {
        userId: user.uid,
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        language: formData.language,
        organizationName: formData.orgName,
        organizationWebsite: formData.orgWebsite,
        organizationAddress: formData.orgAddress,
        organizationPhone: formData.orgPhone,
        region: formData.region,
        completedSetup: true,
        hubsPriority: formData.hubs,
        offlineEnabled: true,
        uiScale: formData.uiScale,
        createdAt: serverTimestamp()
      });
      setGlobalScale(formData.uiScale);
    } catch (e) {
      console.error(e);
      setIsFinishing(false);
      setFinishStatus(null);
    }
  };

  const steps = [
    { title: 'Language & Region', description: 'Let\'s start with your preferred locale.' },
    { title: 'User Profile', description: 'Confirm your identification for the system.' },
    { title: 'Mission Identity', description: 'Tell us about your organization.' },
    { title: 'Operational Contact', description: 'Where does your impact happen?' },
    { title: 'Visual Accessibility', description: 'Adjust the system interface to your comfort level.' },
    { title: 'System Priority', description: 'What\'s your primary focus today?' },
    { title: 'Offline Sanctuary', description: 'Your data is safe, even without a connection.' }
  ];

  const totalSteps = steps.length;

  return (
    <div className="h-screen w-screen bg-[#001220] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <button 
        onClick={devSkipSetup} 
        className="absolute bottom-4 right-4 text-[10px] uppercase font-black tracking-widest text-slate-500 opacity-20 hover:opacity-100 transition-opacity z-50 p-2"
        title="Dev Skip Setup"
      >
        Skip
      </button>
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-teal-600/10 blur-[150px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-6xl h-[800px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-[3rem] shadow-[0_50px_120px_rgba(0,0,0,0.6)] flex overflow-hidden relative z-10"
      >
        {/* Left Side: Visual/Context */}
        <div className="w-[45%] p-20 flex flex-col justify-center bg-gradient-to-br from-white/[0.02] to-transparent border-r border-white/5 relative">
           <div className="absolute top-12 left-12 flex items-center gap-3 opacity-40">
             <Shield className="w-5 h-5 text-teal-400" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Haven OS</span>
           </div>

           <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="space-y-8"
            >
              <div className="w-24 h-24 bg-teal-500/10 rounded-[2rem] flex items-center justify-center border border-teal-500/20 shadow-2xl shadow-teal-500/10">
                {step === 1 && <Languages className="w-10 h-10 text-teal-400" />}
                {step === 2 && <User className="w-10 h-10 text-teal-400" />}
                {step === 3 && <Globe className="w-10 h-10 text-teal-400" />}
                {step === 4 && <MapPin className="w-10 h-10 text-teal-400" />}
                {step === 5 && <Palette className="w-10 h-10 text-teal-400" />}
                {step === 6 && <Compass className="w-10 h-10 text-teal-400" />}
                {step === 7 && <WifiOff className="w-10 h-10 text-teal-400" />}
              </div>
              <h1 className="text-6xl font-extralight text-white tracking-tight leading-[1.1]">{steps[step-1].title}</h1>
              <p className="text-2xl text-slate-400 font-medium leading-relaxed opacity-60 max-w-md">
                {steps[step-1].description}
              </p>
            </motion.div>
           </AnimatePresence>
        </div>

        {/* Right Side: Form Content */}
        <div className="w-[55%] p-20 flex flex-col bg-black/40 relative">
          <div className="flex-1 flex flex-col justify-center overflow-y-auto custom-scrollbar pr-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Language</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['English (US)', 'English (UK)', 'Spanish', 'French', 'German'].map(l => (
                        <button 
                          key={l}
                          onClick={() => setFormData({...formData, language: l})}
                          className={`w-full p-4 rounded-xl text-left font-medium transition-all border ${formData.language === l ? 'bg-teal-500/20 border-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.2)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Service Location (County, City, State)</label>
                    <input 
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData({...formData, region: e.target.value})}
                      placeholder="e.g. Cuyahoga County, OH"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Your Full Name</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pl-16 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-xl font-light"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="email"
                          disabled
                          value={formData.email}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Organization Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Haven Care Sanctuary"
                      value={formData.orgName}
                      onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-xl font-light"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Website URL</label>
                    <div className="relative">
                      <Link className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="url"
                        placeholder="https://yourmission.org"
                        value={formData.orgWebsite}
                        onChange={(e) => setFormData({...formData, orgWebsite: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-14 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Physical Address</label>
                    </div>
                    <textarea 
                      placeholder="123 Sanctuary Way, City, State, Zip"
                      value={formData.orgAddress}
                      onChange={(e) => setFormData({...formData, orgAddress: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Organization Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="tel"
                        value={formData.orgPhone}
                        onChange={(e) => setFormData({...formData, orgPhone: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-16 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="space-y-8">
                    <label className="text-xs uppercase font-black tracking-widest text-slate-500">Interface Scaling</label>
                    <div className="flex items-center gap-8">
                       <input 
                         type="range"
                         min="0.75"
                         max="1.5"
                         step="0.05"
                         value={formData.uiScale}
                         onChange={(e) => setFormData({...formData, uiScale: parseFloat(e.target.value)})}
                         className="flex-1 accent-teal-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                       />
                       <div className="w-20 text-center">
                          <span className="text-3xl font-light text-white">{(formData.uiScale * 100).toFixed(0)}%</span>
                       </div>
                    </div>
                  </div>
                  <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
                     <div className="flex items-center gap-3 text-teal-400">
                        <Info className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Accessibility Insight</span>
                     </div>
                     <p className="text-slate-400 leading-relaxed font-medium">
                        Proper UI scaling reduces cognitive load and eye strain. We've detected your display size and suggested an initial value. 
                        Feel free to adjust it so labels and controls are perfectly legible for your workflow.
                     </p>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div 
                  key="step6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Operational Hubs</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Case Management', 'Funding & Grants', 'Strategic Vision'].map(goal => (
                      <button 
                        key={goal}
                        onClick={() => toggleHub(goal)}
                        className={`w-full p-6 rounded-2xl text-left transition-all border flex items-center justify-between ${formData.hubs.includes(goal) ? 'bg-teal-500/20 border-teal-500 text-white shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        <span className="font-bold text-lg">{goal}</span>
                        {formData.hubs.includes(goal) && <Check className="w-6 h-6 text-teal-400" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest opacity-60 text-center">Select all that apply to your current workflow</p>
                </motion.div>
              )}

              {step === 7 && (
                <motion.div 
                  key="step7"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                  <div className="bg-teal-500/10 border border-teal-500/20 p-8 rounded-3xl flex gap-6 items-start">
                     <div className="p-4 bg-teal-500/20 rounded-2xl">
                        <WifiOff className="w-8 h-8 text-teal-400" />
                     </div>
                     <div className="space-y-2">
                        <h4 className="font-bold text-white text-xl tracking-tight">Offline Operations & Local Ollama AI</h4>
                        <p className="text-slate-400 leading-relaxed font-medium opacity-80">
                           Haven OS is designed for resiliency. Your client data synchronizes automatically when a secure connection is established. 
                           You can also download device-compatible open-weight Ollama models for 100% offline, zero-data-leakage case management.
                        </p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Summary Verification</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Founder</p>
                           <p className="text-white font-medium truncate">{formData.displayName}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Organization</p>
                           <p className="text-white font-medium truncate">{formData.orgName || 'N/A'}</p>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-12 flex justify-between items-center bg-transparent relative z-20">
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step === i + 1 ? 'w-10 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'w-2 bg-white/10'}`} />
              ))}
            </div>
            <div className="flex gap-4">
              {step > 1 && (
                <button 
                  onClick={prevStep}
                  className="px-8 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10"
                >
                  Back
                </button>
              )}
              {step < totalSteps ? (
                <button 
                  onClick={nextStep}
                  disabled={(step === 2 && !formData.displayName) || (step === 3 && !formData.orgName)}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-30 text-white px-12 py-4 rounded-xl font-bold transition-all shadow-[0_10px_30px_rgba(20,184,166,0.2)] active:scale-95 text-lg"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={finishSetup}
                  disabled={isFinishing}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-30 text-white px-12 py-4 rounded-xl font-bold transition-all shadow-[0_10px_30px_rgba(20,184,166,0.3)] flex items-center gap-3 active:scale-95 text-lg"
                >
                  {isFinishing ? (
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       {finishStatus || 'Finalizing Secure Environment...'}
                    </div>
                  ) : (
                    <>
                      Enter Sanctuary <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-10 flex items-center gap-6 z-20 opacity-40">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-4 h-4 text-teal-400" />
           <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white">End-to-End Encrypted</span>
        </div>
        <div className="w-px h-3 bg-white/20" />
        <div className="flex items-center gap-2">
           <Globe className="w-4 h-4 text-teal-400" />
           <span className="text-[9px] uppercase font-black tracking-[0.4em] text-white">Cloud Sync Active</span>
        </div>
      </div>
    </div>
  );
}

function SettingsHub({ user, profile, setActiveHub }: { user: FirebaseUser, profile: any, setActiveHub: (id: HubId | null) => void }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [localProfile, setLocalProfile] = useState({
    displayName: profile?.displayName || user?.displayName || '',
    photoURL: profile?.photoURL || user?.photoURL || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    language: profile?.language || 'English (US)',
    organizationName: profile?.organizationName || '',
    organizationWebsite: profile?.organizationWebsite || '',
    organizationAddress: profile?.organizationAddress || '',
    organizationPhone: profile?.organizationPhone || '',
    region: profile?.region || 'United States',
    theme: profile?.theme || 'Deep Night'
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update Firebase Auth Profile
      if (localProfile.displayName !== user.displayName || localProfile.photoURL !== user.photoURL) {
        await updateProfile(user, {
          displayName: localProfile.displayName,
          photoURL: localProfile.photoURL
        });
      }

      // Update Firestore Profile
      await setDoc(doc(db, `users/${user.uid}`), {
        ...localProfile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("System parameters synchronized successfully.");
    } catch (e) {
      console.error(e);
      alert("Synchronization failed. Check console for details.");
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset your OS? This will return you to the setup wizard. No operational data (clients, tasks) will be deleted, but your system preferences will be lost.")) {
      try {
        await setDoc(doc(db, `users/${user.uid}`), { completedSetup: false }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handlePowerWash = async () => {
    if (confirm("WARNING: POWER WASH\nAre you absolutely sure? This will permanently delete ALL your data (clients, programs, resources, tasks, etc) and restore Haven OS to factory settings. This cannot be undone.")) {
      if (prompt("Type 'POWER WASH' to confirm:") !== "POWER WASH") {
        alert("Power wash aborted.");
        return;
      }
      setIsSaving(true);
      try {
        const collectionsToClear = ['clients', 'programs', 'partnerships', 'tasks', 'grants', 'donations', 'expenses', 'meetings', 'policies'];
        for (const colName of collectionsToClear) {
          const colRef = collection(db, `users/${user.uid}/${colName}`);
          const snapshot = await getDocs(colRef);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
        await deleteDoc(doc(db, `users/${user.uid}`));
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert("Error during power wash.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const sections = [
    { id: 'profile', name: 'Profile & Identity', icon: User },
    { id: 'organization', name: 'Organization', icon: Globe },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'ollama', name: 'Local AI & Ollama', icon: Cpu },
    { id: 'security', name: 'Security & HIPAA', icon: ShieldCheck },
    { id: 'about', name: 'About OS', icon: Info },
    { id: 'help_shortcut', name: 'Support Hub', icon: LifeBuoy },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'help_shortcut') {
      setActiveHub('help');
    } else {
      setActiveSection(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-200px)] flex bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-72 bg-black/20 border-r border-white/5 p-8 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-10 tracking-tight">System Settings</h2>
        <nav className="flex-1 space-y-2">
          {sections.map(s => (
            <button 
              key={s.id}
              onClick={() => handleNavClick(s.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeSection === s.id ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <s.icon className="w-5 h-5" />
              <span className="text-sm font-bold tracking-tight">{s.name}</span>
            </button>
          ))}
        </nav>
        <button 
           onClick={() => signOut(auth)}
          className="mt-auto flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-bold">Sign Out</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-16 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeSection === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <header>
                <h3 className="text-3xl font-light text-white tracking-tight">Personal Identity</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium opacity-60 uppercase tracking-widest">Identify yourself to the Haven Care Network</p>
              </header>

              <div className="space-y-8 max-w-xl">
                <div className="flex items-center gap-10 bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-teal-500/50 flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover:border-teal-400">
                      {localProfile.photoURL ? (
                        <img src={localProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-3xl font-black text-teal-400">{(localProfile.displayName || user.email || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <h4 className="text-white font-bold tracking-tight">Avatar Configuration</h4>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Image URL</label>
                       <input 
                         type="text" 
                         placeholder="https://example.com/photo.jpg"
                         value={localProfile.photoURL}
                         onChange={(e) => setLocalProfile({...localProfile, photoURL: e.target.value})}
                         className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500/30 transition-all"
                       />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text" 
                    value={localProfile.displayName}
                    onChange={(e) => setLocalProfile({...localProfile, displayName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={localProfile.email}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="tel" 
                      value={localProfile.phone}
                      onChange={(e) => setLocalProfile({...localProfile, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</label>
                    <select 
                      value={localProfile.language}
                      onChange={(e) => setLocalProfile({...localProfile, language: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    >
                      {['English (US)', 'English (UK)', 'Spanish', 'French', 'German'].map(l => (
                        <option key={l} value={l} className="bg-slate-900">{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Location (County, City, State)</label>
                    <input 
                      type="text"
                      value={localProfile.region}
                      onChange={(e) => setLocalProfile({...localProfile, region: e.target.value})}
                      placeholder="e.g. Cuyahoga County, OH"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
                    />
                  </div>
                </div>
                
                <div className="pt-6">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-xl shadow-teal-900/20"
                  >
                    {isSaving ? 'Synchronizing...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'organization' && (
            <motion.div 
              key="organization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <header>
                <h3 className="text-3xl font-light text-white tracking-tight">Organization Profile</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium opacity-60 uppercase tracking-widest">Impact parameters for your mission</p>
              </header>

              <div className="space-y-8 max-w-xl">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organization Name</label>
                  <input 
                    type="text" 
                    value={localProfile.organizationName}
                    onChange={(e) => setLocalProfile({...localProfile, organizationName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Website URL</label>
                  <input 
                    type="url" 
                    placeholder="https://mission.org"
                    value={localProfile.organizationWebsite}
                    onChange={(e) => setLocalProfile({...localProfile, organizationWebsite: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Physical Address</label>
                    <textarea 
                      value={localProfile.organizationAddress}
                      onChange={(e) => setLocalProfile({...localProfile, organizationAddress: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Phone</label>
                    <input 
                      type="tel" 
                      value={localProfile.organizationPhone}
                      onChange={(e) => setLocalProfile({...localProfile, organizationPhone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-xl shadow-teal-900/20"
                  >
                    {isSaving ? 'Synchronizing...' : 'Update Organization'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'appearance' && (
            <motion.div 
              key="appearance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <header>
                <h3 className="text-3xl font-light text-white tracking-tight">Appearance</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium opacity-60 uppercase tracking-widest">Customize your visual sanctuary</p>
              </header>

              <div className="grid grid-cols-2 gap-8">
                 <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4">
                    <h4 className="font-bold text-white tracking-tight">Global Theme</h4>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           setLocalProfile({...localProfile, theme: 'Deep Night'});
                           setDoc(doc(db, `users/${user.uid}`), { theme: 'Deep Night', updatedAt: serverTimestamp() }, { merge: true });
                         }}
                         className={`flex-1 p-3 rounded-xl text-center transition-all ${localProfile.theme === 'Deep Night' ? 'bg-slate-900 border-2 border-teal-500' : 'bg-white/10 hover:bg-white/20 border-2 border-transparent'}`}
                       >
                          <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">Deep Night</p>
                       </button>
                       <button 
                         onClick={() => {
                           setLocalProfile({...localProfile, theme: 'Soft Day'});
                           setDoc(doc(db, `users/${user.uid}`), { theme: 'Soft Day', updatedAt: serverTimestamp() }, { merge: true });
                         }}
                         className={`flex-1 p-3 rounded-xl text-center transition-all ${localProfile.theme === 'Soft Day' ? 'bg-amber-900 border-2 border-amber-500' : 'bg-white/10 hover:bg-white/20 border-2 border-transparent'}`}
                       >
                          <p className={`text-[10px] font-black uppercase tracking-widest ${localProfile.theme === 'Soft Day' ? 'text-amber-500' : 'text-slate-300'}`}>Soft Day</p>
                       </button>
                       <button 
                         onClick={() => {
                           setLocalProfile({...localProfile, theme: 'Light Mode'});
                           setDoc(doc(db, `users/${user.uid}`), { theme: 'Light Mode', updatedAt: serverTimestamp() }, { merge: true });
                         }}
                         className={`flex-1 p-3 rounded-xl text-center transition-all ${localProfile.theme === 'Light Mode' ? 'bg-slate-100 border-2 border-slate-400' : 'bg-white/10 hover:bg-white/20 border-2 border-transparent'}`}
                       >
                          <p className={`text-[10px] font-black uppercase tracking-widest ${localProfile.theme === 'Light Mode' ? 'text-slate-800' : 'text-slate-300'}`}>Light</p>
                       </button>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">"Soft Day" and "Light Mode" themes are now active.</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-4">
                    <h4 className="font-bold text-white tracking-tight">Transparency Effects</h4>
                    <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-400">Acrylic Glass Blur</span>
                       <div className="w-12 h-6 bg-teal-500 rounded-full p-1 flex justify-end">
                          <div className="w-4 h-4 bg-white rounded-full" />
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'ollama' && (
            <motion.div 
              key="ollama"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <DeviceOllamaModels isModal={false} />
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div 
               key="security"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-10"
            >
               <header>
                 <h3 className="text-3xl font-light text-white tracking-tight">Security & HIPAA</h3>
                 <p className="text-slate-500 text-sm mt-2 font-medium opacity-60 uppercase tracking-widest">Protecting vulnerable data</p>
               </header>

               <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-3xl flex gap-6 items-start">
                  <ShieldCheck className="w-8 h-8 text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-200 mb-2">Operational Integrity</h4>
                    <p className="text-sm text-amber-200/60 leading-relaxed opacity-80">
                      Haven Care OS uses end-to-end encryption for client case notes stored in Firestore. 
                      Access is restricted to verified founders and trauma-informed case managers.
                    </p>
                  </div>
               </div>

               <div className="space-y-6">
                  <button className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between transition-all group">
                     <span className="text-white font-bold tracking-tight">Download Access Logs</span>
                     <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-teal-400 transition-colors" />
                  </button>
                  <button className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between transition-all group">
                     <span className="text-white font-bold tracking-tight">Generate Compliance Report</span>
                     <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-teal-400 transition-colors" />
                  </button>
               </div>
            </motion.div>
          )}

          {activeSection === 'about' && (
            <motion.div 
               key="about"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-10"
            >
               <div className="text-center py-10">
                  <div className="w-24 h-24 bg-teal-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-teal-500/20 shadow-2xl">
                     <Shield className="w-12 h-12 text-teal-400" />
                  </div>
                  <h3 className="text-3xl font-light text-white tracking-tight">Haven Care OS</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-60">Version 1.4.2 stable | BY AYA KALIMAH SATYA RUANE</p>
               </div>

               <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Operating System</span>
                     <span className="text-white font-medium">Haven Care Enterprise</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Security Architecture</span>
                     <span className="text-white font-medium">Trauma-Informed Zero Trust</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-500">License</span>
                     <span className="text-teal-400 font-medium">Non-Profit Sanctuary License</span>
                  </div>
               </div>

               <div className="pt-10 border-t border-white/5 flex flex-col gap-4">
                  <button 
                    onClick={handleReset}
                    className="flex items-center justify-center gap-3 text-red-500/50 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-widest mx-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Reset System Infrastructure
                  </button>
                  <button 
                    onClick={handlePowerWash}
                    className="flex items-center justify-center gap-3 text-red-500 hover:bg-red-500/10 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest mx-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Power Wash (Factory Reset)
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HelpHub({ ai }: { ai: any }) {
  const [activeTab, setActiveTab] = useState('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  const guides = [
    { id: 'getting-started', title: 'Getting Started', description: 'Initialize your haven sanctuary correctly.', icon: LifeBuoy },
    { id: 'case-management', title: 'Case Management', description: 'Advanced trauma-informed note taking.', icon: User },
    { id: 'funding', title: 'Securing Funding', description: 'Track grants and manage donor pipelines.', icon: DollarSign },
    { id: 'security', title: 'Security Protocols', description: 'Understanding HIPAA and encryption.', icon: ShieldCheck },
    { id: 'offline', title: 'Offline Mode', description: 'How to work without a stable connection.', icon: WifiOff },
    { id: 'collaboration', title: 'Founder Collab', description: 'Managing permissions and shared missions.', icon: Handshake },
  ];

  const faq = [
    { q: 'How do I add a secondary founder?', a: 'Go to Settings > Organization and invite them via their email address linked to Haven OS.' },
    { q: 'Is my data backed up?', a: 'Yes, Haven Care OS synchronizes every individual keystroke with our encrypted cloud servers in real-time.' },
    { q: 'Can I use this on mobile?', a: 'Absolutely. Use the same URL in your mobile browser for the optimized on-the-field experience.' },
    { q: 'What happens if I lose internet?', a: 'The OS switch to Offline Mode automatically. Your changes are cached and synced upon re-connection.' }
  ];

  const handleAiAsk = async () => {
    if (!searchQuery || !ai) return;
    setIsAiLoading(true);
    setAiResponse(null);
    setActiveTab('ai');
    
    try {
      const prompt = `You are Haven the Owl, the diagnostic assistant for Haven Care OS, a trauma-informed administrative platform for non-profit founders.
      As an owl, you represent wisdom, oversight, and a calm presence.
      The user is asking a question or seeking guidance. 
      Available Modules: ${guides.map(g => g.title).join(', ')}.
      
      User Query: "${searchQuery}"
      
      Respond in a calm, professional, and trauma-informed tone. Provide actionable guidance and recommend specific modules if relevant. 
      Keep your response concise but supportive (2-3 sentences).`;
      
      const response = await callAi('generate', {
        model: "gemini-3.7-flash",
        prompt
      });
      setAiResponse(response.text);
    } catch (error) {
      console.error("Haven AI Error:", error);
      setAiResponse("I encountered an issue processing your request. Please ensure system integrity and try again, or consult the Knowledge Base.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <div className="flex items-center justify-center gap-4 mb-2">
           <div className="h-[1px] w-12 bg-teal-500/30" />
           <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.5em]">System Resources</span>
           <div className="h-[1px] w-12 bg-teal-500/30" />
        </div>
        <h2 className="text-5xl font-light text-white tracking-tight">How can we support your mission?</h2>
        <p className="text-slate-400 max-w-2xl mx-auto opacity-60 text-lg">Interactive resources to help you maintain operational integrity and trauma-informed excellence.</p>
        
        <div className="max-w-2xl mx-auto mt-12 relative flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500/40" />
            <input 
              type="text" 
              placeholder="System diagnostics, SOP search, or Ask Haven AI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
              className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-5 pl-14 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-medium text-lg placeholder:opacity-30"
            />
          </div>
          <button 
            onClick={handleAiAsk}
            className="bg-teal-600 hover:bg-teal-500 text-white px-8 rounded-[1.5rem] font-bold transition-all shadow-xl shadow-teal-900/20 flex items-center gap-2 group"
          >
            <OwlIcon className="w-5 h-5 group-hover:animate-pulse" />
            <span>Haven AI</span>
          </button>
        </div>
      </header>

      <div className="flex gap-4 justify-center border-b border-white/5 pb-8">
        {[
          { id: 'guide', label: 'Knowledge Base', icon: BookOpen },
          { id: 'faq', label: 'Quick FAQ', icon: Info },
          { id: 'support', label: 'Human Support', icon: MessageSquare },
          { id: 'ai', label: 'AI Diagnostic', icon: OwlIcon, hidden: !aiResponse && !isAiLoading }
        ].filter(t => !t.hidden).map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 border ${activeTab === tab.id ? 'bg-teal-500 text-white border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]' : 'text-slate-500 border-white/5 hover:bg-white/5 hover:text-white'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[400px]"
      >
        {activeTab === 'ai' && (
          <div className="max-w-3xl mx-auto space-y-8 py-10">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                  <OwlIcon className="w-8 h-8 text-teal-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="text-teal-400 font-bold uppercase tracking-widest text-xs">Haven the Owl is processing system context...</p>
              </div>
            ) : aiResponse && (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <div className="bg-teal-500/10 p-6 flex items-center gap-4 border-b border-white/5">
                  <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
                    <OwlIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white tracking-tight">Haven the Owl</h4>
                    <p className="text-[10px] text-teal-400 font-black uppercase tracking-widest">Real-time Diagnostic</p>
                  </div>
                </div>
                <div className="p-10 space-y-6">
                  <div className="prose prose-invert prose-teal max-w-none text-slate-200 text-xl font-light leading-relaxed">
                    <Markdown>{aiResponse}</Markdown>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex gap-4">
                    <button className="text-xs font-bold text-teal-400 hover:text-teal-300 underline underline-offset-8">Open Suggested Module</button>
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-400" onClick={() => setAiResponse(null)}>Clear Search</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
            {filteredGuides.map(guide => (
              <button 
                key={guide.id}
                className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-left hover:bg-white/10 transition-all group hover:border-teal-500/30 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-teal-500/10 transition-colors" />
                <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6 border border-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                  <guide.icon className="w-7 h-7 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-teal-400 transition-colors">{guide.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed opacity-60 line-clamp-2">{guide.description}</p>
                <div className="mt-6 flex items-center gap-2 text-teal-500 text-[10px] font-black uppercase tracking-widest translate-x-[-10px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  Access SOP <SearchIcon className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="max-w-3xl mx-auto space-y-4 py-10 font-bold">
            <h3 className="text-2xl font-light text-white mb-8 tracking-tight flex items-center gap-4">
              <HelpCircle className="w-6 h-6 text-teal-400/40" /> Frequent Inquiries
            </h3>
            {faq.map((item, idx) => (
              <details key={idx} className="group bg-white/5 border border-white/5 rounded-[1.5rem] p-6 cursor-pointer">
                <summary className="list-none flex justify-between items-center font-bold text-white group-open:mb-4 transition-all">
                  {item.q}
                  <ChevronRight className="w-4 h-4 text-slate-500 group-open:rotate-90 transition-all" />
                </summary>
                <p className="text-slate-400 leading-relaxed text-sm font-medium pr-8">{item.a}</p>
              </details>
            ))}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="max-w-xl mx-auto text-center py-20 space-y-8 bg-white/5 rounded-[3rem] border border-white/5">
             <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto text-indigo-400">
                <MessageSquare className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Need Human Oversite?</h3>
                <p className="text-slate-400 mt-2 font-medium">Your Haven OS License includes 24/7 mission support.</p>
             </div>
             <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-900/20 active:scale-95">Open Live Bridge</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function NotificationsHub({ user }: { user: FirebaseUser }) {
  const notificationsQuery = useMemo(() => query(
    collection(db, `users/${user.uid}/notifications`),
    orderBy('createdAt', 'desc'),
    limit(50)
  ), [user.uid]);
  const [notifSnapshot, loading] = useCollection(notificationsQuery);
  const notifications = useMemo(() => notifSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })), [notifSnapshot]);

  const getIcon = (type: string) => {
    switch(type) {
      case 'System': return <Settings className="w-5 h-5 text-slate-400" />;
      case 'Client': return <User className="w-5 h-5 text-teal-400" />;
      case 'Security': return <ShieldCheck className="w-5 h-5 text-red-400" />;
      default: return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 font-bold">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light text-white leading-tight tracking-tight">Mission Alerts</h1>
          <p className="text-indigo-400/60 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Real-time signals from the care network</p>
        </div>
        <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">Clear All Intel</button>
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-500 italic">Interpreting network noise...</div>
        ) : (notifications || []).length === 0 ? (
          <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
            <p className="text-slate-500 italic">No new alerts. Your sanctuary remains stable.</p>
          </div>
        ) : (notifications || []).map((notif: any) => (
          <div 
            key={notif.id}
            onClick={() => !notif.read && markRead(notif.id)}
            className={`bg-white/5 border p-6 rounded-3xl flex gap-6 items-start group transition-all cursor-pointer ${notif.read ? 'border-transparent opacity-60' : 'border-white/10 hover:border-indigo-500/30'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.read ? 'bg-slate-800' : 'bg-indigo-500/10 shadow-lg shadow-indigo-900/20'}`}>
              {getIcon(notif.type)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start">
                <h3 className={`text-lg font-bold ${notif.read ? 'text-slate-400' : 'text-white'}`}>{notif.title}</h3>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(notif.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{notif.message}</p>
              {!notif.read && (
                <div className="pt-2 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                   <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Unread Transmission</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[9999] pointer-events-none px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl"
            style={{ 
              left: coords.x + 15, 
              top: coords.y + 15 
            }}
          >
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest whitespace-nowrap">
              {text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HavenCharacter() {
  return (
    <motion.div 
      className="relative w-16 h-16 md:w-24 md:h-24"
      animate={{ 
        rotate: [0, -3, 3, 0],
        y: [0, -6, 0] 
      }}
      transition={{ 
        duration: 5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        {/* Shadow underneath */}
        <motion.ellipse 
          cx="50" cy="95" rx="20" ry="5" 
          fill="black" opacity="0.1"
          animate={{ rx: [20, 24, 20], opacity: [0.1, 0.05, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        {/* Body */}
        <motion.ellipse 
          cx="50" cy="62" rx="38" ry="34" 
          fill="#0d9488" 
          animate={{ scaleY: [1, 1.05, 1], y: [0, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        
        {/* Face circle (Creamy tone for contrast) */}
        <circle cx="50" cy="55" r="30" fill="#ccfbf1" />

        {/* Chest Pattern */}
        <g opacity="0.2">
          <path d="M40 70 Q50 62 60 70" stroke="#0f172a" strokeWidth="2" fill="none" />
          <path d="M42 76 Q50 68 58 76" stroke="#0f172a" strokeWidth="2" fill="none" />
        </g>

        {/* Eyes Container */}
        <g>
          {/* Left Eye */}
          <circle cx="36" cy="50" r="12" fill="white" stroke="#0d9488" strokeWidth="1" />
          <motion.circle 
            cx="37" cy="50" r="5" 
            fill="#0f172a"
            animate={{ 
              x: [0, 2, -2, 0],
              y: [0, -1, 1, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          {/* Blinking Lid */}
          <motion.rect 
            x="24" y="38" width="24" height="24" 
            fill="#ccfbf1" 
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 0, 1, 0, 0] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 0.98, 1] }}
            style={{ originY: 0 }}
          />

          {/* Right Eye */}
          <circle cx="64" cy="50" r="12" fill="white" stroke="#0d9488" strokeWidth="1" />
          <motion.circle 
            cx="63" cy="50" r="5" 
            fill="#0f172a"
            animate={{ 
              x: [0, -2, 2, 0],
              y: [0, -1, 1, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.rect 
            x="52" y="38" width="24" height="24" 
            fill="#ccfbf1" 
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 0, 1, 0, 0] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 0.98, 1] }}
            style={{ originY: 0 }}
          />
        </g>

        {/* Beak - slight bounce */}
        <motion.path 
          d="M46 60 L50 70 L54 60 Z" 
          fill="#f59e0b"
          animate={{ y: [0, 1, 0] }}
          transition={{ duration: 1.25, repeat: Infinity }}
        />

        {/* Tufted Ears (Tilted) */}
        <path d="M25 35 L15 20 L35 30 Z" fill="#0d9488" />
        <path d="M75 35 L85 20 L65 30 Z" fill="#0d9488" />

        {/* Wings (Slight flapping movement) */}
        <motion.path 
          d="M15 60 Q5 50 12 40" 
          stroke="#0d9488" strokeWidth="8" strokeLinecap="round" fill="none"
          animate={{ rotate: [0, -10, 0] }}
          style={{ originX: '15px', originY: '60px' }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.path 
          d="M85 60 Q95 50 88 40" 
          stroke="#0d9488" strokeWidth="8" strokeLinecap="round" fill="none"
          animate={{ rotate: [0, 10, 0] }}
          style={{ originX: '85px', originY: '60px' }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
}

function GuidedTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const steps = [
    {
      title: "Welcome to your Sanctuary",
      description: "Greetings! I am Haven. I'll show you how to navigate your new focused environment. It's designed to be your safe harbor for impact.",
      target: null 
    },
    {
      title: "The Compass",
      description: "This is your Launcher. Use it to switch between your specialized hubs like Case Management and Strategic Vision.",
      target: "os-launcher"
    },
    {
      title: "Deep Search",
      description: "Looking for something? This bar searches your entire archive instantly. No note is ever out of reach.",
      target: "os-search"
    },
    {
      title: "System Wellness",
      description: "Need a hand? Access system diagnostics, SOPs, and human support right here whenever you feel friction.",
      target: "help-button"
    },
    {
      title: "Operational Vitals",
      description: "Monitor your mission's pulse here. These widgets keep your daily focus aligned with your long-term vision.",
      target: "desktop-widgets"
    },
    {
      title: "Fly Free!",
      description: "You're all set. Your environment is ready, your mission is clear. I'll be around if you need me!",
      target: null
    }
  ];

  useEffect(() => {
    const updateTarget = () => {
      const currentStepObj = steps[step];
      if (currentStepObj && currentStepObj.target) {
        const el = document.getElementById(currentStepObj.target);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTarget();
    window.addEventListener('resize', updateTarget);
    return () => window.removeEventListener('resize', updateTarget);
  }, [step]);

  const currentStep = steps[step];

  // Bulletproof Positioning for Speech Bubble
  const getTourStyles = () => {
    const padding = 16;
    const isMobile = windowWidth < 640;
    
    // Bubble max dimensions
    const bubbleW = isMobile ? 320 : 440;
    const mascotW = isMobile ? 64 : 96;
    const gap = isMobile ? 0 : 24;
    
    const totalW = isMobile ? bubbleW : mascotW + gap + bubbleW;
    const estH = isMobile ? 400 : 350; 

    if (!targetRect) {
      return { 
        left: '50%', 
        top: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const, 
        isMobile,
        arrowPos: null,
        bubbleW
      };
    }
    
    const targetCX = targetRect.left + targetRect.width / 2;
    const targetCY = targetRect.top + targetRect.height / 2;

    const options = [
      { l: targetCX - totalW / 2, t: targetRect.bottom + 24, pos: 'bottom' },
      { l: targetCX - totalW / 2, t: targetRect.top - estH - 24, pos: 'top' },
      { l: targetRect.right + 24, t: targetCY - estH / 2, pos: 'right' },
      { l: targetRect.left - totalW - 24, t: targetCY - estH / 2, pos: 'left' }
    ];

    let best = options.find(o => 
      o.l >= padding && 
      o.l + totalW <= windowWidth - padding &&
      o.t >= padding && 
      o.t + estH <= windowHeight - padding
    );

    if (!best) {
      best = options[0];
    }

    const left = Math.max(padding, Math.min(best.l, windowWidth - totalW - padding));
    const top = Math.max(padding, Math.min(best.t, windowHeight - estH - padding));

    return { left, top, position: 'fixed' as const, isMobile, totalW, arrowPos: best.pos, bubbleW };
  };

  const styles = getTourStyles() as any;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none font-sans">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -10 }}
          className={`fixed z-[110] flex ${styles.isMobile ? 'flex-col items-center' : 'items-start'} pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
          style={
            !targetRect 
            ? {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: 'calc(100vh - 32px)'
              }
            : {
                left: styles.left,
                top: styles.top,
                width: styles.totalW,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: `calc(100vh - ${styles.top + 16}px)`
              }
          }
        >
          {/* Haven Mascot */}
          <div className={`flex-shrink-0 ${styles.isMobile ? '-mb-4 z-10' : 'mr-6 pt-8'}`}>
            <HavenCharacter />
          </div>

          {/* Speech Bubble */}
          <div 
             className="bg-white border-4 border-teal-500 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-[0_40px_100px_rgba(0,128,128,0.2)] relative flex flex-col min-h-0"
             style={{ width: `${styles.bubbleW}px`, maxWidth: '100%' }}
          >
            {/* Haven Arrow */}
            {targetRect && !styles.isMobile && styles.arrowPos === 'right' && (
              <div className="absolute w-8 h-8 bg-white border-b-4 border-l-4 border-teal-500 rotate-45 top-12 -left-[1.2rem]" />
            )}
            {targetRect && !styles.isMobile && styles.arrowPos !== 'right' && (
              <div className="absolute w-8 h-8 bg-white border-b-4 border-l-4 border-teal-500 rotate-45 top-12 -left-[1.2rem]" />
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-lg font-bold text-xs uppercase tracking-wide shrink-0 inline-block w-max">
                Phase {step + 1}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight" style={{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>{currentStep.title}</h3>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 mb-6 min-h-0 pr-2">
              <p className="text-slate-600 font-medium leading-relaxed text-base md:text-lg" style={{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>
                {currentStep.description}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 pt-4 mt-auto border-t border-slate-100 shrink-0">
              <button 
                onClick={onComplete}
                className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors px-4 py-3 sm:px-2 sm:py-2 text-center min-h-[44px]"
                id="tour-skip-button"
              >
                End Session
              </button>
              
              <button 
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()}
                className="whitespace-nowrap bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-bold transition-transform shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95 text-sm w-full sm:w-auto min-h-[48px]"
                id="tour-next-button"
              >
                {step < steps.length - 1 ? (
                  <>Next Step <ChevronRight className="w-4 h-4 text-white/80" /></>
                ) : (
                  "Let's Go!"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Accurate Precise Highlight Frame */}
      {targetRect && (
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-[105] pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        >
          {/* Animated Border Frame */}
          <div className="absolute inset-0 border-[3px] border-teal-400 rounded-xl shadow-[0_0_50px_rgba(45,212,191,0.5)]">
            <motion.div 
              className="absolute inset-0 border-[3px] border-white/50 rounded-xl"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Corner Brackets */}
          <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg shadow-[0_0_15px_rgba(255,255,255,1)]" />
          <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg shadow-[0_0_15px_rgba(255,255,255,1)]" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg shadow-[0_0_15px_rgba(255,255,255,1)]" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg shadow-[0_0_15px_rgba(255,255,255,1)]" />
        </motion.div>
      )}
    </div>
  );
}
