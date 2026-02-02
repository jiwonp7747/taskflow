// Task Status Types
export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'NEED_FIX'
  | 'COMPLETE'
  | 'ON_HOLD';

// Task Priority Types
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Task Assignee Types
export type TaskAssignee = 'ai-agent' | 'user' | string;

// Date Preset Types for filtering
export type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'overdue' | 'custom';

// Task Filter Interface
export interface TaskFilter {
  tags?: string[];
  assignee?: TaskAssignee | 'all';
  dateRange?: {
    type: DatePreset;
    startDate?: string;
    endDate?: string;
  };
}

// Main Task Interface
export interface Task {
  // Frontmatter fields
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: TaskAssignee;
  created_at: string;
  updated_at: string;
  start_date?: string;  // ISO date string, optional
  due_date?: string;    // ISO date string, optional
  tags: string[];
  task_size?: string;
  total_hours?: number;
  notion_id?: string;

  // Content field (unified markdown)
  content: string;

  // Metadata
  filePath: string;
  rawContent: string;
}

// API Response Types
export interface TaskListResponse {
  tasks: Task[];
  total: number;
  directory: string;
}

export interface TaskDetailResponse {
  task: Task;
}

export interface TaskUpdateRequest {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: TaskAssignee;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  content?: string;
  task_size?: string;
  total_hours?: number;
  notion_id?: string;
}

export interface TaskCreateRequest {
  title: string;
  priority?: TaskPriority;
  assignee?: TaskAssignee;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  content?: string;
  task_size?: string;
  total_hours?: number;
  notion_id?: string;
}

export interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink';
  taskId: string;
  path: string;
  timestamp: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Column configuration for the Kanban board
export interface ColumnConfig {
  id: TaskStatus;
  title: string;
  icon: string;
  color: string;
  glowColor: string;
  bgGradient: string;
}

// Status column definitions with cyberpunk theme
export const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'TODO',
    icon: '📋',
    color: 'text-slate-400',
    glowColor: 'shadow-slate-500/30',
    bgGradient: 'from-slate-900/50 to-slate-800/30',
  },
  {
    id: 'IN_PROGRESS',
    title: 'IN PROGRESS',
    icon: '🔄',
    color: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/50',
    bgGradient: 'from-cyan-950/40 to-cyan-900/20',
  },
  {
    id: 'IN_REVIEW',
    title: 'IN REVIEW',
    icon: '👀',
    color: 'text-violet-400',
    glowColor: 'shadow-violet-500/50',
    bgGradient: 'from-violet-950/40 to-violet-900/20',
  },
  {
    id: 'NEED_FIX',
    title: 'NEED FIX',
    icon: '🛠️',
    color: 'text-orange-400',
    glowColor: 'shadow-orange-500/50',
    bgGradient: 'from-orange-950/40 to-orange-900/20',
  },
  {
    id: 'COMPLETE',
    title: 'COMPLETE',
    icon: '✅',
    color: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/50',
    bgGradient: 'from-emerald-950/40 to-emerald-900/20',
  },
  {
    id: 'ON_HOLD',
    title: 'ON HOLD',
    icon: '⏸️',
    color: 'text-amber-400',
    glowColor: 'shadow-amber-500/40',
    bgGradient: 'from-amber-950/30 to-amber-900/20',
  },
];

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'LOW', color: 'text-slate-400', bgColor: 'bg-slate-800/50' },
  MEDIUM: { label: 'MED', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  HIGH: { label: 'HIGH', color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
  URGENT: { label: 'CRIT', color: 'text-red-400', bgColor: 'bg-red-900/40' },
};
