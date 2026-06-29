import { useEffect, useMemo, useState } from 'react';
import { urgencyLevel, URGENCY_COLOR } from '../lib/time';

const MARGIN_X = 36;
const VIEW_W = 1000;
const VIEW_H = 168;
const TRACK_Y = 92;
const TRACK_H = 34;
const WINDOW_HOURS = 12;

export default function BrinkLine({ tasks, planBlocks, onTaskClick, onPlanClick, planLoading }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const winStart = now.getTime() - 20 * 60 * 1000; // small look-back so "now" isn't glued to the edge
  const winEnd = winStart + WINDOW_HOURS * 60 * 60 * 1000;
  const usableW = VIEW_W - MARGIN_X * 2;

  const timeToX = (ms) => MARGIN_X + ((ms - winStart) / (winEnd - winStart)) * usableW;

  const hourTicks = useMemo(() => {
    const ticks = [];
    const start = new Date(winStart);
    start.setMinutes(0, 0, 0);
    if (start.getTime() < winStart) start.setHours(start.getHours() + 1);
    for (let t = start.getTime(); t <= winEnd; t += 60 * 60 * 1000) {
      ticks.push(t);
    }
    return ticks;
  }, [winStart, winEnd]);

  const planned = useMemo(() => {
    if (!planBlocks?.length) return [];
    const todayBase = new Date(now);
    todayBase.setHours(0, 0, 0, 0);
    return planBlocks
      .map((b) => {
        const [sh, sm] = b.start.split(':').map(Number);
        const [eh, em] = b.end.split(':').map(Number);
        const startMs = todayBase.getTime() + (sh * 60 + sm) * 60000;
        const endMs = todayBase.getTime() + (eh * 60 + em) * 60000;
        const task = tasks.find((t) => t.id === b.taskId);
        return { ...b, startMs, endMs, task };
      })
      .filter((b) => b.endMs > winStart && b.startMs < winEnd);
  }, [planBlocks, tasks, winStart, winEnd, now]);

  const plannedTaskIds = new Set(planned.map((p) => p.taskId));

  const unplannedFlags = useMemo(() => {
    return tasks
      .filter((t) => !t.done && t.deadline && !plannedTaskIds.has(t.id))
      .map((t) => ({ task: t, ms: new Date(t.deadline).getTime() }))
      .filter((f) => f.ms <= winEnd); // overdue tasks (ms < winStart) are kept and clamped below, not dropped
  }, [tasks, winEnd, plannedTaskIds]);

  const nowX = timeToX(now.getTime());

  // Anything overdue gets visually pinned at (or just left of) "now" rather than
  // plotted at its true past timestamp, which could fall off the left edge of the track.
  const flagX = (ms) => Math.max(timeToX(ms), MARGIN_X);

  return (
    <div className="rounded-2xl bg-(--color-surface) border border-(--color-border-line) p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-(--color-text-primary)">Next 12 hours</h2>
          <p className="text-xs text-(--color-text-faint)">Live view of what's coming and what's planned</p>
        </div>
        <button
          onClick={onPlanClick}
          disabled={planLoading}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-(--color-signal) text-(--color-void) transition-all duration-150 hover:opacity-90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {planLoading ? 'Planning…' : planBlocks?.length ? 'Re-plan today' : 'Plan today with AI'}
        </button>
      </div>

      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto mt-2" role="img" aria-label="Timeline of the next 12 hours">
        {/* track background */}
        <rect x={MARGIN_X} y={TRACK_Y} width={usableW} height={TRACK_H} rx="8" fill="var(--color-surface-raised)" />

        {/* hour ticks */}
        {hourTicks.map((t) => {
          const x = timeToX(t);
          const d = new Date(t);
          const label = d.toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '');
          return (
            <g key={t}>
              <line x1={x} y1={TRACK_Y - 6} x2={x} y2={TRACK_Y + TRACK_H + 6} stroke="var(--color-border-line)" strokeWidth="1" />
              <text x={x} y={TRACK_Y + TRACK_H + 22} fontSize="11" fill="var(--color-text-faint)" fontFamily="var(--font-mono)" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

        {/* planned blocks */}
        {planned.map((b, i) => {
          const x1 = Math.max(timeToX(b.startMs), MARGIN_X);
          const x2 = Math.min(timeToX(b.endMs), VIEW_W - MARGIN_X);
          const isBreak = b.type === 'break';
          const level = b.task ? urgencyLevel(b.task.deadline) : 'safe';
          const color = isBreak ? 'var(--color-text-faint)' : URGENCY_COLOR[level];
          const w = Math.max(x2 - x1, 3);
          return (
            <g
              key={(b.taskId || 'break') + i}
              className={isBreak ? '' : 'cursor-pointer'}
              onClick={() => !isBreak && onTaskClick?.(b.taskId)}
            >
              <rect x={x1} y={TRACK_Y + 3} width={w} height={TRACK_H - 6} rx="6" fill={color} opacity={isBreak ? 0.35 : 0.85} />
              {w > 60 && (
                <text x={x1 + 8} y={TRACK_Y + TRACK_H / 2 + 4} fontSize="11" fontWeight="600" fill={isBreak ? 'var(--color-text-muted)' : 'var(--color-void)'} className="select-none">
                  {(isBreak ? '☕ ' : '') + (b.title.length > 22 ? b.title.slice(0, 20) + '…' : b.title)}
                </text>
              )}
            </g>
          );
        })}

        {/* unplanned deadline flags */}
        {unplannedFlags.map(({ task, ms }) => {
          const x = flagX(ms);
          const isOverdue = ms < now.getTime();
          const color = URGENCY_COLOR[urgencyLevel(task.deadline)];
          return (
            <g key={task.id} className="cursor-pointer" onClick={() => onTaskClick?.(task.id)}>
              <line x1={x} y1={TRACK_Y - 18} x2={x} y2={TRACK_Y} stroke={color} strokeWidth="2" />
              <circle cx={x} cy={TRACK_Y - 18} r="4" fill={color} className={isOverdue ? 'pulse-dot' : undefined} />
              {isOverdue && (
                <text x={x} y={TRACK_Y - 26} fontSize="9" fontWeight="700" fill={color} fontFamily="var(--font-mono)" textAnchor="middle">
                  OVERDUE
                </text>
              )}
            </g>
          );
        })}

        {/* now marker */}
        <line x1={nowX} y1="8" x2={nowX} y2={TRACK_Y + TRACK_H + 6} stroke="var(--color-text-primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
        <circle cx={nowX} cy="8" r="3.5" fill="var(--color-text-primary)" />
        <text x={nowX} y="22" fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-text-muted)" textAnchor="middle">
          now
        </text>
      </svg>

      {planned.length === 0 && unplannedFlags.length === 0 && (
        <p className="text-xs text-(--color-text-faint) mt-2">Nothing due in the next 12 hours. Add a task or plan further ahead.</p>
      )}
    </div>
  );
}
