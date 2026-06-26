export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          applicant_id: string | null;
          applied_at: string;
          cover_letter: string | null;
          id: string;
          job_id: string;
          resume_url: string;
          status: Database["public"]["Enums"]["application_status"];
        };
        Insert: {
          applicant_id?: string | null;
          applied_at?: string;
          cover_letter?: string | null;
          id?: string;
          job_id: string;
          resume_url: string;
          status?: Database["public"]["Enums"]["application_status"];
        };
        Update: {
          applicant_id?: string | null;
          applied_at?: string;
          cover_letter?: string | null;
          id?: string;
          job_id?: string;
          resume_url?: string;
          status?: Database["public"]["Enums"]["application_status"];
        };
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          icon: string | null;
          id: string;
          job_count: number;
          name: string;
          slug: string;
        };
        Insert: {
          icon?: string | null;
          id?: string;
          job_count?: number;
          name: string;
          slug: string;
        };
        Update: {
          icon?: string | null;
          id?: string;
          job_count?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          created_at: string;
          id: string;
          parts: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parts: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          parts?: Json;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "coach_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_threads: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          industry: string | null;
          is_approved: boolean;
          logo_url: string | null;
          name: string;
          owner_id: string;
          size: Database["public"]["Enums"]["company_size"] | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          is_approved?: boolean;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          size?: Database["public"]["Enums"]["company_size"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          industry?: string | null;
          is_approved?: boolean;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          size?: Database["public"]["Enums"]["company_size"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      external_jobs: {
        Row: {
          category: string | null;
          company: string;
          company_logo: string | null;
          description: string | null;
          fetched_at: string;
          id: string;
          job_type: string | null;
          location: string | null;
          posted_at: string | null;
          salary: string | null;
          skills: string[];
          source: string;
          source_id: string;
          title: string;
          url: string;
        };
        Insert: {
          category?: string | null;
          company: string;
          company_logo?: string | null;
          description?: string | null;
          fetched_at?: string;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          posted_at?: string | null;
          salary?: string | null;
          skills?: string[];
          source: string;
          source_id: string;
          title: string;
          url: string;
        };
        Update: {
          category?: string | null;
          company?: string;
          company_logo?: string | null;
          description?: string | null;
          fetched_at?: string;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          posted_at?: string | null;
          salary?: string | null;
          skills?: string[];
          source?: string;
          source_id?: string;
          title?: string;
          url?: string;
        };
        Relationships: [];
      };
      job_matches: {
        Row: {
          created_at: string;
          external_job_id: string | null;
          id: string;
          job_id: string | null;
          rationale: string | null;
          score: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          external_job_id?: string | null;
          id?: string;
          job_id?: string | null;
          rationale?: string | null;
          score: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          external_job_id?: string | null;
          id?: string;
          job_id?: string | null;
          rationale?: string | null;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_matches_external_job_id_fkey";
            columns: ["external_job_id"];
            isOneToOne: false;
            referencedRelation: "external_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_matches_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          category: string;
          company_id: string;
          created_at: string;
          description: string;
          experience_level: Database["public"]["Enums"]["experience_level"];
          expires_at: string;
          id: string;
          location: string;
          posted_by: string;
          salary_currency: string;
          salary_max: number | null;
          salary_min: number | null;
          skills_required: string[];
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          type: Database["public"]["Enums"]["job_type"];
          updated_at: string;
          views: number;
        };
        Insert: {
          category: string;
          company_id: string;
          created_at?: string;
          description: string;
          experience_level: Database["public"]["Enums"]["experience_level"];
          expires_at: string;
          id?: string;
          location: string;
          posted_by: string;
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          skills_required?: string[];
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          type: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
          views?: number;
        };
        Update: {
          category?: string;
          company_id?: string;
          created_at?: string;
          description?: string;
          experience_level?: Database["public"]["Enums"]["experience_level"];
          expires_at?: string;
          id?: string;
          location?: string;
          posted_by?: string;
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          skills_required?: string[];
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          type?: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
          views?: number;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          ai_requests_limit: Json | null;
          ai_requests_used: Json | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          email: string;
          full_name: string;
          id: string;
          is_verified: boolean;
          location: string | null;
          onboarding_completed: boolean;
          resume_filename: string | null;
          resume_url: string | null;
          skills: string[];
          updated_at: string;
          website: string | null;
        };
        Insert: {
          ai_requests_limit?: Json | null;
          ai_requests_used?: Json | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          email: string;
          full_name?: string;
          id: string;
          is_verified?: boolean;
          location?: string | null;
          onboarding_completed?: boolean;
          resume_filename?: string | null;
          resume_url?: string | null;
          skills?: string[];
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          ai_requests_limit?: Json | null;
          ai_requests_used?: Json | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          is_verified?: boolean;
          location?: string | null;
          onboarding_completed?: boolean;
          resume_filename?: string | null;
          resume_url?: string | null;
          skills?: string[];
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      resume_rewrites: {
        Row: {
          created_at: string;
          id: string;
          improved_summary: string | null;
          rewritten_bullets: Json;
          user_id: string;
          version_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          improved_summary?: string | null;
          rewritten_bullets?: Json;
          user_id: string;
          version_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          improved_summary?: string | null;
          rewritten_bullets?: Json;
          user_id?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resume_rewrites_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "resume_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      resume_versions: {
        Row: {
          ats_score: number | null;
          content_hash: string | null;
          created_at: string;
          detected_skills: string[];
          file_url: string | null;
          filename: string | null;
          id: string;
          missing_keywords: string[];
          parsed_text: string;
          readiness_score: number | null;
          skill_gaps: string[];
          suggestions: Json;
          summary: string | null;
          user_id: string;
        };
        Insert: {
          ats_score?: number | null;
          content_hash?: string | null;
          created_at?: string;
          detected_skills?: string[];
          file_url?: string | null;
          filename?: string | null;
          id?: string;
          missing_keywords?: string[];
          parsed_text: string;
          readiness_score?: number | null;
          skill_gaps?: string[];
          suggestions?: Json;
          summary?: string | null;
          user_id: string;
        };
        Update: {
          ats_score?: number | null;
          content_hash?: string | null;
          created_at?: string;
          detected_skills?: string[];
          file_url?: string | null;
          filename?: string | null;
          id?: string;
          missing_keywords?: string[];
          parsed_text?: string;
          readiness_score?: number | null;
          skill_gaps?: string[];
          suggestions?: Json;
          summary?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      saved_jobs: {
        Row: {
          external_job_id: string | null;
          id: string;
          job_id: string | null;
          saved_at: string;
          user_id: string;
        };
        Insert: {
          external_job_id?: string | null;
          id?: string;
          job_id?: string | null;
          saved_at?: string;
          user_id: string;
        };
        Update: {
          external_job_id?: string | null;
          id?: string;
          job_id?: string | null;
          saved_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_jobs_external_job_id_fkey";
            columns: ["external_job_id"];
            isOneToOne: false;
            referencedRelation: "external_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_jobs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_reports: {
        Row: {
          created_at: string;
          display_name: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          slug: string;
          user_id: string;
          version_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          slug: string;
          user_id: string;
          version_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          slug?: string;
          user_id?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_reports_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "resume_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_items: {
        Row: {
          company: string | null;
          created_at: string;
          external_job_id: string | null;
          id: string;
          internal_job_id: string | null;
          notes: string | null;
          stage: string;
          title: string;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          external_job_id?: string | null;
          id?: string;
          internal_job_id?: string | null;
          notes?: string | null;
          stage?: string;
          title: string;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          external_job_id?: string | null;
          id?: string;
          internal_job_id?: string | null;
          notes?: string | null;
          stage?: string;
          title?: string;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_items_external_job_id_fkey";
            columns: ["external_job_id"];
            isOneToOne: false;
            referencedRelation: "external_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_items_internal_job_id_fkey";
            columns: ["internal_job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_onboarding: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: undefined;
      };
      approve_company: { Args: { _company_id: string }; Returns: undefined };
      atomic_check_increment_quota: {
        Args: { p_user_id: string; p_quota_key: string; p_limit: number };
        Returns: number;
      };
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_public_report: {
        Args: { p_slug: string };
        Returns: {
          display_name: string | null;
          ats_score: number | null;
          readiness_score: number | null;
          summary: string | null;
          detected_skills: string[];
          missing_keywords: string[];
          skill_gaps: string[];
          suggestions: Json;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_job_views: { Args: { _job_id: string }; Returns: undefined };
      mark_expired_jobs: { Args: never; Returns: undefined };
    };
    Enums: {
      app_role: "seeker" | "employer" | "admin";
      application_status: "pending" | "reviewed" | "hired" | "rejected";
      company_size: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
      experience_level: "entry" | "junior" | "mid" | "senior" | "lead";
      job_status: "open" | "closed" | "expired";
      job_type: "full-time" | "part-time" | "remote" | "hybrid" | "contract" | "internship";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["seeker", "employer", "admin"],
      application_status: ["pending", "reviewed", "hired", "rejected"],
      company_size: ["1-10", "11-50", "51-200", "201-500", "500+"],
      experience_level: ["entry", "junior", "mid", "senior", "lead"],
      job_status: ["open", "closed", "expired"],
      job_type: ["full-time", "part-time", "remote", "hybrid", "contract", "internship"],
    },
  },
} as const;
