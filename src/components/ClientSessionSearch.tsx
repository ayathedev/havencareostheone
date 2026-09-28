import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Copy, 
  Check, 
  FileText, 
  Clock, 
  MessageSquare, 
  Sparkles, 
  ChevronRight,
  ArrowUpRight,
  Filter,
  History,
  Tag,
  FileSearch
} from 'lucide-react';

export interface SearchMatch {
  id: string;
  source: 'transcript' | 'history' | 'intake';
  title: string;
  date?: string;
  authorOrType?: string;
  content: string;
  messageIndex?: number;
}

export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.trim().toLowerCase();
        return isMatch ? (
          <mark 
            key={index} 
            className="bg-amber-400/30 text-amber-200 font-semibold px-1 py-0.5 rounded border border-amber-400/40 shadow-sm"
          >
            {part}
          </mark>
        ) : (
          part
        );
      })}
    </span>
  );
}

interface ClientSessionSearchProps {
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchScope: 'all' | 'transcript' | 'history';
  setSearchScope: (scope: 'all' | 'transcript' | 'history') => void;
  messages: { role: 'user' | 'model'; content: string }[];
  historicalNotes: any[];
  clientName: string;
  clientIntakeNotes?: string;
  clientSummary?: string;
  onQuoteInPrompt: (quotedText: string) => void;
  onJumpToMessage: (index: number) => void;
}

export function ClientSessionSearch({
  isOpen,
  onToggle,
  searchQuery,
  setSearchQuery,
  searchScope,
  setSearchScope,
  messages,
  historicalNotes,
  clientName,
  clientIntakeNotes,
  clientSummary,
  onQuoteInPrompt,
  onJumpToMessage
}: ClientSessionSearchProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickFilterTags = [
    'Housing',
    'Food',
    'Transport',
    'Safety',
    'Health',
    'Crisis',
    'Referral',
    'Intake',
    'Consultation'
  ];

  // Aggregate all searchable documents
  const allMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    const results: SearchMatch[] = [];

    // 1. Current Live Sandbox Messages
    if (searchScope === 'all' || searchScope === 'transcript') {
      messages.forEach((msg, idx) => {
        if (msg.content.toLowerCase().includes(q)) {
          results.push({
            id: `msg-${idx}`,
            source: 'transcript',
            title: msg.role === 'user' ? 'Staff Instruction' : 'Haven AI Response',
            authorOrType: msg.role === 'user' ? 'Case Manager' : 'Haven the Owl',
            content: msg.content,
            messageIndex: idx
          });
        }
      });
    }

    // 2. Historical Consultation / Appointment Notes
    if (searchScope === 'all' || searchScope === 'history') {
      historicalNotes.forEach((note, idx) => {
        const textContent = `${note.notes || ''} ${note.type || ''} ${note.location || ''} ${note.provider || ''}`;
        if (textContent.toLowerCase().includes(q)) {
          let dateStr = 'Past Session';
          if (note.date) {
            try {
              dateStr = new Date(note.date).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
            } catch {
              dateStr = String(note.date);
            }
          }

          results.push({
            id: note.id || `hist-${idx}`,
            source: 'history',
            title: note.type ? `${note.type} Note` : 'Historical Session Note',
            date: dateStr,
            authorOrType: note.provider || 'Staff / System',
            content: note.notes || '(No notes logged)'
          });
        }
      });

      // 3. Client Intake Notes if matched
      if (clientIntakeNotes && clientIntakeNotes.toLowerCase().includes(q)) {
        results.push({
          id: 'client-intake-notes',
          source: 'intake',
          title: 'Initial Intake Notes',
          date: 'Onboarding Record',
          authorOrType: 'Clinical Intake',
          content: clientIntakeNotes
        });
      }

      // 4. Client Summary if matched
      if (clientSummary && clientSummary.toLowerCase().includes(q)) {
        results.push({
          id: 'client-summary-doc',
          source: 'intake',
          title: 'Case Summary Profile',
          date: 'Baseline Profile',
          authorOrType: 'Primary Care Record',
          content: clientSummary
        });
      }
    }

    return results;
  }, [searchQuery, searchScope, messages, historicalNotes, clientIntakeNotes, clientSummary]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuote = (match: SearchMatch) => {
    const header = match.date ? `${match.title} (${match.date})` : match.title;
    // Extract a concise quote or first 200 chars
    const quoteSnippet = match.content.length > 280 
      ? match.content.substring(0, 280) + '...' 
      : match.content;
    const formatted = `> Regarding historical record [${header}]:\n> "${quoteSnippet.replace(/\n/g, ' ')}"\n\nHow should we address this in ${clientName}'s plan?`;
    onQuoteInPrompt(formatted);
  };

  return (
    <div className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md transition-all">
      {/* Top Search Action Bar */}
      <div className="p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="sandbox-session-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen && e.target.value.trim()) onToggle();
              }}
              placeholder="Search historical keywords in session notes & transcripts (e.g. housing, crisis, food)..."
              className="w-full bg-white/5 border border-white/10 focus:border-teal-500 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-md transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="sandbox-search-toggle-btn"
            onClick={onToggle}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isOpen || searchQuery.trim()
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search Panel</span>
            {searchQuery.trim() && (
              <span className="px-1.5 py-0.2 text-[10px] bg-teal-500 text-slate-950 font-black rounded-full">
                {allMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Scope and Keyword Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setSearchScope('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                searchScope === 'all'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setSearchScope('transcript')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                searchScope === 'transcript'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Transcript ({messages.length})
            </button>
            <button
              onClick={() => setSearchScope('history')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                searchScope === 'history'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Historical Notes ({historicalNotes.length})
            </button>
          </div>

          {/* Quick Keyword Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar max-w-full">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3 text-slate-400" />
              Keywords:
            </span>
            {quickFilterTags.map((tag) => {
              const active = searchQuery.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(active ? '' : tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 border ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded Match Inspector Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-slate-950/70"
          >
            <div className="p-4 max-h-[500px] overflow-y-auto space-y-2.5 custom-scrollbar">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  {searchQuery.trim() ? (
                    <>
                      Found <strong className="text-teal-400">{allMatches.length}</strong> matching notes/transcript items for "{searchQuery}"
                    </>
                  ) : (
                    <>Showing recent session history & interaction logs ({historicalNotes.length + messages.length} entries)</>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">
                  Click 'Quote' to draft AI actions with past context
                </span>
              </div>

              {allMatches.length === 0 && searchQuery.trim() ? (
                <div className="text-center py-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium">No matching historical notes or transcript snippets found for "{searchQuery}".</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try another keyword like "housing", "crisis", "health", or clear search.</p>
                </div>
              ) : (
                allMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            match.source === 'transcript'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : match.source === 'intake'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {match.source === 'transcript' ? 'Live Session' : match.source === 'intake' ? 'Intake Profile' : 'Historical Note'}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                          {match.title}
                        </h4>
                        {match.date && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {match.date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {match.source === 'transcript' && match.messageIndex !== undefined && (
                          <button
                            onClick={() => onJumpToMessage(match.messageIndex!)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Jump to message in transcript"
                          >
                            <ChevronRight className="w-3 h-3 text-teal-400" />
                            Jump
                          </button>
                        )}
                        <button
                          onClick={() => handleQuote(match)}
                          className="px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-bold flex items-center gap-1 transition-colors border border-teal-500/30"
                          title="Quote in prompt for AI analysis"
                        >
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          Quote in Chat
                        </button>
                        <button
                          onClick={() => handleCopy(match.id, match.content)}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                          title="Copy text"
                        >
                          {copiedId === match.id ? (
                            <Check className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 bg-black/20 p-2 rounded-xl border border-white/5 font-sans">
                      <HighlightText text={match.content} query={searchQuery} />
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
