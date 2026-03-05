import React, { useState } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { formatYear } from '../utils/timelineUtils';

export default function AddEventForm({ year, parentEventId, onClose }) {
  const { addLocalEvent, addChildEvent, currentView } = useTimeline();
  const { theme } = useTheme();

  const isSubEvent = !!parentEventId;

  const [form, setForm] = useState({
    title: '',
    type: 'point',
    year: year || 0,
    endYear: (year || 0) + 100,
    description: '',
    image: '',
    tags: '',
    afterEvent: '',
    beforeEvent: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const event = {
      id: `local-${Date.now()}`,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    if (form.type === 'point') {
      event.date = { year: parseInt(form.year) };
    } else if (form.type === 'period') {
      event.startDate = { year: parseInt(form.year) };
      event.endDate = { year: parseInt(form.endYear) };
      event.children = [];
    } else {
      event.afterEvent = form.afterEvent || null;
      event.beforeEvent = form.beforeEvent || null;
    }

    if (isSubEvent) {
      addChildEvent(parentEventId, event);
    } else {
      addLocalEvent(event);
    }
    onClose();
  };

  const datedEvents = currentView.events.filter(e => e.type === 'point' || e.type === 'period');

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="add-event-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.7)' : 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="add-event-form"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`
          w-full max-w-md max-h-[80vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-fantasy-card border border-fantasy-border shadow-[0_4px_40px_rgba(0,0,0,0.7)]'
            : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_30px_rgba(0,243,255,0.1)] backdrop-blur-md'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-base'}`}>
            {isSubEvent ? 'Add Sub-Event' : 'Add New Event'}
          </h3>
          <button type="button" onClick={onClose} data-testid="close-add-form" className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className={labelClass}>Title *</label>
          <input data-testid="event-title-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Event name..." required />
        </div>

        {/* Type */}
        <div className="mb-4">
          <label className={labelClass}>Type</label>
          <div className="flex gap-2">
            {['point', 'period', 'undated'].map(t => (
              <button key={t} type="button" data-testid={`event-type-${t}`}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-all
                  ${form.type === t
                    ? theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent'
                    : theme === 'fantasy' ? 'bg-fantasy-bg text-fantasy-muted border border-fantasy-border/60 hover:border-fantasy-accent/50' : 'bg-scifi-bg text-scifi-muted border border-scifi-border hover:border-scifi-accent'
                  }`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Date fields based on type */}
        {form.type === 'point' && (
          <div className="mb-4">
            <label className={labelClass}>Year</label>
            <input data-testid="event-year-input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputClass} />
            <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>Current: {formatYear(parseInt(form.year) || 0)}</p>
          </div>
        )}

        {form.type === 'period' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Year</label>
              <input data-testid="event-start-year-input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Year</label>
              <input data-testid="event-end-year-input" type="number" value={form.endYear} onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))} className={inputClass} />
            </div>
          </div>
        )}

        {form.type === 'undated' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>After Event</label>
              <select data-testid="event-after-select" value={form.afterEvent} onChange={e => setForm(f => ({ ...f, afterEvent: e.target.value }))} className={inputClass}>
                <option value="">(Timeline Start)</option>
                {datedEvents.map(ev => (<option key={ev.id} value={ev.id}>{ev.title}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Before Event</label>
              <select data-testid="event-before-select" value={form.beforeEvent} onChange={e => setForm(f => ({ ...f, beforeEvent: e.target.value }))} className={inputClass}>
                <option value="">(Timeline End)</option>
                {datedEvents.map(ev => (<option key={ev.id} value={ev.id}>{ev.title}</option>))}
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <label className={labelClass}>Description</label>
          <textarea data-testid="event-description-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} h-24 resize-none`} placeholder="Describe the event..." />
        </div>

        {/* Image URL */}
        <div className="mb-4">
          <label className={labelClass}>Image URL</label>
          <input data-testid="event-image-input" type="url" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} className={inputClass} placeholder="https://..." />
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className={labelClass}>Tags (comma-separated)</label>
          <input data-testid="event-tags-input" type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className={inputClass} placeholder="war, magic, discovery" />
        </div>

        {/* Submit */}
        <button data-testid="submit-event-btn" type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
            ${theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'}`}>
          <Plus size={16} />
          {isSubEvent ? 'Add Sub-Event' : 'Add Event'}
        </button>
      </motion.form>
    </motion.div>
  );
}
