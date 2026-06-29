import { useCallback, useEffect, useState } from 'react';
import { buildCompletionPatch } from '../lib/streaks';

const STORAGE_KEY = 'brink:tasks:v1';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // storage full or unavailable — fail silently, in-memory state still works
    }
  }, [tasks]);

  const addTask = useCallback((input) => {
    const task = {
      id: uid(),
      title: input.title?.trim() || 'Untitled task',
      deadline: input.deadline || null,
      estimatedMinutes: Number(input.estimatedMinutes) || 30,
      notes: input.notes || '',
      done: false,
      priority: null,
      priorityReason: null,
      recurrence: input.recurrence === 'daily' ? 'daily' : null,
      streak: 0,
      lastCompletedDate: null,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        let next = { ...t, ...patch };
        // Track how many times a deadline has been pushed *later* — a useful
        // signal for "this keeps slipping" recommendations, separate from
        // ordinary edits (typo fixes, pulling a deadline earlier, etc.).
        if (patch.deadline && t.deadline && new Date(patch.deadline) > new Date(t.deadline)) {
          next.deadlinePushCount = (t.deadlinePushCount || 0) + 1;
        }
        return next;
      })
    );
  }, []);

  const completeTask = useCallback((id, done = true) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (done && t.recurrence === 'daily') {
          return { ...t, ...buildCompletionPatch(t) };
        }
        return { ...t, done };
      })
    );
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyPriorities = useCallback((ranked = []) => {
    setTasks((prev) =>
      prev.map((t) => {
        const match = ranked.find((r) => r.id === t.id);
        return match ? { ...t, priority: match.priority, priorityReason: match.reason } : t;
      })
    );
  }, []);

  /** Applies AI-proposed actions from the chat assistant (add/update/complete/delete) */
  const applyActions = useCallback((actions = []) => {
    setTasks((prev) => {
      let next = [...prev];
      for (const action of actions) {
        if (action.type === 'add_task') {
          next.push({
            id: uid(),
            title: action.title?.trim() || 'Untitled task',
            deadline: action.deadline || null,
            estimatedMinutes: Number(action.estimatedMinutes) || 30,
            notes: action.notes || '',
            done: false,
            priority: null,
            priorityReason: null,
            recurrence: action.recurrence === 'daily' ? 'daily' : null,
            streak: 0,
            lastCompletedDate: null,
            createdAt: new Date().toISOString(),
          });
        } else if (action.type === 'update_task') {
          next = next.map((t) => (t.id === action.id ? { ...t, ...action, type: undefined } : t));
        } else if (action.type === 'complete_task') {
          next = next.map((t) => {
            if (t.id !== action.id) return t;
            return t.recurrence === 'daily' ? { ...t, ...buildCompletionPatch(t) } : { ...t, done: true };
          });
        } else if (action.type === 'delete_task') {
          next = next.filter((t) => t.id !== action.id);
        }
      }
      return next;
    });
  }, []);

  return { tasks, addTask, updateTask, completeTask, deleteTask, applyPriorities, applyActions };
}
