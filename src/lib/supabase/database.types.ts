export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          photo_url: string | null;
          emt_program_completed_on: string | null;
          aemt_program_completed_on: string | null;
          role: string;
          test_role: string | null;
          is_admin: boolean;
          is_premium: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          premium_status: string | null;
          premium_current_period_end: string | null;
          has_completed_tutorial: boolean;
          current_streak: number;
          longest_streak: number;
          last_training_activity_date: string | null;
          total_completed_simulations: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          photo_url?: string | null;
          emt_program_completed_on?: string | null;
          aemt_program_completed_on?: string | null;
          role?: string;
          test_role?: string | null;
          is_admin?: boolean;
          is_premium?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          premium_status?: string | null;
          premium_current_period_end?: string | null;
          has_completed_tutorial?: boolean;
          current_streak?: number;
          longest_streak?: number;
          last_training_activity_date?: string | null;
          total_completed_simulations?: number;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          photo_url?: string | null;
          emt_program_completed_on?: string | null;
          aemt_program_completed_on?: string | null;
          role?: string;
          test_role?: string | null;
          is_admin?: boolean;
          is_premium?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          premium_status?: string | null;
          premium_current_period_end?: string | null;
          has_completed_tutorial?: boolean;
          current_streak?: number;
          longest_streak?: number;
          last_training_activity_date?: string | null;
          total_completed_simulations?: number;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: string;
          is_premium: boolean;
          category: string | null;
          patient_profile: string;
          initial_vitals: Json;
          details: string;
          difficulty: string;
          tags: string[];
          destination: string;
          destination_rationale: string;
          hospital_distances: Json;
          suggested_actions: Json;
          mandatory_actions: Json;
          critical_failures: string[];
          patient_presentation: string | null;
          initial_rhythm: string | null;
          acs_pattern: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          status: string;
          is_premium?: boolean;
          category?: string | null;
          patient_profile: string;
          initial_vitals: Json;
          details: string;
          difficulty: string;
          tags: string[];
          destination: string;
          destination_rationale: string;
          hospital_distances: Json;
          suggested_actions: Json;
          mandatory_actions: Json;
          critical_failures: string[];
          patient_presentation?: string | null;
          initial_rhythm?: string | null;
          acs_pattern?: string | null;
        };
        Update: Partial<{
          title: string;
          description: string;
          status: string;
          is_premium?: boolean;
          category?: string | null;
          patient_profile: string;
          initial_vitals: Json;
          details: string;
          difficulty: string;
          tags: string[];
          destination: string;
          destination_rationale: string;
          hospital_distances: Json;
          suggested_actions: Json;
          mandatory_actions: Json;
          critical_failures: string[];
          patient_presentation?: string | null;
          initial_rhythm?: string | null;
          acs_pattern?: string | null;
        }>;
        Relationships: [];
      };
      interventions: {
        Row: {
          id: string;
          name: string;
          description: string;
          indication: string | null;
          mechanism: string | null;
          certification_level: string;
          sub_options: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          indication?: string | null;
          mechanism?: string | null;
          certification_level: string;
          sub_options?: Json | null;
        };
        Update: Partial<{
          name: string;
          description: string;
          indication?: string | null;
          mechanism?: string | null;
          certification_level: string;
          sub_options?: Json | null;
        }>;
        Relationships: [];
      };
      simulation_sessions: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string;
          scenario_title: string;
          start_time: string;
          end_time: string | null;
          status: string;
          time_elapsed: number | null;
          actions: Json | null;
          messages: Json | null;
          user_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          scenario_id: string;
          scenario_title: string;
          start_time?: string;
          end_time?: string | null;
          status: string;
          time_elapsed?: number | null;
          actions?: Json | null;
          messages?: Json | null;
          user_role?: string | null;
        };
        Update: Partial<{
          scenario_id: string;
          scenario_title: string;
          start_time?: string;
          end_time?: string | null;
          status: string;
          time_elapsed?: number | null;
          actions?: Json | null;
          messages?: Json | null;
          user_role?: string | null;
        }>;
        Relationships: [];
      };
      session_insights: {
        Row: {
          id: string;
          session_id: string;
          assessment_score: number;
          treatment_score: number;
          ai_feedback: string;
          reasoning: string;
          premium_feedback: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          session_id: string;
          assessment_score: number;
          treatment_score: number;
          ai_feedback: string;
          reasoning: string;
          premium_feedback?: Json | null;
        };
        Update: Partial<{
          assessment_score: number;
          treatment_score: number;
          ai_feedback: string;
          reasoning: string;
          premium_feedback: Json | null;
        }>;
        Relationships: [];
      };
      scenario_reviews: {
        Row: {
          id: string;
          scenario_id: string;
          tester_id: string;
          tester_name: string;
          tested_as_role: string;
          approved: boolean;
          comments: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          scenario_id: string;
          tester_id: string;
          tester_name: string;
          tested_as_role: string;
          approved: boolean;
          comments?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          tester_name: string;
          tested_as_role: string;
          approved: boolean;
          comments?: string | null;
        }>;
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          user_email: string;
          message: string;
          scenario_id: string | null;
          scenario_title: string | null;
          ticket_kind: string;
          created_at: string;
          status: string;
          responses: Json;
        };
        Insert: {
          id: string;
          user_id: string;
          user_email: string;
          message: string;
          scenario_id?: string | null;
          scenario_title?: string | null;
          ticket_kind?: string;
          status?: string;
          responses?: Json;
        };
        Update: Partial<{
          user_email: string;
          message: string;
          scenario_id?: string | null;
          scenario_title?: string | null;
          ticket_kind?: string;
          status?: string;
          responses?: Json;
        }>;
        Relationships: [];
      };
      firebase_uid_mappings: {
        Row: { firebase_uid: string; auth_user_id: string };
        Insert: { firebase_uid: string; auth_user_id: string };
        Update: never;
        Relationships: [];
      };
      scenario_favorites: {
        Row: {
          user_id: string;
          scenario_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          scenario_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      rhythm_quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          source: 'trainer' | 'scenario';
          scenario_id: string | null;
          session_id: string | null;
          rhythm_kind: string;
          user_answer: string;
          is_correct: boolean;
          difficulty: string | null;
          family: string;
          ms_to_answer: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: 'trainer' | 'scenario';
          scenario_id?: string | null;
          session_id?: string | null;
          rhythm_kind: string;
          user_answer: string;
          is_correct: boolean;
          difficulty?: string | null;
          family: string;
          ms_to_answer?: number | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
