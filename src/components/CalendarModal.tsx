import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Clock, Plus, Check, Sparkles } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  category: 'clinical' | 'administrative' | 'community' | 'personal';
}

export function CalendarModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({
    // Seed with a few helpful care-management reminders
    [new Date().toISOString().split('T')[0]]: [
      { id: '1', title: 'Daily Morning Clinical Check-in', time: '09:00 AM', category: 'clinical' },
      { id: '2', title: 'SDOH Support Network Sync', time: '02:00 PM', category: 'community' },
    ]
  });
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');
  const [showAddEvent, setShowAddEvent] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const selectedEvents = events[selectedDateKey] || [];

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      time: newEventTime,
      category: 'administrative'
    };

    setEvents(prev => ({
      ...prev,
      [selectedDateKey]: [...(prev[selectedDateKey] || []), newEvent]
    }));

    setNewEventTitle('');
    setShowAddEvent(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => ({
      ...prev,
      [selectedDateKey]: (prev[selectedDateKey] || []).filter(ev => ev.id !== id)
    }));
  };

  const isToday = (d: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (d: number) => {
    return selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="calendar-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-slate-900/95 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">System Calendar</h3>
                  <p className="text-xs text-slate-400">Schedule & administrative timelines</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="calendar-today-button"
                  onClick={handleToday}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 rounded-xl transition-colors border border-white/5"
                >
                  Today
                </button>
                <button 
                  id="calendar-close-button"
                  onClick={onClose} 
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between px-2">
              <h4 className="text-lg font-semibold text-slate-100">
                {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
              </h4>
              <div className="flex items-center gap-1">
                <button 
                  id="calendar-prev-month"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  id="calendar-next-month"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayDate = new Date(year, month, day);
                  const key = dayDate.toISOString().split('T')[0];
                  const hasEvents = (events[key] || []).length > 0;
                  const active = isSelected(day);
                  const current = isToday(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dayDate)}
                      className={`h-9 w-full rounded-xl text-xs font-medium relative flex flex-col items-center justify-center transition-all ${
                        active
                          ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                          : current
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span>{day}</span>
                      {hasEvents && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${active ? 'bg-white' : 'bg-indigo-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  id="calendar-add-event-toggle"
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddEvent ? 'Cancel' : 'Add Item'}
                </button>
              </div>

              {showAddEvent && (
                <form onSubmit={handleAddEvent} className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <input
                    type="text"
                    placeholder="Event / Reminder title..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Time (e.g. 11:30 AM)"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="w-1/2 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors py-2 flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </form>
              )}

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {selectedEvents.length === 0 ? (
                  <div className="text-center py-4 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl text-xs text-slate-500">
                    No scheduled items for this date
                  </div>
                ) : (
                  selectedEvents.map(ev => (
                    <div 
                      key={ev.id}
                      className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-between text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-200 truncate">{ev.title}</p>
                          <p className="text-[10px] text-slate-400">{ev.time}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete event"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
