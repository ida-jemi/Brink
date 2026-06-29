/**
 * Detects concrete risk patterns in the current task/calendar state.
 * Pure, synchronous, no network calls — cheap enough to run on every render
 * or on a timer, so Brink can be "proactive" without hammering the AI API
 * just to check whether something is wrong.
 *
 * Returns an array of risk objects; the caller decides which (if any) to
 * surface and whether to ask Gemini to phrase a recommendation for it.
 */
export function detectRisks(tasks, calendarEvents = [], now = new Date()) {
  const risks = [];
  const active = tasks.filter((t) => !t.done);

  // Risk 1: a daily-habit streak that hasn't been completed today and is running out of room.
  const streakRiskTaskIds = new Set();
  for (const t of active) {
    if (t.recurrence !== 'daily' || !t.streak) continue;
    const completedToday = t.lastCompletedDate === now.toISOString().slice(0, 10);
    if (completedToday) continue;
    const deadline = t.deadline ? new Date(t.deadline) : null;
    if (!deadline) continue;
    const hoursLeft = (deadline.getTime() - now.getTime()) / 36e5;
    if (hoursLeft > 0 && hoursLeft <= 6) {
      risks.push({
        type: 'streak_at_risk',
        severity: hoursLeft <= 2 ? 'high' : 'medium',
        task: t,
        hoursLeft,
      });
      streakRiskTaskIds.add(t.id);
    }
  }

  // Risk 1b: any task (streak or not) with under 60 minutes left until its deadline.
  // Skips tasks already flagged above so a single task surfaces one notice, not two.
  for (const t of active) {
    if (streakRiskTaskIds.has(t.id) || !t.deadline) continue;
    const minutesLeft = (new Date(t.deadline).getTime() - now.getTime()) / 60000;
    if (minutesLeft > 0 && minutesLeft <= 60) {
      risks.push({
        type: 'deadline_imminent',
        severity: minutesLeft <= 20 ? 'high' : 'medium',
        task: t,
        minutesLeft,
      });
    }
  }

  // Risk 2: two or more active tasks whose combined estimated time can't fit
  // before the earliest of their deadlines, given the time remaining today.
  const withDeadlines = active
    .filter((t) => t.deadline)
    .map((t) => ({ ...t, deadlineMs: new Date(t.deadline).getTime() }))
    .sort((a, b) => a.deadlineMs - b.deadlineMs);

  for (let i = 0; i < withDeadlines.length; i++) {
    const horizon = withDeadlines[i].deadlineMs;
    const competing = withDeadlines.filter((t) => t.deadlineMs <= horizon);
    if (competing.length < 2) continue;
    const totalMinutesNeeded = competing.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
    const minutesAvailable = (horizon - now.getTime()) / 60000;
    if (minutesAvailable > 0 && totalMinutesNeeded > minutesAvailable) {
      risks.push({
        type: 'schedule_conflict',
        severity: 'high',
        tasks: competing,
        minutesShort: Math.round(totalMinutesNeeded - minutesAvailable),
        deadlineMs: horizon,
      });
      break; // one conflict surfaced at a time is plenty; avoid overwhelming the user
    }
  }

  // Risk 3: a real calendar event overlaps a task's estimated working window.
  for (const t of active) {
    if (!t.deadline) continue;
    const taskEnd = new Date(t.deadline).getTime();
    const taskStart = taskEnd - (t.estimatedMinutes || 30) * 60000;
    const clash = calendarEvents.find((e) => {
      const evStart = new Date(e.start).getTime();
      const evEnd = new Date(e.end).getTime();
      return evStart < taskEnd && evEnd > taskStart;
    });
    if (clash) {
      risks.push({ type: 'calendar_clash', severity: 'medium', task: t, event: clash });
    }
  }

  // Risk 4: a task repeatedly pushed back (3+ edits to its deadline, all later).
  for (const t of active) {
    if ((t.deadlinePushCount || 0) >= 3) {
      risks.push({ type: 'repeatedly_delayed', severity: 'low', task: t, count: t.deadlinePushCount });
    }
  }

  return risks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export function describeRisk(risk) {
  switch (risk.type) {
    case 'streak_at_risk':
      return `Your "${risk.task.title}" streak (${risk.task.streak} days) breaks in ${Math.round(risk.hoursLeft)}h — it hasn't been done today.`;
    case 'deadline_imminent':
      return `"${risk.task.title}" is due in ${Math.round(risk.minutesLeft)} minutes.`;
    case 'schedule_conflict':
      return `${risk.tasks.length} tasks share a deadline and won't all fit — short by about ${risk.minutesShort} min.`;
    case 'calendar_clash':
      return `"${risk.task.title}" overlaps your calendar event "${risk.event.title}".`;
    case 'repeatedly_delayed':
      return `"${risk.task.title}" has been pushed back ${risk.count} times.`;
    default:
      return 'Something needs attention.';
  }
}
