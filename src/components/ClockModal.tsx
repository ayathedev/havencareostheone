import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock as ClockIcon, X, Bell, BellOff, Plus, Play, Pause, RotateCcw, Trash2, Volume2 } from 'lucide-react';

interface Alarm {
  id: string;
  time: string; // "08:30"
  label: string;
  enabled: boolean;
}

export function ClockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'alarm' | 'timer' | 'stopwatch'>('alarm');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Alarms
  const [alarms, setAlarms] = useState<Alarm[]>([
    { id: '1', time: '08:00', label: 'Morning Standup & Care Sync', enabled: true },
    { id: '2', time: '12:30', label: 'Mid-day Stabilization Review', enabled: false },
    { id: '3', time: '17:00', label: 'Evening Shift Transition', enabled: true }
  ]);
  const [newAlarmTime, setNewAlarmTime] = useState('09:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [triggeredAlarm, setTriggeredAlarm] = useState<string | null>(null);

  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Stopwatch State
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Live time ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check alarms on exact minute
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (now.getSeconds() === 0) {
        const matching = alarms.find(a => a.enabled && a.time === currentHHMM);
        if (matching) {
          playAlarmSound();
          setTriggeredAlarm(matching.label || `Alarm at ${matching.time}`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms]);

  // Stopwatch interval
  useEffect(() => {
    let interval: any;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Timer interval
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playAlarmSound();
            setTriggeredAlarm('Timer Completed!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft]);

  const playAlarmSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioCtxRef.current || new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.4); // D6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTime) return;

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      label: newAlarmLabel.trim() || `Alarm at ${newAlarmTime}`,
      enabled: true
    };

    setAlarms(prev => [...prev, newAlarm].sort((a, b) => a.time.localeCompare(b.time)));
    setNewAlarmLabel('');
    setShowAddAlarm(false);
  };

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const formatStopwatch = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="clock-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-slate-900/95 border border-white/10 rounded-[3rem] p-8 max-w-lg w-full space-y-8 shadow-2xl relative text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">Clock & Alarms</h3>
                  <p className="text-xs text-slate-400">Precision timers & shift alerts</p>
                </div>
              </div>
              <button 
                id="clock-close-button"
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Clock Display */}
            <div className="p-6 bg-white/5 border border-white/5 rounded-3xl text-center space-y-1 relative overflow-hidden">
              <div className="absolute top-3 right-4 flex items-center gap-1 text-[10px] text-teal-400 font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                Live
              </div>
              <p className="text-4xl sm:text-5xl font-extralight tracking-tight text-white font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Alarm Trigger Banner */}
            {triggeredAlarm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-teal-500/20 border border-teal-500/40 rounded-2xl flex items-center justify-between shadow-lg shadow-teal-500/20 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-teal-400" />
                  <div>
                    <p className="text-xs font-bold text-teal-300">Alarm Triggered!</p>
                    <p className="text-sm font-semibold text-white">{triggeredAlarm}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTriggeredAlarm(null)}
                  className="px-3 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 transition-colors"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                id="tab-alarms"
                onClick={() => setActiveTab('alarm')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'alarm' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alarms
              </button>
              <button
                id="tab-timer"
                onClick={() => setActiveTab('timer')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'timer' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Timer
              </button>
              <button
                id="tab-stopwatch"
                onClick={() => setActiveTab('stopwatch')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'stopwatch' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Stopwatch
              </button>
            </div>

            {/* Tab: Alarms */}
            {activeTab === 'alarm' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scheduled Alarms</span>
                  <button
                    id="clock-add-alarm-toggle"
                    onClick={() => setShowAddAlarm(!showAddAlarm)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddAlarm ? 'Cancel' : 'New Alarm'}
                  </button>
                </div>

                {showAddAlarm && (
                  <form onSubmit={handleAddAlarm} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={newAlarmTime}
                        onChange={(e) => setNewAlarmTime(e.target.value)}
                        required
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-lg text-white font-mono focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="Alarm label..."
                        value={newAlarmLabel}
                        onChange={(e) => setNewAlarmLabel(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Bell className="w-3.5 h-3.5" /> Save Alarm
                    </button>
                  </form>
                )}

                <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.length === 0 ? (
                    <div className="text-center py-4 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl text-xs text-slate-500">
                      No active alarms set
                    </div>
                  ) : (
                    alarms.map(alarm => (
                      <div 
                        key={alarm.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          alarm.enabled 
                            ? 'bg-white/5 border-white/10' 
                            : 'bg-white/[0.02] border-white/5 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleAlarm(alarm.id)}
                            className={`p-2 rounded-xl transition-colors ${
                              alarm.enabled 
                                ? 'bg-teal-500/20 text-teal-400' 
                                : 'bg-white/5 text-slate-500'
                            }`}
                            title={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
                          >
                            {alarm.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          </button>
                          <div>
                            <p className="text-lg font-mono font-light text-white leading-none">{alarm.time}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{alarm.label}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteAlarm(alarm.id)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Timer */}
            {activeTab === 'timer' && (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-5xl font-extralight text-white font-mono tracking-tight">
                    {formatTimer(timerSecondsLeft)}
                  </p>
                </div>

                {/* Quick Presets */}
                {!isTimerRunning && (
                  <div className="flex justify-center gap-2">
                    {[5, 10, 15, 25, 45].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          setTimerMinutes(mins);
                          setTimerSecondsLeft(mins * 60);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          timerMinutes === mins 
                            ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' 
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                      isTimerRunning 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30' 
                        : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20'
                    }`}
                  >
                    {isTimerRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start Timer</>}
                  </button>
                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSecondsLeft(timerMinutes * 60);
                    }}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Stopwatch */}
            {activeTab === 'stopwatch' && (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-5xl font-extralight text-white font-mono tracking-tight">
                    {formatStopwatch(stopwatchTime)}
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                      isStopwatchRunning 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30' 
                        : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20'
                    }`}
                  >
                    {isStopwatchRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start Stopwatch</>}
                  </button>
                  <button
                    onClick={() => {
                      setIsStopwatchRunning(false);
                      setStopwatchTime(0);
                    }}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
