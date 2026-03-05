import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, MapPin, Trash2, Layers, Pencil, Save, XCircle } from 'lucide-react';
import { formatYear, getTagColor } from '../utils/timelineUtils';

export default function EventCard({ event, onClose, onUpdate, onDelete, onDrillIn }) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: event.title,
    description: event.description || '',
    image: event.image || '',
    tags: (event.tags || []).join(', '),
    year: event.type === 'point' ? event.date?.year : event.type === 'period' ? event.startDate?.year : '',
    endYear: event.type === 'period' ? event.endDate?.year : '',
  });

  const year = event.type === 'point' ? event.date?.year
    : event.type === 'period' ? event.startDate?.year
    : null;
  const endYear = event.type === 'period' ? event.endDate?.year : null;

  const handleSave = () => {
    const updates = {
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (event.type === 'point') {
      updates.date = { ...event.date, year: parseInt(form.year) };
    } else if (event.type === 'period') {
      updates.startDate = { ...event.startDate, year: parseInt(form.year) };
      updates.endDate = { ...event.endDate, year: parseInt(form.endYear) };
    }
    onUpdate(updates);
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-2 py-1.5 w-full text-sm focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-2 py-1.5 w-full text-sm focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-0.5 text-[10px] font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="event-card-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.6)' : 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        data-testid={`event-card-${event.id}`}
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className={`
          w-full max-w-md max-h-[80vh] overflow-y-auto relative
          ${theme === 'fantasy'
            ? 'bg-[#1e160d] border border-fantasy-border text-fantasy-text shadow-[0_4px_40px_rgba(0,0,0,0.8)]'
            : 'bg-slate-900/95 border border-cyan-500/50 text-cyan-50 shadow-[0_0_30px_rgba(0,243,255,0.15)] backdrop-blur-md'
          }
        `}
      >
        {theme === 'scifi' && <div className="scanlines absolute inset-0 pointer-events-none" />}

        {/* Header */}
        <div className={`flex items-start justify-between p-5 pb-3 relative z-10 ${theme === 'fantasy' ? 'border-b border-fantasy-border/40' : 'border-b border-cyan-500/20'}`}>
          <div className="flex-1 pr-3">
            {editing ? (
              <input data-testid="edit-title-input" type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={`${inputClass} text-lg font-bold`} />
            ) : (
              <h3 className={`text-xl font-bold leading-tight ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-base text-scifi-accent'}`}>
                {event.title}
              </h3>
            )}
            <div className={`flex items-center gap-1.5 mt-1.5 text-sm ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              <MapPin size={13} />
              {editing && event.type === 'point' ? (
                <input data-testid="edit-year-input" type="number" value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  className={`${inputClass} w-24 text-sm`} />
              ) : editing && event.type === 'period' ? (
                <div className="flex items-center gap-1">
                  <input data-testid="edit-start-year-input" type="number" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className={`${inputClass} w-20 text-sm`} />
                  <span>—</span>
                  <input data-testid="edit-end-year-input" type="number" value={form.endYear}
                    onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))}
                    className={`${inputClass} w-20 text-sm`} />
                </div>
              ) : event.type === 'undated' ? (
                <span className="italic">Date uncertain</span>
              ) : (
                <span>
                  {formatYear(year)}
                  {endYear != null && ` — ${formatYear(endYear)}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button data-testid="edit-event-btn" onClick={() => setEditing(true)}
                className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-accent' : 'text-scifi-muted hover:text-scifi-accent'}`}
                title="Edit event">
                <Pencil size={15} />
              </button>
            )}
            <button data-testid="delete-event-btn" onClick={handleDelete}
              className={`p-1.5 transition-colors text-red-400 hover:text-red-300`}
              title="Delete event">
              <Trash2 size={15} />
            </button>
            <button data-testid="close-event-card" onClick={onClose}
              className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}>
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Image */}
        {editing ? (
          <div className="p-4 pb-0 relative z-10">
            <label className={labelClass}>Image URL</label>
            <input data-testid="edit-image-input" type="url" value={form.image}
              onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              className={inputClass} placeholder="https://..." />
          </div>
        ) : event.image ? (
          <div className="relative z-10">
            <img src={event.image} alt={event.title} className={`w-full h-48 object-cover ${theme === 'fantasy' ? 'brightness-90' : 'opacity-90'}`} loading="lazy" />
            {theme === 'fantasy' && <div className="absolute inset-0 bg-gradient-to-t from-[#1e160d] to-transparent opacity-40" />}
          </div>
        ) : null}

        {/* Description */}
        <div className="p-5 relative z-10">
          {editing ? (
            <>
              <label className={labelClass}>Description</label>
              <textarea data-testid="edit-description-input" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={`${inputClass} h-28 resize-none`} />
            </>
          ) : (
            <p className={`text-sm leading-relaxed ${theme === 'fantasy' ? 'font-fantasy-body text-fantasy-text/90' : 'font-scifi-body'}`}>
              {event.description || <span className="italic opacity-50">No description</span>}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="px-5 pb-4 relative z-10">
          {editing ? (
            <>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input data-testid="edit-tags-input" type="text" value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className={inputClass} placeholder="war, magic, discovery" />
            </>
          ) : event.tags && event.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map(tag => {
                const color = getTagColor(tag, theme);
                return (
                  <span key={tag} data-testid={`tag-${tag}`} className="px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: color.bg, color: color.text }}>
                    {tag}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Edit actions */}
        {editing && (
          <div className="px-5 pb-4 flex gap-2 relative z-10">
            <button data-testid="save-edit-btn" onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold transition-all
                ${theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'}`}>
              <Save size={14} /> Save
            </button>
            <button data-testid="cancel-edit-btn" onClick={() => setEditing(false)}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-all
                ${theme === 'fantasy' ? 'text-fantasy-muted border border-fantasy-border/60 hover:text-fantasy-text' : 'text-scifi-muted border border-scifi-border hover:text-scifi-accent'}`}>
              <XCircle size={14} /> Cancel
            </button>
          </div>
        )}

        {/* Drill-in button for period events */}
        {!editing && onDrillIn && (
          <div className="px-5 pb-4 relative z-10">
            <button
              data-testid={`drill-into-${event.id}`}
              onClick={onDrillIn}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all w-full justify-center
                ${theme === 'fantasy'
                  ? 'bg-fantasy-accent/15 text-fantasy-accent border border-fantasy-accent/40 font-fantasy-heading hover:bg-fantasy-accent/25'
                  : 'bg-scifi-accent/10 text-scifi-accent border border-scifi-accent/30 font-scifi-heading hover:bg-scifi-accent/20'
                }
              `}
            >
              <Layers size={15} />
              {event.children?.length > 0
                ? `Explore ${event.children.length} sub-events`
                : 'Open sub-timeline'
              }
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
