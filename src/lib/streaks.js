/**
 * Habit/streak helpers for recurring tasks.
 *
 * A recurring task carries:
 *   - recurrence: 'daily' | null
 *   - streak: number of consecutive on-time completions
 *   - lastCompletedDate: 'YYYY-MM-DD' of the last day it was marked done
 *
 * When a 'daily' task is completed, instead of staying done forever it
 * rolls forward to a fresh open instance due ~24h later, carrying the
 * incremented (or reset) streak with it.
 */

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function daysBetween(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00Z').getTime();
  const b = new Date(bKey + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Given a task being completed "now", returns the patch to apply.
 * For non-recurring tasks this is just { done: true }.
 * For daily tasks, returns a patch that marks today's instance done AND
 * rolls the deadline forward, incrementing/resetting the streak appropriately.
 */
export function buildCompletionPatch(task, now = new Date()) {
  if (task.recurrence !== 'daily') {
    return { done: true };
  }

  const todayKey = dateKey(now);
  const prevKey = task.lastCompletedDate;

  // Missed one or more days since last completion -> streak resets to 1.
  // Same-day double completion (rare, e.g. double click) -> don't double count.
  let nextStreak = task.streak || 0;
  if (!prevKey) {
    nextStreak = 1;
  } else {
    const gap = daysBetween(prevKey, todayKey);
    if (gap === 0) {
      nextStreak = task.streak || 1; // already counted today
    } else if (gap === 1) {
      nextStreak = (task.streak || 0) + 1; // consecutive day, streak continues
    } else {
      nextStreak = 1; // gap of 2+ days, streak broken, restart at 1
    }
  }

  const nextDeadline = new Date(task.deadline ? new Date(task.deadline) : now);
  nextDeadline.setDate(nextDeadline.getDate() + 1);

  return {
    done: false, // instance rolls forward immediately rather than sitting completed
    deadline: nextDeadline.toISOString(),
    streak: nextStreak,
    lastCompletedDate: todayKey,
    priority: null,
    priorityReason: null,
  };
}

/** True if a daily habit's streak is still "alive" as of now (completed today or yesterday). */
export function isStreakActive(task, now = new Date()) {
  if (task.recurrence !== 'daily' || !task.lastCompletedDate) return false;
  const gap = daysBetween(task.lastCompletedDate, dateKey(now));
  return gap <= 1;
}
