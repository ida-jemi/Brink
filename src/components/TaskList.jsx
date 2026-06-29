import { Sparkles, Plus } from 'lucide-react';
import TaskCard from './TaskCard';

export default function TaskList({ tasks, onComplete, onDelete, onEdit, onPrioritize, prioritizing, insight, onAddClick, highlightedId }) {
  const active = tasks.filter((t) => !t.done).sort((a, b) => {
    if (a.priority && b.priority) return a.priority - b.priority;
    if (a.priority) return -1;
    if (b.priority) return 1;
    return new Date(a.deadline || 8640000000000000) - new Date(b.deadline || 8640000000000000);
  });
  const done = tasks.filter((t) => t.done);

  return (
    <div className="rounded-2xl bg-(--color-surface) border border-(--color-border-line) p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-(--color-text-primary)">Tasks</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrioritize}
            disabled={prioritizing || active.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-(--color-border-strong) text-(--color-text-primary) transition-all duration-150 hover:bg-(--color-surface-hover) hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Sparkles size={13} className={prioritizing ? 'animate-spin' : ''} />
            {prioritizing ? 'Thinking…' : 'Prioritize'}
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-(--color-signal) text-(--color-void) transition-all duration-150 hover:opacity-90 hover:scale-105 active:scale-95"
          >
            <Plus size={13} />
            Add task
          </button>
        </div>
      </div>

      {insight && (
        <div className="animate-slide-up text-xs text-(--color-text-primary) bg-(--color-signal-dim) border border-(--color-signal)/20 rounded-lg px-3 py-2">
          {insight}
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState onAddClick={onAddClick} />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} highlighted={highlightedId === task.id} />
          ))}
          {done.length > 0 && (
            <details className="mt-2 group">
              <summary className="text-xs text-(--color-text-faint) cursor-pointer select-none hover:text-(--color-text-muted)">
                {done.length} completed
              </summary>
              <div className="flex flex-col gap-2 mt-2">
                {done.map((task) => (
                  <TaskCard key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
      <p className="text-sm font-medium text-(--color-text-primary)">Nothing on your plate yet</p>
      <p className="text-xs text-(--color-text-faint) max-w-xs">
        Add a task with a deadline, or just tell the assistant what you're up against.
      </p>
      <button
        onClick={onAddClick}
        className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-(--color-signal) text-(--color-void) transition-all duration-150 hover:opacity-90 hover:scale-105 active:scale-95"
      >
        Add your first task
      </button>
    </div>
  );
}
