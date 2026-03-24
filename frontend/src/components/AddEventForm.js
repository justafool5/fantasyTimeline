import React, { useState, useMemo } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { X, Plus, Globe, HelpCircle } from 'lucide-react';
import { getReadableTextColor } from '../utils/timelineUtils';
const EVENT_TITLE_MAX_LENGTH = 40;

export default function AddEventForm({ trackId, year, crossTrack, masterYear, parentPeriodId, forceCrossTrack, onClose }) {
  const { addEvent, allTracks, allEvents, timelineMeta } = useTimeline();
  const { theme } = useTheme();

  const initialTrack = trackId || (allTracks.length > 0 ? allTracks[0].id : null);
  
  // When adding to a track-specific period, disable cross-track option
  // When adding to a cross-track period (forceCrossTrack), force cross-track mode
  const isAddingToParent = !!parentPeriodId;
  const isAddingToCrossTrackParent = forceCrossTrack;

  const [form, setForm] = useState({
    title: '',
    type: 'point',
    year: year || 0,
    endYear: (year || 0) + 100,
    masterYear: masterYear || 0,
    masterEndYear: (masterYear || 0) + 100,
    description: '',
    image: '',
    selectedTags: [],
    trackId: initialTrack,
    isCrossTrack: forceCrossTrack ? true : (isAddingToParent ? false : (crossTrack || false)),
    // Undated event anchors
    afterEvent: '', // Event ID or empty for track/timeline start
    beforeEvent: '', // Event ID or empty for track/timeline end
  });

  const selectedTrack = allTracks.find(t => t.id === form.trackId);

  // Get available anchor events for undated positioning
  const anchorEvents = useMemo(() => {
    if (form.type !== 'undated') return [];
    
    // Filter events that can be anchors (point and period events on the same track or cross-track)
    let candidates = allEvents.filter(e => {
      // Must be a dated event (point or period)
      if (e.type !== 'point' && e.type !== 'period') return false;
      
      if (form.isCrossTrack) {
        // For cross-track undated events, only cross-track anchors make sense
        return e.trackId === null;
      } else {
        // For track-specific undated, use same-track events
        return e.trackId === form.trackId;
      }
    });
    
    // Sort by year
    candidates.sort((a, b) => {
      const getYear = (e) => {
        if (e.trackId === null) {
          return e.type === 'point' ? e.masterDate?.year : e.masterStartDate?.year;
        } else {
          return e.type === 'point' ? e.date?.year : e.startDate?.year;
        }
      };
      return (getYear(a) || 0) - (getYear(b) || 0);
    });
    
    return candidates;
  }, [form.type, form.isCrossTrack, form.trackId, allEvents]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedTitle = form.title.trim().slice(0, EVENT_TITLE_MAX_LENGTH);
    if (!normalizedTitle) return;

    const event = {
      type: form.type,
      title: normalizedTitle,
      description: form.description.trim(),
      image: form.image.trim() || null,
      tags: form.selectedTags,
    };

    if (form.type === 'undated') {
      // Undated event with anchor references
      event.afterEvent = form.afterEvent || null; // null means track/timeline start
      event.beforeEvent = form.beforeEvent || null; // null means track/timeline end
      
      if (form.isCrossTrack) {
        event.trackId = null;
      } else {
        event.trackId = form.trackId;
      }
    } else if (form.isCrossTrack) {
      // Cross-track event uses master dates
      event.trackId = null;
      if (form.type === 'point') {
        event.masterDate = { year: parseInt(form.masterYear) };
      } else if (form.type === 'period') {
        event.masterStartDate = { year: parseInt(form.masterYear) };
        event.masterEndDate = { year: parseInt(form.masterEndYear) };
      }
    } else {
      // Track-specific event uses local dates
      event.trackId = form.trackId;
      if (form.type === 'point') {
        event.date = { year: parseInt(form.year) };
      } else if (form.type === 'period') {
        event.startDate = { year: parseInt(form.year) };
        event.endDate = { year: parseInt(form.endYear) };
        event.children = [];
      }
    }

    addEvent(event, parentPeriodId);
    onClose();
  };

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg-card border-2 border-fantasy-border text-fantasy-text font-fantasy-body px-3 py-2.5 w-full focus:outline-none focus:border-fantasy-gold transition-colors'
    : 'bg-scifi-bg border border-scifi-cyan-dim text-scifi-text font-scifi-body px-3 py-2.5 w-full focus:outline-none focus:border-scifi-cyan focus:shadow-scifi-glow transition-all';

  const labelClass = `block mb-1.5 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-cyan-dim font-scifi-heading'}`;

  return (
    <motion.div
      data-testid="add-event-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(42, 24, 16, 0.85)' : 'rgba(3, 3, 8, 0.9)' }}
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
          w-full max-w-md max-h-[85vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-gradient-to-b from-fantasy-bg-card to-fantasy-bg-dark border-2 border-fantasy-border shadow-fantasy-lg'
            : 'bg-gradient-to-b from-scifi-bg-elevated to-scifi-bg-surface border border-scifi-cyan-dim shadow-scifi-lg'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-cyan uppercase tracking-wider text-base'}`}>
            Add New Event
          </h3>
          <button type="button" onClick={onClose} data-testid="close-add-form" className={`p-1.5 transition-colors ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-gold' : 'text-scifi-text-dim hover:text-scifi-cyan'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className={labelClass}>Title *</label>
          <input
            data-testid="event-title-input"
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value.slice(0, EVENT_TITLE_MAX_LENGTH) }))}
            className={inputClass}
            placeholder="Event name..."
            maxLength={EVENT_TITLE_MAX_LENGTH}
            required
          />
          <p className={`text-[10px] mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
            {form.title.length}/{EVENT_TITLE_MAX_LENGTH} characters
          </p>
        </div>

        {/* Cross-Track Toggle - disabled when adding sub-events to track-specific period */}
        {!isAddingToParent && !isAddingToCrossTrackParent && (
          <div className="mb-4">
            <label className={`flex items-center gap-3 cursor-pointer p-3 transition-all ${theme === 'fantasy' ? 'bg-fantasy-bg/50 border border-fantasy-border/30 hover:border-fantasy-accent/50' : 'bg-scifi-bg/50 border border-scifi-border/30 hover:border-scifi-accent/50'}`}>
              <input
                type="checkbox"
                data-testid="cross-track-checkbox"
                checked={form.isCrossTrack}
                onChange={e => setForm(f => ({ ...f, isCrossTrack: e.target.checked }))}
                className="w-4 h-4"
              />
              <Globe size={16} className={form.isCrossTrack ? (theme === 'fantasy' ? 'text-fantasy-accent' : 'text-scifi-accent') : (theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted')} />
              <div>
                <span className={`text-sm font-bold ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-text' : 'font-scifi-heading text-scifi-text'}`}>
                  Cross-Track Event
                </span>
                <p className={`text-xs ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
                  Spans all tracks (e.g., celestial events, cataclysms)
                </p>
              </div>
            </label>
          </div>
        )}
        
        {/* Show hint when adding sub-event to track-specific period */}
        {isAddingToParent && !isAddingToCrossTrackParent && (
          <div className={`mb-4 p-3 text-sm ${theme === 'fantasy' ? 'bg-fantasy-accent/10 border border-fantasy-accent/30 text-fantasy-accent' : 'bg-scifi-accent/10 border border-scifi-accent/30 text-scifi-accent'}`}>
            Adding sub-event to period
          </div>
        )}
        
        {/* Show hint when adding sub-event to cross-track period */}
        {isAddingToCrossTrackParent && (
          <div className={`mb-4 p-3 text-sm flex items-center gap-2 ${theme === 'fantasy' ? 'bg-red-900/20 border border-red-700/40 text-red-400' : 'bg-pink-500/10 border border-pink-400/30 text-pink-400'}`}>
            <Globe size={16} />
            Adding cross-track sub-event (spans all tracks)
          </div>
        )}

        {/* Track Selection (if not cross-track and not adding to cross-track parent) */}
        {!form.isCrossTrack && !isAddingToCrossTrackParent && allTracks.length > 0 && (
          <div className="mb-4">
            <label className={labelClass}>Track</label>
            <select
              data-testid="event-track-select"
              value={form.trackId}
              onChange={e => setForm(f => ({ ...f, trackId: e.target.value }))}
              className={inputClass}
            >
              {allTracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name} ({track.abbr})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Type */}
        <div className="mb-4">
          <label className={labelClass}>Type</label>
          <div className="flex gap-2">
            {['point', 'period', 'undated'].map(t => (
              <button
                key={t}
                type="button"
                data-testid={`event-type-${t}`}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-all flex items-center gap-1
                  ${form.type === t
                    ? theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent'
                    : theme === 'fantasy' ? 'bg-fantasy-bg text-fantasy-muted border border-fantasy-border/60 hover:border-fantasy-accent/50' : 'bg-scifi-bg text-scifi-muted border border-scifi-border hover:border-scifi-accent'
                  }`}
              >
                {t === 'undated' && <HelpCircle size={12} />}
                {t}
              </button>
            ))}
          </div>
          {form.type === 'undated' && (
            <p className={`text-xs mt-2 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
              Undated events are positioned between two anchor events
            </p>
          )}
        </div>

        {/* Date fields - different for each type */}
        {form.type === 'undated' ? (
          // Undated: show anchor event dropdowns
          <div className="mb-4">
            <div className="mb-3">
              <label className={labelClass}>After Event (earlier anchor)</label>
              <select
                data-testid="event-after-select"
                value={form.afterEvent}
                onChange={e => setForm(f => ({ ...f, afterEvent: e.target.value }))}
                className={inputClass}
              >
                <option value="">{form.isCrossTrack ? '— Timeline Start —' : `— ${selectedTrack?.name || 'Track'} Start —`}</option>
                {anchorEvents.map(evt => {
                  const evtYear = evt.trackId === null 
                    ? (evt.type === 'point' ? evt.masterDate?.year : evt.masterStartDate?.year)
                    : (evt.type === 'point' ? evt.date?.year : evt.startDate?.year);
                  const abbr = evt.trackId === null ? '' : (selectedTrack?.abbr || '');
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evtYear} {abbr})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={labelClass}>Before Event (later anchor)</label>
              <select
                data-testid="event-before-select"
                value={form.beforeEvent}
                onChange={e => setForm(f => ({ ...f, beforeEvent: e.target.value }))}
                className={inputClass}
              >
                <option value="">{form.isCrossTrack ? '— Timeline End —' : `— ${selectedTrack?.name || 'Track'} End —`}</option>
                {anchorEvents.map(evt => {
                  const evtYear = evt.trackId === null 
                    ? (evt.type === 'point' ? evt.masterDate?.year : evt.masterStartDate?.year)
                    : (evt.type === 'point' ? evt.date?.year : evt.startDate?.year);
                  const abbr = evt.trackId === null ? '' : (selectedTrack?.abbr || '');
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evtYear} {abbr})
                    </option>
                  );
                })}
              </select>
            </div>
            <p className={`text-xs mt-2 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
              The event will appear between these two anchors
            </p>
          </div>
        ) : form.isCrossTrack ? (
          // Cross-track: show "reference year" (master) without calling it master
          form.type === 'point' ? (
            <div className="mb-4">
              <label className={labelClass}>Reference Year</label>
              <input
                data-testid="event-master-year-input"
                type="number"
                value={form.masterYear}
                onChange={e => setForm(f => ({ ...f, masterYear: e.target.value }))}
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
                Position relative to other tracks
              </p>
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Reference</label>
                <input
                  data-testid="event-master-start-input"
                  type="number"
                  value={form.masterYear}
                  onChange={e => setForm(f => ({ ...f, masterYear: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End Reference</label>
                <input
                  data-testid="event-master-end-input"
                  type="number"
                  value={form.masterEndYear}
                  onChange={e => setForm(f => ({ ...f, masterEndYear: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )
        ) : (
          // Track-specific: show local year with track's calendar
          form.type === 'point' ? (
            <div className="mb-4">
              <label className={labelClass}>Year ({selectedTrack?.abbr || 'Local'})</label>
              <input
                data-testid="event-year-input"
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className={inputClass}
              />
              <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted/60' : 'text-scifi-muted'}`}>
                In {selectedTrack?.calendarName || 'local calendar'}
              </p>
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Year ({selectedTrack?.abbr})</label>
                <input
                  data-testid="event-start-year-input"
                  type="number"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End Year ({selectedTrack?.abbr})</label>
                <input
                  data-testid="event-end-year-input"
                  type="number"
                  value={form.endYear}
                  onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )
        )}

        {/* Description */}
        <div className="mb-4">
          <label className={labelClass}>Description</label>
          <textarea
            data-testid="event-description-input"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inputClass} h-24 resize-none`}
            placeholder="Describe the event..."
          />
        </div>

        {/* Image URL */}
        <div className="mb-4">
          <label className={labelClass}>Image URL</label>
          <input
            data-testid="event-image-input"
            type="url"
            value={form.image}
            onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
            className={inputClass}
            placeholder="https://..."
          />
        </div>

        {/* Tags */}
        <div className="mb-6" data-testid="event-tags-input">
          <label className={labelClass}>Tags</label>
          {timelineMeta?.tagDefinitions?.length ? (
            <div className="flex flex-wrap gap-2">
              {timelineMeta.tagDefinitions.map(tag => {
                const isSelected = form.selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    data-testid={`event-tag-option-${tag.id}`}
                    onClick={() => setForm(f => ({
                      ...f,
                      selectedTags: isSelected
                        ? f.selectedTags.filter(existingTagId => existingTagId !== tag.id)
                        : [...f.selectedTags, tag.id]
                    }))}
                    className={`px-3 py-1.5 text-xs font-bold border transition-all ${theme === 'fantasy' ? 'font-fantasy-heading' : 'font-scifi-heading'}`}
                    style={{
                      backgroundColor: isSelected ? tag.color : 'transparent',
                      color: isSelected ? getReadableTextColor(tag.color) : tag.color,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`p-3 text-xs ${theme === 'fantasy' ? 'bg-fantasy-bg/50 border border-fantasy-border/30 text-fantasy-muted' : 'bg-scifi-bg/50 border border-scifi-border/30 text-scifi-muted'}`}>
              No timeline tags defined yet. Add them from timeline settings to reuse canonical tags here.
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          data-testid="submit-event-btn"
          type="submit"
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all
            ${theme === 'fantasy'
              ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600'
              : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'
            }`}
        >
          <Plus size={16} />
          {form.isCrossTrack ? 'Add Cross-Track Event' : 'Add Event'}
        </button>
      </motion.form>
    </motion.div>
  );
}
