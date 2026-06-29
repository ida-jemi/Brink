import { useState } from 'react';
import { X, CalendarCheck } from 'lucide-react';

function defaultDeadline() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

/** ISO datetime -> value usable by <input type="datetime-local"> (local time, no seconds/zone) */
function toLocalInputValue(iso) {
  if (!iso) return defaultDeadline();
  const d = new Date(iso);
  d.setSeconds(0, 0);
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/**
 * Used both to create a new task (no `task` prop, calls onSubmit) and to
 * edit an existing one (pass `task`, calls onSave with the task id + patch).
 * This keeps "add" and "edit" as one form so they can't drift apart.
 */
export default function AddTaskModal({ task, onClose, onSubmit, onSave, calendarConnected }) {
  const isEditing = Boolean(task);
  const [title, setTitle] = useState(task?.title || '');
  const [deadline, setDeadline] = useState(toLocalInputValue(task?.deadline));
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes ?? 30);
  const [notes, setNotes] = useState(task?.notes || '');
  const [recurrence, setRecurrence] = useState(task?.recurrence || null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title,
      deadline: new Date(deadline).toISOString(),
      estimatedMinutes,
      notes,
      recurrence,
    };
    if (isEditing) {
      onSave(task.id, payload);
    } else {
      onSubmit(payload);
    }
    onClose();
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="animate-scale-in w-full max-w-sm rounded-2xl bg-(--color-surface-raised) border border-(--color-border-strong) p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-(--color-text-primary)">{isEditing ? 'Edit task' : 'Add a task'}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-(--color-text-faint) transition-all duration-150 hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) hover:scale-105 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="What needs to happen">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finish the Q3 report"
              className="input"
              required
            />
          </Field>

          <Field label="Deadline">
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
              required
            />
          </Field>

          <Field label="Estimated time (minutes)">
            <input
              type="number"
              min="5"
              step="5"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything that helps the AI plan this well"
              rows={2}
              className="input resize-none"
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recurrence === 'daily'}
              onChange={(e) => setRecurrence(e.target.checked ? 'daily' : null)}
              className="w-4 h-4 rounded accent-(--color-signal)"
            />
            <span className="text-xs font-medium text-(--color-text-muted)">
              Repeats daily — track as a habit/streak
            </span>
          </label>
          {isEditing && task.recurrence === 'daily' && recurrence !== 'daily' && (
            <p className="text-xs text-(--color-text-faint) -mt-1.5">
              Turning this off will stop tracking the streak (currently {task.streak || 0}).
            </p>
          )}

          {!isEditing && calendarConnected && (
            <p className="text-xs text-(--color-text-faint) flex items-center gap-1.5 -mt-1">
              <CalendarCheck size={12} className="shrink-0 text-(--color-safe)" />
              This will also be added to your Google Calendar with a 30-min reminder.
            </p>
          )}

          <button
            type="submit"
            className="mt-1 w-full text-sm font-medium py-2.5 rounded-lg bg-(--color-signal) text-(--color-void) transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isEditing ? 'Save changes' : 'Add task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-(--color-text-muted)">{label}</span>
      {children}
    </label>
  );
}
