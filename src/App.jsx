import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import BrinkLine from './components/BrinkLine';
import BrinkNotices from './components/BrinkNotices';
import ScheduleTable from './components/ScheduleTable';
import TaskList from './components/TaskList';
import AddTaskModal from './components/AddTaskModal';
import FloatingChat from './components/FloatingChat';
import { useTasks } from './state/useTasks';
import { useTheme } from './state/useTheme';
import { useGoogleCalendarAuth } from './state/useGoogleCalendarAuth';
import { listUpcomingEvents, createTaskEvent } from './lib/calendar';
import { api } from './lib/api';

export default function App() {
  const { tasks, addTask, updateTask, completeTask, deleteTask, applyPriorities, applyActions } = useTasks();
  const { theme, setTheme } = useTheme();
  const calendar = useGoogleCalendarAuth();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | <task object> being edited
  const [prioritizing, setPrioritizing] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [revising, setRevising] = useState(false);
  const [planBlocks, setPlanBlocks] = useState([]);
  const [planSummary, setPlanSummary] = useState('');
  const [insight, setInsight] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    if (!calendar.isConnected) {
      setCalendarEvents([]);
      return;
    }
    const now = new Date();
    const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    listUpcomingEvents(calendar.accessToken, { timeMinIso: now.toISOString(), timeMaxIso: dayAhead.toISOString() })
      .then(setCalendarEvents)
      .catch((err) => {
        if (err.code === 'TOKEN_EXPIRED') {
          calendar.disconnect();
          setErrorBanner('Your Google Calendar connection expired — click "Connect Calendar" to reconnect.');
        } else {
          setErrorBanner(err.message || 'Could not load your calendar.');
        }
      });
  }, [calendar.isConnected, calendar.accessToken]);

  const dueTodayCount = tasks.filter((t) => {
    if (t.done || !t.deadline) return false;
    const d = new Date(t.deadline);
    return d.toDateString() === new Date().toDateString();
  }).length;

  const handlePrioritize = async () => {
    setPrioritizing(true);
    setErrorBanner('');
    try {
      const res = await api.prioritize(tasks.filter((t) => !t.done));
      applyPriorities(res.ranked);
      setInsight(res.insight || '');
    } catch (err) {
      setErrorBanner(err.message || 'Could not prioritize tasks.');
    } finally {
      setPrioritizing(false);
    }
  };

  const handlePlan = async () => {
    setPlanLoading(true);
    setErrorBanner('');
    try {
      const res = await api.plan(tasks.filter((t) => !t.done), { calendarEvents });
      setPlanBlocks(res.blocks || []);
      setPlanSummary(res.summary || '');
    } catch (err) {
      setErrorBanner(err.message || 'Could not build a plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleRevisePlan = async (feedback) => {
    setRevising(true);
    setErrorBanner('');
    try {
      const res = await api.plan(tasks.filter((t) => !t.done), { feedback, previousBlocks: planBlocks, calendarEvents });
      setPlanBlocks(res.blocks || []);
      setPlanSummary(res.summary || '');
    } catch (err) {
      setErrorBanner(err.message || 'Could not update the schedule.');
    } finally {
      setRevising(false);
    }
  };

  const handleNoticeAction = (risk) => {
    if (risk.type === 'streak_at_risk' || risk.type === 'schedule_conflict' || risk.type === 'calendar_clash') {
      handlePlan();
    } else if (risk.type === 'deadline_imminent') {
      handleTaskClick(risk.task.id);
    }
  };

  const handleAddTask = async (input) => {
    const task = addTask(input);
    if (calendar.isConnected && task.deadline) {
      try {
        const endIso = task.deadline;
        const startIso = new Date(new Date(endIso).getTime() - (task.estimatedMinutes || 30) * 60000).toISOString();
        await createTaskEvent(calendar.accessToken, {
          title: task.title,
          notes: task.notes,
          startIso,
          endIso,
          reminderMinutesBefore: 30,
        });
      } catch (err) {
        if (err.code === 'TOKEN_EXPIRED') {
          calendar.disconnect();
          setErrorBanner('Task saved, but your Google Calendar connection expired — click "Connect Calendar" to reconnect.');
        } else {
          setErrorBanner(`Task saved, but couldn't add it to Google Calendar: ${err.message}`);
        }
      }
    }
    return task;
  };

  const handleTaskClick = (id) => {
    setHighlightedId(id);
    document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar dueTodayCount={dueTodayCount} theme={theme} setTheme={setTheme} calendar={calendar} />

      {errorBanner && (
        <div className="animate-slide-up mx-6 mt-4 text-xs text-(--color-danger) bg-(--color-danger-dim) border border-(--color-danger)/30 rounded-lg px-3 py-2">
          {errorBanner}
        </div>
      )}

      <div className="flex-1 flex justify-center sm:pr-[336px] lg:pr-[360px] xl:pr-[440px]">
        <main className="flex flex-col gap-5 p-6 w-full max-w-3xl">
          <BrinkNotices tasks={tasks} calendarEvents={calendarEvents} onAction={handleNoticeAction} />
          <BrinkLine
            tasks={tasks}
            planBlocks={planBlocks}
            onTaskClick={handleTaskClick}
            onPlanClick={handlePlan}
            planLoading={planLoading}
          />
          {planBlocks.length > 0 && (
            <ScheduleTable
              tasks={tasks}
              blocks={planBlocks}
              summary={planSummary}
              onRevise={handleRevisePlan}
              revising={revising}
            />
          )}
          <TaskList
            tasks={tasks}
            onComplete={completeTask}
            onDelete={deleteTask}
            onEdit={setTaskModal}
            onPrioritize={handlePrioritize}
            prioritizing={prioritizing}
            insight={insight}
            onAddClick={() => setTaskModal('new')}
            highlightedId={highlightedId}
          />
        </main>
      </div>

      <FloatingChat tasks={tasks} applyActions={applyActions} />

      {taskModal && (
        <AddTaskModal
          task={taskModal === 'new' ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onSubmit={handleAddTask}
          onSave={updateTask}
          calendarConnected={calendar.isConnected}
        />
      )}
    </div>
  );
}
