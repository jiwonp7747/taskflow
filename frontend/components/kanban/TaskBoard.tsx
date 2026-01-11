'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@/types/task';
import { COLUMNS } from '@/types/task';
import { TaskColumn } from './TaskColumn';
import { TaskCardOverlay } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate: (id: string, data: Partial<Task>) => Promise<Task | null>;
  onTaskClick: (task: Task) => void;
  workingTaskIds?: string[];
}

export function TaskBoard({ tasks, onTaskUpdate, onTaskClick, workingTaskIds = [] }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      NEED_FIX: [],
      COMPLETE: [],
      ON_HOLD: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  }, [tasks]);

  // Handle drag over (for real-time feedback)
  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Can be used for real-time visual feedback
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const isColumn = COLUMNS.some((col) => col.id === overId);

    if (isColumn) {
      const newStatus = overId as TaskStatus;
      const task = tasks.find((t) => t.id === taskId);

      if (task && task.status !== newStatus) {
        await onTaskUpdate(taskId, { status: newStatus });
      }
    }
  }, [tasks, onTaskUpdate]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Board container with horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 min-h-[calc(100vh-200px)]">
        {COLUMNS.map((column) => (
          <TaskColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
            workingTaskIds={workingTaskIds}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
