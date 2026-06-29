import { Check, Trash2, Clock, Flame, Pencil } from 'lucide-react';
import { formatCountdown, formatDeadlineLabel, urgencyLevel, URGENCY_COLOR } from '../lib/time';
import { isStreakActive } from '../lib/streaks';

export default function TaskCard({ task, onComplete, onDelete, onEdit, highlighted }) {
  const level = urgencyLevel(task.deadline);
  const color = URGENCY_COLOR[level];

  return (
    <div
      id={`task-${task.id}`}
      className={`group animate-slide-up flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
        task.done
          ? 'bg-(--color-surface) border-(--color-border-line) opacity-50'
          : 'bg-(--color-surface) border-(--color-border-line) hover:border-(--color-border-strong) hover:shadow-lg'
      } ${highlighted ? 'ring-2 ring-(--color-signal) ring-offset-2 ring-offset-(--color-void)' : ''}`}
    >
      <button
        onClick={() => onComplete(task.id, !task.done)}
        aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
        className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 ${
          task.done
            ? 'bg-(--color-safe) border-(--color-safe)'
            : 'border-(--color-border-strong) hover:border-(--color-signal) hover:bg-(--color-signal-dim)'
        }`}
      >
        {task.done && <Check size={13} strokeWidth={3} color="var(--color-void)" className="animate-pop" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.priority && !task.done && (
            <span className="text-[10px] font-mono-tabular font-semibold px-1.5 py-0.5 rounded bg-(--color-surface-raised) text-(--color-text-muted)">
              P{task.priority}
            </span>
          )}
          <p className={`text-sm font-medium truncate ${task.done ? 'line-through text-(--color-text-faint)' : 'text-(--color-text-primary)'}`}>
            {task.title}
          </p>
          {task.recurrence === 'daily' && task.streak > 0 && (
            <span
              title={isStreakActive(task) ? `${task.streak} day streak` : 'Streak at risk — not completed today'}
              className={`flex items-center gap-0.5 text-[10px] font-mono-tabular font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                isStreakActive(task)
                  ? 'bg-(--color-signal-dim) text-(--color-signal)'
                  : 'bg-(--color-danger-dim) text-(--color-danger)'
              }`}
            >
              <Flame size={10} />
              {task.streak}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 mt-1 text-xs text-(--color-text-muted)">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDeadlineLabel(task.deadline)}
          </span>
          {!task.done && task.deadline && (
            <>
              <span className="w-1 h-1 rounded-full bg-(--color-border-strong)" />
              <span style={{ color }} className="font-mono-tabular font-medium">
                {formatCountdown(task.deadline)}
              </span>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-(--color-border-strong)" />
          <span>{task.estimatedMinutes}min</span>
        </div>

        {task.priorityReason && !task.done && (
          <p className="text-xs text-(--color-text-faint) mt-1 italic">{task.priorityReason}</p>
        )}
      </div>

      <button
        onClick={() => onEdit(task)}
        aria-label="Edit task"
        className="shrink-0 p-1.5 rounded-md border border-(--color-border-line) bg-(--color-surface-raised) text-(--color-text-muted) transition-all duration-150 hover:text-(--color-text-primary) hover:border-(--color-border-strong) hover:bg-(--color-surface-hover) hover:scale-105 active:scale-95"
      >
        <Pencil size={14} />
      </button>

      <button
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        className="shrink-0 p-1.5 rounded-md border border-(--color-border-line) bg-(--color-surface-raised) text-(--color-text-muted) transition-all duration-150 hover:text-(--color-danger) hover:border-(--color-danger)/40 hover:bg-(--color-danger-dim) hover:scale-105 active:scale-95"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
