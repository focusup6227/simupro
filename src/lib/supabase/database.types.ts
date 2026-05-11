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
          disclaimer_accepted_at: string | null;
          disclaimer_accepted_version: string | null;
          active_protocol_import_id: string | null;
          protocol_workplace_id: string | null;
          active_workplace_protocol_import_id: string | null;
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
          disclaimer_accepted_at?: string | null;
          disclaimer_accepted_version?: string | null;
          active_protocol_import_id?: string | null;
          protocol_workplace_id?: string | null;
          active_workplace_protocol_import_id?: string | null;
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
          disclaimer_accepted_at?: string | null;
          disclaimer_accepted_version?: string | null;
          active_protocol_import_id?: string | null;
          protocol_workplace_id?: string | null;
          active_workplace_protocol_import_id?: string | null;
        };
        Relationships: [];
      };
      protocol_workplace_members: {
        Row: {
          workplace_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          workplace_id: string;
          user_id: string;
          role: string;
          joined_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      protocol_workplaces: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          join_code: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          join_code: string;
          updated_at: string;
        }>;
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
          comorbidities: string[] | null;
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
          autonomic_profile: Json | null;
          patient_weight_kg: number | null;
          age_band: string | null;
          icp_mm_hg: number | null;
          interventions_enabled: boolean;
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
          comorbidities?: string[] | null;
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
          autonomic_profile?: Json | null;
          patient_weight_kg?: number | null;
          age_band?: string | null;
          icp_mm_hg?: number | null;
          interventions_enabled?: boolean;
        };
        Update: Partial<{
          title: string;
          description: string;
          status: string;
          is_premium?: boolean;
          category?: string | null;
          patient_profile: string;
          comorbidities?: string[] | null;
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
          autonomic_profile?: Json | null;
          patient_weight_kg?: number | null;
          age_band?: string | null;
          icp_mm_hg?: number | null;
          interventions_enabled?: boolean;
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
          partner_role: string | null;
          partner_name: string | null;
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
          partner_role?: string | null;
          partner_name?: string | null;
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
          partner_role?: string | null;
          partner_name?: string | null;
        }>;
        Relationships: [];
      };
      simulation_pk_doses: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          drug_id: string;
          intervention_id: string | null;
          dose_mg: number | null;
          route: string;
          kind: string;
          infusion_rate: number | null;
          infusion_rate_kind: string | null;
          patient_weight_kg: number;
          sim_seconds: number;
          administered_at: string;
        };
        Insert: {
          id: string;
          session_id: string;
          user_id: string;
          drug_id: string;
          intervention_id?: string | null;
          dose_mg?: number | null;
          route: string;
          kind: string;
          infusion_rate?: number | null;
          infusion_rate_kind?: string | null;
          patient_weight_kg: number;
          sim_seconds: number;
          administered_at?: string;
        };
        Update: Partial<{
          drug_id: string;
          intervention_id: string | null;
          dose_mg: number | null;
          route: string;
          kind: string;
          infusion_rate: number | null;
          infusion_rate_kind: string | null;
          patient_weight_kg: number;
          sim_seconds: number;
          administered_at?: string;
        }>;
        Relationships: [];
      };
      simulation_autonomic_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          kind: string;
          payload: Json;
          sim_seconds: number;
          recorded_at: string;
        };
        Insert: {
          id: string;
          session_id: string;
          user_id: string;
          kind: string;
          payload?: Json;
          sim_seconds: number;
          recorded_at?: string;
        };
        Update: Partial<{
          kind: string;
          payload: Json;
          sim_seconds: number;
          recorded_at: string;
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
          protocol_deviations: Json | null;
          protocol_wins: Json | null;
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
          protocol_deviations?: Json | null;
          protocol_wins?: Json | null;
        };
        Update: Partial<{
          assessment_score: number;
          treatment_score: number;
          ai_feedback: string;
          reasoning: string;
          premium_feedback: Json | null;
          protocol_deviations: Json | null;
          protocol_wins: Json | null;
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
      user_protocol_imports: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          original_filename: string;
          display_name: string;
          status: string;
          extracted_interventions: Json | null;
          extraction_error: string | null;
          admin_review_status: string | null;
          admin_review_notes: string | null;
          resolved_by_admin_id: string | null;
          admin_resolved_at: string | null;
          resolution_message_for_user: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          original_filename: string;
          display_name: string;
          status?: string;
          extracted_interventions?: Json | null;
          extraction_error?: string | null;
          admin_review_status?: string | null;
          admin_review_notes?: string | null;
          resolved_by_admin_id?: string | null;
          admin_resolved_at?: string | null;
          resolution_message_for_user?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          storage_path: string;
          original_filename: string;
          display_name: string;
          status: string;
          extracted_interventions: Json | null;
          extraction_error: string | null;
          admin_review_status: string | null;
          admin_review_notes: string | null;
          resolved_by_admin_id: string | null;
          admin_resolved_at: string | null;
          resolution_message_for_user: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      workplace_protocol_imports: {
        Row: {
          id: string;
          workplace_id: string;
          uploaded_by_user_id: string;
          storage_path: string;
          original_filename: string;
          display_name: string;
          status: string;
          extracted_interventions: Json | null;
          extraction_error: string | null;
          admin_review_status: string | null;
          admin_review_notes: string | null;
          resolved_by_admin_id: string | null;
          admin_resolved_at: string | null;
          resolution_message_for_user: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workplace_id: string;
          uploaded_by_user_id: string;
          storage_path: string;
          original_filename: string;
          display_name: string;
          status?: string;
          extracted_interventions?: Json | null;
          extraction_error?: string | null;
          admin_review_status?: string | null;
          admin_review_notes?: string | null;
          resolved_by_admin_id?: string | null;
          admin_resolved_at?: string | null;
          resolution_message_for_user?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          storage_path: string;
          original_filename: string;
          display_name: string;
          status: string;
          extracted_interventions: Json | null;
          extraction_error: string | null;
          admin_review_status: string | null;
          admin_review_notes: string | null;
          resolved_by_admin_id: string | null;
          admin_resolved_at: string | null;
          resolution_message_for_user: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      protocol_import_resolution_acks: {
        Row: {
          user_id: string;
          import_scope: string;
          import_id: string;
          acknowledged_at: string;
        };
        Insert: {
          user_id: string;
          import_scope: string;
          import_id: string;
          acknowledged_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      ai_response_feedback: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string;
          scenario_id: string;
          scenario_title: string;
          assistant_message_index: number;
          flagged_assistant_content: string;
          messages_snapshot: Json;
          user_actions_snapshot: Json;
          simulation_role: string | null;
          simulation_time_seconds: number | null;
          user_comment: string;
          review_status: string;
          admin_preferred_response: string | null;
          admin_review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          session_id?: string | null;
          user_id: string;
          scenario_id: string;
          scenario_title: string;
          assistant_message_index: number;
          flagged_assistant_content: string;
          messages_snapshot: Json;
          user_actions_snapshot?: Json;
          simulation_role?: string | null;
          simulation_time_seconds?: number | null;
          user_comment: string;
          review_status?: string;
          admin_preferred_response?: string | null;
          admin_review_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          session_id: string | null;
          review_status: string;
          admin_preferred_response: string | null;
          admin_review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          updated_at: string;
        }>;
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
      create_protocol_workplace: {
        Args: { p_name: string };
        Returns: { id: string; join_code: string }[];
      };
      join_protocol_workplace: {
        Args: { p_code: string };
        Returns: string;
      };
      leave_protocol_workplace: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
