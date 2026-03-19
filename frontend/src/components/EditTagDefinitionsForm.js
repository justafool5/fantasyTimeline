import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Save, Trash2, Tags } from 'lucide-react';
import { useTimeline } from '../contexts/TimelineContext';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeTagId } from '../utils/timelineUtils';

const DEFAULT_TAG_COLORS = [
  '#c9a84c',
  '#4a9eff',
  '#50c878',
  '#ff6b6b',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#e91e63',
];

export default function EditTagDefinitionsForm({ onClose }) {
  const { timelineMeta, updateTimelineMeta } = useTimeline();
  const { theme } = useTheme();

  const [definitions, setDefinitions] = useState(
    (timelineMeta?.tagDefinitions || []).map((definition, index) => ({
      id: definition.id || `tag-${index + 1}`,
      label: definition.label || '',
      color: definition.color || DEFAULT_TAG_COLORS[index % DEFAULT_TAG_COLORS.length],
    }))
  );

  const inputClass = theme === 'fantasy'
    ? 'bg-fantasy-bg border border-fantasy-border/60 text-fantasy-text font-fantasy-body px-3 py-2 w-full focus:outline-none focus:border-fantasy-accent'
    : 'bg-scifi-bg border border-scifi-border text-scifi-text font-scifi-body px-3 py-2 w-full focus:outline-none focus:border-scifi-accent';

  const labelClass = `block mb-1 text-xs font-bold uppercase tracking-wider ${theme === 'fantasy' ? 'text-fantasy-muted font-fantasy-heading' : 'text-scifi-muted font-scifi-heading'}`;

  const hasDuplicates = useMemo(() => {
    const ids = definitions
      .map(definition => normalizeTagId(definition.id || definition.label))
      .filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [definitions]);

  const addDefinition = () => {
    setDefinitions(prev => ([
      ...prev,
      {
        id: '',
        label: '',
        color: DEFAULT_TAG_COLORS[prev.length % DEFAULT_TAG_COLORS.length],
      }
    ]));
  };

  const updateDefinition = (index, field, value) => {
    setDefinitions(prev => prev.map((definition, currentIndex) => {
      if (currentIndex !== index) return definition;

      if (field === 'label') {
        const nextLabel = value;
        return {
          ...definition,
          label: nextLabel,
          id: definition.id ? definition.id : normalizeTagId(nextLabel),
        };
      }

      return {
        ...definition,
        [field]: value,
      };
    }));
  };

  const removeDefinition = (index) => {
    setDefinitions(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (hasDuplicates) return;

    updateTimelineMeta({
      tagDefinitions: definitions,
    });
    onClose();
  };

  return (
    <motion.div
      data-testid="edit-tag-definitions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: theme === 'fantasy' ? 'rgba(10,8,4,0.7)' : 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.form
        data-testid="edit-tag-definitions-form"
        initial={{ scale: 0.94, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 24 }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`
          w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6
          ${theme === 'fantasy'
            ? 'bg-fantasy-card border border-fantasy-border shadow-[0_4px_40px_rgba(0,0,0,0.7)]'
            : 'bg-scifi-bg-secondary border border-scifi-border shadow-[0_0_30px_rgba(0,243,255,0.1)] backdrop-blur-md'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-xl font-bold flex items-center gap-2 ${theme === 'fantasy' ? 'font-fantasy-heading text-fantasy-accent' : 'font-scifi-heading text-scifi-accent text-base'}`}>
              <Tags size={18} /> Edit Tags
            </h3>
            <p className={`text-xs mt-1 ${theme === 'fantasy' ? 'text-fantasy-muted' : 'text-scifi-muted'}`}>
              Define canonical timeline tags once so events reuse the same labels and colors.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-edit-tags"
            className={`p-1 ${theme === 'fantasy' ? 'text-fantasy-muted hover:text-fantasy-text' : 'text-scifi-muted hover:text-scifi-accent'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {definitions.length === 0 && (
            <div className={`p-4 text-sm ${theme === 'fantasy' ? 'bg-fantasy-bg/50 border border-fantasy-border/30 text-fantasy-muted' : 'bg-scifi-bg/50 border border-scifi-border/30 text-scifi-muted'}`}>
              No canonical tags yet. Add one to start standardizing event tags for this timeline.
            </div>
          )}

          {definitions.map((definition, index) => (
            <div
              key={`tag-definition-${index}`}
              className={`grid grid-cols-[1.2fr_1fr_120px_auto] gap-3 items-end p-3 ${theme === 'fantasy' ? 'bg-fantasy-bg/40 border border-fantasy-border/30' : 'bg-scifi-bg/40 border border-scifi-border/30'}`}
            >
              <div>
                <label className={labelClass}>Label</label>
                <input
                  data-testid={`tag-definition-label-${index}`}
                  type="text"
                  value={definition.label}
                  onChange={e => updateDefinition(index, 'label', e.target.value)}
                  className={inputClass}
                  placeholder="Faction"
                />
              </div>
              <div>
                <label className={labelClass}>Canonical ID</label>
                <input
                  data-testid={`tag-definition-id-${index}`}
                  type="text"
                  value={definition.id}
                  onChange={e => updateDefinition(index, 'id', normalizeTagId(e.target.value))}
                  className={inputClass}
                  placeholder="faction"
                />
              </div>
              <div>
                <label className={labelClass}>Color</label>
                <input
                  data-testid={`tag-definition-color-${index}`}
                  type="color"
                  value={definition.color}
                  onChange={e => updateDefinition(index, 'color', e.target.value)}
                  className={`${inputClass} h-10 p-1`}
                />
              </div>
              <button
                type="button"
                data-testid={`tag-definition-remove-${index}`}
                onClick={() => removeDefinition(index)}
                className={`h-10 px-3 flex items-center justify-center ${theme === 'fantasy' ? 'text-red-400 border border-red-700/40 hover:bg-red-900/20' : 'text-red-400 border border-red-500/30 hover:bg-red-500/10'}`}
                title="Remove tag"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {hasDuplicates && (
          <div className={`mb-4 p-3 text-sm ${theme === 'fantasy' ? 'bg-red-900/20 border border-red-700/40 text-red-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            Two tags resolve to the same canonical ID. Please make each tag ID unique before saving.
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            data-testid="add-tag-definition-btn"
            onClick={addDefinition}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold transition-all ${theme === 'fantasy' ? 'bg-fantasy-bg text-fantasy-accent border border-fantasy-accent/40 font-fantasy-heading hover:bg-fantasy-accent/10' : 'bg-scifi-bg text-scifi-accent border border-scifi-accent/40 font-scifi-heading hover:bg-scifi-accent/10'}`}
          >
            <Plus size={14} /> Add Tag
          </button>
          <button
            type="submit"
            data-testid="save-tag-definitions-btn"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold transition-all ${theme === 'fantasy' ? 'bg-fantasy-accent text-fantasy-bg border border-fantasy-accent font-fantasy-heading hover:bg-yellow-600' : 'bg-scifi-accent text-scifi-bg border border-scifi-accent font-scifi-heading hover:bg-cyan-300'}`}
            disabled={hasDuplicates}
          >
            <Save size={14} /> Save Tag Definitions
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
