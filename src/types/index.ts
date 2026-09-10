import { Database, RecurrenceType, UserRole } from './database';
import type { CosmeticsBag, Json } from './database';

export type { Database, RecurrenceType, UserRole, CosmeticsBag, Json };
export type CosmeticItem = Database['public']['Tables']['cosmetics_catalog']['Row'];
export type CosmeticKind = CosmeticItem['kind'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];
export type TaskTemplateInsert = Database['public']['Tables']['task_templates']['Insert'];
export type TaskTemplateUpdate = Database['public']['Tables']['task_templates']['Update'];

export type TaskSchedule = Database['public']['Tables']['task_schedules']['Row'];
export type TaskScheduleInsert = Database['public']['Tables']['task_schedules']['Insert'];
export type TaskScheduleUpdate = Database['public']['Tables']['task_schedules']['Update'];

export type TaskInstance = Database['public']['Tables']['task_instances']['Row'];
export type TaskInstanceInsert = Database['public']['Tables']['task_instances']['Insert'];
export type TaskInstanceUpdate = Database['public']['Tables']['task_instances']['Update'];

export type MonthlySummary = Database['public']['Tables']['monthly_summaries']['Row'];
export type MonthlySummaryInsert = Database['public']['Tables']['monthly_summaries']['Insert'];

export type Reward = Database['public']['Tables']['rewards']['Row'];

export type TaskScheduleWithTemplate = TaskSchedule & {
  task_templates: TaskTemplate;
};

export type TodayTask = {
  instance: TaskInstance;
  schedule: TaskSchedule;
  template: TaskTemplate;
  status: 'pending' | 'completed' | 'missed';
  /** An unowned quest this member claimed from the Prijzenbord. */
  isBounty: boolean;
  /** Late bonus already earned on a bounty, in XP. 0 for normal quests. */
  bonus: number;
};

/** A quest on the Prijzenbord that nobody has claimed yet. */
export type Bounty = {
  instance: TaskInstance;
  schedule: TaskSchedule;
  template: TaskTemplate;
  /** Hours past the scheduled time; negative means not due yet. */
  hoursLate: number;
  /** Escalating reward for the job nobody wants. */
  bonus: number;
};

export type RewardTier = 0 | 1 | 2 | 3;

export type RichTaskInstance = TaskInstance & {
  taskName: string;
  taskIcon: string;
  taskPoints: number;
  userName: string;
  userAvatarUrl: string | null;
  userId: string | null;
};

export type MonthStats = {
  monthKey: string;
  totalPoints: number;
  tasksCompleted: number;
  tasksMissed: number;
  rewardTier: RewardTier;
};
