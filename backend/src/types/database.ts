/**
 * TypeScript types for Supabase Database
 * Generated from database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      resorts: {
        Row: {
          id: string
          name: string
          location: string
          state: string
          region: string
          latitude: number
          longitude: number
          website_url: string | null
          total_lifts: number
          total_trails: number
          vertical_drop: number | null
          base_elevation: number | null
          summit_elevation: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          location: string
          state?: string
          region?: string
          latitude?: number
          longitude?: number
          website_url?: string | null
          total_lifts?: number
          total_trails?: number
          vertical_drop?: number | null
          base_elevation?: number | null
          summit_elevation?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          state?: string
          region?: string
          latitude?: number
          longitude?: number
          website_url?: string | null
          total_lifts?: number
          total_trails?: number
          vertical_drop?: number | null
          base_elevation?: number | null
          summit_elevation?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      snow_reports: {
        Row: {
          id: number
          resort_id: string
          report_date: string
          base_depth: number
          last_24_hours: number
          last_48_hours: number
          last_7_days: number | null
          lifts_open: number
          trails_open: number
          conditions: string | null
          snow_quality: string | null
          grooming_status: string | null
          data_source: string
          raw_response: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          resort_id: string
          report_date: string
          base_depth?: number
          last_24_hours?: number
          last_48_hours?: number
          last_7_days?: number | null
          lifts_open?: number
          trails_open?: number
          conditions?: string | null
          snow_quality?: string | null
          grooming_status?: string | null
          data_source?: string
          raw_response?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          resort_id?: string
          report_date?: string
          base_depth?: number
          last_24_hours?: number
          last_48_hours?: number
          last_7_days?: number | null
          lifts_open?: number
          trails_open?: number
          conditions?: string | null
          snow_quality?: string | null
          grooming_status?: string | null
          data_source?: string
          raw_response?: Json | null
          created_at?: string
        }
      }
      forecasts: {
        Row: {
          id: number
          resort_id: string
          forecast_date: string
          predicted_snow: number
          temp_high: number | null
          temp_low: number | null
          condition: string | null
          snow_probability: number | null
          wind_speed: number | null
          wind_direction: string | null
          humidity: number | null
          powder_score: number | null
          fetched_at: string
        }
        Insert: {
          id?: number
          resort_id: string
          forecast_date: string
          predicted_snow?: number
          temp_high?: number | null
          temp_low?: number | null
          condition?: string | null
          snow_probability?: number | null
          wind_speed?: number | null
          wind_direction?: string | null
          humidity?: number | null
          powder_score?: number | null
          fetched_at?: string
        }
        Update: {
          id?: number
          resort_id?: string
          forecast_date?: string
          predicted_snow?: number
          temp_high?: number | null
          temp_low?: number | null
          condition?: string | null
          snow_probability?: number | null
          wind_speed?: number | null
          wind_direction?: string | null
          humidity?: number | null
          powder_score?: number | null
          fetched_at?: string
        }
      }
      alert_subscriptions: {
        Row: {
          id: number
          visitor_id: string
          email: string | null
          resort_id: string
          resort_name: string
          threshold: 'light' | 'good' | 'great'
          timeframe: number
          is_active: boolean
          last_triggered: string | null
          last_checked: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          visitor_id: string
          email?: string | null
          resort_id: string
          resort_name: string
          threshold: 'light' | 'good' | 'great'
          timeframe?: number
          is_active?: boolean
          last_triggered?: string | null
          last_checked?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          visitor_id?: string
          email?: string | null
          resort_id?: string
          resort_name?: string
          threshold?: 'light' | 'good' | 'great'
          timeframe?: number
          is_active?: boolean
          last_triggered?: string | null
          last_checked?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alert_notifications: {
        Row: {
          id: number
          subscription_id: number
          title: string
          message: string
          predicted_snow: number
          forecast_date: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          subscription_id: number
          title: string
          message: string
          predicted_snow: number
          forecast_date: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          subscription_id?: number
          title?: string
          message?: string
          predicted_snow?: number
          forecast_date?: string
          is_read?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          visitor_id: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          name?: string | null
          visitor_id?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          visitor_id?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: number
          user_id: string | null
          visitor_id: string | null
          resort_id: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          visitor_id?: string | null
          resort_id: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          visitor_id?: string | null
          resort_id?: string
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: number
          session_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          session_id: string
          role: 'user' | 'assistant'
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      search_logs: {
        Row: {
          id: number
          visitor_id: string | null
          query: string
          region: string | null
          results_count: number | null
          created_at: string
        }
        Insert: {
          id?: number
          visitor_id?: string | null
          query: string
          region?: string | null
          results_count?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          visitor_id?: string | null
          query?: string
          region?: string | null
          results_count?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      threshold_type: 'light' | 'good' | 'great'
      chat_role: 'user' | 'assistant'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Resort = Database['public']['Tables']['resorts']['Row']
export type ResortInsert = Database['public']['Tables']['resorts']['Insert']
export type ResortUpdate = Database['public']['Tables']['resorts']['Update']

export type SnowReport = Database['public']['Tables']['snow_reports']['Row']
export type SnowReportInsert = Database['public']['Tables']['snow_reports']['Insert']

export type Forecast = Database['public']['Tables']['forecasts']['Row']
export type ForecastInsert = Database['public']['Tables']['forecasts']['Insert']

export type AlertSubscription = Database['public']['Tables']['alert_subscriptions']['Row']
export type AlertSubscriptionInsert = Database['public']['Tables']['alert_subscriptions']['Insert']

export type AlertNotification = Database['public']['Tables']['alert_notifications']['Row']
export type AlertNotificationInsert = Database['public']['Tables']['alert_notifications']['Insert']

export type User = Database['public']['Tables']['users']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type SearchLog = Database['public']['Tables']['search_logs']['Row']
