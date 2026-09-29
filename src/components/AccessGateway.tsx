import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  UserPlus, 
  LogIn, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail, 
  Building2, 
  Briefcase, 
  ChevronRight, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { 
  HavenUser, 
  LocalAccountRecord, 
  getLocalAccounts, 
  createLocalAccount, 
  loginLocalAccount, 
  loginGuest 
} from '../lib/localAuth';

interface AccessGatewayProps {
  onGoogleSignIn: () => Promise<void>;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  onLaunchSetupWizard: () => void;
}

export function AccessGateway({
  onGoogleSignIn,
  authError,
  setAuthError,
  onLaunchSetupWizard
}: AccessGatewayProps) {
  const [tab, setTab] = useState<'signin' | 'create' | 'google'>('signin');
  const [accounts, setAccounts] = useState<LocalAccountRecord[]>(() => getLocalAccounts());

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Create account form state
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('haven123');
  const [createRole, setCreateRole] = useState('Case Manager');
  const [createOrg, setCreateOrg] = useState('Haven Care Sanctuary');
  const [createLaunchWizard, setCreateLaunchWizard] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Refresh account list on mount and when event fires
  useEffect(() => {
    const refresh = () => setAccounts(getLocalAccounts());
    window.addEventListener('haven_accounts_change', refresh);
    return () => window.removeEventListener('haven_accounts_change', refresh);
  }, []);

  const handleSelectAccount = (acc: LocalAccountRecord) => {
    setSignInEmail(acc.email);
    setSignInPassword(acc.password || 'haven');
    setAuthError(null);
  };

  const handleQuickLaunch = (acc: LocalAccountRecord) => {
    setAuthError(null);
    try {
      loginLocalAccount(acc.email, acc.password);
    } catch (e: any) {
      setAuthError(e.message || 'Login failed.');
    }
  };

  const handleLocalSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!signInEmail.trim()) {
      setAuthError('Please enter your local email, username, or account ID.');
      return;
    }
    setIsSigningIn(true);
    try {
      loginLocalAccount(signInEmail.trim(), signInPassword.trim() || undefined);
    } catch (e: any) {
      setAuthError(e.message || 'Local authentication failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!createName.trim()) {
      setAuthError('Please enter your full clinical or administrator name.');
      return;
    }
    if (!createEmail.trim()) {
      setAuthError('Please provide an email or unique username for this device.');
      return;
    }
    setIsCreating(true);
    try {
      createLocalAccount({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword.trim() || 'haven123',
        role: createRole.trim() || 'Case Manager',
        organization: createOrg.trim() || 'Haven Care Sanctuary',
        launchSetupWizard: createLaunchWizard
      });
      if (createLaunchWizard) {
        onLaunchSetupWizard();
      }
    } catch (e: any) {
      setAuthError(e.message || 'Failed to create local account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGuestAccess = () => {
    setAuthError(null);
    try {
      loginGuest('Emergency Clinician');
    } catch (e: any) {
      setAuthError(e.message || 'Failed to start guest session.');
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0B0F19] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Wallpaper Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F19] via-[#10172A] to-[#070A12] opacity-90" />
        <img 
          src="/src/assets/images/haven_clean_wallpaper_1787839711322.jpg" 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 backdrop-blur-[6px] bg-[#0B0F19]/40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        {/* Header Branding */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-white/5 relative">
          <div className="w-16 h-16 bg-gradient-to-tr from-teal-500/20 via-teal-400/10 to-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/30 shadow-[0_0_25px_rgba(20,184,166,0.3)]">
            <div className="w-3.5 h-3.5 bg-teal-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.9)]" />
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center justify-center gap-2">
            Haven <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-amber-200">Care OS</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium max-w-md mx-auto leading-relaxed">
            Trauma-informed, HIPAA-aligned administrative operating system with zero-dependency local account vault.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 mt-6 p-1 bg-black/40 border border-white/5 rounded-2xl max-w-md mx-auto">
            <button
              type="button"
              onClick={() => { setTab('signin'); setAuthError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'signin' 
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Local Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('create'); setAuthError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'create' 
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('google'); setAuthError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'google' 
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Cloud</span>
            </button>
          </div>
        </div>

        {/* Error Notification Banner */}
        {authError && (
          <div className="mx-8 mt-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              {authError}
            </div>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {tab === 'signin' && (
            <div className="space-y-6">
              {/* Quick Profile Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Detected Local Vault Profiles
                  </span>
                  <span className="text-[10px] text-teal-400/80 font-semibold">1-Click Instant Login</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {accounts.slice(0, 4).map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                        signInEmail === acc.email 
                          ? 'bg-teal-500/15 border-teal-500/50 shadow-sm' 
                          : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner"
                          style={{ backgroundColor: acc.avatarColor || '#14b8a6' }}
                        >
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate group-hover:text-teal-300 transition-colors">
                            {acc.name}
                          </p>
                          <p className="text-slate-400 text-[10px] truncate opacity-75">
                            {acc.role}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLaunch(acc);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-white text-[10px] font-bold transition-all shrink-0 ml-2"
                        title="Quick Login"
                      >
                        Launch
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Credential Input */}
              <form onSubmit={handleLocalSignInSubmit} className="space-y-3.5 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Account ID or Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="aya@havenos.local or admin"
                        required
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Local Password
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSigningIn ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Haven OS</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('create'); setAuthError(null); }}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium text-xs transition-all border border-white/10 cursor-pointer"
                  >
                    Register New
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center gap-2.5 text-teal-300 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 text-teal-400" />
                <span>Create an offline-first sanctuary profile. All case notes and data remain safely on your device.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Full Name & Credentials *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Chen, MD or Aya Ruane"
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Local Email or User ID *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="e.g. sarah.chen@havenos.local"
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Clinical Role / Position
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value)}
                      placeholder="e.g. Lead Clinician, Case Manager"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Organization / Sanctuary Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={createOrg}
                      onChange={(e) => setCreateOrg(e.target.value)}
                      placeholder="e.g. Haven Care Sanctuary"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Local Password
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Set a password (e.g. haven123)"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2.5 cursor-pointer" onClick={() => setCreateLaunchWizard(!createLaunchWizard)}>
                <input 
                  type="checkbox"
                  id="launchWizardCheck"
                  checked={createLaunchWizard}
                  onChange={(e) => setCreateLaunchWizard(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-teal-500 focus:ring-teal-500 cursor-pointer w-4 h-4"
                />
                <label htmlFor="launchWizardCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Launch First-Run Setup Wizard upon account creation (Recommended)
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setAuthError(null); }}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium text-xs transition-all border border-white/10 cursor-pointer"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Enter Haven OS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {tab === 'google' && (
            <div className="space-y-6 text-center py-4">
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-white">Google Cloud Identity</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in using your Google account to synchronize cases and telemetry directly with Firebase Firestore.
                </p>
              </div>

              <div className="max-w-sm mx-auto space-y-3">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Sign in with Google Account</span>
                </button>

                <p className="text-[10px] text-slate-500">
                  Running in an iframe preview? If popups are blocked by your browser, use the local account vault tab for guaranteed zero-delay entry.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Guaranteed Instant Access Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Guaranteed 100% Fail-Safe Access</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleGuestAccess}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="Instant zero-friction casework session"
            >
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>Instant Guest Mode</span>
            </button>

            <button
              type="button"
              onClick={onLaunchSetupWizard}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="Launch first-run setup wizard directly"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>First-Run Setup Wizard</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
