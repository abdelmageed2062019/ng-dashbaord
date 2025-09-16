export interface MatchClock {
  id: number;
  time_remaining_in_period: string;
  display_time: string;
  half_time_remaining: string;
  current_half: number;
  current_rotation: number;
  exclusion_timers: Record<string, any>;
  power_play_timers: Record<string, any>;
  timeouts_remaining: Record<string, number>;
  team_fouls_period: Record<string, any>;
  apparatus_rotation_order: any[];
  current_period: number;
  period_type: string;
  clock_state: string;
  total_elapsed_time: string;
  total_stoppage_time: string;
  is_running: boolean;
  last_start_time: string;
  last_stop_time: string;
  periods_completed: number;
  total_periods: number;
  period_duration: string;
  extra_time_duration: string;
  injury_time: string;
  stoppage_time: string;
  shot_clock_remaining: string | null;
  shot_clock_duration: string;
  routine_timer: string | null;
  routine_duration_limit: string;
  current_apparatus: string | null;
  routine_start_time: string | null;
  timeout_duration: string;
  timeout_end_time: string | null;
  last_sync_time: string;
  sync_interval: number;
  is_official_time: boolean;
  created_at: string;
  updated_at: string;
  match: number;
  current_routine_player: number | null;
  current_timeout_team: number | null;
  period: string;
  time_remaining: string;
  state: string;
  
  // Additional timeout and exclusion data
  exclusions?: number;
  power_plays?: number;
  exclusion_summary?: string;
  timeout_summary?: string;
  
  // Enhanced timeout status
  timeout_status?: {
    has_timeout: boolean;
    current_timeout_team?: {
      id: number;
      name: string;
    };
    timeout_end_time?: string;
    timeout_remaining?: number;
    timeout_remaining_display?: string;
    timeout_duration?: number;
  };
  
  // Enhanced exclusion status
  exclusion_status?: {
    has_exclusions: boolean;
    active_exclusions: any[];
    total_exclusions: number;
  };
}

export interface ClockInitializationRequest {
  match_format: string;
  total_periods: number;
  period_duration: number;
  shot_clock_duration?: number;
  routine_time_limit?: number;
  apparatus_rotation_time?: number;
  injury_time_tracking?: boolean;
  exclusion_duration?: number;
}

export interface TimeoutRequest {
  team_id: number;
  duration: string;
  reason?: string;
}

export interface ClockOperation {
  period?: number;
  apparatus?: string;
  reason?: string;
}