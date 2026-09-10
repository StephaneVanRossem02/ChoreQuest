export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';
export type UserRole = 'user' | 'admin';

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/** Shape stored in `profiles.cosmetics`. */
export type CosmeticsBag = {
  owned?: string[];
  flame?: string;
  title?: string;
  frame?: string;
  dragon?: string;
};

/**
 * Hand-maintained schema types, carried over from the React Native app.
 *
 * `Relationships` is required by supabase-js v2.4x+: without it every table
 * fails the GenericTable constraint and the whole schema silently collapses to
 * `never`, which makes every query untyped. The entries below mirror the real
 * foreign keys, so the nested `select()` hints used in the services type-check.
 */
export type Database = {
  public: {
    Tables: {
      task_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          points: number;
          photo_required: boolean;
          icon: string;
          is_active: boolean;
          is_deleted: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          points: number;
          photo_required?: boolean;
          icon?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          points?: number;
          photo_required?: boolean;
          icon?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_templates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_schedules: {
        Row: {
          id: string;
          task_template_id: string;
          recurrence_type: RecurrenceType;
          recurrence_day: number | null;
          once_date: string | null;
          time_of_day: string;
          is_active: boolean;
          reminder_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_template_id: string;
          recurrence_type: RecurrenceType;
          recurrence_day?: number | null;
          once_date?: string | null;
          time_of_day?: string;
          is_active?: boolean;
          reminder_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_template_id?: string;
          recurrence_type?: RecurrenceType;
          recurrence_day?: number | null;
          once_date?: string | null;
          time_of_day?: string;
          is_active?: boolean;
          reminder_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_template_id';
            columns: ['task_template_id'];
            isOneToOne: false;
            referencedRelation: 'task_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      task_instances: {
        Row: {
          id: string;
          schedule_id: string;
          due_date: string;
          completed_at: string | null;
          photo_url: string | null;
          points_earned: number | null;
          month_key: string;
          created_at: string;
          /** 005_bounties.sql. Undefined at runtime until that migration runs,
              which is what `capabilities.bounties` gates on. */
          claimed_by: string | null;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          due_date: string;
          completed_at?: string | null;
          photo_url?: string | null;
          points_earned?: number | null;
          month_key: string;
          created_at?: string;
          claimed_by?: string | null;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          due_date?: string;
          completed_at?: string | null;
          photo_url?: string | null;
          points_earned?: number | null;
          month_key?: string;
          created_at?: string;
          claimed_by?: string | null;
          claimed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'schedule_id';
            columns: ['schedule_id'];
            isOneToOne: false;
            referencedRelation: 'task_schedules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_instances_claimed_by_fkey';
            columns: ['claimed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      monthly_summaries: {
        Row: {
          id: string;
          month_key: string;
          user_id: string | null;
          total_points: number;
          tasks_completed: number;
          tasks_missed: number;
          reward_tier: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          month_key: string;
          user_id?: string | null;
          total_points?: number;
          tasks_completed?: number;
          tasks_missed?: number;
          reward_tier?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          month_key?: string;
          user_id?: string | null;
          total_points?: number;
          tasks_completed?: number;
          tasks_missed?: number;
          reward_tier?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_summaries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          /** 006_hoard.sql. Gated on `capabilities.hoard`. */
          coins: number;
          coins_lifetime: number;
          cosmetics: CosmeticsBag;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          /** Equipping is client-writable; `owned` and the balances are not
              (006 installs a trigger that rejects those). */
          cosmetics?: CosmeticsBag;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          tier: number;
          name: string;
          description: string;
          points_required: number;
          emoji: string;
        };
        Insert: {
          id?: string;
          tier: number;
          name: string;
          description: string;
          points_required: number;
          emoji: string;
        };
        Update: {
          id?: string;
          tier?: number;
          name?: string;
          description?: string;
          points_required?: number;
          emoji?: string;
        };
        Relationships: [];
      };
      cosmetics_catalog: {
        Row: {
          id: string;
          kind: 'flame' | 'title' | 'frame' | 'dragon';
          name: string;
          price: number;
          value: string;
        };
        Insert: {
          id: string;
          kind: 'flame' | 'title' | 'frame' | 'dragon';
          name: string;
          price: number;
          value: string;
        };
        Update: {
          id?: string;
          kind?: 'flame' | 'title' | 'frame' | 'dragon';
          name?: string;
          price?: number;
          value?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** 006_hoard.sql. Deducts the catalogue price server-side and returns
          the new balance, so the browser never names its own price. */
      buy_cosmetic: {
        Args: { p_item: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
