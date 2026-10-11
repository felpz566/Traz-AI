export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent: string
          created_at: string
          credits_used: number
          id: string
          prompt: string
          result: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent: string
          created_at?: string
          credits_used?: number
          id?: string
          prompt: string
          result?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          created_at?: string
          credits_used?: number
          id?: string
          prompt?: string
          result?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          language: string
          model: string
          title: string
          title_generated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          language?: string
          model?: string
          title?: string
          title_generated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          language?: string
          model?: string
          title?: string
          title_generated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          content: string
          created_at: string
          favorite: boolean
          id: string
          language: string
          name: string
          path: string
          project_id: string
          size: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          favorite?: boolean
          id?: string
          language?: string
          name: string
          path: string
          project_id: string
          size?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          favorite?: boolean
          id?: string
          language?: string
          name?: string
          path?: string
          project_id?: string
          size?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          credits_reset_at: string
          daily_credit_limit: number
          email: string
          favorite_languages: string[]
          id: string
          last_active_at: string
          name: string
          plan: Database["public"]["Enums"]["plan_type"]
          preferences: Json
          suspended: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          credits_reset_at?: string
          daily_credit_limit?: number
          email: string
          favorite_languages?: string[]
          id: string
          last_active_at?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          preferences?: Json
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          credits_reset_at?: string
          daily_credit_limit?: number
          email?: string
          favorite_languages?: string[]
          id?: string
          last_active_at?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          preferences?: Json
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived: boolean
          created_at: string
          description: string
          id: string
          language: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          language?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          language?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_exercises: {
        Row: {
          content: string
          created_at: string
          description: string
          display_order: number
          id: string
          language: string
          level_id: string
          retorne_quiz: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          language?: string
          level_id: string
          retorne_quiz?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          language?: string
          level_id?: string
          retorne_quiz?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_exercises_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      school_levels: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          language: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          language?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          language?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_progress: {
        Row: {
          completed_at: string
          exercise_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "school_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      school_quiz_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          question_order: number
          quiz_id: string
          respost: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          question_order?: number
          quiz_id: string
          respost?: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          question_order?: number
          quiz_id?: string
          respost?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "school_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_quizzes: {
        Row: {
          created_at: string
          display_order: number
          exercise_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          exercise_id: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          exercise_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_quizzes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "school_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      snippets: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          provider: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action: string
          chat_id: string | null
          created_at: string
          credits_used: number
          id: string
          model: string | null
          user_id: string
        }
        Insert: {
          action: string
          chat_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          model?: string | null
          user_id: string
        }
        Update: {
          action?: string
          chat_id?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          model?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credits: {
        Args: {
          _action: string
          _chat_id?: string
          _cost: number
          _model?: string
        }
        Returns: {
          credits: number
          daily_credit_limit: number
          is_admin: boolean
        }[]
      }
      consume_credits_for: {
        Args: {
          _action: string
          _chat_id?: string
          _cost: number
          _model?: string
          _user_id: string
        }
        Returns: {
          credits: number
          daily_credit_limit: number
          is_admin: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_daily_credits: {
        Args: never
        Returns: {
          credits: number
          daily_credit_limit: number
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin"
      message_role: "user" | "assistant" | "system"
      plan_type: "free" | "plus" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
      message_role: ["user", "assistant", "system"],
      plan_type: ["free", "plus", "pro"],
    },
  },
} as const
